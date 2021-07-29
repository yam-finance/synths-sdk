import { ethers } from "ethers";

/// @notice Asset class interfaces

export interface AssetClassConfig {
  /** ethersProvider - ethers.js provider */
  ethersProvider: any;
  /** contracts - Official contracts of the selected network */
  contracts: AssetsConfig;
  /** assetIdentifier - The identifier of the asset contract to use */
  assetIdentifier: string;
}

export interface EmpState {
  expirationTimestamp: ethers.BigNumber;
  collateralCurrency: string;
  priceIdentifier: string;
  tokenCurrency: string;
  collateralRequirement: ethers.BigNumber;
  disputeBondPercentage: ethers.BigNumber;
  disputerDisputeRewardPercentage: ethers.BigNumber;
  sponsorDisputeRewardPercentage: ethers.BigNumber;
  minSponsorTokens: ethers.BigNumber;
  timerAddress: string;
  cumulativeFeeMultiplier: ethers.BigNumber;
  rawTotalPositionCollateral: ethers.BigNumber;
  totalTokensOutstanding: ethers.BigNumber;
  liquidationLiveness: ethers.BigNumber;
  withdrawalLiveness: ethers.BigNumber;
  currentTime: ethers.BigNumber;
  isExpired: boolean;
  contractState: number;
  finderAddress: string;
  expiryPrice: ethers.BigNumber;
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
