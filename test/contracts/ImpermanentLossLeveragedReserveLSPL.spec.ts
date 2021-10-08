// noinspection DuplicatedCode

import { deployments, ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { beforeEach } from "mocha";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

const runDefaultFixture = deployments.createFixture(
  async ({ getNamedAccounts, ethers }) => {
    await deployments.fixture(["ImpermanentLossLeveragedReserveLSPL"]);
    const { deployer } = await getNamedAccounts();
    const impermanentLossLeveragedReserveLSPLFactory =
      await ethers.getContractFactory("ImpermanentLossLeveragedReserveLSPL");
    const mockEMPFactory = await ethers.getContractFactory(
      "ExpiringMultiPartyMock"
    );
    const mockDeployment = await mockEMPFactory.deploy(
      ZERO_ADDRESS,
      "1000000",
      { rawValue: "1500000000000000000" },
      ethers.utils.hexZeroPad(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes("TEST_IDENTIFIER")),
        32
      ),
      ZERO_ADDRESS
    );
    await ethers.provider.send("hardhat_impersonateAccount", [
      mockDeployment.address,
    ]);

    const impermanentLossLeveragedReserveLSPLContract =
      await impermanentLossLeveragedReserveLSPLFactory.deploy();

    return {
      deployer: {
        address: deployer,
        impermanentLossLeveragedReserveLSPL:
          impermanentLossLeveragedReserveLSPLContract,
        mockContract: mockDeployment,
      },
    };
  }
);

describe("ImpermanentLossLeveragedReserveLSPL.sol", () => {
  const fixture = runDefaultFixture;
  describe("A standard deployment", () => {
    it("should deploy", async () => {
      const { deployer } = await fixture();
      expect(deployer.impermanentLossLeveragedReserveLSPL.address).to.contain(
        "0x"
      );
    });
    it("should allow setting valid parameters", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters
      >;

      const validParams = [
        deployer.mockContract.address,
        utils.parseEther("100"),
        utils.parseEther(".90"),
        utils.parseEther("50"),
        utils.parseEther("1"),
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters(
        ...validParams
      );
      // Retrieve Parameters from the network
      const params =
        await deployer.impermanentLossLeveragedReserveLSPL.longShortPairParameters(
          deployer.mockContract.address
        );

      // subset of Contract Params that we expect to receive back on the call to longShortPairParameters.
      const [, upperBound, pctLongCap, initalPrice, leverageFactor] =
        validParams;
      const expectedParams = [
        upperBound,
        pctLongCap,
        initalPrice,
        leverageFactor,
      ] as const;
      expect(params).to.deep.equal(expectedParams);
    });
    it("should not have parameters set by default", async () => {
      const { deployer } = await fixture();
      const params =
        await deployer.impermanentLossLeveragedReserveLSPL.longShortPairParameters(
          deployer.mockContract.address
        );
      const expectedParams = [
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
      ] as typeof params;
      expect(params).to.deep.equal(expectedParams);
    });
    it("should revert on invalid bound, 0", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters
      >;
      const badParams = [
        deployer.mockContract.address,
        0,
        0,
        0,
        0,
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await expect(
        deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters(
          ...badParams
        )
      ).to.be.revertedWith("Invalid bound");
    });
    it("should revert on invalid reserve percentage,  1", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters
      >;
      const badParams = [
        deployer.mockContract.address,
        utils.parseEther("100"),
        utils.parseEther("1"), // Max pctLongCap must be less than 1 ether (100%).
        utils.parseEther("50"),
        utils.parseEther("1"),
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await expect(
        deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters(
          ...badParams
        )
      ).to.revertedWith("Invalid cap");
    });

    const parameters = [
      {
        longMaxPercentage: ".90",
        longMinPercentage: ".10",
        upperBound: "2",
        initialPrice: "4000",
        leverageFactor: "20",
        maxBoundSet: ["2250.000000000000009999"],
        minBoundSet: [],
        knownResults: [
          { input: "4000", result: "0.5" },
          { input: "3500", result: "0.522246968602822980" },
          { input: "-1", result: "0.9" },
          { input: "2250.000000000000019999", result: "0.899999999999999990" },
          { input: "2250.000000000000029999", result: "0.899999999999999990" },
        ],
      },
    ] as const;

    parameters.forEach((params) => {
      const {
        longMaxPercentage,
        longMinPercentage,
        upperBound,
        initialPrice,
        leverageFactor,
        maxBoundSet,
        minBoundSet,
        knownResults,
      } = params;
      describe(`When upperBound: ${upperBound} ether, pctLongCap:${longMaxPercentage} ether, initialPrice:${initialPrice}, leverageFactor:${leverageFactor}`, () => {
        let deployment: Awaited<ReturnType<typeof fixture>>;
        beforeEach(
          `Setting upperBound: ${upperBound} ether, pctLongCap: ${longMaxPercentage} ether `,
          async () => {
            deployment = await fixture();
            const { deployer } = deployment;
            type ContractParams = Parameters<
              typeof deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters
            >;
            const contractParams: ContractParams = [
              deployer.mockContract.address,
              utils.parseEther(upperBound),
              utils.parseEther(longMaxPercentage),
              utils.parseEther(initialPrice),
              utils.parseEther(leverageFactor),
              { from: deployer.address },
            ];

            await deployer.impermanentLossLeveragedReserveLSPL.setLongShortPairParameters(
              ...contractParams
            );
          }
        );

        const testPriceBound = (price: string, bound: string) => {
          it(`price: ${price} --> expiryPercentLong: ${bound} `, async () => {
            const { deployer } = deployment;
            // Reconnect to contract with the impersonated signer
            const contract =
              deployer.impermanentLossLeveragedReserveLSPL.connect(
                await ethers.getSigner(deployer.mockContract.address)
              );
            const percentLong = await contract.percentageLongCollateralAtExpiry(
              utils.parseEther(price),
              { from: deployer.mockContract.address }
            );
            expect(percentLong).to.equal(utils.parseEther(bound));
          });
        };
        for (const price of maxBoundSet) {
          testPriceBound(price, longMaxPercentage);
        }
        for (const price of minBoundSet) {
          testPriceBound(price, longMinPercentage);
        }
        for (const { input, result } of knownResults) {
          testPriceBound(input, result);
        }
      });
    });
  });
});
