import {
  BNConverter,
  checkNullAndUndefinedParameter,
} from "@haechi-labs/henesis-wallet-core";
import { ECPair, Network, Payment, payments, Psbt } from "bitcoinjs-lib";
import sjcl = require("@haechi-labs/henesis-wallet-core/lib/eth/eth-core-lib/sjcl");
import axios, { AxiosInstance, AxiosStatic } from "axios";
import { Env } from "./recovery";

export interface LtcRecoveryOptions {
  accountKeyFile: string;
  backupKeyFile: string;
  henesisPubKey: string;
  passphrase: string;
  env: Env;
}

export interface LtcUTXO {
  txid: string;
  vout: number;
  satoshis: number;
}

export interface LtcRecoverParams {
  walletAddress: string;
  depositAddressHenesisPubKey?: string;
  recipientAddress: string;
}

// copied from https://github.com/bitcoinjs/bitcoinjs-lib/pull/1095/files
export const litecoinMainnet: Network = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

export const litecoinTestnet: Network = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  // copied from https://github.com/litecoin-project/litecore-lib/blob/segwit/lib/networks.js#L155
  bip32: {
    public: 0x0436f6e1,
    private: 0x0436ef7d,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0x3a,
  wif: 0xef,
};

export class LtcRecovery {
  private static readonly BYTES_PER_INPUT = 148;
  private static readonly BYTES_PER_OUTPUT = 34;
  private static readonly MIN_FEE_RATE = 2.5;
  private static readonly TARGET_CONFIRMATION = 2;
  private static readonly DECIMALS = 0.00000001;

  private readonly accountPriv: ECPair.ECPairInterface;
  private readonly backupPriv: ECPair.ECPairInterface;
  private readonly network: Network;
  private readonly client: LtcClient;
  private readonly redeemScript: Payment;

  constructor(options: LtcRecoveryOptions) {
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
    this.network = options.env == Env.Main ? litecoinMainnet : litecoinTestnet;
    this.client = new LtcClient(options.env);
  }

  public async recover(params: LtcRecoverParams) {
    checkNullAndUndefinedParameter(params);
    console.log(
      `\nRecovering LTC from ${params.walletAddress} to ${params.recipientAddress}.`
    );
    const utxos: LtcUTXO[] = await this.client.getUTXOs(params.walletAddress);
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
      .map((utxo: LtcUTXO) => utxo.satoshis)
      .reduce((a, b) => a + b);
    console.log(
      `Address: '${params.walletAddress}' has ${
        utxos.length
      } utxos with value ${this.applyDecimals(totalValue)} LTC.`
    );
    const psbt = new Psbt({ network: this.network });
    for (let i = 0; i < utxos.length; i++) {
      psbt.addInput({
        redeemScript: redeemScript.output,
        hash: utxos[i].txid,
        index: utxos[i].vout,
        nonWitnessUtxo: await this.client.getTxHex(utxos[i].txid),
      });
      console.log(
        `- ${i}: utxo id: ${utxos[i].txid}, index: ${utxos[i].vout}.`
      );
    }

    const fee = await this.getEstimatedFee(utxos.length, 1);

    if (totalValue - fee <= 0) {
      console.error(
        "The quantity you send must be higher than the minimum fee."
      );
      return;
    }

    console.log(`\nThe fee to be charged is ${this.applyDecimals(fee)} LTC.`);
    console.log(
      `Therefore, the ${this.applyDecimals(
        totalValue - fee
      )} LTC will be withdrawn.`
    );

    psbt.addOutput({
      address: params.recipientAddress,
      value: totalValue - fee,
    });

    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, this.accountPriv);
      psbt.signInput(i, this.backupPriv);
    }

    const tx = psbt.finalizeAllInputs().extractTransaction();
    const txId = await this.client.send(tx.toHex());
    console.log(
      `Successfully recover LTC from ${params.walletAddress} to ${
        params.recipientAddress
      } with value ${this.applyDecimals(totalValue - fee)} LTC.`
    );
    console.log(`Transaction Id: ${txId}.`);
    return txId;
  }

  private applyDecimals(value: number): number {
    return Number((value * LtcRecovery.DECIMALS).toFixed(8));
  }

  private async getEstimatedFee(
    inputNumber: number,
    outputNumber: number
  ): Promise<number> {
    const feeRate = await this.client.getFeeRate(
      LtcRecovery.TARGET_CONFIRMATION
    );
    if (feeRate < LtcRecovery.MIN_FEE_RATE) {
      return (
        this.getEstimatedBytes(inputNumber, outputNumber) *
        LtcRecovery.MIN_FEE_RATE
      );
    }
    return this.getEstimatedBytes(inputNumber, outputNumber) * feeRate;
  }

  private getEstimatedBytes(inputNumber: number, outputNumber: number): number {
    return (
      LtcRecovery.BYTES_PER_INPUT * inputNumber +
      LtcRecovery.BYTES_PER_OUTPUT * outputNumber
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

export class LtcClient {
  litecore: AxiosInstance;
  sochain: AxiosInstance;
  env: Env;

  constructor(env: Env) {
    let axiosBaseURL = "https://testnet.litecore.io/api";
    if (env === Env.Main) {
      axiosBaseURL = "https://insight.litecore.io/api";
    }

    this.litecore = axios.create({
      baseURL: axiosBaseURL,
    });
    this.sochain = axios.create({
      baseURL: "https://chain.so/api/v2",
    });
    this.env = env;
  }

  // axios prints "litecoin insufficient priority 66 -26" error
  public async sendUsingAxios(txHex: string): Promise<string> {
    return (
      await this.litecore.post(
        `/tx/send`,
        {
          rawtx: txHex,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    ).data;
  }

  public async send(txHex: string): Promise<string> {
    let network = "";
    if (this.env == Env.Main) {
      network = "LTC";
    } else if (this.env == Env.Test) {
      network = "LTCTEST";
    }

    const response = await this.sochain.post(`/send_tx/${network}`, {
      tx_hex: txHex,
    });
    return response.data.data.txid;
  }

  public async getUTXOs(address: string): Promise<LtcUTXO[]> {
    return (await this.litecore.get(`/addr/${address}/utxo`)).data as LtcUTXO[];
  }

  public async getTxHex(txId: string): Promise<Buffer> {
    return Buffer.from(
      (await this.litecore.get(`/rawtx/${txId}`)).data.rawtx,
      "hex"
    );
  }

  public async getFeeRate(targetConfirmation: number): Promise<number> {
    const results = (await this.litecore.get(`/utils/estimatefee`)).data;
    const feeRate = results[targetConfirmation];
    if (feeRate == null) {
      return 0;
    }
    return feeRate;
  }
}
