import Asset from "./Asset";
import { defaultAssetsConfig } from "./config";
import { SynthsAssetsConfig, AssetsConfig } from "../types/assets.t";

class Synths {
    #ethersProvider!: any;
    assets!: AssetsConfig;
    asset?: Asset;

    /**
     * Creates an instance of the Synths SDK.
     * @param options - Ethers Synths configuration
     * @return The Synths SDK instance
     * @throws "Synths not found in the current network"
     */
    // @todo Add options type
    static async create(options: any): Promise<Synths> {
        const synthsSdk = new Synths();
        await synthsSdk.init(options);
        return synthsSdk;
    }

    /**
     * Initializes the Synths SDK instance.
     * @param options - Ethers Synths configuration
     * @throws "Synths not found in the current network"
     */
    // @todo Add options type
    private async init(options: any): Promise<void> {
        this.#ethersProvider = options.ethersProvider;

        const signer = this.#ethersProvider.getSigner();
        const chainId = await signer.getChainId();
        const synthsAssetsConfig: SynthsAssetsConfig = {
        ...defaultAssetsConfig,
        ...options.userAssetsConfig,
        };

        this.assets = synthsAssetsConfig[chainId];

        if (!this.assets) {
        throw new Error("Synths not found in the current network");
        }
    }

    /**
     * Connects the SDK to an asset.
     * @param config - Ethers Asset configuration
     */
    async connectAsset(assetIdentifier: string): Promise<void> {
        this.asset = await Asset.connect({
            ethersProvider: this.#ethersProvider,
            assets: this.assets,
            assetIdentifier: assetIdentifier,
        });
    }
}

export default Synths;