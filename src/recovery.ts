import sjcl from "@haechi-labs/henesis-wallet-core/lib/eth/eth-core-lib/sjcl";
import hash from "@haechi-labs/henesis-wallet-core/lib/eth/eth-core-lib/hash";
import {BNConverter, encodeSignature, RecoveryUtils} from "./utils/common";
import Web3 from "web3";
import elliptic from "elliptic";
import BN from "bn.js";
import _ from "lodash";
import walletAbi from "./abi/Wallet.json";
import erc20Abi from "./abi/ERC20.json";
import {Contract} from "web3-eth-contract";
import {AbiItem} from "web3-utils";

export enum BlockchainType {
    Ethereum = "ETHEREUM",
    Klaytn = "KLAYTN",
    BinanceSmartChain = "BINANCE_SMART_CHAIN"
}

export const enum Env {
    Test = "testnet",
    Main = "mainnet",
}

export interface Key {
    address?: string;
    pub: string;
    keyFile?: string;
}

export interface RecoveryOptions {
    host: string;
    accountKeyFile: string;
    backupKeyFile: string;
    passphrase: string;
    env?: string;
}

export interface RecoverParams {
    tokenAddress?: string;
    walletAddress: string;
    recipientAddress: string;
}

export interface TransactionParams {
    encodedData: string;
    amount: string;
    nonce: BN;
    randomNonce: BN;
}

export interface MultiSigPayload {
    walletAddress: string;
    toAddress: string;
    value: BN;
    walletNonce: BN;
    hexData: string;
}

export function checkNullAndUndefinedParameter(requiredParams: object): void {
    Object.entries(requiredParams).forEach((o) => {
        if (_.isUndefined(o[1])) {
            throw new Error(`${o[0]} is undefined`);
        }
        if (_.isNull(o[1])) {
            throw new Error(`${o[0]} is null`);
        }
        if (_.isNaN(o[1])) {
            throw new Error(`${o[0]} is NaN`);
        }
        if (_.isPlainObject(o[1])) {
            checkNullAndUndefinedParameter(_.fromPairs(o));
        }
    });
}

export abstract class Recovery {
    protected readonly keychains: Keychains;
    protected readonly accountPriv: string;
    protected readonly backupPriv: string;
    protected readonly walletContract: Contract;
    protected readonly erc20Contract: Contract;
    protected readonly blockchain: BlockchainType;

    protected constructor(options: RecoveryOptions, blockchain: BlockchainType) {
        checkNullAndUndefinedParameter(options);
        this.blockchain = blockchain;
        this.keychains = new Keychains(this.blockchain);
        this.accountPriv = this.keychains.decrypt({
            keyFile: options.accountKeyFile,
            pub: null
        }, options.passphrase);
        this.backupPriv = this.keychains.decrypt({
            keyFile: options.backupKeyFile,
            pub: null
        }, options.passphrase);
        this.walletContract = new new Web3().eth.Contract(walletAbi as AbiItem[]);
        this.erc20Contract = new new Web3().eth.Contract(erc20Abi as AbiItem[]);
    }

    protected async buildMultiSigRawTransaction(params: RecoverParams, transactionParams: TransactionParams) {
        let hexTokenData, toAddress;
        if (params.tokenAddress) {
            hexTokenData = this.erc20Contract.methods.transfer(params.recipientAddress, transactionParams.amount).encodeABI();
            toAddress = params.tokenAddress;
        } else {
            hexTokenData = transactionParams.encodedData;
            toAddress = params.walletAddress;
        }
        const multiSigPayload = {
            hexData: hexTokenData,
            walletNonce: transactionParams.randomNonce,
            value: BNConverter.hexStringToBN("0x0"),
            toAddress: toAddress,
            walletAddress: params.walletAddress,
        };
        const signature = await this.keychains.signPayload({
            multiSigPayload: multiSigPayload,
            privateKey: this.backupPriv
        });
        const hexData = this.walletContract.methods.multiSigCall(
            signature,
            multiSigPayload.walletAddress,
            multiSigPayload.toAddress,
            multiSigPayload.value,
            multiSigPayload.walletNonce,
            multiSigPayload.hexData
        ).encodeABI();
        return {
            "to": multiSigPayload.walletAddress,
            "nonce": transactionParams.nonce,
            "value": BNConverter.hexStringToBN("0x0"),
            "data": hexData
        };
    }
}

export class Keychains {
    private readonly utils: RecoveryUtils;
    private readonly blockchain: BlockchainType;
    private readonly secp256k1: elliptic;

    constructor(blockchain: BlockchainType) {
        this.utils = new RecoveryUtils();
        this.blockchain = blockchain;
        this.secp256k1 = new elliptic.ec("secp256k1");
    }

    private blockchainPrefix(blockchain: BlockchainType): string {
        const keys = Object.keys(BlockchainType).filter(
            (x) => BlockchainType[x] == blockchain
        );
        return keys.length > 0 ? keys[0] : null;
    }

    private payloadToPrefixedMessage(hexPayload: string): Buffer {
        const hashedPayload = hash.keccak256(hexPayload);
        const payloadBuffer = Buffer.from(hashedPayload.slice(2), "hex");
        const preambleBuffer = Buffer.from(
            `\u0019${this.blockchainPrefix(this.blockchain)} Signed Message:\n${
                payloadBuffer.length
            }`
        );
        return Buffer.concat([preambleBuffer, payloadBuffer]);
    }

    public async signPayload(params: {
        multiSigPayload: MultiSigPayload;
        privateKey: string;
    }) {
        const payload = `0x${params.multiSigPayload.walletAddress
            .toLowerCase()
            .slice(2)}${params.multiSigPayload.toAddress.toLowerCase()
            .slice(2)}${this.utils.pad(32, this.utils.fromNat(`0x${params.multiSigPayload.value.toString(16)}`))
            .slice(2)}${this.utils.pad(32, this.utils.fromNat(`0x${params.multiSigPayload.walletNonce.toString(16)}`))
            .slice(2)}${params.multiSigPayload.hexData.slice(2)}`;
        const hashedMessage = hash.keccak256(this.payloadToPrefixedMessage(payload));
        const signature = this.secp256k1
            .keyFromPrivate(Buffer.from(params.privateKey.slice(2), "hex"))
            .sign(Buffer.from(hashedMessage.slice(2), "hex"), {canonical: true});
        return encodeSignature([
            this.utils.fromString(this.utils.fromNumber(27 + signature.recoveryParam)),
            this.utils.pad(32, this.utils.fromNat(`0x${signature.r.toString(16)}`)),
            this.utils.pad(32, this.utils.fromNat(`0x${signature.s.toString(16)}`)),
        ]);
    }

    decrypt(key: Key, password: string): string {
        try {
            return sjcl.decrypt(password, key.keyFile);
        } catch (error) {
            if (error.message.includes("ccm: tag doesn't match")) {
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