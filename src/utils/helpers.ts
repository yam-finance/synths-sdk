import Web3 from "web3";
import WETHContract from "../abi/weth.json";
import YAMContract from "../abi/yam.json";
import BigNumber from "bignumber.js";
import request from "request";
import { provider, TransactionReceipt } from "web3-core";
import { AbiItem } from "web3-utils";
import { WETH } from "./addresses";
import { ethers } from "ethers";
import UNIFactContract from "../abi/uniFactory.json";
import UNIContract from "../abi/uni.json"
import { USDC } from "../utils/addresses"

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const waitTransaction = async (provider: any, txHash: string) => {
  const web3 = new Web3(provider);
  let txReceipt: TransactionReceipt | null = null;
  while (txReceipt === null) {
    const r = await web3.eth.getTransactionReceipt(txHash);
    txReceipt = r;
    await sleep(2000);
  }
  return txReceipt.status;
};

const requestHttp = (url: any) => {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      json: true,
    }, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

export const getERC20Contract = (provider: provider, address: string) => {
  const web3 = new Web3(provider);
  const contract = new web3.eth.Contract((YAMContract.abi as unknown) as AbiItem, address);
  return contract;
};

// TODO update with custom ABIs (balanceOf)
// export const getERC20Contract = async (provider: provider, address: string, abi: any) => {
//   const abiContract = {
//     [WETH]:1,
//     [YAM]:1,
//   }
//   const web3 = new Web3(provider);
//   const contractWETH = new web3.eth.Contract((abiContract as unknown) as AbiItem, address);
//   return contractWETH;
// };

export const getAllowance = async (userAddress: string, spenderAddress: string, tokenAddress: string, provider: provider): Promise<string> => {
  try {
    const tokenContract = getERC20Contract(provider, tokenAddress);
    const allowance: string = await tokenContract.methods.allowance(userAddress, spenderAddress).call();
    return allowance;
  } catch (e) {
    return "0";
  }
};

export const approve = async (
  userAddress: string,
  spenderAddress: string,
  tokenAddress: string,
  provider: provider,
  onTxHash?: (txHash: string) => void
): Promise<boolean> => {
  try {
    const tokenContract = getERC20Contract(provider, tokenAddress);
    return tokenContract.methods
      .approve(spenderAddress, ethers.constants.MaxUint256)
      .send({ from: userAddress, gas: 80000 }, async (error: any, txHash: string) => {
        if (error) {
          console.log("ERC20 could not be approved", error);
          onTxHash && onTxHash("");
          return false;
        }
        if (onTxHash) {
          onTxHash(txHash);
        }
        const status = await waitTransaction(provider, txHash);
        if (!status) {
          console.log("Approval transaction failed.");
          return false;
        }
        return true;
      });
  } catch (e) {
    console.log("error", e);
    return false;
  }
};

export const getWETH = async (provider: provider) => {
  const web3 = new Web3(provider);
  const contractWETH = new web3.eth.Contract((WETHContract.abi as unknown) as AbiItem, WETH);
  return contractWETH;
};

export const getBalance = async (provider: provider, tokenAddress: string, userAddress: string): Promise<string> => {
  const tokenContract = getERC20Contract(provider, tokenAddress);
  try {
    const balance: string = await tokenContract.methods.balanceOf(userAddress).call();
    return balance;
  } catch (e) {
    return "0";
  }
};

export async function getContractInfo(address: string) {
  const data: any = await requestHttp(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${address}`);
  return data;
}

export async function getPriceByContract(address: string, toCurrency?: string) {
  let result = await getContractInfo(address);
  return result && result.market_data && result.market_data.current_price[toCurrency || "usd"];
}

async function getUNIFact(provider: provider) {
  const web3 = new Web3(provider);
  const uniFactContract = new web3.eth.Contract((UNIFactContract.abi as unknown) as AbiItem, "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f");
  return uniFactContract;
}

async function getUNI(provider: provider, address: string) {
  const web3 = new Web3(provider)
  const uniContract = new web3.eth.Contract((UNIContract.abi as unknown) as AbiItem, address);
  return uniContract;
}

export async function getUniPrice(provider: provider, tokenA: string, tokenB: string) {
  const uniFact = await getUNIFact(provider);
  try {
    const pair = await uniFact.methods.getPair(tokenA, tokenB).call();
    const uniPair = await getUNI(provider, pair);
    const token0 = await uniPair.methods.token0().call();
    let reserves0: any = 0;
    let reserves1: any = 0;
    const res = await uniPair.methods.getReserves().call();
    reserves0 = new BigNumber(res._reserve0);
    reserves1 = new BigNumber(res._reserve1);
    if (token0 == tokenA || token0.toLowerCase() == USDC) {
      return reserves0.dividedBy(reserves1);
    } else {
      return reserves1.dividedBy(reserves0);
    }
  } catch (e) {
    console.error("couldnt get uni price for:", tokenA, tokenB);
    // console.log("user:", store.state.account, e);
  }
}
