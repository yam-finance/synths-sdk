/* istanbul ignore file */
import "tsconfig-paths/register";
import { HardhatUserConfig } from "hardhat/config";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle"; // imports hardhat-ethers https://hardhat.org/guides/waffle-testing.html#setting-up
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import "hardhat-watcher";
import dotenv from "dotenv";

dotenv.config();

// const WALLET_PRIVATE_KEY = process.env["WALLET_PRIVATE_KEY"];
const INFURA_API_KEY = process.env["INFURA_API_KEY"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const COINMARKETCAP_PUBLIC_KEY = process.env["COINMARKETCAP_PUBLIC_KEY"];

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args: unknown, hre) => {
  console.log(args);
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_API_KEY || ""}`,
      },
    },
    // ropsten: {
    //   url: `https://ropsten.infura.io/v3/${INFURA_API_KEY || ""}`,
    //   accounts: [`0x${WALLET_PRIVATE_KEY || ""}`],
    // },
  },
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    compilers: [
      { version: "0.8.0", settings },
      { version: "0.8.4", settings },
    ],
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
  watcher: {
    test: {
      tasks: [{ command: "test", params: { testFiles: ["{path}"] } }],
      files: ["./test/**/*"],
      verbose: true,
    },
  },
};

export default config;
