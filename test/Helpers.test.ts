import { expect } from "chai";
import { defaultAssetsConfig, defaultTestAssetsConfig } from "lib/config";
import {
  getCurrentDexTokenPrice,
  getSynthData,
  getPoolChartData,
  getTotalMarketData,
  getRecentSynthData,
  getYamRewardsByPoolAddress,
  roundNumber,
} from "../src/index";

describe("Synths SDK", function () {
  describe("Helper running against mainnet", function () {
    it("getYamRewardsByPoolAddress - success", async function () {
      const rewards = await getYamRewardsByPoolAddress(
        "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa"
      );
      expect(rewards).to.be.an("string");
    });
    it("getRecentSynthData - success", async function () {
      this.timeout(100000);
      const recentSynthData = await getRecentSynthData(1, defaultAssetsConfig);
      expect(recentSynthData).to.be.an("array");
    });
    it("getTotalMarketData - success", async function () {
      this.timeout(100000);
      const totalMarketData = await getTotalMarketData(
        [1],
        defaultAssetsConfig
      );
      expect(totalMarketData.totalLiquidity).to.be.greaterThan(0);
    });
    it("getCurrentDexTokenPrice - success", async function () {
      const synthPrice = await getCurrentDexTokenPrice(
        "sushiswap",
        "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
        "0x86140A763077155964754968B6F6e243fE809cBe"
      );
      expect(synthPrice).to.not.equal(0);
    });
    it("getSynthData - success", async function () {
      const synthData = await getSynthData(
        "sushiswap",
        "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
        "WETH"
      );
      expect(synthData).to.be.an("object");
    });
    it("synthChartData - success", async function () {
      const synthChartData = await getPoolChartData(
        "sushiswap",
        "0x9469313a1702dc275015775249883cfc35aa94d8",
        "0x86140A763077155964754968B6F6e243fE809cBe"
      );
      expect(synthChartData).to.be.an("array");
    });
    it("roundNumber - success", function () {
      const float = 1.23456789;
      const result: number = roundNumber(float, 2);
      expect(result).to.equal(parseFloat(float.toFixed(2)));
    });
  });
  describe("Helper running against polygon", function () {
    it("getRecentSynthData - success", async function () {
      this.timeout(100000);
      const recentSynthData = await getRecentSynthData(
        137,
        defaultTestAssetsConfig
      );
      expect(recentSynthData).to.be.an("array");
    });
    it("getTotalMarketData - success", async function () {
      this.timeout(100000);
      const totalMarketData = await getTotalMarketData(
        [137],
        defaultTestAssetsConfig
      );
      expect(totalMarketData.totalLiquidity).to.be.greaterThan(0);
    });
    it("getCurrentDexTokenPrice - success", async function () {
      const synthPrice = await getCurrentDexTokenPrice(
        "sushiswap",
        "0x15ab243be0fc14b2b09988dd91f1cbebb0498922",
        "0x9d54905BD652aCE565F948370649482cCA885169",
        "137"
      );
      expect(synthPrice).to.not.equal(0);
    });
    it("getSynthData - success", async function () {
      const synthData = await getSynthData(
        "sushiswap",
        "0x15ab243be0fc14b2b09988dd91f1cbebb0498922",
        "WETH",
        "137"
      );
      expect(synthData).to.be.an("object");
    });
    it("synthChartData - success", async function () {
      const synthChartData = await getPoolChartData(
        "sushiswap",
        "0x15ab243be0fc14b2b09988dd91f1cbebb0498922",
        "0x9d54905BD652aCE565F948370649482cCA885169",
        "137"
      );
      expect(synthChartData).to.be.an("array");
    });
  });
});
