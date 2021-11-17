/* istanbul ignore file */
import "tsconfig-paths/register";
import { HardhatUserConfig, subtask, task, types } from "hardhat/config";
import { CLIArgumentType } from "hardhat/types";
import { HardhatError } from "hardhat/internal/core/errors";
import { ERRORS } from "hardhat/internal/core/errors-list";
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
const INFURA_API_KEY = process.env["INFURA_API_KEY"] ?? "";
const ALCHEMY_API_KEY = process.env["ALCHEMY_API_KEY"] ?? "";
const ALCHEMY_API_KEY_MAINNET = process.env["ALCHEMY_API_KEY_MAINNET"] ?? "";
const ALCHEMY_API_KEY_MATIC = process.env["ALCHEMY_API_KEY_MATIC"] ?? "";
const PREFERRED_PROVIDER =
  process.env["INFURA_API_KEY"]?.toLowerCase() === PROVIDER.INFURA
    ? PROVIDER.INFURA
    : PROVIDER.ALCHEMY;
const API_KEY =
  PREFERRED_PROVIDER === PROVIDER.INFURA ? INFURA_API_KEY : ALCHEMY_API_KEY;
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const COINMARKETCAP_PUBLIC_KEY = process.env["COINMARKETCAP_PUBLIC_KEY"];
const CHAINID = parseInt(process.env["CHAINID"] ?? "1");

if (!API_KEY) {
  throw new Error("Please set the API key for the preferred provider");
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

enum SynthCategories {
  dpi2X = "2xdpi",
  ugas = "ugas",
}

enum ContractType {
  lsp = "lsp",
  emp = "emp",
}
enum SupportedPoolLocation {
  sushiswap = "sushiswap",
  uniswap = "uniswap",
}

type SupportedCollateral = "WETH" | "DAI";
type SupportedChainId = 1 | 137;
type Address = string;
const SupportedCollateral: Record<
  SupportedCollateral,
  Record<SupportedChainId, Address>
> = {
  WETH: {
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    137: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
  DAI: {
    1: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    137: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
};

const SynthContractCLIArgument: CLIArgumentType<ContractType> = {
  name: "SynthContractCLIArgument",
  parse(argName: string, strValue: string): ContractType {
    switch (strValue) {
      case "lsp":
        return ContractType.lsp;
      case "emp":
        return ContractType.emp;
      default:
        throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: strValue,
          type: this.name,
          name: argName,
        });
    }
  },
  validate() {}, // no further validation needed
};

function getExpiry(cycle: string, year: string) {
  const lastDay = new Date(parseInt("20" + year), parseInt(cycle) + 1, 0)
    .getDate()
    .toString();
  const date = Date.parse(`20${year}-${cycle}-${lastDay} 22:00:00 GMT`);
  return Math.floor(date / 1000);
}

task<{ category: SynthCategories; contractType: ContractType }>(
  "synth:deploy",
  "Deploy a synth and write output to assets.json",
  async (taskArgs, hre) => {
    if (taskArgs.contractType === ContractType.lsp) {
      // Run DefiTools deployment
      await hre.deployments.run("DefiTools", {
        writeDeploymentsToFiles: hre.network.live,
      });
      await hre.run("synth:create", {
        chainID: 137,
        expiry: getExpiry("12", "21"),
      });
    }
  }
)
  .addPositionalParam<SynthCategories>(
    "category",
    `The category of the synth to deploy [${Object.values(SynthCategories).join(
      ","
    )}]`
  )
  .addOptionalParam<ContractType>(
    "contractType",
    `The contract type of synth to deploy [${Object.values(ContractType).join(
      ","
    )}]`,
    ContractType.lsp,
    SynthContractCLIArgument
  )
  .addParam<string>("cycle", "The cycle of the synth to deploy")
  .addParam<string>("year", "The year [YY] of the synth to deploy")
  .addParam<SupportedCollateral>(
    "collateral",
    `Collateral type [${Object.keys(SupportedCollateral).join(",")}]`,
    undefined,
    types.string
  )
  .addOptionalParam<SupportedPoolLocation>(
    "poolLocation",
    `The pool location [${Object.keys(SupportedCollateral).join(",")}]`,
    SupportedPoolLocation.sushiswap,
    types.string
  );

// get current month integer
function getDefaultExpiry() {
  const date = new Date();
  const month = date.getMonth() + 1;
  // get last two integers of year
  const year = date.getFullYear().toString().substr(-2);
  return [month.toString(), year] as const;
}

subtask("synth:create", "calls LSP Creator")
  .addOptionalParam("chainID", "The chainID to deploy on.", 1, types.int)
  .addOptionalParam(
    "expiry",
    "Expiry for the synth",
    getExpiry(...getDefaultExpiry()),
    types.int
  )
  .setAction(async (taskArgs: { chainID: number; expiry: number }, hre) => {
    const {
      getAddress,
      LongShortPairCreatorEthers__factory,
      AddressWhitelistEthers__factory,
      IdentifierWhitelistEthers__factory,
    } = await import("@uma/contracts-node");
    // const { utils } = await import("ethers");
    const { ethers, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);
    const [
      longShortPairCreatorAddress,
      addressWhitelistAddress,
      identifierWhitelistAddress,
    ] = await Promise.all([
      getAddress("LongShortPairCreator", taskArgs.chainID),
      getAddress("AddressWhitelist", taskArgs.chainID),
      getAddress("IdentifierWhitelist", taskArgs.chainID),
    ]);
    const addressWhitelistContract = AddressWhitelistEthers__factory.connect(
      addressWhitelistAddress,
      signer
    );
    const longShortPairCreator = LongShortPairCreatorEthers__factory.connect(
      longShortPairCreatorAddress,
      signer
    );
    const identifierWhitelistContract =
      IdentifierWhitelistEthers__factory.connect(
        identifierWhitelistAddress,
        signer
      );
    console.log(addressWhitelistContract.address);
    console.log(longShortPairCreator.address);
    console.log(identifierWhitelistContract.address);
    console.log((await hre.deployments.get("ReserveLSPL")).address);
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
    compilers: [{ version: "0.8.4", settings }],
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
