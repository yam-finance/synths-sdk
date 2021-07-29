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

export interface Synths {
  web3: Web3;
  contracts: any;
  addresses: any;
}

export interface AssetClassConfig {
  /** ethersProvider - ethers.js provider */
  ethersProvider: any;
  /** contracts - Official contracts of the selected network */
  contracts: AssetsConfig;
  /** assetIdentifier - The identifier of the asset contract to use */
  assetIdentifier: string;
}

/// @notice assets.json interfaces

export interface PoolConfig {
  /** address - Address of the pool contract */
  address: string;
  /** location - Location of the pool contract */
  location: string;
}

export interface EmpConfig {
  /** address - Address of the emp contract */
  address: string;
  /** new - Identifier to distinguish between the new and the old emp contracts */
  new: boolean;
  /** type - Identifier to clarify the emp contract type */
  type?: string;
}

export interface TokenConfig {
  /** address - Address of the token contract */
  address: string;
  /** decimals - Decimals of the token contract */
  decimals: number;
}

export interface AssetConfig {
  /** name - Name of the asset */
  name: string;
  /** cycle - Cycle of the asset */
  cycle: string;
  /** year - Year of the asset */
  year: string;
  /** collateral - Collateral of the asset */
  collateral: string;
  /** token - Token of the asset */
  token: TokenConfig;
  /** emp - Emp of the asset */
  emp: EmpConfig;
  /** pool - Pool of the asset */
  pool: PoolConfig;
  /** expired - Identifier for the expiry of the asset */ 
  expired: boolean;
}

export interface AssetsConfig {
  /** assetType - Object of all official asset contracts of a type in a network */
  [assetType: string]: AssetConfig[];
}

export interface SynthsAssetsConfig {
  /** id - Network name */
  [id: string]: AssetsConfig;
}
