import { PolygonRecovery } from "../src/polygon-recovery";
import { Env } from "../src/recovery";

function main() {
    const recovery = new PolygonRecovery({
        host: "https://rpc-mumbai.matic.today/",
        accountKeyFile: '{"iv":"fQAhgpoDv1a21Z1bI76fmA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"YYBQPMZdtk0=","ct":"zmYiTi4/FaaH9U0ZjiZ8GWVkmlv4zPi4270v3UuQ73NJUe7ea57n19zoaNOzE029+JoGHNpEhJ0Ukh6SexRYzBnXlfNsBn3aaRg="}',
        backupKeyFile: '{"iv":"kU7iWGAvF6lU92ECNbMLSA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"SzjpCAP1fsg=","ct":"IOQOzFZt5Ys/1VVrMefYhv5CEE/LG2pZomj2KpEnA9gDh3SxvaXAE4LLUDYPV9WURVWD/Bcl8kW7xj1S/fphKje3xcG+JAd1Ssg="}',
        passphrase: "passphrase1!",
        env: Env.Test
    });
    console.log(recovery.getAccountKeyAddress());
}

main();