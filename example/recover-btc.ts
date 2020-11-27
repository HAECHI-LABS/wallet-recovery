import {BtcRecovery} from '../src';
import {Env} from "../src/recovery";

async function main() {
  const recovery = new BtcRecovery({
    accountKeyFile: '{"iv":"yxxchJ9neFnIbs20cDM3gA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","ci pher":"aes","salt":"LyHTpP/fFpo=","ct":"aLPKlPSNinvesTb1Q8PHQ9vZ528ijEpgNkR5IDspOQmV GP4J9HHFiEt9tGfFXG8zSwsIIf8dp/LewXktMaYhcemMKIuM3r3E"}',
    backupKeyFile: '\n' +
      '{"iv":"xd50qD3eWH4TMkwIZhIgaA==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":""," cipher":"aes","salt":"LgnYPruIEIo=","ct":"Z4BQBD/ L7X3h7iPCMNzyScHNE8SmaqpGWy1LwxXTvFhQnZvFLiqNCX1Q8so8Ldra +DFqjbgbmbtDHOoMUWRd5OeGXinCXAM+"}',
    henesisPubKey: "0x0233d144a513eb7eb0a963c88557d76a921a32bb1033e01a2392fc73aa828f65f3",
    passphrase: "password",
    env: Env.Test
  });

  const txId = await recovery.recover({
    walletAddress: "2N77eQXo2C2HYFMnmFMvu5AYdaZUzteZb5K",
    depositAddressHenesisPubKey: "0x0233d144a513eb7eb0a963c88557d76a921a32bb1033e01a2392fc73aa828f65f3",
    recipientAddress: "2N4sg1AxZsbfqAXtB88wAowgmPjhcEu6AXC"
  });

  console.log(txId);
}

main();