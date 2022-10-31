# Henesis Wallet Recovery Tool
 본 도구는 고객이 유사시에 Henesis 시스템을 통하지 않고도 Henesis 지갑으로부터 코인을 출금할 수 있도록 지원하기 위해 만들어졌습니다.
 
 코인을 출금하기 위해서는 해당 마스터 지갑 생성시 다운로드 받았던 복구 키트(Recovery Kit) PDF 파일이 필요합니다.
 
 Henesis의 마스터 지갑은 2-of-3 Multisig 지갑이므로, 복구 키트에 적혀있는 Account Key, Backup Key를 활용하면 Henesis API 호출 없이도 코인을 출금할 수 있습니다.
 
## Requirements
- Node >= v10.15.3

## 설치 방법
```shell
$ npm i @haechi-labs/wallet-recovery
```

## 이더리움, 클레이튼, 바이낸스 스마트 체인, 폴리곤 코인 출금 방법
EthRecovery, KlayRecovery, BscRecovery, PolygonRecovery class 를 활용하여 이더리움/클레이튼/바이낸스 스마트 체인/폴리곤 코인을 출금할 수 있습니다.
```javascript
import {EthRecovery} from '@haechi-labs/wallet-recovery';
import { SDK } from "@haechi-labs/henesis-wallet-core";
const sdk = new SDK({
  accessToken: 'Henesis Access Token',
  secret: 'Henesis Secret'
});
const recovery = new EthRecovery({
  host: '블록체인 노드(ex. Infura)의 URL endpoint',
  accountKeyFile: '복구 키트 PDF의 A 영역 Account Key Data' // example '{"iv":"4cAzFHxoTs3r2dP9kFTtyw==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lc+7qEzXcDM=","ct":"x6Mbt9paLIV/pwZFSGxRNSx+zZOBu8euRieMeW2+ZGs8n/AaT9FI+1b519Otogbm3Zo4pM/aeNBrBg2rP97AfOJO8Ngob+9gY4g="}'
  backupKeyFile: '복구 키트 PDF의 B 영역 Backup Key Data' // example '{"iv":"UdhntWT/HWXrn8ctyQZHCw==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"cvy5+5YIiLU=","ct":"Pcg9r2hfgUWblPm/6s9gqITHNuv5hYcVIJJfjeDYIJWpSUCIB9JstJ5bRPWux2qCoWNWlZhoCh9vBlXwMtwnx/kFtZmfxmjCiwc="}'
  passphrase: '마스터 지갑 비밀번호',
  wallet: await sdk.eth.wallets.getWallet('출금하려는 지갑의 id'),
  dArea: '복구 키트 PDF의 D 영역',
  env: Env.Test // 테스트넷일 경우 Env.Test, 메인넷일 경우 Env.Main
});
```
출금 트랜잭션은 Account Key(EOA) 주소에서 발생시키므로 Account Key에 트랜잭션을 발생시킬 수 있도록 수수료(가스비) ETH/KLAY/BNB를 입금해야 합니다.

Account Key의 address는 아래와 같이 얻을 수 있습니다.
```javascript
console.log(recovery.getAccountKeyAddress());
```
위에서 출력된 주소로 ETH/KLAY/BNB를 입금한 후 recover 함수를 통해 recovery address로 출금을 진행합니다.

ERC20/KCT7/BEP20 토큰인 경우에는 tokenAddress에 해당 토큰 컨트랙트 주소를 넣으면 됩니다. tokenAddress에 값을 입력하지 않을 경우, 토큰이 아니라고 판단하여 ETH/KLAY/BNB가 출금됩니다.
```javascript
const hash = await recovery.recover({
  recipientAddress: "받는 주소",
  walletAddress: "출금하려는 마스터 지갑 주소 또는 사용자 지갑 주소",
  tokenAddress: "0x12313" // ERC20/KCT/BEP20 토큰을 출금하는 경우에만 입력하며, ETH/KLAY/BNB를 출금하는 경우에는 생략
});
console.log(hash);
```

** The Merge 하드포크 이후로 스플릿 된 ETHW, ETHF 의 경우도 위의 방법과 동일하게 코인 출금 진행하면 됩니다.  

