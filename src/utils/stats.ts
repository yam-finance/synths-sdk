import Web3 from "web3";
import BigNumber from "bignumber.js";
import { provider } from "web3-core";
import { JsonTxResult } from "../types/stats.t";
import axios from 'axios';
import { sleep } from './helpers'

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

    const response = await axios.get(url);

    if (response.data["status"] == 0) {
      break;
    }

    const nextTxs = response.data["result"];
    _count = nextTxs.length;
    _txs.push(...nextTxs);
  }
  return _txs;
};

const getBlockNumberByTimestamp = async (_timestamp: number, _etherscanApiKey: string) => {
  let url = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${_timestamp}&closest=before&apikey=${_etherscanApiKey}`
  let response = await axios.get(url);
  return response.data["result"]
}

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
  let startBlockNumber = 0;
  let endBlockNumber = await web3.eth.getBlockNumber(function (error, result) {
    if (!error) return result;
  });

  try {
    startBlockNumber = await getBlockNumberByTimestamp(startTimeStamp, etherscanApiKey)
    endBlockNumber = await getBlockNumberByTimestamp(endTimeStamp, etherscanApiKey)

    // Fetch a list of 'normal' unique outgoing transactions by address (maximum of 10000 records only).
    // Continue fetching if response >= 1000.
    let url = `https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&startblock=${startBlockNumber}&endblock=${endBlockNumber}&sort=asc&apikey=${etherscanApiKey}`;
    // let response = await fetch(url);
    let response = await axios.get(url);
    let json = await response.data;
    let txs = json["result"];
    let count = txs.length;
    txs = await fetchTxs("ether", userAddress, count, endBlockNumber, etherscanApiKey, txs);

    // Fetch a list of "ERC20 - Token Transfer Events" by address (maximum of 10000 records only).
    // Continue fetching if response >= 1000.
    url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${userAddress}&startblock=${startBlockNumber}&endblock=${endBlockNumber}&sort=asc&apikey=${etherscanApiKey}`;
    response = await axios.get(url);
    // response = await fetch(url);
    json = await response.data;
    const erc20Txs = json["result"];
    count = erc20Txs.length;
    txs.push(...erc20Txs);
    txs = await fetchTxs("erc20", userAddress, count, endBlockNumber, etherscanApiKey, txs);

    // Show only txs that come from the user address.
    let txsOut: any = txs.filter((v: any) => v.from === userAddress.toLowerCase());
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
    return [txGasCostETH.toString(), averageTxPrice.toString(), txCount, failedTxCount, failedTxGasCostETH.toString()];
  } catch (e) {
    console.log("An error occurred while retrieving your transaction data.\nPlease submit it as an issue.");
    return ["...", "...", "...", "...", "..."];
  }
};
