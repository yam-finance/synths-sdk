import { deployments } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const runDefaultFixture = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    await deployments.fixture(["FloatiesLSPFPL"]);
    const floatiesFactory = await ethers.getContractFactory(
      "FloatiesLongShortPairFinancialProductLibrary"
    );
    const { deployer } = await getNamedAccounts();
    const mockDeployment = await deployments.deploy(
      "YamExpiringMultiPartyMock",
      {
        from: deployer,
        args: [
          ZERO_ADDRESS,
          "1000000",
          { rawValue: "1500000000000000000" },
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes("TEST_IDENTIFIER")),
            32
          ),
          ZERO_ADDRESS,
        ],
      }
    );

    return {
      deployer: {
        address: deployer,
        FloatiesFPL: await floatiesFactory.deploy(),
        mockContract: mockDeployment,
      },
    };
  }
);

describe("Synth Contracts", function () {
  describe("FloatiesLongShortPairFinancialProductLibrary.sol", () => {
    describe("A valid implementation", () => {
      it("should deploy", async () => {
        const { deployer } = await runDefaultFixture();

        expect(deployer.FloatiesFPL.address).to.contain("0x");
      });
      it("should allow setting valid parameters", async () => {
        const { deployer } = await runDefaultFixture();

        // Rely on typechain to get type data for the contract.
        type ContractParams = Parameters<
          typeof deployer.FloatiesFPL.setLongShortPairParameters
        >;
        const validParams: ContractParams = [
          deployer.mockContract.address,
          BigNumber.from("10"),
          BigNumber.from("1"),
          { from: deployer.address },
        ];

        // Send transaction to set parameters.
        await deployer.FloatiesFPL.setLongShortPairParameters(...validParams);
        // Retrieve Parameters from the network
        const params = await deployer.FloatiesFPL.longShortPairParameters(
          deployer.mockContract.address
        );

        // subset of Contract Params that we expect to receive back on the call to longShortPairParameters.
        const [, priceCap, priceFloor] = validParams;
        const expectedParams = [priceCap, priceFloor];
        expect(params).to.deep.equal(expectedParams);
      });
      it("should not have parameters set by default", async () => {
        const { deployer } = await runDefaultFixture();
        const params = await deployer.FloatiesFPL.longShortPairParameters(
          deployer.mockContract.address
        );
        const expectedParams = [BigNumber.from("0"), BigNumber.from("0")];
        expect(params).to.deep.equal(expectedParams);
      });
    });
  });
});
