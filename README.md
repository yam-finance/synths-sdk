# synths-sdk

## Install
```
yarn add synths-sdk
```

Example for using the Yam Uma Synths SDK:
## Code
```js
import { Synths } from "synths-sdk";

// Initialize
const synths = await new Synths({
  provider: Web3Provider,
  network: "mainnet",
  account: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
});

// Use
synths.network;
synths.account;
synths.methods.getUserBalanceUSDC();

const UGAS0921 = await new Asset(SDK.synthetics["ugas"]["0221"], SDK.options);
UGAS0921.getTVL();
```