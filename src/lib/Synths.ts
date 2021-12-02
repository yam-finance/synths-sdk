import Asset from "./Asset";
import { ethers } from "ethers";
import { providers } from "@0xsequence/multicall";
import {
  ERC20Ethers__factory,
  LongShortPairEthers__factory,
} from "@uma/contracts-node";
import { defaultAssetsConfig } from "./config";
import { prepareLSPStateCall, getDexTokenPriceAtBlock } from "../utils/helpers";
import {
  SynthsAssetsConfig,
  AssetsConfig,
  InitOptions,
  isAssetConfigLSP,
  MulticallParameter,
} from "../types/assets.t";

const MulticallWrapper = providers.MulticallProvider as unknown as new (
  provider: ethers.providers.BaseProvider,
  multicall?: MulticallParameter
) => ethers.providers.JsonRpcProvider;

class Synths {
  config!: SynthsAssetsConfig;
  assets!: AssetsConfig;
  chainId!: number;
  #multicallProvider!: ethers.providers.Provider;
  #signer!: ethers.Signer;

  /**
   * @notice Creates an instance of the Synths SDK.
   * @param options - Ethers Synths configuration.
   * @returns The Synths SDK instance.
   * @throws "Synths not found in the current network".
   */
  static async create(options: InitOptions): Promise<Synths> {
    const synthsSdk = new Synths();
    await synthsSdk.init(options);
    return synthsSdk;
  }

  /**
   * Connects the SDK to an asset.
   * @param config - Ethers Asset configuration
   */
  connectAsset(assetIdentifier: string): Asset {
    const asset = Asset.connect({
      signer: this.#signer,
      multicallProvider: this.#multicallProvider,
      assets: this.assets,
      assetIdentifier: assetIdentifier,
    });

    return asset;
  }

  async getLSPPortfolio() {
    const portfolio = [];

    for (const assetCycles in this.assets) {
      for (const asset of this.assets[assetCycles]) {
        if (isAssetConfigLSP(asset)) {
          const userAddress = await this.#signer.getAddress();
          const contract = LongShortPairEthers__factory.connect(
            asset.lsp.address,
            this.#multicallProvider
          );
          const call = prepareLSPStateCall(contract);
          const [
            expirationTimestamp,
            collateralToken,
            ,
            ,
            longToken,
            shortToken,
            ,
            ,
          ] = await call;

          // console.log(priceIdentifier, pairName, collateralPerPair, timerAddress)

          const collateralContract = ERC20Ethers__factory.connect(
            collateralToken,
            this.#multicallProvider
          );
          const longTokenContract = ERC20Ethers__factory.connect(
            longToken,
            this.#multicallProvider
          );
          const shortTokenContract = ERC20Ethers__factory.connect(
            shortToken,
            this.#multicallProvider
          );

          const currentUnixTs = Math.floor(Date.now() / 1000);
          const expired = expirationTimestamp.gte(
            ethers.BigNumber.from(currentUnixTs)
          )
            ? true
            : false;

          const [
            collateralSymbol,
            longSymbol,
            shortSymbol,
            longBalance,
            shortBalance,
          ] = await Promise.all([
            collateralContract.symbol(),
            longTokenContract.symbol(),
            shortTokenContract.symbol(),
            longTokenContract.balanceOf(userAddress),
            shortTokenContract.balanceOf(userAddress),
          ]);

          const dexData: { [key: string]: number } = {};

          // @todo Think about calculating this on the front-end in the future.
          for (const pool of asset.pools) {
            const blockNumber = await this.#multicallProvider.getBlockNumber();

            const tokenPrice = await getDexTokenPriceAtBlock(
              pool.location,
              pool.address,
              collateralSymbol,
              blockNumber - 10,
              String(this.chainId)
            );

            if (!tokenPrice.tokenId || !tokenPrice.value) continue;

            dexData[ethers.utils.getAddress(tokenPrice.tokenId)] = Number(
              tokenPrice.value
            );
          }

          /// @todo Get lp amount of user
          portfolio.push({
            symbol: longSymbol,
            balance: longBalance,
            price: dexData[longToken] || 0,
            collateralSymbol: collateralSymbol,
            status: expired,
          });

          /// @todo Get lp amount of user
          portfolio.push({
            symbol: shortSymbol,
            balance: shortBalance,
            price: dexData[shortToken] || 0,
            collateralSymbol: collateralSymbol,
            status: expired,
          });
        }
      }
    }

    return portfolio;
  }

  /**
   * Initializes the Synths SDK instance.
   * @param options - Ethers Synths configuration
   * @throws "Synths not found in the current network"
   */
  async init(options: InitOptions): Promise<void> {
    // const chainId = await this.#signer.getChainId();
    const synthsAssetsConfig: SynthsAssetsConfig = {
      ...defaultAssetsConfig,
      ...options.userAssetsConfig,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.#multicallProvider = new MulticallWrapper(options.ethersProvider);
    this.#signer = options.ethersProvider.getSigner();
    this.chainId = (await options.ethersProvider.getNetwork()).chainId;
    this.config = synthsAssetsConfig;

    if (Object.keys(synthsAssetsConfig).includes(this.chainId.toString())) {
      this.assets = synthsAssetsConfig[this.chainId];
    } else {
      throw new Error(
        `Synths not found in the current network ${this.chainId}. Please check your configuration.`
      );
    }

    if (!this.assets) {
      throw new Error("Synths not found in the current network");
    }
  }
}

export default Synths;
