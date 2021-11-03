import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import axios from "axios";
import Synths, {
  getCurrentDexTokenPrice,
  getSynthData,
  getSynthChartData,
} from "../src/index";
import { SynthsAssetsConfig } from "../src/types/assets.t";
import Asset from "../src/lib/Asset";

describe("Synths SDKs", function () {
  let provider: typeof ethers.provider;

  describe("Ethereum Mainnet tests", function () {
    let upunksAsset: Asset;

    before(async function () {
      provider = ethers.provider;
      const chainId = (await provider.getNetwork()).chainId;
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

    describe("Interact with asset", function () {
      it("helpers - success", async function () {
        this.timeout(100000);
        const synthPrice = await getCurrentDexTokenPrice(
          "sushiswap",
          "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
          "0x86140A763077155964754968B6F6e243fE809cBe"
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const synthData = await getSynthData(
          "upunks-0921",
          "0x86140A763077155964754968B6F6e243fE809cBe"
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const synthChartData = await getSynthChartData(
          "0x86140A763077155964754968B6F6e243fE809cBe"
        );
        const response = await axios.get(
          `https://data.yam.finance/degenerative/apr/upunks-0921`
        );

        expect(synthData).to.deep.include({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          apr: response.data["aprMultiplier"] as string,
        });
        expect(synthChartData).to.be.an("array");
        expect(synthPrice).to.not.equal(0);
      });
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
      it("getPositions - success", async function () {
        const positions = await upunksAsset.getPositions();
        expect(positions).to.deep.include({
          "0x86140A763077155964754968B6F6e243fE809cBe": BigNumber.from(0),
        });
      });
      it("getGCR - success", async function () {
        const gcr = await upunksAsset.getGCR();
        expect(parseFloat(gcr ?? "0")).to.be.equal(0);
      });
    });
  });
});
