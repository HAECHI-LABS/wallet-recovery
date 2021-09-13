import { LtcRecovery } from "../src";
import { Env } from "../src/recovery";

async function main() {
  const recovery = new LtcRecovery({
    accountKeyFile:
      '{"iv":"0UsNc2HMbABHnwHesnqwDg==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"wblLZ7lewe8=","ct":"6eQAr/6jRKgJz+OVTgdEvnuUGObjl3i2tdnCONkOEFCzecAR70yZD8kCKWhg6W1EsKG/TW0I8OhE305n92VGPt6sG+zoaCVV"}',
    backupKeyFile:
      '{"iv":"PGhjO0DSzRBZYkCqsFvFGQ==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"Tvo4J4j9R1E=","ct":"PGTUIjxsv6gW8eUVItqoolEUReqJuMQJVH12ik1pMhUAdlaERjMxtFu88jXuzf8nIqvybcM89mMfp9Mg4mQL/bq7DOE/DK0k"}',
    henesisPubKey:
      "0x03ef30f7eb671ffd414284125e458907a5dfd1520c206fa216088034ce6f50aa8f",
    passphrase: "passphrase",
    env: Env.Main,
  });

  const txHash = await recovery.recover({
    walletAddress: "MBp9DJZVoYpKunzvRRf1nsXDBd5arTPM9Q",
    depositAddressHenesisPubKey:
      "0x03ef30f7eb671ffd414284125e458907a5dfd1520c206fa216088034ce6f50aa8f",
    recipientAddress: "MFUraerDzorrUcEkTkwHNHf1SFKD8zaGTo",
  });

  console.log(txHash);
}

main().catch((err) => {
  console.error(err);
});
