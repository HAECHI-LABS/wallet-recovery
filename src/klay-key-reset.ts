import {KeyReset, KeyResetParams} from "./key-reset";
import {Env, SDKOptions} from "@haechi-labs/henesis-wallet-core";
import BN from "bn.js";
import {EthMasterWallet, EthTransaction} from "@haechi-labs/henesis-wallet-core/lib/eth/wallet";
import {AbiItem} from "web3-utils";
import Caver from "caver-js";
import {Contract} from "web3-eth-contract";
import MasterWalletAbi from "./abi/IHenesisMasterWallet.json";

export class KlayKeyReset extends KeyReset {
    private KLAY_WALLET_REGISTRY_RECOVER_FUNCTION_PARAMETERS: AbiItem = {
        name: 'recover',
        type: 'function',
        inputs: [{type: 'address', name: '_newAccountKey'}, {type: 'address', name: '_newBackupKey'}]
    };
    private caver: Caver;

    constructor(options: SDKOptions, endpointUrl: string) {
        super(options);
        this.caver = new Caver(endpointUrl);
    }

    public async reset(params: KeyResetParams) {
        const wallet: EthMasterWallet = await this.sdk.klay.wallets.getMasterWallet(params.masterWalletId);
        wallet.getAccountKey().address
        //build "WalletRegistry.recover(newAccountKeyAddress,newBackupKeyAddress)" function call data
        const AbiCoder = require('web3-eth-abi');
        const data: string = AbiCoder.encodeFunctionCall(
            this.KLAY_WALLET_REGISTRY_RECOVER_FUNCTION_PARAMETERS,
            [params.newAccountKeyAddress, params.newBackupKeyAddress]
        );
        const contract: Contract = new this.caver.klay.Contract(MasterWalletAbi as AbiItem[], wallet.getAddress());
        const masterWalletContractAddress: string = await contract.methods.registry().call();

        const transaction: EthTransaction = await wallet.contractCall(masterWalletContractAddress, new BN(0), data, params.passphrase);
        console.log(`key replace transaction is sent. tx hash:${transaction.hash}`);
    }
}