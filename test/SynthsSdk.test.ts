import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import Synths from "../src/index";
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

      // TODO Connect asset with emp / lsp address.
      upunksAsset = synthsSDK.connectAsset("upunks-0921");
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
        this.timeout(100000);
        const positions = await upunksAsset.getPositions();
        expect(positions).to.deep.include({
          "0x86140A763077155964754968B6F6e243fE809cBe": BigNumber.from(0),
        });
      });
<<<<<<< HEAD
      it("getGCR - success", async function () {
        const gcr = await upunksAsset.getGCR();
        expect(gcr).to.be.lt(0);
=======
      // it("getGCR - success", async function () {
      //   const gcr = await upunksAsset.getGCR();
      //  expect(parseFloat(gcr ?? "0")).to.be.equal(0);
      // });
      it("getContract -success", function () {
        const contract = upunksAsset.getContract();
        const contractAddress = contract.address;
        expect(ethers.utils.getAddress(contractAddress)).to.be.a("string");
>>>>>>> 6e22c10b40c61fcf0471a771f0b1d0a9f312cd5e
      });
    });
  });
  describe("LSP Asset", () => {
    let lspAsset: Asset;
    let synthsSDK: Synths;

    before(async function () {
      provider = ethers.provider;
      const chainId = (await provider.getNetwork()).chainId;
      if (network.name !== "hardhat" || chainId != 137) {
        this.skip();
      }
      const userAssetsConfig = testAssetConfig as SynthsAssetsConfig;
      synthsSDK = await Synths.create({
        ethersProvider: provider,
        userAssetsConfig: userAssetsConfig,
      });
      lspAsset = synthsSDK.connectAsset("2xdpi-1021");
    });
    describe("Interact with LSP asset", () => {
      it("getLSPPortfolio - success", async function () {
        this.timeout(100000);
        const lspPortfolio = await synthsSDK.getLSPPortfolio() 
        console.log(lspPortfolio);
      });
      it("getLSPState -success", async function () {
        this.timeout(100000);
        const lspState = await lspAsset.getLSPState();
        expect(lspState).to.deep.include({
          pairName: "2XDPI Oct26",
        });
        it("getContract -success", function () {
          const contract = lspAsset.getContract();
          const contractAddress = contract.address;
          expect(ethers.utils.getAddress(contractAddress)).to.be.a("string");
        });
      });
    });
  });
});
