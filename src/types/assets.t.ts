import Web3 from "web3/types";

export type DevMiningCalculatorParams = {
  ethers: any;
  getPrice: any;
  empAbi: any;
  erc20Abi: any;
  provider: any;
};

export interface AssetGroupModel {
  name: string;
  AssetModel: AssetModel[];
}

export interface AssetModel {
  name: string;
  cycle: string;
  year: string;
  collateral: string;
  token: TokenModel;
  emp: EmpModel;
  pool: PoolModel;
  apr?: AprModel;
}

export interface TokenModel {
  address: string;
  decimals: number;
}

export interface EmpModel {
  address: string;
  new: boolean;
}

export interface PoolModel {
  address: string;
}

export interface AprModel {
  force: number;
  extra: number;
}

export interface Degenerative {
  web3: Web3;
  contracts: any;
  addresses: any;
}

export interface Protection {
  coverageAmount: string;
  paid: string;
  holder: string;
  start: number;
  expiry: number;
  conceptIndex: number;
  status: number;
}

export interface ProtectionProvider {
  totalTokenSecondsProvided: string;
  premiumIndex: string;
  curTokens: string;
  lastUpdate: number;
  lastProvide: number;
  withdrawInitiated: number;
}

export interface JsonTxResult {
  blockHash: string;
  blockNumber: string;
  confirmations: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  input: string;
  isError: string;
  nonce: string;
  timeStamp: string;
  to: string;
  tokenDecimal: string;
  tokenName: string;
  tokenSymbol: string;
  transactionIndex: string;
  txreceipt_status: string;
  value: string;
}
