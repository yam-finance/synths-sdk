import { ethers, utils, BigNumber } from "ethers";
import moment from "moment";
import { AbiItem } from "web3-utils";
import fetch from "node-fetch";
import {
  AssetGroupModel,
  AssetModel,
  DevMiningCalculatorParams,
} from "../types/assets.t";
import UNIContract from "../abi/uni.json";
import EMPContract from "../../src/abi/emp.json";
import erc20 from "@studydefi/money-legos/erc20";
import Assets from "../assets.json";
import { WETH, YAM, UMA } from "../utils/addresses";

export class MiningRewards {
  private options;
  constructor(options: any) {
    this.options = options;
  }

  /**
   * Fetch the mining rewards
   * @param {AssetModel} asset Asset object for the input
   * @param {AssetGroupModel} assetGroup Asset group of an asset for the input
   * @param {number} assetPrice Asset price
   * @param {number} cr Collateral Ratio
   * @public
   * @methods
   */
  getMiningRewards = async (
    asset: AssetModel,
    assetGroup: AssetGroupModel,
    assetPrice: number,
    cr: number,
  ) => {
    // TODO Use params for setup instead of test setup
    const ethersProvider = this.options.ethersProvider;
    const network = 'mainnet';
    assetGroup = { name: 'UGAS', AssetModel: Assets[network]['ugas'] };
    asset = asset;
    assetPrice = 170.242;
    cr = 1.5;

    /// @dev Check if params are set
    if (!assetGroup || !asset || !assetPrice || !cr) {
      return 0;
    }

    try {
      /// @dev Get dev mining emp
      const devMiningEmp = await this.getDevMiningEmps(network);

      /// @dev Construct devMiningCalculator
      const devmining =  devMiningCalculator({
        provider: ethersProvider,
        ethers: ethers,
        getPrice: this.getPriceByContract,
        empAbi: EMPContract.abi,
        erc20Abi: erc20.abi,
      });

      /// @dev Get emp info from devMiningCalculator
      const getEmpInfo: any = await devmining.utils.getEmpInfo(
        asset.emp.address
      );

      /// @dev Get dev mining reward estimation from devMiningCalculator
      const estimateDevMiningRewards = await devmining.estimateDevMiningRewards(
        {
          /* @ts-ignore */
          totalRewards: devMiningEmp["totalReward"],
          /* @ts-ignore */
          empWhitelist: devMiningEmp["empWhitelist"],
        }
      );

      // TODO Object.fromEntries(estimateDevMiningRewards)
      /// @dev Structure rewards
      const rewards: any = {};
      let whitelistedTVM: string = "";
      for (let i = 0; i < estimateDevMiningRewards.length; i++) {
        rewards[estimateDevMiningRewards[i][0]] =
          estimateDevMiningRewards[i][1];
        whitelistedTVM = estimateDevMiningRewards[i][2];
      }

      /// @dev Setup base variables for calculation
      let baseCollateral;
      const baseAsset = BigNumber.from(10).pow(asset.token.decimals);

      /// @dev Setup contract calls
      const contractLp = new this.options.web3.eth.Contract(
        UNIContract.abi as unknown as AbiItem,
        asset.pool.address
      );
      const contractLpCall = await contractLp.methods.getReserves().call();
      // const contractEmp = new this.options.web3.eth.Contract((EMPContract.abi as unknown) as AbiItem, asset.emp.address);
      // const contractEmpCall = await contractEmp.methods.rawTotalPositionCollateral().call();

      /// @dev Get prices for relevant tokens
      const ethPrice = await this.getPriceByContract(WETH);
      const umaPrice = await this.getPriceByContract(UMA);
      const yamPrice = await this.getPriceByContract(YAM);
      // const tokenPrice = await getPriceByContract(address);

      /// @dev Temporary pricing
      let tokenPrice;
      if (asset.collateral === "USDC") {
        baseCollateral = BigNumber.from(10).pow(6);
        /* @ts-ignore */
        tokenPrice = assetPrice * 1;
        // } else if(assetInstance.collateral === "YAM"){
        //   tokenPrice = assetPrice * yamPrice;
      } else {
        baseCollateral = BigNumber.from(10).pow(18);
        /* @ts-ignore */
        // tokenPrice = assetPrice * ethPrice;
        tokenPrice = assetPrice * 1;
      }

      /// @dev Prepare reward calculation
      const current = moment().unix();
      const week1Until = 1615665600;
      const week2Until = 1616961600;
      const yamRewards = 0;
      const umaRewards = rewards[asset.emp.address];
      let yamWeekRewards = 0;
      let umaWeekRewards = 0;
      if (
        assetGroup.name.toUpperCase() === "UGAS" &&
        asset.cycle === "JUN" &&
        asset.year === "21"
      ) {
        if (current < week1Until) {
          yamWeekRewards += 5000;
        } else if (current < week2Until) {
          yamWeekRewards += 10000;
        }
      } else if (
        assetGroup.name.toUpperCase() === "USTONKS" &&
        asset.cycle === "APR" &&
        asset.year === "21"
      ) {
        if (current < week1Until) {
          umaWeekRewards += 5000;
          yamWeekRewards += 5000;
        } else if (current < week2Until) {
          umaWeekRewards += 10000;
          yamWeekRewards += 10000;
        }
      }

      /// @dev Calculate rewards
      let calcAsset = 0;
      let calcCollateral = 0;
      const normalRewards = umaRewards * umaPrice + yamRewards * yamPrice;
      const additionalWeekRewards = umaWeekRewards * umaPrice + yamWeekRewards * yamPrice;
      const assetReserve0 = BigNumber.from(contractLpCall._reserve0).div(baseAsset).toNumber();
      const assetReserve1 = BigNumber.from(contractLpCall._reserve1).div(baseCollateral).toNumber();

      if (assetGroup.name === "USTONKS") {
        calcAsset = assetReserve1 * tokenPrice;
        calcCollateral = assetReserve0 * (asset.collateral == "WETH" ? ethPrice : 1);
      } else {
        calcAsset = assetReserve0 * tokenPrice;
        calcCollateral = assetReserve1 * (asset.collateral == "WETH" ? ethPrice : 1);
      }

      /// @dev Prepare calculation
      console.log(getEmpInfo.collateralCount)
      // getEmpInfo.tokenCount
      const _tokenCount: number = Number(utils.formatUnits(getEmpInfo.tokenCount, 18))
      console.log("_tokenCount", _tokenCount.toString())
      // getEmpInfo.tokenPrice
      const _tokenPrice: number = tokenPrice
      console.log("_tokenPrice", _tokenPrice)
      // whitelistedTVM
      const _whitelistedTVM: number = Number(whitelistedTVM)
      console.log("_whitelistedTVM", _whitelistedTVM)
      // 50_000
      /// @TODO Check why umaRewards != 50_000
      const _umaRewards: number = 50_000
      console.log("_umaRewards", _umaRewards)
      // umaPrice
      const _umaPrice: number = umaPrice
      console.log("_umaPrice", _umaPrice)
      // 0.82
      const _developerRewardsPercentage: number = 0.82
      console.log("_developerRewardsPercentage", _developerRewardsPercentage)
      // additionalWeekRewards
      const _additionalWeekRewards: number = additionalWeekRewards
      console.log("_additionalWeekRewards", _additionalWeekRewards)
      // calcAsset
      const _calcAsset: number = calcAsset
      console.log("_calcAsset", _calcAsset)
      // 1
      const _one: number = 1
      console.log("_one", _one)
      // 52
      const _numberOfWeeksInYear: number = 52
      console.log("_numberOfWeeksInYear", _numberOfWeeksInYear)


      // @notice New calculation based on the doc
      /// @TODO Check _whitelistedTVM
      // umaRewardsPercentage = (`totalTokensOutstanding` * synthPrice) / whitelistedTVM
      let umaRewardsPercentage: number = (_tokenCount * _tokenPrice) / _whitelistedTVM;
      console.log("umaRewardsPercentage", umaRewardsPercentage.toString())

      // dynamicAmountPerWeek = 50,000 * umaRewardsPercentage
      const dynamicAmountPerWeek: number = _umaRewards * umaRewardsPercentage;
      console.log("dynamicAmountPerWeek", dynamicAmountPerWeek.toString())

      // dynamicAmountPerWeekInDollars = dynamicAmountPerWeek * UMA price
      const dynamicAmountPerWeekInDollars: number = dynamicAmountPerWeek * _umaPrice;
      console.log("dynamicAmountPerWeekInDollars", dynamicAmountPerWeekInDollars.toString())

      // standardWeeklyRewards = dynamicAmountPerWeekInDollars * developerRewardsPercentage
      const standardWeeklyRewards: number = dynamicAmountPerWeekInDollars * _developerRewardsPercentage;
      console.log("standardWeeklyRewards", standardWeeklyRewards.toString())

      // totalWeeklyRewards = (standardRewards) + (Additional UMA * UMA price) + (Additional Yam * Yam Price)
      const totalWeeklyRewards: number = standardWeeklyRewards + _additionalWeekRewards;
      console.log("totalWeeklyRewards", totalWeeklyRewards.toString())

      // sponsorAmountPerDollarMintedPerWeek = totalWeeklyRewards / (Synth in AMM pool * synth price)
      const sponsorAmountPerDollarMintedPerWeek: number = totalWeeklyRewards / _calcAsset;
      console.log("sponsorAmountPerDollarMintedPerWeek", sponsorAmountPerDollarMintedPerWeek.toString())

      // collateralEfficiency = 1 / (CR + 1)
      const collateralEfficiency: number = 1 / (cr + 1)
      console.log("collateralEfficiency", collateralEfficiency)

      // General APR = (sponsorAmountPerDollarMintedPerWeek * chosen collateralEfficiency * 52)
      const generalAPR: number = sponsorAmountPerDollarMintedPerWeek * collateralEfficiency * _numberOfWeeksInYear * 100;
      console.log("generalAPR", generalAPR.toString())

      return generalAPR;
    } catch (e) {
      console.error("error", e);
      return 0;
    }
  };

