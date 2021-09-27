import { deployments, ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { beforeEach } from "mocha";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

const runDefaultFixture = deployments.createFixture(
  async ({ getNamedAccounts, ethers }) => {
    await deployments.fixture(["ReserveLSPL"]);
    const { deployer } = await getNamedAccounts();
    const reserveLSPLFactory = await ethers.getContractFactory("ReserveLSPL");
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

    const reserveLSPLContract = await reserveLSPLFactory.deploy();

    return {
      deployer: {
        address: deployer,
        reserveLSPL: reserveLSPLContract,
        mockContract: mockDeployment,
      },
    };
  }
);

describe("ReserveLSPL.sol", () => {
  const fixture = runDefaultFixture;
  describe("A standard deployment", () => {
    it("should deploy", async () => {
      const { deployer } = await fixture();
      expect(deployer.reserveLSPL.address).to.contain("0x");
    });
    it("should allow setting valid parameters", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.reserveLSPL.setLongShortPairParameters
      >;

      const validParams = [
        deployer.mockContract.address,
        utils.parseEther("200"),
        utils.parseEther(".10"),
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await deployer.reserveLSPL.setLongShortPairParameters(...validParams);
      // Retrieve Parameters from the network
      const params = await deployer.reserveLSPL.longShortPairParameters(
        deployer.mockContract.address
      );

      // subset of Contract Params that we expect to receive back on the call to longShortPairParameters.
      const [, upperBound, pctLongCap] = validParams;
      const expectedParams = [upperBound, pctLongCap] as const;
      expect(params).to.deep.equal(expectedParams);
    });
    it("should not have parameters set by default", async () => {
      const { deployer } = await fixture();
      const expectedParams = [BigNumber.from("0"), BigNumber.from("0")];
      const params = await deployer.reserveLSPL.longShortPairParameters(
        deployer.mockContract.address
      );
      expect(params).to.deep.equal(expectedParams);
    });
    it("should revert on invalid bound, 0", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.reserveLSPL.setLongShortPairParameters
      >;
      const badParams = [
        deployer.mockContract.address,
        0,
        0,
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await expect(
        deployer.reserveLSPL.setLongShortPairParameters(...badParams)
      ).to.revertedWith("Invalid bound");
    });
    it("should revert on invalid reserve percentage,  1", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.reserveLSPL.setLongShortPairParameters
      >;
      const badParams = [
        deployer.mockContract.address,
        utils.parseEther("100"),
        utils.parseEther("1"), // Max pctLongCap must be less than 1 ether (100%).
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await expect(
        deployer.reserveLSPL.setLongShortPairParameters(...badParams)
      ).to.revertedWith("Invalid cap");
    });

    const parameters = [
      {
        longMaxPercentage: ".90",
        longMinPercentage: ".10",
        upperBound: "200",
        maxBoundSet: ["180", "190"],
        minBoundSet: ["10", "20"],
        knownResults: [
          { input: "100", result: ".5" },
          { input: "150", result: ".75" },
          { input: "175.86777", result: ".87933885" },
        ],
      },
      {
        longMaxPercentage: ".90",
        longMinPercentage: ".10",
        upperBound: "100",
        maxBoundSet: ["90", "100"],
        minBoundSet: ["10", "0", "-1"],
        knownResults: [
          { input: "80", result: ".8" },
          { input: "76", result: ".76" },
        ],
      },
      {
        longMaxPercentage: ".99",
        longMinPercentage: ".01",
        upperBound: "100",
        maxBoundSet: ["99.99", "100"],
        minBoundSet: ["0.009999999999999999", "0", "-1"],
        knownResults: [
          { input: "99", result: ".99" },
          { input: "76", result: ".76" },
          { input: "5", result: ".05" },
        ],
      },
    ] as const;
    parameters.forEach((params) => {
      const {
        longMaxPercentage,
        longMinPercentage,
        upperBound,
        maxBoundSet,
        minBoundSet,
        knownResults,
      } = params;
      describe(`When upperBound: ${upperBound} ether, pctLongCap:${longMaxPercentage} ether `, () => {
        let deployment: Awaited<ReturnType<typeof fixture>>;
        beforeEach(
          `Setting upperBound: ${upperBound} ether, pctLongCap: ${longMaxPercentage} ether `,
          async () => {
            deployment = await fixture();
            const { deployer } = deployment;
            type ContractParams = Parameters<
              typeof deployer.reserveLSPL.setLongShortPairParameters
            >;
            const contractParams: ContractParams = [
              deployer.mockContract.address,
              utils.parseEther(upperBound),
              utils.parseEther(longMaxPercentage),
              { from: deployer.address },
            ];

            await deployer.reserveLSPL.setLongShortPairParameters(
              ...contractParams
            );
          }
        );

        const testPriceBound = (price: string, bound: string) => {
          it(`price: ${price} --> expiryPercentLong: ${bound} `, async () => {
            const { deployer } = deployment;
            // Reconnect to contract with the impersonated signer
            const contract = deployer.reserveLSPL.connect(
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
