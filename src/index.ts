
import Web3 from "web3";
import { Contracts } from "./protocol/Contracts";
import { AssetMethods } from "./library/AssetMethods";
import { Synthetics } from "./protocol/Synthetics";
import Assets from "../src/assets.json";
import { TxStats } from "./library/TxStats";
import { MiningRewards } from "./utils/apr"
require('dotenv').config();

export class Degenerative {

    private options: any;
    private web3: any;
    public provider: any;
    public network: string;
    public account: any;
    public contracts: any;
    public synthetics: any;
    public utils: any;
    public abis: any;
    public assets: any;
    public methods: any;
    public apr: any;
    public stats: any;
    constructor(options: any) {
        this.options = options;
        this.account = options.account;
        this.network = options.network;
        this.abis;
        this.contracts;
        this.synthetics;
        this.apr;
        this.stats;
        this.utils;

        /* @ts-ignore */
        this.assets = Assets[this.options.network];
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
        this.synthetics = new Synthetics(this.options, this.assets);
        this.apr = new MiningRewards(this.options);
        this.stats = new TxStats(this.options);
    }
}
