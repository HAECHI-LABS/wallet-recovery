import {
  BNConverter,
  checkNullAndUndefinedParameter,
} from "@haechi-labs/henesis-wallet-core";
import { ECPair, Network, Payment, payments } from "bitcoinjs-lib";
import { Psbt } from "@bithighlander/bitcoin-cash-js-lib";
import sjcl = require("@haechi-labs/henesis-wallet-core/lib/eth/eth-core-lib/sjcl");
import axios, { AxiosInstance, AxiosStatic } from "axios";
import { Env } from "./recovery";
const Address = require("./utils/cashAddress");
const cashAddress = new Address();

export interface BchRecoveryOptions {
  accountKeyFile: string;
  backupKeyFile: string;
  henesisPubKey: string;
  passphrase: string;
  env: Env;
}

export interface BchUTXO {
  txid: string;
  index: number;
  value: number;
}

export interface BchRecoverParams {
  walletAddress: string;
  depositAddressHenesisPubKey?: string;
  recipientAddress: string;
}

export const bitcoinCashMainnet: Network = {
  messagePrefix: "\x19Bitcoin Signed Message:\n",
  bech32: "bc",
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

export const bitcoinCashTestnet: Network = {
  messagePrefix: "\x19Bitcoin Signed Message:\n",
  bech32: "bc",
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

export const bitcoinCashRegTestnet: Network = {
  ...bitcoinCashTestnet,
};

export class BchRecovery {
  private static readonly BYTES_PER_INPUT = 148;
  private static readonly BYTES_PER_OUTPUT = 34;
  private static readonly MIN_FEE_RATE = 2.5;
  private static readonly TARGET_CONFIRMATION = 2;
  private static readonly DECIMALS = 0.00000001;

  private readonly accountPriv: ECPair.ECPairInterface;
  private readonly backupPriv: ECPair.ECPairInterface;
  private readonly network: Network;
  private readonly client: BchClient;
  private readonly redeemScript: Payment;

  constructor(options: BchRecoveryOptions) {
    checkNullAndUndefinedParameter(options);
    this.accountPriv = this.decryptECPair(
      options.accountKeyFile,
      options.passphrase
    );
    this.backupPriv = this.decryptECPair(
      options.backupKeyFile,
      options.passphrase
    );
    this.redeemScript = payments.p2ms({
      m: 2,
      pubkeys: [
        this.accountPriv.publicKey,
        this.backupPriv.publicKey,
        Buffer.from(options.henesisPubKey.slice(2), "hex"),
      ],
      network: this.network,
    });
    this.network = options.env == Env.Main ? bitcoinCashMainnet : bitcoinCashTestnet;
    this.client = new BchClient(options.env);
  }

  public async recover(params: BchRecoverParams) {
    checkNullAndUndefinedParameter(params);
    console.log(
      `\nRecovering BCH from ${params.walletAddress} to ${params.recipientAddress}.`
    );
    const utxos: BchUTXO[] = await this.client.getUTXOs(params.walletAddress);
    if (utxos.length < 1) {
      console.warn(`address: ${params.walletAddress} do not have utxos.`);
      return;
    }

    let redeemScript = this.redeemScript;
    if (params.depositAddressHenesisPubKey) {
      redeemScript = payments.p2ms({
        m: 2,
        pubkeys: [
          this.accountPriv.publicKey,
          this.backupPriv.publicKey,
          Buffer.from(params.depositAddressHenesisPubKey.slice(2), "hex"),
        ],
        network: this.network,
      });
    }

    const totalValue = utxos
      .map((utxo: BchUTXO) => utxo.value)
      .reduce((a, b) => a + b);
    console.log(
      `Address: '${params.walletAddress}' has ${
        utxos.length
      } utxos with value ${this.applyDecimals(totalValue)} BCH.`
    );
    const psbt = new Psbt({ network: this.network, forkCoin: "bch" });
    console.log(utxos)
    for (let i = 0; i < utxos.length; i++) {
      psbt.addInput({
        redeemScript: redeemScript.output,
        hash: utxos[i].txid,
        index: utxos[i].index,
        nonWitnessUtxo: await this.client.getTxHex(utxos[i].txid),
      });
      console.log(
        `- ${i}: utxo id: ${utxos[i].txid}, index: ${utxos[i].index}.`
      );
    }

    const fee = await this.getEstimatedFee(utxos.length, 1);

    if (totalValue - fee <= 0) {
      console.error(
        "The quantity you send must be higher than the minimum fee."
      );
      return;
    }

    console.log(`\nThe fee to be charged is ${this.applyDecimals(fee)} BCH.`);
    console.log(
      `Therefore, the ${this.applyDecimals(
        totalValue - fee
      )} BCH will be withdrawn.`
    );

    psbt.addOutput({
      address: convertToLegacyAddress(params.recipientAddress),
      value: totalValue - fee,
    });

    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, this.accountPriv, [65]);
      psbt.signInput(i, this.backupPriv, [65]);
    }

    const tx = psbt.finalizeAllInputs().extractTransaction();
    const txId = await this.client.send(tx.toHex());
    console.log(
      `Successfully recover BCH from ${params.walletAddress} to ${
        params.recipientAddress
      } with value ${this.applyDecimals(totalValue - fee)} BCH.`
    );
    console.log(`Transaction Id: ${txId}.`);
    return txId;
  }

  private applyDecimals(value: number): number {
    return Number((value * BchRecovery.DECIMALS).toFixed(8));
  }

  private async getEstimatedFee(
    inputNumber: number,
    outputNumber: number
  ): Promise<number> {
    const feeRate = await this.client.getFeeRate(
      BchRecovery.TARGET_CONFIRMATION
    );
    if (feeRate < BchRecovery.MIN_FEE_RATE) {
      return (
        this.getEstimatedBytes(inputNumber, outputNumber) *
        BchRecovery.MIN_FEE_RATE
      );
    }
    return this.getEstimatedBytes(inputNumber, outputNumber) * feeRate;
  }

  private getEstimatedBytes(inputNumber: number, outputNumber: number): number {
    return (
      BchRecovery.BYTES_PER_INPUT * inputNumber +
      BchRecovery.BYTES_PER_OUTPUT * outputNumber
    );
  }

  private decryptECPair(
    keyFile: string,
    password: string
  ): ECPair.ECPairInterface {
    const decryptedKey = this.decrypt(keyFile, password);
    return ECPair.fromPrivateKey(
      Buffer.from(BNConverter.remove0x(decryptedKey), "hex"),
      {
        compressed: true,
        network: this.network,
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

export class BchClient {
  blockchainInfoApi: AxiosInstance;
  fullstackApi: AxiosInstance;
  env: Env;

  constructor(env: Env) {
    let blockchainInfoUrl = "https://api.blockchain.info/haskoin-store/bch-testnet";
    let fullstackApiUrl = "https://tapi.fullstack.cash/v4";
    if (env === Env.Main) {
      blockchainInfoUrl = "https://api.blockchain.info/haskoin-store/bch";
      fullstackApiUrl = "https://api.fullstack.cash/v4";
    }

    this.blockchainInfoApi = axios.create({
      baseURL: blockchainInfoUrl,
    });
    this.fullstackApi = axios.create({
      baseURL: fullstackApiUrl,
    });
    this.env = env;
  }

  public async send(txHex: string): Promise<string> {
    const response = await this.fullstackApi.get(`/rawtransactions/sendRawTransaction/${txHex}`);
    return response.data;
  }

  public async getUTXOs(address: string): Promise<BchUTXO[]> {
    return (await this.blockchainInfoApi.get(`/address/${address}/unspent`)).data as BchUTXO[];
  }

  public async getTxHex(txId: string): Promise<Buffer> {
    return Buffer.from(
      (await this.blockchainInfoApi.get(`/transaction/${txId}/raw`)).data.result,
      "hex"
    );
  }

  public async getFeeRate(targetConfirmation: number): Promise<number> {
    return 1;
  }
}

const convertToLegacyAddress = (address: string) => {
  return cashAddress.toLegacyAddress(address);
};
