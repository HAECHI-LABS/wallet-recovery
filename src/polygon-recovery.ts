import Web3 from "web3";
import { AbiItem } from "web3-utils";
import BN from "bn.js";
import BigDecimal from "big.js"
import { Transaction } from "ethereumjs-tx";
import bep20Abi from "./abi/BEP20.json";
import { BlockchainType, checkNullAndUndefinedParameter, Env, RecoverParams, Recovery, RecoveryOptions } from "./recovery";
import Common from "ethereumjs-common";
import { BNConverter } from "@haechi-labs/henesis-wallet-core";

export class PolygonRecovery extends Recovery {
    private readonly web3: Web3;
    private readonly ethereumJSCommon: Common;

    constructor(options: RecoveryOptions) {
        super(options, BlockchainType.Polygon);
        this.web3 = new Web3(options.host);
        if (options.env === Env.Main) {
            this.ethereumJSCommon = Common.forCustomChain("mainnet", {
                name: 'polygon mainnet',
                networkId: 137,
                chainId: 137
            }, "istanbul");
        } else {
            this.ethereumJSCommon = Common.forCustomChain("ropsten", {
                name: 'polygon testnet',
                networkId: 80001,
                chainId: 80001
            }, "istanbul");
        }
    }

    public async recover(params: RecoverParams) {
        checkNullAndUndefinedParameter(params);
        const totalValue = await this.getBalance(params);
        const valueCalcWithDecimals = new BigDecimal(totalValue.amount).div(new BN(10).pow(new BN(totalValue.decimals)));
        const symbol = params.tokenAddress ? totalValue.symbol : 'MATIC';
        console.log(`\nRecovering ${symbol} from '${params.walletAddress}' to '${params.recipientAddress}'...`);
        console.log(`The address '${params.walletAddress}' has value of ${valueCalcWithDecimals} ${symbol}.`);
        const transactionParams = {
            encodedData: this.walletContract.methods.transferMatic(params.recipientAddress, totalValue.amount).encodeABI(),
            amount: totalValue.amount,
            nonce: await this.getNonce(this.getAccountKeyAddress()),
            randomNonce: this.getRandomNonce()
        }
        const txData = await this.buildMultiSigRawTransaction(params, transactionParams);
        const finalTxData = {
            ...txData,
            gas: 100000,
            gasPrice: BNConverter.decimalStringToBn(await this.web3.eth.getGasPrice()),
        };
        const tx = new Transaction(finalTxData, { common: this.ethereumJSCommon });
        tx.sign(Buffer.from(this.accountPriv.substring(2), 'hex'));
        const serializedTx = tx.serialize();
        const estimateGas = await this.web3.eth.estimateGas({
            from: this.getAccountKeyAddress(),
            to: finalTxData.to,
            data: finalTxData.data
        })
        const sendTx = await this.web3.eth
            .sendSignedTransaction('0x' + serializedTx.toString('hex'));
        const transactionResult = {
            transactionHash: sendTx.transactionHash,
            transactionFee: parseFloat(this.web3.utils.fromWei(finalTxData.gasPrice)) * sendTx.gasUsed,
            status: sendTx.status
        };
        console.log(`The fee to be charged is ${transactionResult.transactionFee} MATIC, and it will be withdrawn from account '${this.getAccountKeyAddress()}'.`);
        console.log(`Successfully recovered ${symbol} from '${params.walletAddress}' to '${params.recipientAddress}' with value of ${valueCalcWithDecimals} ${symbol}.\n`);
        console.log(`The transaction result is \n`);
        console.log(JSON.stringify(transactionResult, null, "\t"));
        console.log(`\n`);
        return sendTx;
    }

    private async getBalance(params: {
        tokenAddress?: string,
        walletAddress: string
    }): Promise<{
        amount: string;
        symbol: string;
        decimals: number
    }> {
        let amount: string, symbol: string, decimals: number = 18;
        const contract = new this.web3.eth.Contract(bep20Abi as AbiItem[], params.tokenAddress);
        if (params.tokenAddress) {
            symbol = await contract.methods.symbol().call();
            decimals = await contract.methods.decimals().call();
            amount = await contract.methods.balanceOf(params.walletAddress).call();
        } else {
            amount = await this.web3.eth.getBalance(params.walletAddress);
        }
        return {
            amount,
            symbol,
            decimals
        };
    }

    private async getNonce(accountKeyAddress): Promise<BN> {
        return this.web3.utils.toBN(await this.web3.eth.getTransactionCount(accountKeyAddress));
    }

    public getAccountKeyAddress(): string {
        return this.web3.eth.accounts.privateKeyToAccount(this.accountPriv).address;
    }

    private getRandomNonce() {
        return this.web3.utils.toBN(this.web3.utils.randomHex(32));
    }
}