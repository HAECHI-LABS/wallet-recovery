import {EthKeyReset} from "../src";
import {Env} from "@haechi-labs/henesis-wallet-core";

async function main() {
    const keyReset = new EthKeyReset({
        accessToken: "accessToken",
        secret: "secret",
        env: Env.Test
    },"nodeEndpoint");
    await keyReset.reset({
        masterWalletId: "masterWalletId",
        passphrase: "password",
        newAccountKeyAddress: "_currentAccountKey",
        newBackupKeyAddress: "_newBackupKey"
    });
}
main()