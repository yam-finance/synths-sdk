import { SynthsAssetsConfig } from "../../types/assets.t";
import assets from "../../assets.json";
import dotenv from "dotenv";

dotenv.config();

export const INFURA_API_KEY = process.env["INFURA_API_KEY"];
export const WALLET_PRIVATE_KEY = process.env["WALLET_PRIVATE_KEY"];
export const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
export const COINMARKETCAP_PUBLIC_KEY = process.env["COINMARKETCAP_PUBLIC_KEY"];

// @todo Check type error
export const defaultAssetsConfig: SynthsAssetsConfig = assets;
