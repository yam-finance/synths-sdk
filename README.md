# degenerative-sdk

## Install
```
yarn add degenerative-sdk
```

## Code
```js
import { Degenerative } from "degenerative-sdk";

// Initialize
const degenerative: Degenerative = await new Degenerative({
  provider: Web3Provider,
  network: "mainnet",
  account: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
});

// Use
degenerative.network;
degenerative.account;
degenerative.methods.getUserBalanceUSDC();
```