  mergeUnique = (arr1: any, arr2: any) => {
    return arr1.concat(
      arr2.filter(function (item: any) {
        return arr1.indexOf(item) === -1;
      })
    );
  };

  getDevMiningEmps = async (network: String) => {
    /* @ts-ignore */
    const assets: AssetGroupModel = Assets[network];
    if (assets) {
      /* @ts-ignore */
      const data = [
        /* @ts-ignore */
        assets["ugas"][1].emp.address,
        /* @ts-ignore */
        assets["ugas"][2].emp.address,
        /* @ts-ignore */
        assets["ugas"][3].emp.address,
        /* @ts-ignore */
        assets["ustonks"][0].emp.address,
      ];
      const umadata: any = await fetch(
        `https://raw.githubusercontent.com/UMAprotocol/protocol/master/packages/affiliates/payouts/devmining-status.json`
      );
      const umaDataJson = await umadata.json();
      const empWhitelistUpdated = this.mergeUnique(
        umaDataJson["empWhitelist"],
        data
      );
      const umaObject = {
        empWhitelist: empWhitelistUpdated,
        totalReward: umaDataJson["totalReward"],
      };

      return umaObject;
    } else {
      return -1;
    }
  };

  getContractInfo = async (address: string) => {
    const data: any = await fetch(
      `https://api.coingecko.com/api/v3/coins/ethereum/contract/${address}`
    );
    const jsonData = await data.json();
    return jsonData;
  };

