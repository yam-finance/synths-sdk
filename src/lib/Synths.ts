import Asset from "./Asset";
import { defaultAssetsConfig } from "./config";
import {
  SynthsAssetsConfig,
  AssetsConfig,
  InitOptions,
} from "../types/assets.t";
import { ethers } from "ethers";

class Synths {
  assets!: AssetsConfig;
  #ethersProvider!: ethers.providers.Web3Provider;

  /**
   * @notice Creates an instance of the Synths SDK.
   * @param options - Ethers Synths configuration.
   * @returns The Synths SDK instance.
   * @throws "Synths not found in the current network".
   */
  // @todo Add options type.
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
      ethersProvider: this.#ethersProvider,
      assets: this.assets,
      assetIdentifier: assetIdentifier,
    });

    return asset;
  }

  /**
   * Initializes the Synths SDK instance.
   * @param options - Ethers Synths configuration
   * @throws "Synths not found in the current network"
   */
  // @todo Add options type.
  private async init(options: InitOptions): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.#ethersProvider =
      options.ethersProvider as ethers.providers.Web3Provider;

    const signer = this.#ethersProvider.getSigner();

    const synthsAssetsConfig: SynthsAssetsConfig = {
      ...defaultAssetsConfig,
      ...options.userAssetsConfig,
    };
    const chainId = await signer.getChainId();
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
