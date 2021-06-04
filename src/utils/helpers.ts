import Web3 from "web3";
import WETHContract from "../abi/weth.json";
import YAMContract from "../abi/yam.json";
import BigNumber from "bignumber.js";
import request from "request";
import { provider, TransactionReceipt } from "web3-core";
import { AbiItem } from "web3-utils";
import { WETH } from "./addresses";
import { JsonTxResult, AssetGroupModel } from "../types/assets.t";
import { ethers } from "ethers";
import Assets from "../assets.json";
import UNIFactContract from "../abi/uniFactory.json";
import UNIContract from "../abi/uni.json"
import { USDC } from "../utils/addresses"
import fetch from 'node-fetch';


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

const multiplyEach = async (arg1: any, arg2: any) => {
  const result: number[] = [];
  for (let i = 0; i < arg1.length; i++) {
    result[i] = arg1[i] * arg2[i];
  }
  return result;
};

const fetchTxs = async (_type: string, _userAddress: string, _count: number, _endBlockNumber: number, _etherscanApiKey: string, _txs: any) => {
  let url = "";
  while (_count === 10000) {
    await sleep(500);
    const startBlock = _txs[_txs.length - 1].blockNumber;
    const endBlock = _endBlockNumber;
    switch (_type) {
      case "ether":
        url = `https://api.etherscan.io/api?module=account&action=txlist&address=${_userAddress}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${_etherscanApiKey}`;
        break;
      case "erc20":
        url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${_userAddress}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${_etherscanApiKey}`;
        break;
      default:
        console.log("No transaction type passed.");
        break;
    }
    const response = await fetch(url);
    const json = await response.json();
    if (json["status"] == 0) {
      break;
    }
    const nextTxs = json["result"];
    _count = nextTxs.length;
    _txs.push(...nextTxs);
  }
  return _txs;
};

export const getTxStats = async (
  provider: provider,
  userAddress: string,
  startTimeStamp: number,
  endTimeStamp: number,
): Promise<string[]> => {
  const web3 = new Web3(provider);
  const etherscanApiKey = process.env.ETHERSCAN_KEY || ""
  let gasFeeTotal = 0;
  let gasPriceTotal = 0;
  let gasFeeTotalFail = 0;
  const startBlockNumber = 0;
  const endBlockNumber = await web3.eth.getBlockNumber(function (error, result) {
    if (!error) return result;
  });

  try {
    // Fetch a list of 'normal' unique outgoing transactions by address (maximum of 10000 records only).
    // Continue fetching if response >= 1000.
    let url = `https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=${startBlockNumber}&endblock=${endBlockNumber}&sort=asc&apikey=${etherscanApiKey}`;
    let response = await fetch(url);
    let json = await response.json();
    let txs = json["result"];
    let count = txs.length;
    txs = await fetchTxs("ether", userAddress, count, endBlockNumber, etherscanApiKey, txs);

    // Fetch a list of "ERC20 - Token Transfer Events" by address (maximum of 10000 records only).
    // Continue fetching if response >= 1000.
    url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${userAddress}&startblock=${startBlockNumber}&endblock=${endBlockNumber}&sort=asc&apikey=${etherscanApiKey}`;
    response = await fetch(url);
    json = await response.json();
    const erc20Txs = json["result"];
    count = erc20Txs.length;
    txs.push(...erc20Txs);
    txs = await fetchTxs("erc20", userAddress, count, endBlockNumber, etherscanApiKey, txs);

    // Show only txs that come from the user address.
    let txsOut: any = txs.filter((v: any) => v.from === userAddress.toLowerCase());
    if (startTimeStamp > 0) {
      txsOut = txsOut.filter((v: any) => v.timeStamp > Math.floor(startTimeStamp / 1000));
    }
    if (endTimeStamp > 0) {
      txsOut = txsOut.filter((v: any) => v.timeStamp < Math.floor(endTimeStamp / 1000));
    }
    txsOut = txsOut.map(({ confirmations, ...item }: any) => item);
    txsOut = new Set(txsOut.map(JSON.stringify));
    txsOut = Array.from(txsOut);
    const txsOutArray: JsonTxResult = txsOut.map(JSON.parse);
    txsOut = txsOutArray;
    const txsOutCount = txsOut.length;
    const txsOutFail = txsOut.filter((v: any) => v.isError === "1"); // 0 = No Error, 1 = Got Error.
    const txOutFail = txsOutFail.length;

    if (txsOutCount > 0) {
      const gasUsedArray = txsOut.map((value: any) => parseInt(value.gasUsed));
      const gasPriceArray = txsOut.map((value: any) => parseInt(value.gasPrice));
      const gasFee = await multiplyEach(gasPriceArray, gasUsedArray);
      gasFeeTotal = gasFee.reduce((partialSum, a) => partialSum + a, 0);
      gasPriceTotal = gasPriceArray.reduce((partialSum: any, a: any) => partialSum + a, 0);
      const gasUsedFailArray = txsOutFail.map((value: any) => parseInt(value.gasUsed));
      const gasPriceFailArray = txsOutFail.map((value: any) => parseInt(value.gasPrice));
      const gasFeeFail = await multiplyEach(gasPriceFailArray, gasUsedFailArray);
      gasFeeTotalFail = gasFeeFail.reduce((partialSum, a) => partialSum + a, 0);
    }

    const txGasCostETH = new BigNumber(web3.utils.fromWei(gasFeeTotal.toString(), "ether")).decimalPlaces(3);
    let averageTxPrice = new BigNumber(0);

    if (txsOutCount != 0) {
      averageTxPrice = new BigNumber(gasPriceTotal / txsOutCount / 1e9).decimalPlaces(3);
    }

    const txCount = txsOutCount.toString();
    const failedTxCount = txOutFail.toString();
    const failedTxGasCostETH = new BigNumber(web3.utils.fromWei(gasFeeTotalFail.toString(), "ether")).decimalPlaces(3);
    return [txGasCostETH, averageTxPrice, txCount, failedTxCount, failedTxGasCostETH];
  } catch (e) {
    console.log("An error occurred while retrieving your transaction data.\nPlease submit it as an issue.");
    return ["...", "...", "...", "...", "..."];
  }
};

export async function getContractInfo(address: string) {
  const data: any = await requestHttp(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${address}`);
  return data;
}

export async function getPriceByContract(address: string, toCurrency?: string) {
  // TODO: Remove while loop
  let result = await getContractInfo(address);
  while (!result) {
    result = await getContractInfo(address); 
  }
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
