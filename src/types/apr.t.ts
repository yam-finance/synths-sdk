export type DevMiningCalculatorParams = {
  ethers: any;
  getPrice: any;
  empAbi: any;
  erc20Abi: any;
  provider: any;
};

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
  location: "uni" | "sushi" | "bal";
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
