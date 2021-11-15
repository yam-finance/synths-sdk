import type { ethers } from "ethers";

export enum FinancialContractTemplates {
  EMP = "EMP",
  LSP = "LSP",
}

export interface IPairData {
  date: Date;
  timestamp: string;
  reserveUSD: string;
  volumeUSD: string;
  price: number;
}

export interface IDailyPoolData {
  date: number;
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  token0: { id: string; symbol: string };
  token1: { id: string; symbol: string };
  volumeUSD: string;
  price: number;
}

export interface ISynthsData {
  tokenId: string;
  tokenSymbol: string;
  apr: string | undefined;
  price: number;
  priceChanged24h: number;
  liquidity: number;
  volume24h: number;
}

/// @notice Asset class interfaces

export interface AssetClassConfig {
  /** ethersProvider - ethers.js provider */
  ethersProvider: ethers.providers.JsonRpcProvider;
  /** assets - Official contracts of the selected network */
  assets: AssetsConfig;
  /** assetIdentifier - The identifier of the asset contract to use */
  assetIdentifier: string;
}

export interface IPoolData {
  [x: string]: {
    reserveUSD: number;
    token0: IPoolToken;
    token1: IPoolToken;
    reserve0: number;
    reserve1: number;
    volumeToken0: number;
    volumeToken1: number;
  };
}

export interface IPoolToken {
  id: string;
  symbol: string;
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

// @notice Financial Contract Configuration
export interface FinancialContractConfigBase {
  /** address - Address of the Financial contract */
  address: string;
}

export interface FinancialContractConfigEMP
  extends FinancialContractConfigBase {
  /** new - Identifier to distinguish between the new and the old emp contracts */
  new: boolean;
  /** type - Identifier to clarify the emp contract type */
  type?: string;
}

export interface FinancialContractConfigLSP
  extends FinancialContractConfigBase {
  /** library - Financial Product Library's Address for LSP */
  library: string;
}

export interface TokenConfig {
  /** address - Address of the token contract */
  address: string;
  /** decimals - Decimals of the token contract */
  decimals: number;
}

/** AssetConfig - Asset specifications */
export interface AssetConfigBase {
  name: string;
  cycle: string;
  year: string;
  collateral: string;
  token: TokenConfig;
  /** Expiration status */
  expired: boolean;
}

export interface AssetConfigEMP extends AssetConfigBase {
  /** ExpiringMultipartyContract config options */
  emp: FinancialContractConfigEMP;
  /** Incentivized Pool */
  pool: PoolConfig;
  type?: FinancialContractTemplates.EMP;
}

export interface AssetConfigLSP extends Omit<AssetConfigBase, "token"> {
  /** address - Address of the LSP contract */
  lsp: FinancialContractConfigLSP;
  pools: PoolConfig[];
  tokens?: TokenConfig;
  type: string;
}

export interface FPLConfig {
  /** address - Address of the FPL contract */
  address: string;
  type: string;
}

export type AssetConfig = AssetConfigEMP | AssetConfigLSP;

export interface AssetsConfig {
  /** assetType - Object of all official Asset contracts of a type in a network */
  [assetType: string]: AssetConfig[];
}

export interface SynthsAssetsConfig {
  /** id - Network name */
  [id: string]: AssetsConfig;
}

/// @todo Check ethersProvider type.
export interface InitOptions {
  ethersProvider: ethers.providers.JsonRpcProvider;
  userAssetsConfig: SynthsAssetsConfig;
}

export const isAssetConfigEMP = (
  assetConfig: AssetConfig
): assetConfig is AssetConfigEMP => {
  return (assetConfig as AssetConfigEMP).emp !== undefined;
};

export const isAssetConfigLSP = (
  assetConfig: AssetConfig
): assetConfig is AssetConfigLSP => {
  return (assetConfig as AssetConfigLSP).lsp !== undefined;
};

export const assertAssetConfigEMP = (
  assetConfig: AssetConfig
): AssetConfigEMP => {
  if (!isAssetConfigEMP(assetConfig)) {
    throw new Error(`AssetConfig is not an AssetConfigEMP`);
  }
  return assetConfig as AssetConfigEMP;
};

export const assertAssetConfigLSP = (
  assetConfig: AssetConfig
): AssetConfigLSP => {
  if (!isAssetConfigLSP(assetConfig)) {
    throw new Error(`AssetConfig is not an AssetConfigLSP`);
  }
  return assetConfig as AssetConfigLSP;
};
