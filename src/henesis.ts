import aesjs from "aes-js";
import { Base64 } from "js-base64";

export function recoverPassphrase(encryptedPassphrase: string, encryptionKey: string): string {
    try {
      const aesCtr = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(encryptionKey)
      );
      const decryptedBytes = aesCtr.decrypt(
        aesjs.utils.hex.toBytes(Base64.decode(encryptedPassphrase))
      );
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch (e) {
      throw new Error("failed to recover passphrase");
    }
  }