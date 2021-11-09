import { ethers } from "ethers";
import { request } from "graphql-request";
import axios from "axios";
import { ERC20Ethers__factory } from "@uma/contracts-node";
import { defaultAssetsConfig, defaultTestAssetsConfig } from "../lib/config";
import sushiData from '@sushiswap/sushi-data';
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  BLOCKLYTICS_ENDPOINT,
  UNI_SUSHI_PAIR_DATA,
  UNI_SUSHI_DAILY_PAIR_DATA,
  TIMESTAMP_TO_BLOCK
} from "./queries";
import { isAssetConfigEMP, isAssetConfigLSP, IResentSynthsData, AssetConfigLSP, AssetConfigEMP } from "types/assets.t";

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
    const ts = Math.round(new Date().getTime() / 1000);
    const blockNow = await timestampToBlock(ts);
    /// @dev Get pool data from graph endpoints.
    const endpoint =
      poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
    const query = UNI_SUSHI_PAIR_DATA;
    // eslint-disable-next-line
    const poolData: any = await request(endpoint, query, {
      pairAddress: poolAddress,
      blockNumber: blockNow - 5
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
    const synthInfo = getInfoByIdentifier(
      synthId,
      networkId
    );

    if (synthInfo == undefined) {
      return;
    }

    const response = await axios.get(
      `https://data.yam.finance/degenerative/apr/${synthId}`
    );

    const data = response.data as { aprMultiplier: string };
    const synthData = {};
    const ts = Math.round(new Date().getTime() / 1000);
    const tsYesterday = ts - (24 * 3600);
    const blockNow = await timestampToBlock(ts);
    const block24hAgo = await timestampToBlock(tsYesterday);

    let poolDataCurrently;
    let poolDataYesterday;

    if (isAssetConfigEMP(synthInfo)) {
      const endpoint = synthInfo.pool.location === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
      const query = UNI_SUSHI_PAIR_DATA;
      poolDataCurrently = await request(endpoint, query, {
        pairAddress: synthInfo.pool.address,
        blockNumber: blockNow - 5
      });
      poolDataYesterday = await request(endpoint, query, {
        pairAddress: synthInfo.pool.address,
        blockNumber: block24hAgo
      });

      const poolData = extractPoolData(poolDataCurrently, poolDataYesterday, synthInfo.collateral);

      // @ts-ignore
      synthData[poolData.tokenId] = {
        apr: data.aprMultiplier,
        price: poolData.tokenPriceCurrently,
        priceChanged24h: getPercentageChange(poolData.tokenPriceCurrently, poolData.tokenPriceYesterday),
        liquidity24h: poolData.liquidityCurrently,
        volume24h: poolData.volumeCurrently
      }
    } else if (isAssetConfigLSP(synthInfo)) {
      for (const pool of synthInfo.pools) {
        const endpoint = pool.location === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
        const query = UNI_SUSHI_PAIR_DATA;
        poolDataCurrently = await request(endpoint, query, {
          pairAddress: pool.address,
          blockNumber: blockNow - 5
        });
        poolDataYesterday = await request(endpoint, query, {
          pairAddress: pool.address,
          blockNumber: block24hAgo
        });

        const poolData = extractPoolData(poolDataCurrently, poolDataYesterday, synthInfo.collateral);

        // @ts-ignore
        synthData[poolData.tokenId] = {
          apr: data.aprMultiplier,
          price: poolData.tokenPriceCurrently,
          priceChanged24h: getPercentageChange(poolData.tokenPriceCurrently, poolData.tokenPriceYesterday),
          liquidity24h: poolData.liquidityCurrently,
          volume24h: poolData.volumeCurrently
        }
      }
    } 

    return synthData;
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

// @ts-ignore
function extractPoolData(poolDataCurrently, poolDataYesterday, collateral) {
    let tokenId;
    let tokenPriceCurrently;
    let tokenPriceYesterday;
    let volumeCurrently;
    let volumeYesterday;
    let liquidityCurrently;
    let liquidityYesterday;

    if (poolDataCurrently["pair"].token0.symbol === collateral) {
      tokenId = poolDataCurrently["pair"].token1.symbol;
      tokenPriceCurrently = poolDataCurrently["pair"].reserve0 / poolDataCurrently["pair"].reserve1;
      tokenPriceYesterday = poolDataYesterday["pair"].reserve0 / poolDataYesterday["pair"].reserve1;
      volumeCurrently = poolDataCurrently["pair"].volumeUSD;
      volumeYesterday = poolDataYesterday["pair"].volumeUSD;
      liquidityCurrently = poolDataCurrently["pair"].reserveUSD;
      liquidityYesterday = poolDataYesterday["pair"].reserveUSD;
    } else {
      tokenId = poolDataCurrently["pair"].token0.symbol;
      tokenPriceCurrently = poolDataCurrently["pair"].reserve1 / poolDataCurrently["pair"].reserve0;
      tokenPriceYesterday = poolDataYesterday["pair"].reserve1 / poolDataYesterday["pair"].reserve0;
      volumeCurrently = poolDataCurrently["pair"].volumeUSD;
      volumeYesterday = poolDataYesterday["pair"].volumeUSD;
      liquidityCurrently = poolDataCurrently["pair"].reserveUSD;
      liquidityYesterday = poolDataYesterday["pair"].reserveUSD;
    }

    return {
      tokenId,
      tokenPriceCurrently,
      tokenPriceYesterday,
      volumeCurrently,
      volumeYesterday,
      liquidityCurrently,
      liquidityYesterday
    }
}

/**
 * @notice Helper function to get the data for the most recent synths.
 * @dev Can be used on the front-end to display the most recent synths.
 * @param networkId The network / chain id of the synth deployment.
 */
export async function getRecentSynthData(networkId: number) {
  const recentSynthData: IResentSynthsData = {};

  for (const synthClassName in defaultAssetsConfig[networkId]) {
    const synthClass = defaultAssetsConfig[networkId][synthClassName];
    const lastSynth = synthClass.slice(-1)[0];
    const synthId = synthClassName + "-" + lastSynth.cycle + lastSynth.year;
    const synthData = await getSynthData(synthId, networkId);

    if (synthData === undefined) {
      break;
    }

    recentSynthData[synthClassName] = synthData;
  }

  return recentSynthData;
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

          for (const key in synthData) {
            // @ts-ignore
            totalLiquidity += Number(synthData[key]["liquidity24h"]);
            // @ts-ignore
            totalVolume += Number(synthData[key]["volume24h"]);
          }
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
        if (isAssetConfigEMP(synthClass[i])) {
          return synthClass[i] as AssetConfigEMP;
        } else if (isAssetConfigLSP(synthClass[i])) {
          return synthClass[i] as AssetConfigLSP;
        }
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
 * TODO Fill dates with no entries.
 */
export async function getSynthChartData(synthId: string, networkId: number) {
  const synthInfo = getInfoByIdentifier(
    synthId,
    networkId
  );

  if (synthInfo == undefined) {
    return;
  }

  const ts = Math.round(new Date().getTime() / 1000);
  const tsMonthAgo = ts - (30 * 24 * 3600);
  let pairData;

  if (isAssetConfigEMP(synthInfo)) {
    const endpoint = synthInfo.pool.location === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
    const query = UNI_SUSHI_DAILY_PAIR_DATA;
    pairData = await request(endpoint, query, {
      pairAddress: synthInfo.pool.address,
      startingTime: tsMonthAgo,
      endingTime: ts
    });
    console.log(pairData);

    pairData = await sushiData.charts.pairDaily({
      pair_address: synthInfo.pool.address,
    });
    console.log(pairData);
  } 

  return pairData;
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

/**
 * @notice Calculates the change between 2 numbers in percentage.
 * @param oldNumber The initial value.
 * @param newNumber The value that changed.
 */
export function getPercentageChange(oldNumber: number, newNumber: number){
  const decreaseValue = oldNumber - newNumber;

  return (decreaseValue / oldNumber) * 100;
}

/**
 * @notice Converts a given timestamp into a block number.
 * @param timestamp The timestamp that should be converted.
 */
export async function timestampToBlock(timestamp: number) {
  timestamp = String(timestamp).length > 10 ? Math.floor(timestamp / 1000) : timestamp;

  const endpoint = BLOCKLYTICS_ENDPOINT;
  const query = TIMESTAMP_TO_BLOCK;
  const result = await request(endpoint, query, {
    timestamp: timestamp,
  });

  return Number(result.blocks[0].number);
}
