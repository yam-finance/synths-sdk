import { ethers, artifacts, waffle } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { MockProvider } from "@ethereum-waffle/provider";
import { expect } from "chai";
import Synths from "../src";
import { SynthsAssetsConfig } from "../src/types/assets.t";

async function deploy(name: string, ...params: any) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe("Synths", function () {
  let provider: MockProvider;
  let accounts: Signer[];

  // beforeEach(async function () {
  //   provider = waffle.provider;
  //   accounts = await ethers.getSigners();
  // });

  describe("Yam Synths SDK", function () {
    let synthsSDK: any;

    before(async function () {
      provider = waffle.provider;
      accounts = await ethers.getSigners();
      const chainId: number = (await provider.getNetwork()).chainId;
      const userAssetsConfig: SynthsAssetsConfig = {
        [chainId]: {
          "upunks": [
            {
              "name": "September",
              "cycle": "09",
              "year": "21",
              "collateral": "WETH",
              "token": {
                "address": "0x86140A763077155964754968B6F6e243fE809cBe",
                "decimals": 18
              },
              "emp": {
                "address": "0xF8eF02C10C473CA5E48b10c62ba4d46115dd2288",
                "new": true,
                "type": "finlib"
              },
              "pool": {
                "address": "0x6e01db46b183593374a49c0025e42c4bb7ee3ffa",
                "location": "sushiswap"
              },
              "expired": false 
            }
          ],
        },
      };

      synthsSDK = await Synths.create({
        ethersProvider: provider,
        userAssetsConfig: userAssetsConfig
      });

      synthsSDK.connectAsset("upunks-0921")
    });

    // TODO Add tests
    describe("Interact with asset", function () {
      it("should do something", async function () {
        
      });
    });
  });
});
