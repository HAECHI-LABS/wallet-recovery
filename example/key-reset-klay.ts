import {KlayKeyReset} from "../src";
import {Env} from "@haechi-labs/henesis-wallet-core";

async function main() {
    const keyReset = new KlayKeyReset({
        accessToken: "token",
        secret: "secret",
        env: Env.Test
    },"");
    await keyReset.reset({
        masterWalletId: "7fbc528b893c57f9a3c06979b6c9ff67",
        passphrase: "password",
        newAccountKeyAddress: "_newAccountKey",
        newBackupKeyAddress: "_newBackupKey"
    });
}