# degenerative-sdk

## Install
```
yarn add degenerative-sdk
```

Example for using the Degenerative SDK:
## Code
```js
import { Degenerative } from "degenerative-sdk";

// Initialize
const degenerative = await new Degenerative({
  provider: Web3Provider,
  network: "mainnet",
  account: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
});

// Use
degenerative.network;
degenerative.account;
degenerative.methods.getUserBalanceUSDC();

const UGAS0921 = await new Asset(SDK.synthetics["ugas"]["0221"], SDK.options);
UGAS0921.getTVL();
```