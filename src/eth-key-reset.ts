import {KeyReset, KeyResetParams} from "./key-reset";
import {Env, SDKOptions} from "@haechi-labs/henesis-wallet-core";
import BN from "bn.js";
import {EthMasterWallet, EthTransaction} from "@haechi-labs/henesis-wallet-core/lib/eth/wallet";
import {AbiItem} from "web3-utils";
import Web3 from "web3";
import {Contract} from "web3-eth-contract";
import MasterWalletAbi from "./abi/IHenesisMasterWallet.json";

export class EthKeyReset extends KeyReset {
    private ETH_WALLET_REGISTRY_RECOVER_FUNCTION_PARAMETERS: AbiItem = {
        name: 'recover',
        type: 'function',
        inputs: [{type: 'address', name: '_newAccountKey'}, {type: 'address', name: '_newBackupKey'}]
    };
    private web3: Web3;

    constructor(options: SDKOptions, endpointUrl: string) {
        super(options);
        this.web3 = new Web3(endpointUrl);
    }

    public async reset(params: KeyResetParams) {
        const wallet: EthMasterWallet = await this.sdk.eth.wallets.getMasterWallet(params.masterWalletId);

        //build "WalletRegistry.recover(newAccountKeyAddress,newBackupKeyAddress)" function call data
        const AbiCoder = require('web3-eth-abi');
        const data: string = AbiCoder.encodeFunctionCall(
            this.ETH_WALLET_REGISTRY_RECOVER_FUNCTION_PARAMETERS,
            [params.newAccountKeyAddress, params.newBackupKeyAddress]
        );
        const contract: Contract = new this.web3.eth.Contract(MasterWalletAbi as AbiItem[], wallet.getAddress());
        const registryContractAddress: string = await contract.methods.registry().call();
        const transaction: EthTransaction = await wallet.contractCall(registryContractAddress, new BN(0), data, params.passphrase);
        console.log(`key replace transaction is sent. tx hash:${transaction.hash}`);
    }
}