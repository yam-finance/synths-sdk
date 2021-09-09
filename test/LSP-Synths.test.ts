import { ethers, waffle } from "hardhat";
import { Contract, BigNumber, utils } from "ethers";
import { MockProvider } from "@ethereum-waffle/provider";
import { expect } from "chai";
import LinearLSPFPLAbi from "../src/abi/llspfpl.json";
import { Llspfpl } from "types/abi";

/**
 * @notice To test LSP libraries we simply need a financial
 * contract with an `expirationTimestamp` method.
 */

async function deploy(name: string, ...params: Array<unknown>) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe("Synths", function () {
  let provider: MockProvider;

  before(function () {
    provider = waffle.provider;
  });

  describe("LinearLongShortPairFinancialProductLibrary hardhat node tests", function () {
    let linearLSPFPL: Llspfpl;
    let expiringContractMock: Contract;
    const upperBound = BigNumber.from("2000000000000000000000");
    const lowerBound = BigNumber.from("1000000000000000000000");
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    /**
     * @notice In order to be able to test the contract we deploy it before each test.
     */
    beforeEach(async function () {
      linearLSPFPL = (await deploy(
        "LinearLongShortPairFinancialProductLibrary"
      )) as unknown as Llspfpl;
      /**
       * @notice In order to deploy the contract we pass some parameters for the contract constructor.
       */
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

    /**
     * @notice The following lines setup tests for the parameterization of the linear lspfpl contract.
     */
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
        expect(setParams.upperBound).to.be.equal(upperBound);
        expect(setParams.lowerBound).to.be.equal(lowerBound);
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
      let linearLSPFPLWithoutSigner: Llspfpl;

      /**
       * @notice In order to test the synth expiry we need to parameterize the linear lspfpl contract before each test.
       */
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
        ) as unknown as Llspfpl;
      });

      it("Lower than lower bound should return 0", async () => {
        const expiryTokensForCollateral =
          await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
            utils.parseEther("900"),
            { from: expiringContractMock.address }
          );

        expect(expiryTokensForCollateral).to.be.equal(utils.parseEther("0"));
      });
      it("Higher than upper bound should return 1", async () => {
        const expiryTokensForCollateral =
          await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
            utils.parseEther("2100"),
            { from: expiringContractMock.address }
          );

        expect(expiryTokensForCollateral).to.be.equal(utils.parseEther("1"));
      });
      it("Midway between bounds should return 0.5", async () => {
        const expiryTokensForCollateral =
          await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
            utils.parseEther("1500"),
            { from: expiringContractMock.address }
          );

        expect(expiryTokensForCollateral).to.be.equal(utils.parseEther(".5"));
      });

      it("Arbitrary price between bounds should return correctly", async () => {
        for (const price of [
          utils.parseEther("1000"),
          utils.parseEther("1200"),
          utils.parseEther("1400"),
          utils.parseEther("1600"),
          utils.parseEther("1800"),
          utils.parseEther("2000"),
        ]) {
          const expiryTokensForCollateral =
            await linearLSPFPLWithoutSigner.percentageLongCollateralAtExpiry(
              price,
              {
                from: expiringContractMock.address,
              }
            );
          const numerator = BigNumber.from(price).sub(
            BigNumber.from(lowerBound)
          );
          const denominator = BigNumber.from(upperBound).sub(
            BigNumber.from(lowerBound)
          );
          const expectedPrice = numerator
            .mul(BigNumber.from(utils.parseEther("1")))
            .div(denominator);
          expect(expiryTokensForCollateral).to.be.equal(expectedPrice);
        }
      });
    });
  });
});
