/**
 * @notice The following is a sdk implementation of the apr calculation.
 * This code is not used in any test. To enable a test call, uncomment the
 * necessary lines in src/index.ts and add a test case.
 */
import { request } from 'graphql-request';
import moment from 'moment';
import axios from 'axios';
import fetch from "node-fetch";
import Assets from "../assets.json";
import UNIContract from "../abi/uni.json";
import EMPContract from "../../src/abi/emp.json";
import erc20 from "@studydefi/money-legos/erc20";
import { ISynth, DevMiningCalculatorParams, ILiquidityPool } from '../types/apr.t';
import { BigNumber, ethers, utils  } from 'ethers';
/* @ts-ignore */
import sessionStorage from 'node-sessionstorage';
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  UNISWAP_MARKET_DATA_QUERY,
} from './queries';


export class MiningRewards {
  private options;
  constructor(options: any) {
    this.options = options;
  }

  getPoolData = async (pool: ILiquidityPool) => {
    const endpoint = pool.location === 'uni' ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
    try {
      const data = await request(endpoint, UNISWAP_MARKET_DATA_QUERY, { poolAddress: pool.address });
      return data.pair;
    } catch (err) {
      console.log(err);
      return Promise.reject(err);
    }
  };


  /**
   * Fetch the mining rewards
   * @notice This will be removed after the api is ready (don't remove any comments)
   * @param {string} assetName Name of an asset for the input
   * @param {ISynth} asset Asset object for the input
   * @param {number} assetPrice Asset price for the input
   * @public
   * @methods
   */
  getMiningRewards = async (
    assetName: string,
    asset: ISynth,
    assetPrice: number,
  ) => {
    // TODO Use params for setup instead of test setup
    const ethersProvider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL_HTTP || "");
    const network = 'mainnet';

    /// @dev Check if params are set
    if (!assetName || !asset) {
      return 0;
    }

