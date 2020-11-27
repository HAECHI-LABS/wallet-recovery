import {KlayRecovery} from "../src/klay-recovery";

function main() {
    const recovery = new KlayRecovery({
        host: 'https://api.baobab.klaytn.net:8651/',
        accountKeyFile: '{"iv":"h0kKsWaOr6pMTQSNjebtJg==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"BNnG5+9zWJw=","ct":"dZanHdu4/L3GLepA8C+YfofllBuNrCD7DbBu4MlLXnfat0BljItL8Zkhq4iTzRcRb5IWnda3FKuxuCc+WhOyZUre8QtViVYeLos="}',
        backupKeyFile: '{"iv":"Z92+TxK9ABtLD2Y2eus0eQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"kUfRnhXcrdY=","ct":"BA7F/LRVVUBg9A0bxxsmZ5STYV8fNRpaEail2Qxg0zMI2l8XXwWf1SI3MJxlZsjMpDLZCz5giMTP2aXY0cPnI9tV+n/rslK2FYc="}',
        passphrase: 'Fhrmdls7!!'
    });
    console.log(recovery.getAccountKeyAddress());
}

main();