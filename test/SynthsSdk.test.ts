import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import axios from "axios";
import Synths, {
  getCurrentDexTokenPrice,
  getSynthData,
  getSynthChartData,
  getTotalMarketData,
  getResentSynthData,
  roundNumber,
} from "../src/index";
import { SynthsAssetsConfig } from "../src/types/assets.t";
import Asset from "../src/lib/Asset";
import testAssetConfig from "../src/assetstest.json";

describe("Synths SDKs", function () {
  let provider: typeof ethers.provider;

  describe("Ethereum Mainnet tests", function () {
    let upunksAsset: Asset;

    before(async function () {
      provider = ethers.provider;
      const chainId = (await provider.getNetwork()).chainId;
      if (network.name !== "hardhat" || chainId != 1) {
        this.skip();
      }
      const userAssetsConfig: SynthsAssetsConfig = {
        [chainId]: {
          upunks: [
            {
              name: "September",
              cycle: "09",
              year: "21",
              collateral: "WETH",
              token: {
                address: "0x86140A763077155964754968B6F6e243fE809cBe",
                decimals: 18,
              },
              emp: {
                address: "0xF8eF02C10C473CA5E48b10c62ba4d46115dd2288",
                new: true,
                type: "finlib",
              },
              pool: {
                address: "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
                location: "sushiswap",
              },
              expired: false,
            },
          ],
        },
      };

      const synthsSDK = await Synths.create({
        ethersProvider: provider,
        userAssetsConfig: userAssetsConfig,
      });

      upunksAsset = synthsSDK.connectAsset("upunks-0921");
    });

    describe("Helper functions", function () {
      it("getResentSynthData - success", async function () {
        this.timeout(100000);
        const resentSynthData = await getResentSynthData(1);
        console.log(resentSynthData);
        // expect(resentSynthData)
      });
      it("getTotalMarketData - success", async function () {
        this.timeout(100000);
        const totalMarketData = await getTotalMarketData([1]);
        expect(totalMarketData.total24hLiquidity).to.be.greaterThan(0);
        expect(totalMarketData.total24hVolume).to.be.greaterThan(0);
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
        const synthData = await getSynthData("upunks-0921", 1);
        const response = await axios.get(
          `https://data.yam.finance/degenerative/apr/upunks-0921`
        );
        expect(synthData).to.deep.include({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          apr: response.data["aprMultiplier"] as string,
        });
      });
      it("synthChartData - success", async function () {
        const synthChartData = await getSynthChartData("upunks-0921", 1);
        expect(synthChartData).to.be.an("array");
      });
      it("roundNumber - success", async function () {
        const float = 1.23456789;
        const result = roundNumber(float, 2);
        expect(result).to.equal(parseFloat(float.toFixed(2)));
      });
    });
    describe("Interact with asset", function () {
      it("getEmpState - success", async function () {
        this.timeout(100000);
        const empState = await upunksAsset.getEmpState();
        expect(empState).to.deep.include({
          collateralCurrency: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        });
      });
      it("getPosition - success", async function () {
        const position = await upunksAsset.getPosition();
        expect(position?.rawCollateral["rawValue"]).to.equal(BigNumber.from(0));
      });
      it("getPositionCR - success", async function () {
        const positionCR = await upunksAsset.getPositionCR();
        expect(positionCR).to.equal("0");
      });
      //@todo find a valid position to test.
      it.skip("getPositions - success", async function () {
        const positions = await upunksAsset.getPositions();
        expect(positions).to.deep.include({
          "0x86140A763077155964754968B6F6e243fE809cBe": BigNumber.from(0),
        });
      });
      // it("getGCR - success", async function () {
      //   const gcr = await upunksAsset.getGCR();
      //  expect(parseFloat(gcr ?? "0")).to.be.equal(0);
      // });
    });
  });
  describe("LSP Asset", () => {
    let lspAsset: Asset;

    before(async function () {
      provider = ethers.provider;
      const chainId = (await provider.getNetwork()).chainId;
      if (network.name !== "hardhat" || chainId != 137) {
        this.skip();
      }
      const userAssetsConfig = testAssetConfig as SynthsAssetsConfig;
      const synthsSDK = await Synths.create({
        ethersProvider: provider,
        userAssetsConfig: userAssetsConfig,
      });
      lspAsset = synthsSDK.connectAsset("2xdpi-1021");
    });
    describe("Interact with LSP asset", () => {
      it("getLSPState - Success", async function () {
        const lspState = await lspAsset.getLSPState();
        expect(lspState).to.deep.include({
          pairName: "2XDPI Oct26",
        });
      });
    });
  });
});
