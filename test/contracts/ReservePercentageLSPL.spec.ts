import { deployments, ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { beforeEach } from "mocha";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

const runDefaultFixture = deployments.createFixture(
  async ({ getNamedAccounts, ethers }) => {
    await deployments.fixture(["ReservePercentageLSPL"]);
    const { deployer } = await getNamedAccounts();
    const reservePercentageLSPLFactory = await ethers.getContractFactory(
      "ReservePercentageLSPL"
    );
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

    const reservePercentageLSPLContract =
      await reservePercentageLSPLFactory.deploy();

    return {
      deployer: {
        address: deployer,
        reservePercentageLSPL: reservePercentageLSPLContract,
        mockContract: mockDeployment,
      },
    };
  }
);

describe("ReservePercentageLSPL.sol", () => {
  const fixture = runDefaultFixture;
  describe("A standard deployment", () => {
    it("should deploy", async () => {
      const { deployer } = await fixture();
      expect(deployer.reservePercentageLSPL.address).to.contain("0x");
    });
    it("should allow setting valid parameters", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.reservePercentageLSPL.setLongShortPairParameters
      >;

      const validParams = [
        deployer.mockContract.address,
        utils.parseEther("200"),
        utils.parseEther(".10"),
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await deployer.reservePercentageLSPL.setLongShortPairParameters(
        ...validParams
      );
      // Retrieve Parameters from the network
      const params =
        await deployer.reservePercentageLSPL.longShortPairParameters(
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
      const params =
        await deployer.reservePercentageLSPL.longShortPairParameters(
          deployer.mockContract.address
        );
      expect(params).to.deep.equal(expectedParams);
    });
    it("should revert on invalid bound, 0", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.reservePercentageLSPL.setLongShortPairParameters
      >;
      const badParams = [
        deployer.mockContract.address,
        0,
        0,
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await expect(
        deployer.reservePercentageLSPL.setLongShortPairParameters(...badParams)
      ).to.revertedWith("Invalid bound");
    });
    it("should revert on invalid reserve percentage, 1", async () => {
      const { deployer } = await fixture();
      type ContractParams = Parameters<
        typeof deployer.reservePercentageLSPL.setLongShortPairParameters
      >;
      const badParams = [
        deployer.mockContract.address,
        utils.parseEther("100"),
        utils.parseEther("1"), // Max pctLongCap must be less than 1 ether (100%).
        { from: deployer.address },
      ] as ContractParams;

      // Send transaction to set parameters.
      await expect(
        deployer.reservePercentageLSPL.setLongShortPairParameters(...badParams)
      ).to.revertedWith("Invalid percentage long cap");
    });
    describe("When upperBound: 200 ether, pctLongCap:.90 ether ", () => {
      const upperBound = utils.parseEther("200");
      const pctLongCap = utils.parseEther(".9");
      let deployment: Awaited<ReturnType<typeof fixture>>;
      beforeEach(
        "Set parameters, upperBound: 200 ether, pctLongCap:.90 ether ",
        async () => {
          deployment = await fixture();
          const { deployer } = deployment;
          type ContractParams = Parameters<
            typeof deployer.reservePercentageLSPL.setLongShortPairParameters
          >;
          const contractParams = [
            deployer.mockContract.address,
            upperBound,
            pctLongCap,
            { from: deployer.address },
          ] as ContractParams;

          await deployer.reservePercentageLSPL.setLongShortPairParameters(
            ...contractParams
          );
        }
      );
      const maxBoundSet = [
        "180",
        "180.01",
        "190",
        "200",
        "200.0001",
        "1000000000", // 1 billion
      ] as const;
      for (const price of maxBoundSet) {
        it(`price: ${price} should return an expiryPercentLong of: .90 `, async () => {
          const { deployer } = deployment;
          // Reconnect to contract with the impersonated signer
          const contract = deployer.reservePercentageLSPL.connect(
            await ethers.getSigner(deployer.mockContract.address)
          );
          const percentLong = await contract.percentageLongCollateralAtExpiry(
            utils.parseEther("100"),
            { from: deployer.mockContract.address }
          );
          expect(percentLong).to.equal(utils.parseEther(".90"));
        });
      }
    });
  });
});
