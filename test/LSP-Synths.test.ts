import { ethers, waffle } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { MockProvider } from "@ethereum-waffle/provider";
import { expect, assert } from "chai";
import LinearLSPFPLAbi from "../src/abi/llspfpl.json";
import web3 from "web3";

/** @notice To test LSP libraries we simply need a financial
 * contract with an `expirationTimestamp` method.
 */

async function deploy(name: string, ...params: any) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe("Synths", function () {
  let provider: MockProvider;
  let accounts: Signer[];

  before(async function () {
    provider = waffle.provider;
    accounts = await ethers.getSigners();
  });

  describe("LinearLongShortPairFinancialProductLibrary hardhat node tests", function () {
    let linearLSPFPL: Contract;
    let expiringContractMock: Contract;
    const upperBound = BigNumber.from("2000000000000000000000");
    const lowerBound = BigNumber.from("1000000000000000000000");
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    beforeEach(async function () {
      linearLSPFPL = await deploy("LinearLongShortPairFinancialProductLibrary");
      expiringContractMock = await deploy(
        "ExpiringMultiPartyMock",
        ZERO_ADDRESS,
        "1000000",
        { rawValue: "1500000000000000000" },
        ethers.utils.hexZeroPad(
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes("TEST_IDENTIFIER")),
          32
        ),
        ZERO_ADDRESS
      );
    });

    describe("Long Short Pair Parameterization", () => {
      it("Can set and fetch valid values", async () => {
        await linearLSPFPL.setLongShortPairParameters(
          expiringContractMock.address,
          upperBound,
          lowerBound
        );

        const setParams = await linearLSPFPL.longShortPairParameters(
          expiringContractMock.address
        );
        expect(setParams.upperBound.toString()).to.be.equal(
          upperBound.toString()
        );
        expect(setParams.lowerBound.toString()).to.be.equal(
          lowerBound.toString()
        );
      });
      it("Can not re-use existing LSP contract address", async () => {
        await linearLSPFPL.setLongShortPairParameters(
          expiringContractMock.address,
          upperBound,
          lowerBound
        );

        /// @notice Second attempt should revert.
        await expect(
          linearLSPFPL.setLongShortPairParameters(
            expiringContractMock.address,
            upperBound,
            lowerBound
          )
        ).to.be.reverted;
      });
      it("Can not set invalid bounds", async () => {
        /// @notice upper bound larger than lower bound by swapping upper and lower
        await expect(
          linearLSPFPL.setLongShortPairParameters(
            expiringContractMock.address,
            lowerBound,
            upperBound
          )
        ).to.be.reverted;
      });
      it("Can not set invalid LSP contract address", async () => {
        /// @notice LSP Address must implement the `expirationTimestamp method.
        await expect(
          linearLSPFPL.setLongShortPairParameters(
            ZERO_ADDRESS,
            upperBound,
            lowerBound
          )
        ).to.be.reverted;
      });
    });

    describe("Compute expiry tokens for collateral", () => {
      let linearLSPFPLWithoutSigner: Contract;

      beforeEach(async () => {
        await linearLSPFPL.setLongShortPairParameters(
          expiringContractMock.address,
          upperBound,
          lowerBound
        );
        linearLSPFPLWithoutSigner = new ethers.Contract(
          linearLSPFPL.address,
          LinearLSPFPLAbi,
          provider
        );
      });
      it("Lower than lower bound should return 0", async () => {
        const expiryTokensForCollateral =
          await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
            web3.utils.toWei("900"),
            { from: expiringContractMock.address }
          );

        assert.equal(
          expiryTokensForCollateral.toString(),
          web3.utils.toWei("0")
        );
      });
      it("Higher than upper bound should return 1", async () => {
        const expiryTokensForCollateral =
          await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
            web3.utils.toWei("2100"),
            { from: expiringContractMock.address }
          );

        assert.equal(
          expiryTokensForCollateral.toString(),
          web3.utils.toWei("1")
        );
      });
      it("Midway between bounds should return 0.5", async () => {
        const expiryTokensForCollateral =
          await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
            web3.utils.toWei("1500"),
            { from: expiringContractMock.address }
          );

        assert.equal(
          expiryTokensForCollateral.toString(),
          web3.utils.toWei("0.5")
        );
      });

      it("Arbitrary price between bounds should return correctly", async () => {
        for (const price of [
          web3.utils.toWei("1000"),
          web3.utils.toWei("1200"),
          web3.utils.toWei("1400"),
          web3.utils.toWei("1600"),
          web3.utils.toWei("1800"),
          web3.utils.toWei("2000"),
        ]) {
          const expiryTokensForCollateral =
            await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
              price,
              { from: expiringContractMock.address }
            );
          const numerator = BigNumber.from(price).sub(
            BigNumber.from(lowerBound)
          );
          const denominator = BigNumber.from(upperBound).sub(
            BigNumber.from(lowerBound)
          );
          const expectedPrice = numerator
            .mul(BigNumber.from(web3.utils.toWei("1")))
            .div(denominator);
          assert.equal(
            expiryTokensForCollateral.toString(),
            expectedPrice.toString()
          );
        }
      });
    });
  });
});
