// // @todo Replace web3 with ether.js

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
