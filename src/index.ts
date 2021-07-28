
import Web3 from "web3";
import { Contracts } from "./protocol/Contracts";
import { AssetMethods } from "./library/AssetMethods";
import { Synthetics } from "./protocol/Synthetics";
import Assets from "../src/assets.json";
import { Utils } from "./library/Utils"
import { Asset } from "./library/Asset";
require('dotenv').config();

type supportNetwork = keyof typeof Assets
type assetGroup = keyof typeof Assets['mainnet'] | keyof typeof Assets['kovan']
type supportedAsset = {
    [group in assetGroup]: Record<string, Asset>;
};


export class Synths {

    public options;
    public web3;
    public provider;
    public network;
    public account;
    public contracts;
    public synthetics;
    public utils;
    public abis: any;
    public assets;
    public methods;
    constructor(options: any) {
        this.options = options as Record<any,any>;
        this.account = options.account as string;
        this.network = options.network as supportNetwork;

        this.assets = Assets[this.options.network as supportNetwork];
        this.methods = new AssetMethods(this.options);

        let providerSource;
        if (typeof this.options.provider === "string") {
            if (this.options.provider.includes("wss")) {
                providerSource = new Web3.providers.WebsocketProvider(this.options.provider, this.options.timeout || 10000);
            } else {
                providerSource = new Web3.providers.HttpProvider(this.options.provider, this.options.timeout || 10000);
            }
        } else {
            providerSource = this.options.provider;
        }

        this.provider = providerSource;
        this.web3 = new Web3(providerSource);
        this.options.web3 = this.web3;
        this.contracts = new Contracts(this.options);
        this.synthetics = new Synthetics(this.options, this.assets) as supportedAsset;
        this.utils = new Utils(this.options)
    }
}
