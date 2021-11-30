import Asset from "./Asset";
import { ethers } from "ethers";
import { providers } from "@0xsequence/multicall";
import {
  ERC20Ethers__factory,
  LongShortPairEthers__factory,
} from "@uma/contracts-node";
import { defaultAssetsConfig } from "./config";
import { prepareLSPStateCall } from "../utils/helpers";
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
    try {
      const portfolio: { [key: string]: Record<string, unknown> } = {};

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
              priceIdentifier,
              pairName,
              longToken,
              shortToken,
              collateralPerPair,
              timerAddress,
            ] = await call;

            console.log(
              priceIdentifier,
              pairName,
              collateralPerPair,
              timerAddress
            );

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

            /// @todo Get lp amount of user
            portfolio[longSymbol] = {
              balance: longBalance,
              collateralSymbol: collateralSymbol,
              status: expired,
            };

            /// @todo Get lp amount of user
            portfolio[shortSymbol] = {
              balance: shortBalance,
              collateralSymbol: collateralSymbol,
              status: expired,
            };
          }
        }
      }

      return portfolio;
    } catch (e) {
      console.error("error", e);
      return;
    }
  }

  /**
   * Initializes the Synths SDK instance.
   * @param options - Ethers Synths configuration
   * @throws "Synths not found in the current network"
   */
   async init(options: InitOptions): Promise<void> {
    const chainId = (await options.ethersProvider.getNetwork()).chainId
    // const chainId = await this.#signer.getChainId();
    const synthsAssetsConfig: SynthsAssetsConfig = {
      ...defaultAssetsConfig,
      ...options.userAssetsConfig,
    };    

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.#multicallProvider = new MulticallWrapper(options.ethersProvider);
    this.#signer = options.ethersProvider.getSigner();
    this.config = synthsAssetsConfig;

    if (Object.keys(synthsAssetsConfig).includes(chainId.toString())) {
      this.assets = synthsAssetsConfig[chainId];
    } else {
      throw new Error(
        `Synths not found in the current network ${chainId}. Please check your configuration.`
      );
    }

    if (!this.assets) {
      throw new Error("Synths not found in the current network");
    }
  }
}

export default Synths;
