import {SDK, SDKOptions} from "@haechi-labs/henesis-wallet-core";

export interface KeyResetParams {
    masterWalletId: string;
    passphrase: string;
    newAccountKeyAddress: string;
    newBackupKeyAddress: string;
}

export abstract class KeyReset {
    protected sdk: SDK;

    protected constructor(options: SDKOptions) {
        this.sdk = new SDK(options);
    }

    public abstract reset(params: KeyResetParams);
}