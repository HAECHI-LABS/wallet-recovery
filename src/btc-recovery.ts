import {BNConverter, checkNullAndUndefinedParameter} from '@haechi-labs/henesis-wallet-core';
import {
  ECPair,
  Network,
  networks, Payment,
  payments,
  Psbt
} from "bitcoinjs-lib";
import sjcl = require('@haechi-labs/henesis-wallet-core/lib/eth/eth-core-lib/sjcl');
import axios from 'axios';
import {Env} from './recovery';

export interface BtcRecoveryOptions {
  accountKeyFile: string;
  backupKeyFile: string;
  henesisPubKey: string;
  passphrase: string;
  env: Env;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
}

export interface BtcRecoverParams {
  walletAddress: string;
  depositAddressHenesisPubKey?: string;
  recipientAddress: string;
}

export class BtcRecovery {
  private static readonly BYTES_PER_INPUT = 148;
  private static readonly BYTES_PER_OUTPUT = 34;
  private static readonly MIN_FEE_RATE = 2.5;
  private static readonly TARGET_CONFIRMATION = 2;
  private static readonly DECIMALS = 0.00000001;

  private readonly accountPriv: ECPair.ECPairInterface;
  private readonly backupPriv: ECPair.ECPairInterface;
  private readonly network: Network;
  private readonly client: BtcClient;
  private readonly redeemScript: Payment;

  constructor(options: BtcRecoveryOptions) {
    checkNullAndUndefinedParameter(options);
    this.accountPriv = this.decryptECPair(options.accountKeyFile, options.passphrase);
    this.backupPriv = this.decryptECPair(options.backupKeyFile, options.passphrase);
    this.redeemScript = payments.p2ms({
      m: 2,
      pubkeys: [this.accountPriv.publicKey, this.backupPriv.publicKey, Buffer.from(options.henesisPubKey.slice(2), "hex")],
      network: this.network
    });
    this.network = options.env == Env.Main ? networks.bitcoin : networks.testnet;
    this.client = new BtcClient(options.env);
  }

  public async recover(params: BtcRecoverParams) {
    checkNullAndUndefinedParameter(params);
    console.log(`\nRecovering BTC from ${params.walletAddress} to ${params.recipientAddress}.`);
    const utxos: UTXO[] = await this.client.getUTXOs(params.walletAddress);
    if (utxos.length < 1) {
      console.warn(`address: ${params.walletAddress} do not have utxos.`);
      return;
    }

    let redeemScript = this.redeemScript;
    if (params.depositAddressHenesisPubKey){
      redeemScript = payments.p2ms({
        m: 2,
        pubkeys: [this.accountPriv.publicKey, this.backupPriv.publicKey, Buffer.from(params.depositAddressHenesisPubKey.slice(2), "hex")],
        network: this.network
      })
    }

    const totalValue = utxos.map((utxo: UTXO) => utxo.value).reduce((a, b) => a + b);
    console.log(`Address: '${params.walletAddress}' has ${utxos.length} utxos with value ${this.applyDecimals(totalValue)} BTC.`);
    const psbt = new Psbt({network: this.network});
    for (let i = 0; i < utxos.length; i++) {
      psbt.addInput({
        redeemScript: redeemScript.output,
        hash: utxos[i].txid,
        index: utxos[i].vout,
        nonWitnessUtxo: await this.client.getTxHex(utxos[i].txid)
      });
      console.log(`- ${i}: utxo id: ${utxos[i].txid}, index: ${utxos[i].vout}.`)
    }

    const fee = await this.getEstimatedFee(
      utxos.length,
      1
    );

    if (totalValue - fee <= 0) {
      console.error("The quantity you send must be higher than the minimum fee.");
      return;
    }

    console.log(`\nThe fee to be charged is ${this.applyDecimals(fee)} BTC.`);
    console.log(`Therefore, the ${this.applyDecimals(totalValue - fee)} BTC will be withdrawn.`);

    psbt.addOutput({
      address: params.recipientAddress,
      value: totalValue - fee
    });

    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, this.accountPriv);
      psbt.signInput(i, this.backupPriv);
    }

    const tx = psbt.finalizeAllInputs().extractTransaction();
    const txId = await this.client.send(tx.toHex());
    console.log(`Successfully recover BTC from ${params.walletAddress} to ${params.recipientAddress} with value ${this.applyDecimals(totalValue - fee)} BTC.`);
    console.log(`Transaction Id: ${txId}.`);
    return txId;
  }

  private applyDecimals(value: number): number{
    return Number((value * BtcRecovery.DECIMALS).toFixed(8));
  }

  private async getEstimatedFee(inputNumber: number, outputNumber: number): Promise<number> {
    const feeRate = await this.client.getFeeRate(BtcRecovery.TARGET_CONFIRMATION);
    if (feeRate < BtcRecovery.MIN_FEE_RATE) {
      return this.getEstimatedBytes(inputNumber, outputNumber) * (BtcRecovery.MIN_FEE_RATE)
    }
    return this.getEstimatedBytes(inputNumber, outputNumber) * feeRate;
  }

  private getEstimatedBytes(inputNumber: number, outputNumber: number): number {
    return (BtcRecovery.BYTES_PER_INPUT * inputNumber) + (BtcRecovery.BYTES_PER_OUTPUT * outputNumber);
  }

  private decryptECPair(keyFile: string, password: string): ECPair.ECPairInterface {
    const decryptedKey = this.decrypt(keyFile, password);
    return ECPair.fromPrivateKey(
      Buffer.from(BNConverter.remove0x(decryptedKey), "hex"),
      {
        compressed: true,
        network: this.network
      }
    );
  }

  private decrypt(keyFile: string, password: string): string {
    try {
      return `0x${sjcl.decrypt(password, keyFile)}`;
    } catch (error) {
      if (
        error.message.includes("ccm: tag doesn't match") ||
        error.message.includes("sjcl.exception.invalid is not a constructor")
      ) {
        error.message = `password error - ${error.message}`;
      } else if (
        error.message === "sjcl.exception.corrupt is not a constructor"
      ) {
        error.message = "passphrase error";
      }
      throw error;
    }
  }
}

export class BtcClient {
  constructor(env: Env) {
    axios.defaults.baseURL = 'https://blockstream.info/testnet/api';
    if (env === Env.Main) {
      axios.defaults.baseURL = 'https://blockstream.info/api';
    }
  }

  public async send(txHex: string): Promise<string> {
    return (await axios.post(`/tx`, txHex, {
      headers: {
        'Content-Type': 'text/plain'
      },
    })).data;
  }

  public async getUTXOs(address: string): Promise<UTXO[]> {
    return ((await axios.get(`/address/${address}/utxo`)).data as UTXO[]);
  }

  public async getTxHex(txId: string): Promise<Buffer> {
    return Buffer.from((await axios.get(`/tx/${txId}/hex`)).data, "hex")
  }

  public async getFeeRate(targetConfirmation: number): Promise<number> {
    const results = (await axios.get(`/fee-estimates`)).data;
    return results[targetConfirmation];
  }
}