import {LtcRecovery} from "../src";
import {Env} from "../src/recovery";
import {BchRecovery} from "../src/bch-recovery";

async function main() {
    const recovery = new BchRecovery({
        accountKeyFile:
            '{"iv":"bxIksNPjDicsjtb0OZsE0g==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","ciph er":"aes","salt":"VvRCXju7c6g=","ct":"b3g2c5Xo1ViD/XM8QlzaDkMaCe4dth9/kNRAh7+MP/ h8lNzP9RFq2DKs97rum1lJmgM3Tn/m3qTHSqTnfJ9wqVMyAYI6as4V"}',
        backupKeyFile:
            '{"iv":"plhKzAxQoeTRUTtqf++oXQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","c ipher":"aes","salt":"SvtX4EsJYjk=","ct":"BUcpLBA1Iugn9eUAYp2uigiiB7h/6v8278f1mYe/ t9qUukGvjHba6QrNUfCNhw6b068tzbpF22BDB6GFpfbxitAa5kvcP9rl"}',
        henesisPubKey:
            "0x02987fc26bc019678590ea6c596932318d807dd5fce158b189cd6f526d01cfaaf0",
        passphrase: "password",
        env: Env.Test,
    });

    const txHash = await recovery.recover({
        walletAddress: "bchtest:pq2nhvznrk2rk32tangdqsmk7qk2y0yljg5jr8juht",
        recipientAddress: "bchtest:ppyvxud2ak6549mv7pu75gt3djyff9ge6gexah05qp",
    });

    console.log(txHash);
}

main().catch((err) => {
    console.error(err);
});
