import { ethers } from "ethers";
import { request } from "graphql-request";
import axios from "axios";
import sushiData from "@sushiswap/sushi-data";
import { Erc20 } from "../types/abi";
import ERC20Abi from "../abi/erc20.json";
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  UNI_SUSHI_PAIR_DATA,
} from "./queries";

/**
 * @notice Helper function to get the decimals of a erc20 token.
 * @param address Address of the erc20 contract.
 * @param ethersProvider Ethers provider instance.
 * @returns `undefined` or the erc20 token decimals.
 */
export async function getTokenDecimals(
  address: string,
  ethersProvider: ethers.providers.Web3Provider
): Promise<number | undefined> {
  try {
    const contract = new ethers.Contract(
      address,
      ERC20Abi,
      ethersProvider
    ) as Erc20;
    const decimals: number = await contract.decimals();

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
): Promise<number | undefined> {
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

export async function getSynthData(
  synthId: string,
  tokenAddress: string
): Promise<any | undefined> {
  try {
    const tokenData = await sushiData.exchange.token24h({
      token_address: tokenAddress,
    });

    const response = await axios.get(
      `https://data.yam.finance/degenerative/apr/${synthId}`
    );
    const apr: string = response.data["aprMultiplier"];

    return {
      apr: apr,
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

export async function getYamSynthsTotalTVL(): Promise<string> {
  const response = await axios.get(`https://api.yam.finance/tvl/degenerative`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tvl: string = response.data["total"];

  return tvl;
}

export async function getSynthChartData(
  tokenAddress: string
): Promise<any | undefined> {
  const tokenData = await sushiData.charts.tokenDaily({
    token_address: tokenAddress,
  });
  return tokenData;
}

// // @todo Replace web3 with ether.js.

// import Web3 from "web3";
// import { ethers } from "ethers";
// import WETHContract from "../abi/weth.json";
// import request from "request";
// import { provider, TransactionReceipt } from "web3-core";
// import { AbiItem } from "web3-utils";
// import { WETH } from "../lib/config/";

// export const sleep = (ms: number) => {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// };

// export const waitTransaction = async (provider: any, txHash: string) => {
//   const web3 = new Web3(provider);
//   let txReceipt: TransactionReceipt | null = null;
//   while (txReceipt === null) {
//     const r = await web3.eth.getTransactionReceipt(txHash);
//     txReceipt = r;
//     await sleep(2000);
//   }
//   return txReceipt.status;
// };

// const requestHttp = (url: any) => {
//   return new Promise((resolve, reject) => {
//     request(
//       {
//         url: url,
//         json: true,
//       },
//       (error, response, body) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve(body);
//         }
//       }
//     );
//   });
// };

// export const getAllowance = async (
//   userAddress: string,
//   spenderAddress: string,
//   tokenAddress: string,
//   provider: provider
// ): Promise<string> => {
//   try {
//     const tokenContract = getERC20Contract(provider, tokenAddress);
//     const allowance: string = await tokenContract.methods
//       .allowance(userAddress, spenderAddress)
//       .call();
//     return allowance;
//   } catch (e) {
//     return "0";
//   }
// };

// export const approve = async (
//   userAddress: string,
//   spenderAddress: string,
//   tokenAddress: string,
//   provider: provider,
//   onTxHash?: (txHash: string) => void
// ): Promise<boolean> => {
//   try {
//     const tokenContract = getERC20Contract(provider, tokenAddress);
//     return tokenContract.methods
//       .approve(spenderAddress, ethers.constants.MaxUint256)
//       .send(
//         { from: userAddress, gas: 80000 },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.log("ERC20 could not be approved", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(provider, txHash);
//           if (!status) {
//             console.log("Approval transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//   } catch (e) {
//     console.log("error", e);
//     return false;
//   }
// };

// export const getWETH = async (provider: provider) => {
//   const web3 = new Web3(provider);
//   const contractWETH = new web3.eth.Contract(
//     WETHContract.abi as unknown as AbiItem,
//     WETH
//   );
//   return contractWETH;
// };

// export const getBalance = async (
//   provider: provider,
//   tokenAddress: string,
//   userAddress: string
// ): Promise<string> => {
//   const tokenContract = getERC20Contract(provider, tokenAddress);
//   try {
//     const balance: string = await tokenContract.methods
//       .balanceOf(userAddress)
//       .call();
//     return balance;
//   } catch (e) {
//     return "0";
//   }
// };

// export async function getContractInfo(address: string) {
//   const data: any = await requestHttp(
//     `https://api.coingecko.com/api/v3/coins/ethereum/contract/${address}`
//   );
//   return data;
// }

// export async function getPriceByContract(address: string, toCurrency?: string) {
//   let result = await getContractInfo(address);
//   return (
//     result &&
//     result.market_data &&
//     result.market_data.current_price[toCurrency || "usd"]
//   );
// }

// export async function multiplyEach(arg1: any, arg2: any) {
//   const result: number[] = [];
//   for (let i = 0; i < arg1.length; i++) {
//     result[i] = arg1[i] * arg2[i];
//   }
//   return result;
// }
