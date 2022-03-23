import { PolygonRecovery } from "../src/polygon-recovery";
import { Env } from '../src/recovery';

async function main() {
    const recovery = new PolygonRecovery({
        host: "https://rpc-mumbai.matic.today/",
        accountKeyFile: '{"iv":"fQAhgpoDv1a21Z1bI76fmA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"YYBQPMZdtk0=","ct":"zmYiTi4/FaaH9U0ZjiZ8GWVkmlv4zPi4270v3UuQ73NJUe7ea57n19zoaNOzE029+JoGHNpEhJ0Ukh6SexRYzBnXlfNsBn3aaRg="}',
        backupKeyFile: '{"iv":"kU7iWGAvF6lU92ECNbMLSA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"SzjpCAP1fsg=","ct":"IOQOzFZt5Ys/1VVrMefYhv5CEE/LG2pZomj2KpEnA9gDh3SxvaXAE4LLUDYPV9WURVWD/Bcl8kW7xj1S/fphKje3xcG+JAd1Ssg="}',
        passphrase: "passphrase1!",
        env: Env.Test
    });

    const receipt = await recovery.recover({
        recipientAddress: "0x34e08b813462cace463b2e4aa9c94107b50ffa3c",
        walletAddress: "0x224b16751b3b08be2d4f5a0e72273a05f6a36b15",
    });
    console.log(receipt);
}

main();