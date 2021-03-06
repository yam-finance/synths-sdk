/* istanbul ignore file */
import "tsconfig-paths/register";
import { HardhatUserConfig } from "hardhat/config";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle"; // imports hardhat-ethers https://hardhat.org/guides/waffle-testing.html#setting-up
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import "hardhat-watcher";
import "solidity-coverage";
import "hardhat-docgen";
import dotenv from "dotenv";

dotenv.config();

enum PROVIDER {
  INFURA = "infura",
  ALCHEMY = "alchemy",
}

// const WALLET_PRIVATE_KEY = process.env["WALLET_PRIVATE_KEY"] ?? undefined;
const INFURA_API_KEY = process.env["INFURA_API_KEY"] || "";
const ALCHEMY_API_KEY_MAINNET = process.env["ALCHEMY_API_KEY_MAINNET"] || "";
const ALCHEMY_API_KEY_MATIC = process.env["ALCHEMY_API_KEY_MATIC"] || "";
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"] || "";
const COINMARKETCAP_PUBLIC_KEY = process.env["COINMARKETCAP_PUBLIC_KEY"] || "";
const CHAINID = parseInt(process.env["CHAINID"] || "1");
const PREFERRED_PROVIDER =
  CHAINID === 1 && INFURA_API_KEY ? PROVIDER.INFURA : PROVIDER.ALCHEMY;

if (
  (CHAINID === 1 && !INFURA_API_KEY && !ALCHEMY_API_KEY_MAINNET) ||
  (CHAINID === 137 && !INFURA_API_KEY && !ALCHEMY_API_KEY_MATIC)
) {
  console.error(
    `CHAINID=${CHAINID}\n` +
      `PROVIDER=${PREFERRED_PROVIDER}\n` +
      `INFURA_API_KEY=${INFURA_API_KEY}\n` +
      `ALCHEMY_API_KEY_MAINNET=${ALCHEMY_API_KEY_MAINNET}\n` +
      `ALCHEMY_API_KEY_MATIC=${ALCHEMY_API_KEY_MATIC}\n` +
      "Please set your Infura or Alchemy API key in the .env file.\n" +
      "You can find your project key in the Infura or Alchemy dashboard.\n\n"
  );
  process.exit(1);
}
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

const NETWORK_URLS = {
  [PROVIDER.INFURA]: {
    mainnet: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    // Polygon is only supported as an addon for infura projects, use alchemy as free alternative.
    matic: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  },
  [PROVIDER.ALCHEMY]: {
    mainnet: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY_MAINNET}`,
    matic: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_MATIC}`,
  },
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url:
          CHAINID === 137
            ? NETWORK_URLS[PREFERRED_PROVIDER].matic
            : NETWORK_URLS[PREFERRED_PROVIDER].mainnet,
      },
      chainId: CHAINID,
    },
    // matic: {
    //   url: NETWORK_URLS[PROVIDER.ALCHEMY].matic,
    //   accounts: [`0x${WALLET_PRIVATE_KEY || ""}`],
    // },
    // ropsten: {
    //   url: `https://ropsten.infura.io/v3/${INFURA_API_KEY || ""}`,
    //   accounts: [`0x${WALLET_PRIVATE_KEY || ""}`],
    // },
  },
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    compilers: [{ version: "0.8.9", settings }],
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
  docgen: {
    path: "./docs/contracts",
    clear: true,
    runOnCompile: true,
  },
};

export default config;
