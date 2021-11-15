import Asset from "./Asset";
import { ethers } from "ethers";
import { providers } from "@0xsequence/multicall";
import { LongShortPairEthers__factory } from "@uma/contracts-node";
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
      /// @todo Call helper function for multicall.
      const portfolio: { [key: string]: Record<string, unknown> } = {};

      for (const assetCycles in this.assets) {
        for (const asset of this.assets[assetCycles]) {
          if (isAssetConfigLSP(asset)) {
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

            // const state = this.getLSPState(asset.lsp.address);
            // get synthCollateralSymbol
            // get status

            // get pairName + long
            // get balance of longToken
            // get lp amount of user
            // get tokenPrice
            portfolio[0] = {
              balance: 0,
              lpAmount: 0,
              price: 0,
              collateral: 0,
              status: true,
            };

            // get pairName + short
            // get balance of shortToken
            // get lp amount of user
            // get tokenPrice
            portfolio[0] = {
              balance: 0,
              lpAmount: 0,
              price: 0,
              collateral: 0,
              status: true,
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
  private async init(options: InitOptions): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.#multicallProvider = new MulticallWrapper(options.ethersProvider);

    this.#signer = options.ethersProvider.getSigner();

    const synthsAssetsConfig: SynthsAssetsConfig = {
      ...defaultAssetsConfig,
      ...options.userAssetsConfig,
    };

    const chainId = await this.#signer.getChainId();

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
