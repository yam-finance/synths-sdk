import { ethers } from "ethers";
import { request } from "graphql-request";
import axios from "axios";
import { ERC20Ethers__factory } from "@uma/contracts-node";
import { defaultAssetsConfig, defaultTestAssetsConfig } from "../lib/config";
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  BLOCKLYTICS_ENDPOINT,
  UNI_SUSHI_PAIR_DATA,
  UNI_SUSHI_DAILY_PAIR_DATA,
  TIMESTAMP_TO_BLOCK,
} from "./queries";
import {
  isAssetConfigEMP,
  isAssetConfigLSP,
  IResentSynthsData,
  AssetConfigLSP,
  AssetConfigEMP,
  IPoolData,
  IPoolToken,
  AssetConfigBase,
} from "types/assets.t";

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
 * @todo Change returns statements.
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
    const poolData: IPoolData = await request(endpoint, query, {
      pairAddress: poolAddress,
      blockNumber: blockNow - 5,
    });

    if (poolData["pair"].token0.id === tokenAddress) {
      return poolData["pair"].reserve0 / poolData["pair"].reserve1;
    } else {
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
 * @TODO Update params to use addresses.
 */
export async function getSynthData(
  poolLocation: string,
  poolAddress: string,
  collateralSymbol: string
) {
  try {
    const rewards = await getYamRewardsByPoolAddress(poolAddress);
    const ts = Math.round(new Date().getTime() / 1000);
    const tsYesterday = ts - 24 * 3600;
    const blockNow = await timestampToBlock(ts);
    const block24hAgo = await timestampToBlock(tsYesterday);

    const endpoint =
      poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
    const query = UNI_SUSHI_PAIR_DATA;
    const poolDataCurrently: IPoolData = await request(endpoint, query, {
      pairAddress: poolAddress,
      blockNumber: blockNow - 5,
    });
    const poolDataYesterday: IPoolData = await request(endpoint, query, {
      pairAddress: poolAddress,
      blockNumber: block24hAgo,
    });

    const poolData = extractPoolData(
      poolDataCurrently,
      poolDataYesterday,
      collateralSymbol
    );

    const synthData = {
      tokenId: poolData.tokenId,
      tokenSymbol: poolData.tokenSymbol,
      apr: rewards,
      price: poolData.tokenPriceCurrently,
      priceChanged24h: getPercentageChange(
        poolData.tokenPriceCurrently,
        poolData.tokenPriceYesterday
      ),
      liquidity: poolData.liquidityCurrently,
      volume24h: Math.abs(poolData.volumeCurrently - poolData.volumeYesterday),
    };

    return synthData;
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

function extractPoolData(
  poolDataCurrently: IPoolData,
  poolDataYesterday: IPoolData,
  collateral: string
) {
  let tokenId;
  let tokenSymbol;
  let tokenPriceCurrently;
  let tokenPriceYesterday;
  let volumeCurrently;
  let volumeYesterday;
  let liquidityCurrently;
  let liquidityYesterday;

  if (poolDataCurrently["pair"].token0.symbol === collateral) {
    tokenId = poolDataCurrently["pair"].token1.id;
    tokenSymbol = poolDataCurrently["pair"].token1.symbol;
    tokenPriceCurrently =
      poolDataCurrently["pair"].reserve0 / poolDataCurrently["pair"].reserve1;
    tokenPriceYesterday =
      poolDataYesterday["pair"].reserve0 / poolDataYesterday["pair"].reserve1;
    volumeCurrently = poolDataCurrently["pair"].volumeToken1;
    volumeYesterday = poolDataYesterday["pair"].volumeToken1;
    liquidityCurrently = poolDataCurrently["pair"].reserveUSD;
    liquidityYesterday = poolDataYesterday["pair"].reserveUSD;
  } else {
    tokenId = poolDataCurrently["pair"].token0.id;
    tokenSymbol = poolDataCurrently["pair"].token0.symbol;
    tokenPriceCurrently =
      poolDataCurrently["pair"].reserve1 / poolDataCurrently["pair"].reserve0;
    tokenPriceYesterday =
      poolDataYesterday["pair"].reserve1 / poolDataYesterday["pair"].reserve0;
    volumeCurrently = poolDataCurrently["pair"].volumeToken0;
    volumeYesterday = poolDataYesterday["pair"].volumeToken0;
    liquidityCurrently = poolDataCurrently["pair"].reserveUSD;
    liquidityYesterday = poolDataYesterday["pair"].reserveUSD;
  }

  return {
    tokenId,
    tokenSymbol,
    tokenPriceCurrently,
    tokenPriceYesterday,
    volumeCurrently,
    volumeYesterday,
    liquidityCurrently,
    liquidityYesterday,
  };
}

/**
 * @notice Helper function to get the data for the most recent synths.
 * @dev Can be used on the front-end to display the most recent synths.
 * @param networkId The network / chain id of the synth deployment.
 * TODO Update params to use addresses.
 * TODO Pass asset config from user.
 */
export async function getRecentSynthData(networkId: number) {
  const recentSynthData: IResentSynthsData = {};

  for (const synthClassName in defaultAssetsConfig[networkId]) {
    const synthClass = defaultAssetsConfig[networkId][synthClassName];
    const lastSynth = synthClass.slice(-1)[0];
    const synthId = synthClassName + "-" + lastSynth.cycle + lastSynth.year;

    if (isAssetConfigEMP(lastSynth)) {
      const data = await getSynthData(
        lastSynth.pool.location,
        lastSynth.pool.address,
        lastSynth.collateral
      );

      // @ts-ignore
      recentSynthData[lastSynth.pool.address] = data;
    } else if (isAssetConfigLSP(lastSynth)) {
      for (const pool of lastSynth.pools) {
        const data = await getSynthData(
          pool.location,
          pool.address,
          lastSynth.collateral
        );

        // @ts-ignore
        recentSynthData[pool.address] = data;
      }
    }
  }

  return recentSynthData;
}

/**
 * @notice Helper function to get the total liquidity and volume of all synths in the last 24h.
 * @param networks Array of networks that the user wants to query.
 * @todo Pass asset config from user.
 */
export async function getTotalMarketData(networks: Array<number>) {
  const totalSynthData: IResentSynthsData = {};
  let totalLiquidity = 0;
  let total24hVolume = 0;

  for (const networkId of networks) {
    for (const synthClassName in defaultAssetsConfig[networkId]) {
      const synthClass = defaultAssetsConfig[networkId][synthClassName];
      for (let i = 0; i < synthClass.length; i++) {
        if (!synthClass[i].expired) {
          const synthId =
            synthClassName + "-" + synthClass[i].cycle + synthClass[i].year;

          if (isAssetConfigEMP(synthClass[i])) {
            const synthData = await getSynthData(
              // @ts-ignore
              synthClass[i].pool.location,
              // @ts-ignore
              synthClass[i].pool.address,
              synthClass[i].collateral
            );
            // @ts-ignore
            totalSynthData[synthClass[i].pool.address] = synthData;
          } else if (isAssetConfigLSP(synthClass[i])) {
            // @ts-ignore
            for (const pool of synthClass[i].pools) {
              const synthData = await getSynthData(
                pool.location,
                pool.address,
                synthClass[i].collateral
              );
              // @ts-ignore
              totalSynthData[pool.address] = synthData;
            }
          }
        }
      }
    }
  }

  for (const key in totalSynthData) {
    // @ts-ignore
    totalLiquidity += Number(totalSynthData[key]["liquidity"]);
    // @ts-ignore
    total24hVolume += Number(totalSynthData[key]["volume24h"]);
  }

  const response = await axios.get<{ total: string }>(
    `https://api.yam.finance/tvl/degenerative`
  );

  return {
    totalLiquidity: totalLiquidity,
    total24hVolume: total24hVolume,
    totalTVL: response.data["total"],
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
 * @notice Helper function to get the rewards by pool address.
 * @dev Should be removed after api accepts a pool address instead of an id.
 */
export async function getYamRewardsByPoolAddress(poolAddress: string) {
  try {
    let synthId;
    let poolCount: number = 0;

    for (const networkId in defaultAssetsConfig) {
      for (const synthClassName in defaultAssetsConfig[networkId]) {
        const synthClass = defaultAssetsConfig[networkId][synthClassName];
        for (let i = 0; i < synthClass.length; i++) {
          if (isAssetConfigEMP(synthClass[i])) {
            // @ts-ignore
            if (synthClass[i].pool.address == poolAddress) {
              synthId =
                synthClassName + "-" + synthClass[i].cycle + synthClass[i].year;
              poolCount += 1;
              break;
            }
          } else if (isAssetConfigLSP(synthClass[i])) {
            // @ts-ignore
            for (const pool of synthClass[i].pools) {
              if (pool.address == poolAddress) {
                synthId =
                  synthClassName +
                  "-" +
                  synthClass[i].cycle +
                  synthClass[i].year;
                // @ts-ignore
                poolCount += synthClass[i].pools.length;
                break;
              }
            }
          }
        }
      }
    }

    const response = await axios.get<{ aprMultiplier: string }>(
      `https://data.yam.finance/degenerative/apr/${synthId}`
    );

    const rewards = Number(response.data.aprMultiplier) / poolCount;

    return String(rewards);
  } catch (e) {
    console.error("error", e);
    return undefined;
  }
}

export interface IPairData {}

/**
 * @notice Helper function to get pool data.
 * @dev Since the subgraph only indexes data if something has changed we fill the data manually.
 * @param poolAddress The pool address you want to get the data from.
 * @param tokenAddress The token of which you want to get the price.
 * @param poolLocation The pool location to help choose the right subgraph endpoint.
 * @returns An array of token market data.
 */
export async function getPoolChartData(
  poolLocation: string,
  poolAddress: string,
  tokenAddress: string
) {
  const TWENTY_FOUR_HOURS = 86400;
  const dayIndexSet = new Set();
  const dayIndexArray: any[] = [];
  const tsEnd = Math.round(new Date().getTime() / 1000);
  const tsStart = tsEnd - 365 * 24 * 3600;

  const endpoint =
    poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
  const query = UNI_SUSHI_DAILY_PAIR_DATA;
  const pairData = await request(endpoint, query, {
    pairAddress: poolAddress,
  });

  let data = [];
  const graphData = pairData.pairDayDatas;

  graphData.forEach((_: any, i: string | number) => {
    let price;

    if (graphData[i].token0.id == tokenAddress) {
      price = graphData[i].reserve0 / graphData[i].reserve1;
    } else {
      price = graphData[i].reserve1 / graphData[i].reserve0;
    }

    graphData[i].price = price;
    dayIndexSet.add((graphData[i].date / TWENTY_FOUR_HOURS).toFixed(0));
    dayIndexArray.push(graphData[i]);

    data.push({
      date: new Date(graphData[i].date * 1000),
      timestamp: graphData[i].date,
      reserveUSD: graphData[i].reserveUSD,
      volumeUSD: graphData[i].volumeUSD,
      price: graphData[i].price,
    });
  });

  let timestamp =
    graphData[0] && graphData[0].date ? graphData[0].date : tsStart;
  let latestReserveUSD = graphData[0] && graphData[0].reserveUSD;
  let latestVolumeUSD = graphData[0] && graphData[0].volumeUSD;
  let latestPrice = graphData[0] && graphData[0].price;
  let index = 1;

  while (timestamp < tsEnd - TWENTY_FOUR_HOURS) {
    const nextDay = timestamp + TWENTY_FOUR_HOURS;
    const currentDayIndex = (nextDay / TWENTY_FOUR_HOURS).toFixed(0);
    if (!dayIndexSet.has(currentDayIndex)) {
      data.push({
        // id: `${data[0].id.split("-")[0]}-${nextDay / TWENTY_FOUR_HOURS}`,
        date: new Date(nextDay * 1000),
        timestamp: nextDay,
        reserveUSD: latestReserveUSD,
        volumeUSD: latestVolumeUSD,
        price: latestPrice,
      });
    } else {
      latestReserveUSD = dayIndexArray[index].reserveUSD;
      latestVolumeUSD = dayIndexArray[index].volumeUSD;
      if (dayIndexArray[index].token0.id == tokenAddress) {
        latestPrice =
          dayIndexArray[index].reserve0 / dayIndexArray[index].reserve1;
      } else {
        latestPrice =
          dayIndexArray[index].reserve1 / dayIndexArray[index].reserve0;
      }
      index = index + 1;
    }
    timestamp = nextDay;
  }

  data = data.sort((a, b) =>
    parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1
  );

  console.log(data);

  return data;
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
export function getPercentageChange(oldNumber: number, newNumber: number) {
  const decreaseValue = oldNumber - newNumber;

  return (decreaseValue / oldNumber) * 100;
}

/**
 * @notice Converts a given timestamp into a block number.
 * @param timestamp The timestamp that should be converted.
 */
export async function timestampToBlock(timestamp: number) {
  timestamp =
    String(timestamp).length > 10 ? Math.floor(timestamp / 1000) : timestamp;

  const endpoint = BLOCKLYTICS_ENDPOINT;
  const query = TIMESTAMP_TO_BLOCK;
  const result = await request(endpoint, query, {
    timestamp: timestamp,
  });

  return Number(result.blocks[0].number);
}
