# synths-sdk

## Install
```
yarn add synths-sdk
```

### Synths contract and sdk tests

```
yarn install
```

```
yarn test
```

# Code

```ts
import Synths from "synths-sdk";
import { ethers } from "ethers";

/// @dev Create an ethers provider instance
const provider = new ethers.providers.Web3Provider(web3Provider);

// const chainId = 1;
// const userAssetsConfig: SynthsAssetsConfig = {
//   [chainId]: {
//     "upunks": [
//       {
//         "name": "September",
//         "cycle": "09",
//         "year": "21",
//         "collateral": "WETH",
//         "token": {
//           "address": "0x86140A763077155964754968B6F6e243fE809cBe",
//           "decimals": 18
//         },
//         "emp": {
//           "address": "0xF8eF02C10C473CA5E48b10c62ba4d46115dd2288",
//           "new": true,
//           "type": "finlib"
//         },
//         "pool": {
//           "address": "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
//           "location": "sushiswap"
//         },
//         "expired": false 
//       }
//     ],
//   },
// };

synthsSDK = await Synths.create({
  ethersProvider: provider,
  // userAssetsConfig: userAssetsConfig
});

synthsSDK.connectAsset("upunks-0921")
```
