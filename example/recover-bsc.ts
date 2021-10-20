import { BscRecovery } from "../src/bsc-recovery";
import { Env } from '../src/recovery';

async function main() {
    const recovery = new BscRecovery({
        host: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        accountKeyFile: '{"iv":"xQROYFmGOzK1pNB5hEjB6g==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"RWEyXMj0Mc0=","ct":"wIA/nF0kJ8zErj3Q7qrE0uGbFPyIEYPRRYL+K5swgc4oWcz2Oxtlw7d1/OlqRokTJAhvRFYJ342ui3qDSir+HbTMLsaVziECucw="}',
        backupKeyFile: '{"iv":"kEmtkqX4talQDOhyWXJckA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"jBs385GnWp0=","ct":"UQMB5A2ixhZZpN04wZPV1PKkYyPOmmL1jdtnkcKjsih96upCUISVZF7gl0OW5j5ah6nJRk5I5VB0UwH/IXGniora733gSOvzCTs="}',
        passphrase: 'passphrase',
        env: Env.Test
    });

    const receipt = await recovery.recover({
        recipientAddress: "0x7667f0085E853a53f4227703aa6710f526176d0E",
        walletAddress: "0x5369ffac48fbf1c2e72c3012114ab254c49f973e",
    });
    console.log(receipt);
}

main();