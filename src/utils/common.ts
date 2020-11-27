import _ from "lodash";
import BN from "bn.js";

const flatten = (a) => `0x${a.reduce((r, s) => r + s.slice(2), '')}`;

export const encodeSignature = ([v, r, s]) => flatten([r, s, v]);

export class BNConverter {
    static remove0x(hexString: string): string {
        if (hexString.length > 2 && hexString.substring(0, 2) == "0x") {
            return hexString.substring(2);
        }
        return hexString;
    }

    static hexStringToBN(hexString: string) {
        if (
            _.isEmpty(hexString) ||
            ["undefined", "null"].some((nil) => nil === hexString)
        ) {
            return new BN(0);
        }
        if (!hexString.startsWith("0x")) {
            throw new Error(
                `invalid hex string format${
                    !_.isEmpty(hexString) ? `: ${hexString}` : ""
                }`
            );
        }

        return new BN(this.remove0x(hexString), 16);
    }
}

export class RecoveryUtils {
    fromNat(bn) {
        return bn === '0x0' ? '0x' : bn.length % 2 === 0 ? bn : `0x0${bn.slice(2)}`;
    }

    pad(l, hex) {
        return hex.length === l * 2 + 2 ? hex : this.pad(l, `${'0x' + '0'}${hex.slice(2)}`);
    }

    fromString(str) {
        const bn = `0x${(str.slice(0, 2) === "0x"
                ? new BN(str.slice(2), 16)
                : new BN(str, 10)
        ).toString("hex")}`;
        return bn === "0x0" ? "0x" : bn;
    };

    fromNumber(num) {
        const hex = num.toString(16);
        return hex.length % 2 === 0 ? `0x${hex}` : `0x0${hex}`;
    };

    encodeSignature([v, r, s]) {
        this.flatten([r, s, v]);
    }

    flatten = (a) => `0x${a.reduce((r, s) => r + s.slice(2), '')}`;
}