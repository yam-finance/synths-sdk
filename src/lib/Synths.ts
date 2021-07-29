import Asset from "./Asset";
import { defaultAssetsConfig } from "./config";
import { SynthsAssetsConfig } from "../types/assets.t";

class Synths {
    #ethersProvider!: any;
    contracts!: any;
    asset?: any;

    /**
     * Creates an instance of the Synths SDK.
     * @param options - Ethers Synths configuration
     * @return The Synths SDK instance
     * @throws "Synths contracts not found in the current network"
     */
    static async create(options: any): Promise<Synths> {
        const synthsSdk = new Synths();
        await synthsSdk.init(options);
        return synthsSdk;
    }

    /**
     * Initializes the Synths SDK instance.
     * @param options - Ethers Synths configuration
     * @throws "Synths contracts not found in the current network"
     */
    private async init(options: any): Promise<void> {
        this.#ethersProvider = options.ethersProvider;

        const signer = this.#ethersProvider.getSigner();
        const chainId = await signer.getChainId();
        const synthsAssetsConfig: SynthsAssetsConfig = {
        ...defaultAssetsConfig,
        ...options.userAssetsConfig,
        };

        this.contracts = synthsAssetsConfig[chainId];

        if (!this.contracts) {
        throw new Error("Synths contracts not found in the current network");
        }
    }

    /**
     * Connects the SDK to an asset.
     * @param config - Ethers Asset configuration
     */
    async connectAsset(assetIdentifier: string): Promise<void> {
        this.asset = await Asset.connect({
            ethersProvider: this.#ethersProvider,
            contracts: this.contracts,
            assetIdentifier: assetIdentifier,
        });
    }
}

export default Synths;