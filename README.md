# synths-sdk

[![CI](https://github.com/yam-finance/synths-sdk/actions/workflows/main.yml/badge.svg)](https://github.com/yam-finance/synths-sdk/actions/workflows/main.yml)

# Documentation

- [SDK](https://yam-finance.github.io/synths-sdk/)
- [Synth Contracts](https://yam-finance.github.io/synths-sdk/contracts/)

# Using the Yam Uma Synths SDK

### \*\*Official

assets:\*\* [File](https://github.com/yam-finance/synths-sdk/blob/master/src/assets.json)
and [Raw file](https://raw.githubusercontent.com/yam-finance/synths-sdk/master/src/assets.json)

## Install

```sh
yarn add synths-sdk
```

## Use

```ts
import Synths from "synths-sdk";
import { ethers } from "ethers";

// Create an ethers provider instance
const provider = new ethers.providers.Web3Provider(web3Provider);

// Initialize the sdk with the official yam synths
const synthsSDK = await Synths.create({
  ethersProvider: provider,
});

// Connect the sdk to a synth
const upunksAsset = await synthsSDK.connectAsset("upunks-0921");

// Example method calls
const gcr: any = await upunksAsset.getGCR();
```

```ts
// Alternatively you can pass your own synth object or modify the existing synths for a local test network deployment
const chainId = 1;
const userAssetsConfig: SynthsAssetsConfig = {
  [chainId]: {
    upunks: [
      {
        name: "September",
        cycle: "09",
        year: "21",
        collateral: "WETH",
        token: {
          address: "0x86140A763077155964754968B6F6e243fE809cBe",
          token: 18,
        },
        emp: {
          address: "0xF8eF02C10C473CA5E48b10c62ba4d46115dd2288",
          new: true,
          type: "finlib",
        },
        pool: {
          address: "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
          location: "sushiswap",
        },
        expired: false,
      },
    ],
  },
};

const synthsSDK = await Synths.create({
  ethersProvider: provider,
  userAssetsConfig: userAssetsConfig,
});
```

# Development

After cloning the synths repo, copy over the .env.template file and fill in variables.

```sh
# Copy over the .env.template file to .env and fill in variables.
yarn install
yarn test
```

## Local testnet deployment

```sh
yarn hardhat node
yarn hardhat deploy --network localhost
```
