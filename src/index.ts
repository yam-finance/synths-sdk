import Synths from "./lib/Synths";
import {
  getCurrentDexTokenPrice,
  getTotalMarketData,
  getSynthData,
  getPoolChartData,
  getInfoByIdentifier,
  getRecentSynthData,
  getYamRewardsByPoolAddress,
  roundNumber,
} from "./utils/helpers";
import { SynthsAssetsConfig } from "./types/assets.t";

export default Synths;
export {
  getCurrentDexTokenPrice,
  getTotalMarketData,
  getSynthData,
  getPoolChartData,
  getInfoByIdentifier,
  getRecentSynthData,
  getYamRewardsByPoolAddress,
  roundNumber,
  SynthsAssetsConfig
};
