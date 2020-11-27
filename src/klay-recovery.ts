import Caver from "caver-js";
import {BlockchainType, checkNullAndUndefinedParameter, RecoverParams, Recovery, RecoveryOptions} from "./recovery";
import BN from "bn.js";
import BigDecimal from "big.js"
import erc20Abi from "./abi/ERC20.json";
import {AbiItem} from "web3-utils";

export class KlayRecovery extends Recovery {
    private readonly caver: Caver;

    constructor(options: RecoveryOptions) {
        super(options, BlockchainType.Klaytn);
        this.caver = new Caver(options.host);
    }

    public getAccountKeyAddress(): string {
        return this.caver.klay.accounts.privateKeyToAccount(this.accountPriv).address;
    }

    private async getNonce(accountKeyAddress): Promise<BN> {
        return this.caver.utils.toBN(await this.caver.klay.getTransactionCount(accountKeyAddress));
    }

    private getRandomNonce() {
        return this.caver.utils.toBN(this.caver.utils.randomHex(32));
    }

    async getBalance(params: {
        tokenAddress?: string,
        walletAddress: string
    }) {
        let amount: string, symbol: string, decimals: number = 18;
        const contract = new this.caver.klay.Contract(erc20Abi as AbiItem[], params.tokenAddress);
        if (params.tokenAddress) {
            symbol = await contract.methods.symbol().call();
            decimals = await contract.methods.decimals().call();
            amount = await contract.methods.balanceOf(params.walletAddress).call();
        } else {
            amount = await this.caver.klay.getBalance(params.walletAddress);
        }
        return {
            amount,
            symbol,
            decimals
        };
    }

    public async recover(params: RecoverParams) {
        checkNullAndUndefinedParameter(params);
        const totalValue = await this.getBalance(params);
        const valueCalcWithDecimals = new BigDecimal(totalValue.amount) / (10 ** totalValue.decimals);
        const symbol = params.tokenAddress ? totalValue.symbol : 'KLAY';
        console.log(`\nRecovering ${symbol} from '${params.walletAddress}' to '${params.recipientAddress}'...`);
        console.log(`The address '${params.walletAddress}' has value of ${valueCalcWithDecimals} ${symbol}.`);
        const transactionParams = {
            encodedData: this.walletContract.methods.transferKlay(params.recipientAddress, totalValue.amount).encodeABI(),
            amount: totalValue.amount,
            nonce: await this.getNonce(this.getAccountKeyAddress()),
            randomNonce: this.getRandomNonce()
        }
        const txData = await this.buildMultiSigRawTransaction(params, transactionParams);
        const finalTxData = {
            ...txData,
            gas: 850000,
            from: this.getAccountKeyAddress()
        };
        const signTx = await this.caver.klay.accounts.signTransaction(finalTxData, this.accountPriv);
        const sendTx = await this.caver.klay.sendSignedTransaction(signTx);
        const transactionResult = {
            transactionHash: sendTx.transactionHash,
            transactionFee: parseFloat(this.caver.utils.fromPeb(25000000000)) * sendTx.gasUsed,
            status: sendTx.status
        };
        console.log(`The fee to be charged is ${transactionResult.transactionFee} KLAY, and it will be withdrawn from account '${this.getAccountKeyAddress()}'.`);
        console.log(`Successfully recovered ${symbol} from '${params.walletAddress}' to '${params.recipientAddress}' with value of ${valueCalcWithDecimals} ${symbol}.\n`);
        console.log(`The transaction result is \n`);
        console.log(JSON.stringify(transactionResult, null, "\t"));
        console.log(`\n`);
        return sendTx;
    }
}