    try {
      const contractLp = new ethers.Contract(asset.pool.address, UNIContract.abi, ethersProvider);

      /// @dev Construct devMiningCalculator
      const devmining = this.devMiningCalculator({
        provider: ethersProvider,
        ethers: ethers,
        getPrice: this.getPriceByContract,
        empAbi: EMPContract.abi,
        erc20Abi: erc20.abi,
      });

      const [
          jsonEmpData,
          contractLpCall,
          ethPrice,
          umaPrice,
          yamPrice
      ] = await Promise.all([
          this.getEmpData(devmining, ethersProvider, network),
          contractLp.getReserves(),
          this.getUsdPrice("weth"),
          this.getUsdPrice("uma"),
          this.getUsdPrice("yam-2"),
      ]);

      const jsonEmpObject = JSON.parse(jsonEmpData)
      const { rewards, whitelistedTVM } = jsonEmpObject

      /// @dev Get emp info from devMiningCalculator
      const getEmpInfo: any = await devmining.utils.getEmpInfo(
        asset.emp.address
      );

      /// @dev Setup base variables for calculation
      let baseCollateral;
      const baseAsset = BigNumber.from(10).pow(asset.token.decimals);

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
      /// @TODO Update week1UntilWeek2 and week3UntilWeek4 timestamps for uPUNKS after launch.
      const week1UntilWeek2 = 1615665600;
      const week3UntilWeek4 = 1616961600;
      const umaRewards = rewards[asset.emp.address];
      let yamWeekRewards = 0;
      let umaWeekRewards = 0;
      /// @TODO Check assetName
      if (assetName.toLowerCase() === "upunks-0921") {
        if (current < week1UntilWeek2) {
          umaWeekRewards += 5000
        } else if (current < week3UntilWeek4) {
          yamWeekRewards += 5000;
        }
      }

      /// @dev Calculate rewards
      let calcAsset = 0;
      let calcCollateral = 0;
      const additionalWeekRewards = umaWeekRewards * umaPrice + yamWeekRewards * yamPrice;
      const assetReserve0 = BigNumber.from(contractLpCall._reserve0).div(baseAsset).toNumber();
      const assetReserve1 = BigNumber.from(contractLpCall._reserve1).div(baseCollateral).toNumber();

      calcAsset = assetReserve0 * tokenPrice;
      calcCollateral = assetReserve1 * (asset.collateral == "WETH" ? ethPrice : 1);

      /// @dev Prepare calculation
      console.log("assetName", assetName)
      // getEmpInfo.tokenCount
      let _tokenCount: number;
      if (assetName.toLowerCase().includes("ustonks")) {
        _tokenCount = Number(utils.formatUnits(getEmpInfo.tokenCount, 6))
      } else {
        _tokenCount = Number(utils.formatUnits(getEmpInfo.tokenCount, 18))
      }
      console.log("_tokenCount", _tokenCount.toString())
      // tokenPrice
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
      // cr
      // const _cr: number = cr
      // console.log("_cr", _cr)


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
      // const collateralEfficiency: number = 1 / (_cr + 1)
      // console.log("collateralEfficiency", collateralEfficiency)

      // General APR = (sponsorAmountPerDollarMintedPerWeek * chosen collateralEfficiency * 52)
      let aprMultiplier: number = sponsorAmountPerDollarMintedPerWeek * _numberOfWeeksInYear * 100;
      console.log("aprMultiplier", aprMultiplier.toString())

      if (aprMultiplier === Infinity || _tokenPrice === undefined) {
        aprMultiplier = 0;
      }

      return aprMultiplier.toString();
    } catch (e) {
      console.error("error", e);
      return "0";
    }
  };

  getUsdPrice = async (cgId: string) => {
    const cached = sessionStorage.getItem(cgId);
    if (cached) return Promise.resolve(Number(cached));

    try {
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
      const price = Number(res.data[cgId].usd);
      sessionStorage.setItem(cgId, price.toString());
      return Promise.resolve(price);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  getEmpData = async (devmining: any, ethersProvider: ethers.providers.JsonRpcProvider, network: string) => {
    const cached = sessionStorage.getItem("empData");
    if (cached) return cached;

    /// @dev Get dev mining emp
    const devMiningEmp = await this.getDevMiningEmps(network);

    /// @dev Get dev mining reward estimation from devMiningCalculator
    const estimateDevMiningRewards = await devmining.estimateDevMiningRewards(
      {
        /* @ts-ignore */
        totalRewards: devMiningEmp["totalReward"],
        /* @ts-ignore */
        empWhitelist: devMiningEmp["empWhitelist"],
      }
    );

    /// @dev Structure rewards
    const rewards: any = {};
    let whitelistedTVM: string = "";
    for (let i = 0; i < estimateDevMiningRewards.length; i++) {
      rewards[estimateDevMiningRewards[i][0]] =
        estimateDevMiningRewards[i][1];
      whitelistedTVM = estimateDevMiningRewards[i][2];
    }

    sessionStorage.setItem("empData", JSON.stringify({ rewards, whitelistedTVM }));

    return JSON.stringify({ rewards, whitelistedTVM })
  }

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
    let loopCount = 0
    let result = await this.getContractInfo(address);

    while (!result && loopCount < 10) {
      result = await this.getContractInfo(address);
      loopCount += 1
    }

    return (
      result &&
      result.market_data &&
      result.market_data.current_price[toCurrency || "usd"]
    );
  };

  devMiningCalculator = ({
    provider,
    ethers,
    getPrice,
    empAbi,
    erc20Abi,
  }: DevMiningCalculatorParams) => {
    const { utils, BigNumber, FixedNumber } = ethers;
    const { parseEther } = utils;
    async function getEmpInfo(address: string, toCurrency = "usd") {
      const emp = new ethers.Contract(address, empAbi, provider);
      const tokenAddress = await emp.tokenCurrency();
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
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
      const collateralCount = (await emp.totalPositionCollateral()).toString();
      const collateralDecimals = (await collateralContract.decimals()).toString();
      const collateralRequirement = (
        await emp.collateralRequirement()
      ).toString();

      return {
        address,
        toCurrency,
        tokenAddress,
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
      tokenDecimals,
      collateralPrice,
      collateralDecimals,
      tokenCount,
      collateralCount,
      collateralRequirement,
    }: {
      tokenDecimals: number;
      collateralPrice: number;
      collateralDecimals: number;
      tokenCount: number;
      collateralCount: number;
      collateralRequirement: number;
    }) {
      const fallbackCr = "2000000000000000000"
      const fixedPrice = FixedNumber.from(collateralPrice.toString());
      const collFixedSize = FixedNumber.fromValue(
        collateralCount,
        collateralDecimals
      );

      return fixedPrice
        .mulUnsafe(collFixedSize)
        .divUnsafe(FixedNumber.fromValue(fallbackCr, 18));

      // /// @dev If we have a token price, use this first to estimate EMP value
      // if (tokenPrice) {
      //   const fixedPrice = FixedNumber.from(tokenPrice.toString());
      //   const fixedSize = FixedNumber.fromValue(tokenCount, tokenDecimals);
      //   return fixedPrice.mulUnsafe(fixedSize);
      // }
      //
      // /** @dev Theres no token price then fallback to collateral price divided by
      //   * the collateralization requirement (usually 1.2) this should give a
      //   * ballpack of what the total token value will be. Its still an over estimate though.
      //  */
      // if (collateralPrice) {
      //   const fixedPrice = FixedNumber.from(collateralPrice.toString());
      //   const collFixedSize = FixedNumber.fromValue(
      //     collateralCount,
      //     collateralDecimals
      //   );
      //
      //   const fallbackCr = "1250000000000000000"
      //
      //   return fixedPrice
      //     .mulUnsafe(collFixedSize)
      //     .divUnsafe(FixedNumber.fromValue(fallbackCr, 18));
      // }

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
        console.log(info)
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
}
