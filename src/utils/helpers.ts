import { ethers } from "ethers";
import { request } from "graphql-request";
import axios from "axios";
import { ERC20Ethers__factory } from "@uma/contracts-node";
import { defaultAssetsConfig } from "../lib/config";
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  MATIC_SUSHISWAP_ENDPOINT,
  BLOCKLYTICS_ENDPOINT,
  UNI_SUSHI_PAIR_DATA,
  UNI_SUSHI_DAILY_PAIR_DATA,
  TIMESTAMP_TO_BLOCK,
} from "./queries";
import {
  isAssetConfigEMP,
  isAssetConfigLSP,
  AssetConfigLSP,
  AssetConfigEMP,
  IPoolData,
  IDailyPoolData,
  IPairData,
  assertAssetConfigEMP,
  assertAssetConfigLSP,
  SynthsAssetsConfig,
  ISynthsData,
} from "../types/assets.t";

/**
 * @notice Helper function to get the decimals of a erc20 token.
 * @param address Address of the erc20 contract.
 * @param ethersProvider Ethers provider instance.
 * @returns The erc20 token decimals.
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
    return;
  }
}

/**
 * @notice Helper function to get the current DEX token price.
 * @param poolLocation Location string of the DEX pool (e.g. "uni").
 * @param poolAddress Address of the DEX pool.
 * @param tokenAddress Address of the token.
 * @param network? Chain id to decide which subgraph endpoint to use, defaults to mainnet.
 * @returns The DEX token price in WEI.
 */
export async function getCurrentDexTokenPrice(
  poolLocation: string,
  poolAddress: string,
  tokenAddress: string,
  network?: string
) {
  try {
    const ts = Math.round(new Date().getTime() / 1000);
    const blockNow = await timestampToBlock(ts);
    let endpoint =
      poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;

    if (network === "137") {
      endpoint = MATIC_SUSHISWAP_ENDPOINT;
    }

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
    return;
  }
}

/**
 * @notice Helper function to get relevant synth market data.
 * @param synthId The synth identifier.
 * @param networkId The network / chain id of the synth deployment.
 * @param network? Chain id to decide which subgraph endpoint to use, defaults to mainnet.
 * @param userConfig? A user assets userConfig.
 * @returns An object with the synth market data.
 */
