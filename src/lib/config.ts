// src/lib/config.ts
import dotenv from "dotenv";

dotenv.config();

export const INFURA_API_KEY = process.env["INFURA_API_KEY"];
export const WALLET_PRIVATE_KEY = process.env["WALLET_PRIVATE_KEY"];
export const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
export const COINMARKETCAP_PUBLIC_KEY = process.env["COINMARKETCAP_PUBLIC_KEY"];
