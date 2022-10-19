import {EthfRecovery} from '../src/ethf-recovery';
import {Env} from "../src/recovery";

async function main() {
    const recovery = new EthfRecovery({
        host: 'https://rpc.etherfair.org',
        accountKeyFile: '{"iv":"H4epeJvXarcY9RBbDy09tQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","c ipher":"aes","salt":"65NMVN0unIk=","ct":"/IY0oxRLTxB2csZeGrLJaywiwvtvSXZzK6zhg +HRWGsksPwjGDpghDjK6GhElmakCZ0rZNXk9rnvHTkHdGBWTpxWi3g0gW7Vkqk="}',
        backupKeyFile: '{"iv":"ZevqguXBYGoNdZv4KE2ZIQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":""," cipher":"aes","salt":"WteugHEUCR0=","ct":"NyFXmRvtBkkyncduNQjdz1w2vFhpIF9SBi1JvfUatSB Td4tPKvTTPlcVxB4CZxMzax2SRBAimqlLLSKdI/RsJjSX+A5VT2vDKIs="}',
        passphrase: 'password',
        env: Env.Main // Only using mainnet
    });

    await recovery.recover({
        recipientAddress: '0x13da3a8be6cc271291515dfb65bd2e8ac73175b4', //0x4ff4d2923b9fc88bf5134f82e655443cddacbf90
        walletAddress: '0x4ff4d2923b9fc88bf5134f82e655443cddacbf90', //0x13da3a8be6cc271291515dfb65bd2e8ac73175b4
        // tokenAddress: '0x0d4c27c49906208fbd9a9f3a43c63ccbd089f3bf'
    });
}

main();