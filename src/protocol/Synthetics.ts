import { AssetModel } from "../types/assets.t";
import { Asset } from "../library/Asset";
import { AssetV1 } from "../library/AssetV1";

// Assets formation
export class Synthetics {
  constructor(options: any, assets: any, config?: any) {
    Object.keys(assets).forEach(assetGroup => {
      
      /* @ts-ignore */
      this[assetGroup] = {};
      for (let i = 0; i < assets[assetGroup].length; i++) {
        const asset: AssetModel = assets[assetGroup][i];
        const assetId = asset.cycle.toLowerCase() + asset.year;
        /* @ts-ignore */
        this[assetGroup][assetId] = new Asset(asset, options);
      }
    });
  }
}
