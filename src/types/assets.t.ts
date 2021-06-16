import Web3 from "web3/types";

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
