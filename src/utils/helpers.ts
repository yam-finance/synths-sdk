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
import { AssetConfigBase } from "types/assets.t";

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
 * @returns `undefined` or the DEX token price.
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
 * @notice Helper function to get the YAM Synths total TVL.
 * @returns The total tvl of all yam synths.
 */
export async function getYamSynthsTotalTVL() {
  const response = await axios.get(`https://api.yam.finance/tvl/degenerative`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return response.data["total"] as string;
}

/**
 * @notice Helper function to get market chart data.
 * @param tokenAddress Address of the Synth.
 * @returns An array of synth market data.
 */
export async function getSynthChartData(tokenAddress: string) {
  const tokenData = await sushiData.charts.tokenDaily({
    token_address: tokenAddress,
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
