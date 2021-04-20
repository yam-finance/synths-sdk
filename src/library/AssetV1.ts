import { AssetMethods } from "./AssetMethods";

export class AssetV1 {

  private _options;
  private asset;
  public tvl: any;
  public apr: any;
  public gcr: any;
  private methods: AssetMethods;
  constructor(asset: any, _options: any, config?: any) {
    this._options = _options;
    this.asset = asset;
    this.methods = new AssetMethods(this._options);
    this.tvl = null;
    this.apr = null;
    this.gcr = null;
  }

  mint = async (tokenQty: string, collateralQty: string, onTxHash?: (txHash: string) => void) => {
    const emp = await this.methods.getEmpV1(this.asset);
    await this.methods.mint(emp, tokenQty, collateralQty, onTxHash);
  };

}