  getPriceByContract = async (address: string, toCurrency?: string) => {
    // TODO: Remove while loop
    let result = await this.getContractInfo(address);
    while (!result) {
      result = await this.getContractInfo(address);
    }
    return (
      result &&
      result.market_data &&
      result.market_data.current_price[toCurrency || "usd"]
    );
  };
}

export function devMiningCalculator({
  provider,
  ethers,
  getPrice,
  empAbi,
  erc20Abi,
}: DevMiningCalculatorParams) {
  const { utils, BigNumber, FixedNumber } = ethers;
  const { parseEther } = utils;
  async function getEmpInfo(address: string, toCurrency = "usd") {
    const emp = new ethers.Contract(address, empAbi, provider);
    const tokenAddress = await emp.tokenCurrency();
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    /// @dev Fetches the token price from coingecko using getPriceByContract (getPrice == getPriceByContract)
    const tokenPrice = await getPrice(tokenAddress, toCurrency).catch(
      () => null
    );
    console.log("Fetched token Price: ", tokenPrice);
    const tokenCount = (await emp.totalTokensOutstanding()).toString();
    const tokenDecimals = (await tokenContract.decimals()).toString();

    const collateralAddress = await emp.collateralCurrency();
    const collateralContract = new ethers.Contract(
      collateralAddress,
      erc20Abi,
      provider
    );
    /// @dev Fetches the collateral price from coingecko using getPriceByContract (getPrice == getPriceByContract)
    const collateralPrice = await getPrice(collateralAddress, toCurrency).catch(
      () => null
    );
    console.log("Fetched collateral Price: ", collateralPrice);
    const collateralCount = (await emp.totalPositionCollateral()).toString();
    const collateralDecimals = (await collateralContract.decimals()).toString();
    const collateralRequirement = (
      await emp.collateralRequirement()
    ).toString();

    return {
      address,
      toCurrency,
      tokenAddress,
      tokenPrice,
      tokenCount,
      tokenDecimals,
      collateralAddress,
      collateralPrice,
      collateralCount,
      collateralDecimals,
      collateralRequirement,
    };
  }
  /// @dev Returns a fixed number
  function calculateEmpValue({
    tokenPrice,
    tokenDecimals,
    collateralPrice,
    collateralDecimals,
    tokenCount,
    collateralCount,
    collateralRequirement,
  }: {
    tokenPrice: number;
    tokenDecimals: number;
    collateralPrice: number;
    collateralDecimals: number;
    tokenCount: number;
    collateralCount: number;
    collateralRequirement: number;
  }) {
    /// @dev If we have a token price, use this first to estimate EMP value
    if (tokenPrice) {
      const fixedPrice = FixedNumber.from(tokenPrice.toString());
      const fixedSize = FixedNumber.fromValue(tokenCount, tokenDecimals);
      return fixedPrice.mulUnsafe(fixedSize);
    }

    /** @dev Theres no token price then fallback to collateral price divided by
      * the collateralization requirement (usually 1.2) this should give a
      * ballpack of what the total token value will be. Its still an over estimate though.
     */
    if (collateralPrice) {
      const fixedPrice = FixedNumber.from(collateralPrice.toString());
      const collFixedSize = FixedNumber.fromValue(
        collateralCount,
        collateralDecimals
      );
      return fixedPrice
        .mulUnsafe(collFixedSize)
        .divUnsafe(FixedNumber.fromValue(collateralRequirement, 18));
    }
    throw new Error(
      "Unable to calculate emp value, no token price or collateral price"
    );
  }

  async function estimateDevMiningRewards({
    totalRewards,
    empWhitelist,
  }: {
    totalRewards: number;
    empWhitelist: string[];
  }) {
    const allInfo = await Promise.all(
      empWhitelist.map((address) => getEmpInfo(address))
    );

    const values: any[] = [];
    /// @dev Returns the whitelisted TVM
    const totalValue = allInfo.reduce((totalValue, info) => {
      const value = calculateEmpValue(info);
      values.push(value);
      return totalValue.addUnsafe(value);
    }, FixedNumber.from("0"));

    return allInfo.map((info, i): [string, string, string] => {
      return [
        info.address,
        values[i]
          .mulUnsafe(FixedNumber.from(totalRewards))
          .divUnsafe(totalValue)
          .toString(),
        totalValue.toString()
      ];
    });
  }

  return {
    estimateDevMiningRewards,
    utils: {
      getEmpInfo,
      calculateEmpValue,
    },
  };
}
