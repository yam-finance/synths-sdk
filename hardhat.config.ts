import {
  INFURA_API_KEY,
  WALLET_PRIVATE_KEY,
  ETHERSCAN_API_KEY,
  COINMARKETCAP_PUBLIC_KEY,
} from "./src/lib/config";
import "tsconfig-paths/register";
import { HardhatUserConfig } from "hardhat/config";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};

const config: HardhatUserConfig = {
  // networks: {
  //   hardhat: {
  //     forking: {
  //       url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
  //     },
  //   },
  //   ropsten: {
  //     url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
  //     accounts: [`0x${WALLET_PRIVATE_KEY}`],
  //   },
  // },
  solidity: {
    compilers: [{ version: "0.8.0", settings }],
  },
  typechain: {
    outDir: "./src/types/contracts",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: COINMARKETCAP_PUBLIC_KEY,
    gasPrice: 200,
  },
};

export default config;
