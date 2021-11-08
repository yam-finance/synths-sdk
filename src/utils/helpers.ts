import { ethers } from "ethers";
import { request } from "graphql-request";
import axios from "axios";
import sushiData from "@sushiswap/sushi-data";
import { ERC20Ethers__factory } from "@uma/contracts-node";
import { defaultAssetsConfig } from "../lib/config";
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  UNI_SUSHI_PAIR_DATA,
} from "./queries";
import { AssetConfigBase, IResentSynthsData } from "types/assets.t";

/**
 * @notice Helper function to get the decimals of a erc20 token.
 * @param address Address of the erc20 contract.
 * @param ethersProvider Ethers provider instance.
 * @returns `undefined` or the erc20 token decimals.
 */
export async function getTokenDecimals(
  address: string,
  ethersProvider: ethers.providers.Provider
) {
  try {
    const contract = ERC20Ethers__factory.connect(address, ethersProvider);
    const decimals = await contract.decimals();

    return decimals;
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

/**
 * @notice Helper function to get the current DEX token price.
 * @param poolLocation Location string of the DEX pool (e.g. "uni").
 * @param poolAddress Address of the DEX pool.
 * @param tokenAddress Address of the token.
 * @returns `undefined` or the DEX token price in WEI.
 */
export async function getCurrentDexTokenPrice(
  poolLocation: string,
  poolAddress: string,
  tokenAddress: string
) {
  try {
    /// @dev Get pool data from graph endpoints.
    const endpoint =
      poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
    const query = UNI_SUSHI_PAIR_DATA;
    // eslint-disable-next-line
    const poolData: any = await request(endpoint, query, {
      pairAddress: poolAddress,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (poolData["pair"].token0.id === tokenAddress) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return poolData["pair"].reserve0 / poolData["pair"].reserve1;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return poolData["pair"].reserve1 / poolData["pair"].reserve0;
    }
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

/**
 * @notice Helper function to get relevant synth market data.
 * @param synthId The synth identifier.
 * @param networkId The network / chain id of the synth deployment.
 * @returns `undefined` or an object with the relevant data.
 */
export async function getSynthData(synthId: string, networkId: number) {
  try {
    const synthInfo: AssetConfigBase | undefined = getInfoByIdentifier(
      synthId,
      networkId
    );

    if (synthInfo == undefined) {
      return;
    }

    const tokenData = await sushiData.exchange.token24h({
      token_address: synthInfo.token.address,
    });

    const response = await axios.get(
      `https://data.yam.finance/degenerative/apr/${synthId}`
    );

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      apr: response.data["aprMultiplier"] as string,
      price: tokenData.priceUSD,
      priceChanged24h: tokenData.priceUSDChange,
      liquidity24h: tokenData.liquidityUSD,
      volume24h: tokenData.volumeUSDOneDay,
    };
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

/**
 * @notice Helper function to get the data for the most recent synths.
 * @dev Can be used on the front-end to display the most recent synths.
 * @param networkId The network / chain id of the synth deployment.
 */
export async function getResentSynthData(networkId: number) {
  const resentSynthData: IResentSynthsData = {};

  for (const synthClassName in defaultAssetsConfig[networkId]) {
    const synthClass = defaultAssetsConfig[networkId][synthClassName];
    const lastSynth = synthClass.slice(-1)[0];
    const synthId = synthClassName + "-" + lastSynth.cycle + lastSynth.year;
    const synthData = await getSynthData(synthId, networkId);

    if (synthData == undefined) {
      break;
    }

    resentSynthData[synthClassName] = synthData;
  }

  return resentSynthData;
}

/**
 * @notice Helper function to get the total liquidity and volume of all synths in the last 24h.
 * @param networks Array of networks that the user wants to query.
 */
export async function getTotalMarketData(networks: Array<number>) {
  let totalLiquidity = 0;
  let totalVolume = 0;

  for (const networkId of networks) {
    for (const synthClassName in defaultAssetsConfig[networkId]) {
      const synthClass = defaultAssetsConfig[networkId][synthClassName];
      for (let i = 0; i < synthClass.length; i++) {
        if (!synthClass[i].expired) {
          const synthId =
            synthClassName + "-" + synthClass[i].cycle + synthClass[i].year;
          const synthData = await getSynthData(synthId, networkId);

          if (synthData == undefined) {
            break;
          }

          totalLiquidity += synthData.liquidity24h;
          totalVolume += synthData.volume24h;
        }
      }
    }
  }

  const response = await axios.get(`https://api.yam.finance/tvl/degenerative`);

  return {
    total24hLiquidity: totalLiquidity,
    total24hVolume: totalVolume,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    totalTVL: response.data["total"] as string,
  };
}

/**
 * @notice Helper function to get data from `assets.json` according to the synth id.
 * @param synthId The synth identifier.
 * @param networkId The network / chain id of the synth deployment.
 */
export function getInfoByIdentifier(synthId: string, network: number) {
  try {
    const synthClassId = synthId.substr(0, synthId.indexOf("-"));
    const synthCycle = synthId.substr(synthId.indexOf("-") + 1);
    const synthClass = defaultAssetsConfig[network][synthClassId];

    for (let i = 0; i < synthClass.length; i++) {
      if (synthClass[i].cycle + synthClass[i].year == synthCycle) {
        return synthClass[i] as AssetConfigBase;
      }
    }

    return undefined;
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

/**
 * @notice Helper function to get market chart data.
 * @dev The data gets fetched from Sushiswap every 24h.
 * @param synthId The synth identifier.
 * @param networkId The network / chain id of the synth deployment.
 * @returns An array of synth market data.
 */
export async function getSynthChartData(synthId: string, networkId: number) {
  const synthInfo: AssetConfigBase | undefined = getInfoByIdentifier(
    synthId,
    networkId
  );

  if (synthInfo == undefined) {
    return;
  }

  const tokenData = await sushiData.charts.tokenDaily({
    token_address: synthInfo.token.address,
  });

  return tokenData;
}

/**
 * @notice Helper function to round a number to a certain number of decimals.
 * @param number The number to round.
 * @param decimals The number of decimals to round to.
 * @returns number The rounded number.
 */
export function roundNumber(number: number, decimals: number) {
  return Math.round(number * 10 ** decimals) / 10 ** decimals;
}