export async function getSynthData(
  poolLocation: string,
  poolAddress: string,
  collateralSymbol: string,
  network?: string,
  userConfig?: SynthsAssetsConfig
) {
  try {
    const config = userConfig ?? defaultAssetsConfig;
    const rewards = config
      ? await getYamRewardsByPoolAddress(poolAddress, config)
      : "0";
    const ts = Math.round(new Date().getTime() / 1000);
    const tsYesterday = ts - 24 * 3600;
    const blockNow = await timestampToBlock(ts);
    const block24hAgo = await timestampToBlock(tsYesterday);

    let endpoint =
      poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;

    if (network === "137") {
      endpoint = MATIC_SUSHISWAP_ENDPOINT;
    }

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

    const synthData: ISynthsData = {
      tokenId: poolData.tokenId,
      tokenSymbol: poolData.tokenSymbol,
      collateralSymbol: poolData.collateralSymbol,
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
    return;
  }
}

function extractPoolData(
  poolDataCurrently: IPoolData,
  poolDataYesterday: IPoolData,
  collateral: string
) {
  let tokenId;
  let tokenSymbol;
  let collateralSymbol;
  let tokenPriceCurrently;
  let tokenPriceYesterday;
  let volumeCurrently;
  let volumeYesterday;
  let liquidityCurrently;
  let liquidityYesterday;

  if (poolDataCurrently["pair"].token0.symbol === collateral) {
    tokenId = poolDataCurrently["pair"].token1.id;
    tokenSymbol = poolDataCurrently["pair"].token1.symbol;
    collateralSymbol = poolDataCurrently["pair"].token0.symbol;
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
    collateralSymbol = poolDataCurrently["pair"].token1.symbol;
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
    collateralSymbol,
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
 * @param userConfig? A user assets userConfig.
 * @returns The most recent synth market data.
 */
export async function getRecentSynthData(
  networkId: number,
  userConfig?: SynthsAssetsConfig
) {
  const config = userConfig ?? defaultAssetsConfig;
  const recentSynthData: ISynthsData[] = [];

  for (const synthClassName in config[networkId]) {
    const synthClass = config[networkId][synthClassName];
    const lastSynth = synthClass.slice(-1)[0];

    if (lastSynth.expired) continue;

    if (isAssetConfigEMP(lastSynth)) {
      const synth = assertAssetConfigEMP(lastSynth);
      const data = await getSynthData(
        synth.pool.location,
        synth.pool.address,
        synth.collateral
      );

      data && recentSynthData.push(data);
    } else if (isAssetConfigLSP(lastSynth)) {
      const synth = assertAssetConfigLSP(lastSynth);
      for (const pool of synth.pools) {
        const data = await getSynthData(
          pool.location,
          pool.address,
          lastSynth.collateral
        );

        data && recentSynthData.push(data);
      }
    }
  }

  return recentSynthData;
}

/**
 * @notice Helper function to get the total liquidity and volume of all synths in the last 24h.
 * @param networks Array of networks that the user wants to query.
 * @param userConfig? A user assets userConfig.
 * @returns The total synths market data.
 */
export async function getTotalMarketData(
  networks: Array<number>,
  userConfig?: SynthsAssetsConfig
) {
  const config = userConfig ?? defaultAssetsConfig;
  const totalSynthData: { [x: string]: ISynthsData | undefined } = {};
  let totalTVL;
  let totalLiquidity = 0;
  let total24hVolume = 0;
  let synthCount = 0;

  for (const networkId of networks) {
    for (const synthClassName in config[networkId]) {
      const synthClass = config[networkId][synthClassName];
      for (let i = 0; i < synthClass.length; i++) {
        if (!synthClass[i].expired) {
          if (isAssetConfigEMP(synthClass[i])) {
            const synth = assertAssetConfigEMP(synthClass[i]);
            const synthData = await getSynthData(
              synth.pool.location,
              synth.pool.address,
              synth.collateral
            );

            totalSynthData[synth.pool.address] = synthData;
            // synthCount += 1;
          } else if (isAssetConfigLSP(synthClass[i])) {
            const synth = assertAssetConfigLSP(synthClass[i]);
            for (const pool of synth.pools) {
              const synthData = await getSynthData(
                pool.location,
                pool.address,
                synthClass[i].collateral
              );

              totalSynthData[pool.address] = synthData;
              synthCount += 1;
            }
          }
        }
      }
    }
  }

  for (const key in totalSynthData) {
    totalLiquidity += Number(totalSynthData[key]?.liquidity) || 0;
    total24hVolume += Number(totalSynthData[key]?.liquidity) || 0;
  }

  await axios
    .get<{ total: string }>(`https://api.yam.finance/tvl/degenerative`)
    .then((response) => {
      totalTVL = response.data["total"];
    })
    .catch((error) => {
      console.log(error);
    });

  return {
    totalLiquidity: totalLiquidity,
    total24hVolume: total24hVolume,
    totalTVL: totalTVL,
    totalSynthCound: synthCount,
  };
}

/**
 * @notice Helper function to get data from `assets.json` according to the synth id.
 * @param synthId The synth identifier.
 * @param networkId The network / chain id of the synth deployment.
 * @param userConfig? A user assets userConfig.
 * @returns The synth info from the `assets.json`.
 */
export function getInfoByIdentifier(
  synthId: string,
  network: number,
  userConfig?: SynthsAssetsConfig
) {
  try {
    const config = userConfig ?? defaultAssetsConfig;
    const synthClassId = synthId.substr(0, synthId.indexOf("-"));
    const synthCycle = synthId.substr(synthId.indexOf("-") + 1);
    const synthClass = config[network][synthClassId];

    for (let i = 0; i < synthClass.length; i++) {
      if (synthClass[i].cycle + synthClass[i].year == synthCycle) {
        if (isAssetConfigEMP(synthClass[i])) {
          return synthClass[i] as AssetConfigEMP;
        } else if (isAssetConfigLSP(synthClass[i])) {
          return synthClass[i] as AssetConfigLSP;
        }
      }
    }

    return;
  } catch (e) {
    console.error("error", e);
    return;
  }
}

/**
 * @notice Helper function to get the rewards by pool address.
 * @dev Should be removed after api accepts a pool address instead of an id.
 * @param poolAddress The DEX pool address.
 * @param userConfig? A user assets userConfig.
 * @returns The rewards for the given pool.
 */
export async function getYamRewardsByPoolAddress(
  poolAddress: string,
  userConfig?: SynthsAssetsConfig
) {
  try {
    const config = userConfig ?? defaultAssetsConfig;
    let synthId = "";
    let poolCount = 0;

    for (const networkId in config) {
      for (const synthClassName in config[networkId]) {
        const synthClass = config[networkId][synthClassName];
        for (let i = 0; i < synthClass.length; i++) {
          if (isAssetConfigEMP(synthClass[i])) {
            const synth = assertAssetConfigEMP(synthClass[i]);
            if (synth.pool.address == poolAddress) {
              synthId = synthClassName + "-" + synth.cycle + synth.year;
              poolCount += 1;
              break;
            }
          } else if (isAssetConfigLSP(synthClass[i])) {
            const synth = assertAssetConfigLSP(synthClass[i]);
            for (const pool of synth.pools) {
              if (pool.address == poolAddress) {
                synthId = synthClassName + "-" + synth.cycle + synth.year;
                poolCount += synth.pools.length;
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
    return;
  }
}

/**
 * @notice Helper function to get pool data.
 * @dev Since the subgraph only indexes data if something has changed we fill the data manually.
 * @param poolAddress The pool address you want to get the data from.
 * @param tokenAddress The token of which you want to get the price.
 * @param poolLocation The pool location to help choose the right subgraph endpoint.
 * @param network? Chain id to decide which subgraph endpoint to use, defaults to mainnet.
 * @returns An array of token market data.
 */
export async function getPoolChartData(
  poolLocation: string,
  poolAddress: string,
  tokenAddress: string,
  network?: string
) {
  const TWENTY_FOUR_HOURS = 86400;
  const dayIndexSet = new Set();
  const dayIndexArray: IDailyPoolData[] = [];
  const tsEnd = Math.round(new Date().getTime() / 1000);
  const tsStart = tsEnd - 365 * 24 * 3600;

  let endpoint = poolLocation === "uni" ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;

  if (network === "137") {
    endpoint = MATIC_SUSHISWAP_ENDPOINT;
  }

  const query = UNI_SUSHI_DAILY_PAIR_DATA;
  const pairData = await request<{ pairDayDatas: IDailyPoolData[] }>(
    endpoint,
    query,
    {
      pairAddress: poolAddress,
    }
  );

  let data = [];
  const graphData: IDailyPoolData[] = pairData.pairDayDatas;

  for (const i of graphData) {
    let price;

    if (i.token0.id == tokenAddress) {
      price = parseInt(i.reserve0) / parseInt(i.reserve1);
    } else {
      price = parseInt(i.reserve1) / parseInt(i.reserve0);
    }

    i.price = price;
    dayIndexSet.add((i.date / TWENTY_FOUR_HOURS).toFixed(0));
    dayIndexArray.push(i);

    data.push({
      date: new Date(i.date * 1000),
      timestamp: String(i.date),
      reserveUSD: i.reserveUSD,
      volumeUSD: i.volumeUSD,
      price: i.price,
    } as IPairData);
  }

  let timestamp: number =
    graphData[0] && graphData[0].date ? graphData[0].date : tsStart;
  let latestReserveUSD: string = graphData[0] && graphData[0].reserveUSD;
  let latestVolumeUSD: string = graphData[0] && graphData[0].volumeUSD;
  let latestPrice: number = graphData[0] && graphData[0].price;
  let index = 1;

  while (timestamp < tsEnd - TWENTY_FOUR_HOURS) {
    const nextDay: number = timestamp + TWENTY_FOUR_HOURS;
    const currentDayIndex = (nextDay / TWENTY_FOUR_HOURS).toFixed(0);
    if (!dayIndexSet.has(currentDayIndex)) {
      data.push({
        // id: `${data[0].id.split("-")[0]}-${nextDay / TWENTY_FOUR_HOURS}`,
        date: new Date(nextDay * 1000),
        timestamp: String(nextDay),
        reserveUSD: latestReserveUSD,
        volumeUSD: latestVolumeUSD,
        price: latestPrice,
      } as IPairData);
    } else {
      latestReserveUSD = dayIndexArray[index].reserveUSD;
      latestVolumeUSD = dayIndexArray[index].volumeUSD;
      if (dayIndexArray[index].token0.id == tokenAddress) {
        latestPrice =
          parseInt(dayIndexArray[index].reserve0) /
          parseInt(dayIndexArray[index].reserve1);
      } else {
        latestPrice =
          parseInt(dayIndexArray[index].reserve1) /
          parseInt(dayIndexArray[index].reserve0);
      }
      index = index + 1;
    }
    timestamp = nextDay;
  }

  data = data.sort((a, b) =>
    parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1
  );

  return data;
}

/**
 * @notice Helper function to round a number to a certain number of decimals.
 * @param number The number to round.
 * @param decimals The number of decimals to round to.
 * @returns The rounded number.
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
 * @returns A block number.
 */
export async function timestampToBlock(timestamp: number) {
  timestamp =
    String(timestamp).length > 10 ? Math.floor(timestamp / 1000) : timestamp;

  const endpoint = BLOCKLYTICS_ENDPOINT;
  const query = TIMESTAMP_TO_BLOCK;
  const result = await request<{ blocks: [{ number: string }] }>(
    endpoint,
    query,
    {
      timestamp: timestamp,
    }
  );

  return Number(result.blocks[0].number);
}