## 비트코인, 비트코인 캐시, 라이트코인 코인 복구 과정
BtcRecovery, LtcRecovery class를 활용하여 비트코인을 출금할 수 있습니다.
```javascript
import {BtcRecovery} from '@haechi-labs/wallet-recovery';
const recovery = new BtcRecovery({
  accountKeyFile: '복구 키트 PDF의 A 영역 Account Key Data' // example '{"iv":"4cAzFHxoTs3r2dP9kFTtyw==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lc+7qEzXcDM=","ct":"x6Mbt9paLIV/pwZFSGxRNSx+zZOBu8euRieMeW2+ZGs8n/AaT9FI+1b519Otogbm3Zo4pM/aeNBrBg2rP97AfOJO8Ngob+9gY4g="}'
  backupKeyFile: '복구 키트 PDF의 B 영역 Backup Key Data' // example '{"iv":"UdhntWT/HWXrn8ctyQZHCw==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"cvy5+5YIiLU=","ct":"Pcg9r2hfgUWblPm/6s9gqITHNuv5hYcVIJJfjeDYIJWpSUCIB9JstJ5bRPWux2qCoWNWlZhoCh9vBlXwMtwnx/kFtZmfxmjCiwc="}'
  henesisPubKey: '복구 키트 PDF의 C 영역 Henesis Key Data',
  passphrase: '마스터 지갑 비밀번호',
  env: Env.Test // 테스트넷일 경우 Env.Test, 메인넷일 경우 Env.Main
});
```
비트코인의 경우 출금시 출금하는 금액에서 수수료가 차감되기 때문에 이더리움/클레이튼과 같이 따로 수수료를 입금할 필요가 없습니다.

실시간 적정 출금 수수료는 blockstream.info에서 제공하는 API를 사용하였으며, 현 시점으로부터 2 confirmation 안에 채굴 될 수 있도록 수수료를 책정합니다.
```javascript
const hash = await recovery.recover({
  recipientAddress: "받는 주소",
  walletAddress: "출금하려는 마스터 지갑 주소 또는 입금 주소",
  depositAddressHenesisPubKey: "입금 주소에서 출금하고자 하는 경우, 해당 입금 주소의 Henesis Key Pub Key" // 평소 Henesis API를 통해 입금 주소 생성/조회시 응답으로 온 값을 저장해두었어야 합니다. (이 부분은 추후 개선하고자 합니다.)
});
console.log(hash);
```

### 예제
출금 예제는 /example 패키지 안에 eth-recovery.ts, klay-recovery.ts, btc-recorver.ts를 확인하시면 됩니다. 실행하면 아래와 같이 출력되는 것을 확인할 수 있습니다.

**이더리움 ETH 출금 예제**
```shell
$ ts-node recover-eth.ts
Recovering ETH from '0x13da3a8be6cc271291515dfb65bd2e8ac73175b4' to '0x4ff4d2923b9fc88bf5134f82e655443cddacbf90'...
The address '0x13da3a8be6cc271291515dfb65bd2e8ac73175b4' has value of 4.97 ETH.
The fee to be charged is 0.01649906532797645 ETH, and it will be withdrawn from account '0x64195D7194249C8e44F5ff94467282B489F500B3'.
Successfully recovered ETH from '0x13da3a8be6cc271291515dfb65bd2e8ac73175b4' to '0x4ff4d2923b9fc88bf5134f82e655443cddacbf90' with value of 4.97 ETH.
The transaction result is
{
  "transactionHash": "0x8833e857a529af2705c7872cdc9a225a9bbc348b851753fde5e88ba0dd08dfec",
  "transactionFee": 0.01649906532797645,
  "status": true
}
```

**클레이튼 KLAY 출금 예제**
```shell
$ ts-node recover-klay.ts
Recovering KLAY from '0xfd9036d47dd832c1471ae92b82bf679c67ffb364' to '0x5972627b43a058dc2ad072cb67cd4a269a81f4fa'...
The address '0xfd9036d47dd832c1471ae92b82bf679c67ffb364' has value of 1 KLAY.
The fee to be charged is 0.002168825 KLAY, and it will be withdrawn from account '0x9de9ab49200eac4c83b9c029802b600e508e2e60'.
Successfully recovered KLAY from '0xfd9036d47dd832c1471ae92b82bf679c67ffb364' to '0x5972627b43a058dc2ad072cb67cd4a269a81f4fa' with value of 1 KLAY.
The transaction result is
{
  "transactionHash": "0xb6a9389570aa7f930f536b4f6764b12d5d4607168a9e1b3285a149e0e9a93a2d",
  "transactionFee": 0.002168825,
  "status": true
}
```

**바이낸스 스마트 체인 BNB 출금 예제**
```shell
$ ts-node recover-bsc.ts
Recovering BNB from '0x5369ffac48fbf1c2e72c3012114ab254c49f973e' to '0x7667f0085E853a53f4227703aa6710f526176d0E'...
The address '0x5369ffac48fbf1c2e72c3012114ab254c49f973e' has value of 0.0105 BNB.
The fee to be charged is 0.00079593 BNB, and it will be withdrawn from account '0xbf1228102043FB10Be904df3eF8CD1599Ac73A78'.
Successfully recovered BNB from '0x5369ffac48fbf1c2e72c3012114ab254c49f973e' to '0x7667f0085E853a53f4227703aa6710f526176d0E' with value of 0.0105 BNB.
The transaction result is
{
        "transactionHash": "0x0d1c9a7e7ca29d1105e576f6b9a5d0214e5ea304e88c27f133486d1841ff9d01",
        "transactionFee": 0.00079593,
        "status": true
}
```

