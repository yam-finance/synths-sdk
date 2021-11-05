import type { ethers } from "ethers";

/// @notice Asset class interfaces

export interface AssetClassConfig {
  /** ethersProvider - ethers.js provider */
  ethersProvider: ethers.providers.Web3Provider;
  /** assets - Official contracts of the selected network */
  assets: AssetsConfig;
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

/** AssetConfig - Asset specifications */
export interface AssetConfig {
  name: string;
  cycle: string;
  year: string;
  collateral: string;
  token: TokenConfig;
  emp: EmpConfig;
  pool: PoolConfig;
  expired: boolean; // Force expiration of the asset
}

export interface AssetsConfig {
  /** assetType - Object of all official asset contracts of a type in a network */
  [assetType: string]: AssetConfig[];
}

export interface SynthsAssetsConfig {
  /** id - Network name */
  [id: string]: AssetsConfig;
}

/// @todo Check ethersProvider type.
export interface InitOptions {
  ethersProvider: any;
  userAssetsConfig: SynthsAssetsConfig;
}
