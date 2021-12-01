import type { SynthsAssetsConfig } from "../../types/assets.t";
import assets from "../../assets.json";
import assetstest from "../../assetstest.json";

export const POLYSCAN_API_KEY = process.env.VUE_APP_POLYSCAN_API_KEY
export const defaultAssetsConfig: SynthsAssetsConfig = assets;
export const defaultTestAssetsConfig: SynthsAssetsConfig = assetstest;
