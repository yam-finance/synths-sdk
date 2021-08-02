import { ethers, artifacts, waffle } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { MockProvider } from "@ethereum-waffle/provider";
import { expect } from "chai";
import Synths from "../src";
import { INFURA_API_KEY } from "../src/lib/config";
import { SynthsAssetsConfig, EmpState } from "../src/types/assets.t";

async function deploy(name: string, ...params: any) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe("Synths SDK", function () {
  // let provider: MockProvider;
  let provider: any;
  let accounts: Signer[];

  // beforeEach(async function () {
  //   provider = waffle.provider;
  //   accounts = await ethers.getSigners();
  // });

  describe("Ethereum Mainnet tests", function () {
    let upunksAsset: any;

    before(async function () {
      // provider = waffle.provider;
      provider = new ethers.providers.JsonRpcProvider(
        `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
      );
      accounts = await ethers.getSigners();
      const chainId: number = (await provider.getNetwork()).chainId;
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
                decimals: 18
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

      upunksAsset = await synthsSDK.connectAsset("upunks-0921");
    });

    // @todo Add tests
    describe("Interact with asset", function () {
      it("getEmpState - success", async function () {
        const empState: EmpState = await upunksAsset.getEmpState();
        expect(empState).to.deep.include({
          collateralCurrency: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        });
      });
      it("getPosition - success", async function () {
        const position: any = await upunksAsset.getPosition();
        expect(position.rawCollateral["rawValue"]).to.equal(BigNumber.from(0));
      });
      it("getPositionCR - success", async function () {
        const positionCR: any = await upunksAsset.getPositionCR();
        expect(positionCR).to.equal("0");
      });
      it("getPositions - success", async function () {
        const positions: any = await upunksAsset.getPositions();
        expect(positions).to.deep.include({
          "0x86140A763077155964754968B6F6e243fE809cBe": BigNumber.from(0),
        });
      });
      it("getGCR - success", async function () {
        const gcr: any = await upunksAsset.getGCR();
        // console.log(gcr);
      });
    });
  });
});
