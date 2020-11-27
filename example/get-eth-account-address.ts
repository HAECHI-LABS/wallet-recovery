import {EthRecovery} from "../src/eth-recovery";
import {Env} from '../src/recovery';

function main() {
    const recovery = new EthRecovery({
        host: 'https://ropsten.infura.io/v3/e0045a11b5e64a5b97dca82c816a2d1d',
        accountKeyFile: '{"iv":"H4epeJvXarcY9RBbDy09tQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","c ipher":"aes","salt":"65NMVN0unIk=","ct":"/IY0oxRLTxB2csZeGrLJaywiwvtvSXZzK6zhg +HRWGsksPwjGDpghDjK6GhElmakCZ0rZNXk9rnvHTkHdGBWTpxWi3g0gW7Vkqk="}',
        backupKeyFile: '{"iv":"ZevqguXBYGoNdZv4KE2ZIQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":""," cipher":"aes","salt":"WteugHEUCR0=","ct":"NyFXmRvtBkkyncduNQjdz1w2vFhpIF9SBi1JvfUatSB Td4tPKvTTPlcVxB4CZxMzax2SRBAimqlLLSKdI/RsJjSX+A5VT2vDKIs="}',
        passphrase: 'password',
        env: Env.Test
    });
    console.log(recovery.getAccountKeyAddress());
}

main();