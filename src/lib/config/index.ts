import type { SynthsAssetsConfig } from "../../types/assets.t";
import assets from "../../assets.json";
import assetstest from "../../assetstest.json";
import dotenv from "dotenv";

dotenv.config();

export const POLYSCAN_API_KEY = process.env["POLYSCAN_API_KEY"] || "";
export const defaultAssetsConfig: SynthsAssetsConfig = assets;
export const defaultTestAssetsConfig: SynthsAssetsConfig = assetstest;
