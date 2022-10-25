import {EthwRecovery} from '../src/ethw-recovery';
import {Env} from "../src/recovery";

async function main() {
    const recovery = new EthwRecovery({
        host: 'https://mainnet.ethereumpow.org',
        accountKeyFile: '{"iv":"G6+bJ7lmptq/EskMoJF1YA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"FWz93U/j0BQ=","ct":"nLfw7UPecABBjld0rFhQ2dQEAr+7ODqgpe3txZQQkqf09phTiHXcFsy2dBjxXpumr1nGnsfxs33HDqpY/BO/0+Ef/SiXDH7oxUs="}',
        backupKeyFile: '{"iv":"3NNkx3seHPVAEuGdNPV2lw==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"4UlUjbYwggE=","ct":"iDyp3EsjhymnFLxd/ZwBXHeiTYRvy5mAk1t3MSAphsDP2FjvHUjHyXzzeC/sLdLkwHCfBfFX5zIiPCabALZa3lU5RqIGLKFIWMI="}',
        passphrase: 'password1!',
        env: Env.Main // Only using mainnet
    });

    await recovery.recover({
        recipientAddress: '0x13da3a8be6cc271291515dfb65bd2e8ac73175b4', //0x4ff4d2923b9fc88bf5134f82e655443cddacbf90
        walletAddress: '0x4ff4d2923b9fc88bf5134f82e655443cddacbf90', //0x13da3a8be6cc271291515dfb65bd2e8ac73175b4
        amount: '0.12345678',
    });
}

main();