import Web3 from "web3";
import {
    BlockchainType,
    checkNullAndUndefinedParameter,
    Env,
    RecoverParams,
    Recovery,
    RecoveryOptions
} from "./recovery";
import {Transaction} from "ethereumjs-tx";
import BN from "bn.js";
import BigDecimal from "big.js"
import erc20Abi from "./abi/ERC20.json";
import {AbiItem} from "web3-utils";
import { BNConverter } from "@haechi-labs/henesis-wallet-core";

export class EthRecovery extends Recovery {
    private readonly chain: string = "ropsten";
    private readonly web3: Web3;

    constructor(options: RecoveryOptions) {
        super(options, BlockchainType.Ethereum);
        this.web3 = new Web3(options.host);
        if (options.env === Env.Main) {
            this.chain = "mainnet";
        }
    }

    public getAccountKeyAddress(): string {
        return this.web3.eth.accounts.privateKeyToAccount(this.accountPriv).address;
    }

    private async getNonce(accountKeyAddress): Promise<BN> {
        return this.web3.utils.toBN(await this.web3.eth.getTransactionCount(accountKeyAddress));
    }

    private getRandomNonce() {
        return this.web3.utils.toBN(this.web3.utils.randomHex(32));
    }

    async getBalance(params: {
        tokenAddress?: string,
        walletAddress: string
    }) {
        let amount: string, symbol: string, decimals: number = 18;
        const contract = new this.web3.eth.Contract(erc20Abi as AbiItem[], params.tokenAddress);
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

    public async recover(params: RecoverParams) {
        checkNullAndUndefinedParameter(params);
        const totalValue = params.amount; //await this.getBalance(params);
        const decimals  = 6;
        const valueCalcWithDecimals = new BigDecimal(totalValue).div(new BN(10).pow(new BN(decimals)));
        const symbol = params.tokenAddress ? totalValue : 'ETH';
        console.log(`\nRecovering ${symbol} from '${params.walletAddress}' to '${params.recipientAddress}'...`);
        console.log(`The address '${params.walletAddress}' has value of ${valueCalcWithDecimals} ${symbol}.`);
        const transactionParams = {
            encodedData: this.walletContract.methods.transferEth(params.recipientAddress, totalValue).encodeABI(),
            amount: totalValue,
            nonce: await this.getNonce(this.getAccountKeyAddress()),
            randomNonce: this.getRandomNonce()
        }
        const txData = await this.buildMultiSigRawTransaction(params, transactionParams);
        const finalTxData = {
            ...txData,
            gas: 100000,
            gasPrice: BNConverter.decimalStringToBn(await this.web3.eth.getGasPrice())
        };
        const tx = new Transaction(finalTxData, {'chain': this.chain});
        tx.sign(Buffer.from(this.accountPriv.substring(2), 'hex'));
        const serializedTx = tx.serialize();
        const estimateGas = await this.web3.eth.estimateGas({
            from: this.getAccountKeyAddress(),
            to: finalTxData.to,
            data: finalTxData.data
        })
        console.log('estimateGas', estimateGas)
        console.log('accountKey', this.getAccountKeyAddress())
        const sendTx = await this.web3.eth
            .sendSignedTransaction('0x' + serializedTx.toString('hex'));
        const transactionResult = {
            transactionHash: sendTx.transactionHash,
            transactionFee: parseFloat(this.web3.utils.fromWei(finalTxData.gasPrice)) * sendTx.gasUsed,
            status: sendTx.status
        };
        console.log(`The fee to be charged is ${transactionResult.transactionFee} ETH, and it will be withdrawn from account '${this.getAccountKeyAddress()}'.`);
        console.log(`Successfully recovered ${symbol} from '${params.walletAddress}' to '${params.recipientAddress}' with value of ${valueCalcWithDecimals} ${symbol}.\n`);
        console.log(`The transaction result is \n`);
        console.log(JSON.stringify(transactionResult, null, "\t"));
        console.log(`\n`);
        return sendTx;
    }
}
