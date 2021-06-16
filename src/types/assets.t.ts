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

export interface IContract {
  address: string;
}

export interface IToken extends IContract {
  name: string;
  decimals: number; // NOTE: Synth and collateral will have same decimals
  symbol: string;
  coingeckoId: string;
}

export interface ILiquidityPool extends IContract {
  location: 'uni' | 'sushi' | 'bal';
}

export interface ISynth {
  imgLocation: string;
  group: string;
  cycle: string;
  year: string;
  collateral: string; // TODO remove, get collateral through group
  token: IToken;
  emp: IContract;
  pool: ILiquidityPool;
}

export interface ISynthGroup {
  description: string;
  collateral: string;
  paired: string;
  image: string;
  creator: string;
}

export interface ISynthMarketData {
  price: number;
  priceUsd: number;
  collateralPriceUsd: number;
  tvl: number;
  apr: number;
  volume24h: number;
  marketCap: number;
  totalSupply: number;
  liquidity: number;
  minTokens: number;
  daysTillExpiry: number;
  isExpired: boolean;
  globalUtilization: number; // Inverse of GCR taken from EMP
  liquidationPoint: number;
  withdrawalPeriod: number;
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