**폴리곤 MATIC 출금 예제**
```shell
$ ts-node recover-polygon.ts
Recovering MATIC from '0x5369ffac48fbf1c2e72c3012114ab254c49f973e' to '0x7667f0085E853a53f4227703aa6710f526176d0E'...
The address '0x5369ffac48fbf1c2e72c3012114ab254c49f973e' has value of 0.0105 MATIC.
The fee to be charged is 0.00079593 MATIC, and it will be withdrawn from account '0xbf1228102043FB10Be904df3eF8CD1599Ac73A78'.
Successfully recovered MATIC from '0x5369ffac48fbf1c2e72c3012114ab254c49f973e' to '0x7667f0085E853a53f4227703aa6710f526176d0E' with value of 0.0105 MATIC.
The transaction result is
{
        "transactionHash": "0x0d1c9a7e7ca29d1105e576f6b9a5d0214e5ea304e88c27f133486d1841ff9d01",
        "transactionFee": 0.00079593,
        "status": true
}
```

**이더리움 ERC20 토큰 출금 예제**
```shell
$ ts-node recover-eth.ts
Recovering EVT from '0x5972627b43a058dc2ad072cb67cd4a269a81f4fa' to '0xfd9036d47dd832c1471ae92b82bf679c67ffb364'...
The address '0x5972627b43a058dc2ad072cb67cd4a269a81f4fa' has value of 10000 EVT.
The fee to be charged is 0.00221465 KLAY, and it will be withdrawn from account '0x9de9ab49200eac4c83b9c029802b600e508e2e60'.
Successfully recovered EVT from '0x5972627b43a058dc2ad072cb67cd4a269a81f4fa' to '0xfd9036d47dd832c1471ae92b82bf679c67ffb364' with value of 10000 EVT.
The transaction result is
{
  "transactionHash": "0xfb8f2f948c4af5cf5563d868b6dbd68c4a87f9dd98550583853d7adb833f9c7d",
  "transactionFee": 0.00221465,
  "status": true
}
```

**비트코인 출금 예제**
```shell
$ ts-node recover-btc.ts
Recovering BTC from 2N77eQXo2C2HYFMnmFMvu5AYdaZUzteZb5K to 2N4sg1AxZsbfqAXtB88wAowgmPjhcEu6AXC.
Address: '2N77eQXo2C2HYFMnmFMvu5AYdaZUzteZb5K' has 1 utxos with value 0.00001 BTC.
- 0: utxo id: 1c2d65d1ae4dd83811e0c7a39c3057219b88fdd69c8a9a83013f5cf2863278b0, index: 0.
The fee to be charged is 0.00000455 BTC.
Therefore, the 0.00000545 BTC will be withdrawn.
Successfully recover BTC from 2N77eQXo2C2HYFMnmFMvu5AYdaZUzteZb5K to 2N4sg1AxZsbfqAXtB88wAowgmPjhcEu6AXC with value 0.00000545 BTC.
Transaction Id: 43437be09912fae870e920dcf71a0243c21f3f25a4f2dbdc495bf07ad089ca4a.
```

**비트코인 캐시 출금 예제**
```shell
$ ts-node recover-bch.ts

Recovering BCH from bchtest:pq2nhvznrk2rk32tangdqsmk7qk2y0yljg5jr8juht to bchtest:ppyvxud2ak6549mv7pu75gt3djyff9ge6gexah05qp.
Address: 'bchtest:pq2nhvznrk2rk32tangdqsmk7qk2y0yljg5jr8juht' has 1 utxos with value 0.01 BCH.
- 0: utxo id: 20460c94803bd3420b113320cb433639317cff515bfef88e482680ae47e8d9de, index: 0.

The fee to be charged is 0.00000455 LTC.
Therefore, the 0.00999545 LTC will be withdrawn.
Successfully recover LTC from QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873 to QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873 with value 0.00999545 LTC.
Transaction Id: 3d6b6fab77b1d983a28fac903441c8039931f110add463fc3042b7cd1b452e52.
```

**라이트코인 출금 예제**
```shell
$ ts-node recover-ltc.ts

Recovering LTC from QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873 to QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873.
Address: 'QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873' has 1 utxos with value 0.01 LTC.
- 0: utxo id: 20460c94803bd3420b113320cb433639317cff515bfef88e482680ae47e8d9de, index: 0.

The fee to be charged is 0.00000455 LTC.
Therefore, the 0.00999545 LTC will be withdrawn.
Successfully recover LTC from QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873 to QhTfpfxJh3ydDm7AvjCDmwo88xGEfCy873 with value 0.00999545 LTC.
Transaction Id: 3a93b2f9dd686a14500a48d8ce1036d648062e65a4620cc01058df42d55ef324.
```

## @haechi-labs/wallet-recovery 배포하기

1. `npm login`으로 로그인
2. package.json의 버전 수정
3. `npm publish --access public`으로 배포
