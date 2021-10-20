import { expect } from "chai";
import { utils } from "ethers";
import { deployments, ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import type { Deployment } from "hardhat-deploy/dist/types";

const toEther = utils.parseEther;
const formatEther = utils.formatEther;
type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

enum DefiToolLibs {
  LeveragedReserveLSPL = "LeveragedReserveLSPL",
  ReserveLSPL = "ReserveLSPL",
  ImpermanentLossLeveragedReserveLSPL = "ImpermanentLossLeveragedReserveLSPL",
}

interface ReserveLSPLValidParams {
  upperBound: BigNumber; // Must be > 0 ether
  pctLongCap: BigNumber; // Must be < 1 ether
}

interface LeveragedReserveLSPLValidParams {
  upperBound: BigNumber; // Must be > 0 ether
  pctLongCap: BigNumber; // Must be < 1 ether
  initialPrice: BigNumber; // Must be > 0 ether
  leverageFactor: BigNumber; // Must be > 0 ether
}

interface ImpermanentLossLeveragedReserveLSPLValidParams {
  upperBound: BigNumber; // Must be > 0 ether
  pctLongCap: BigNumber; // Must be < 1 ether
  initialPrice: BigNumber; // Must be > 0 ether
  leverageFactor: BigNumber; // Must be > 0 ether
}

type LSPParams =
  | ReserveLSPLValidParams
  | LeveragedReserveLSPLValidParams
  | ImpermanentLossLeveragedReserveLSPLValidParams;

type ParamsFor<T = DefiToolLibs> = LSPParams &
  T extends DefiToolLibs.ReserveLSPL
  ? ReserveLSPLValidParams
  : T extends DefiToolLibs.LeveragedReserveLSPL
  ? LeveragedReserveLSPLValidParams
  : T extends DefiToolLibs.ImpermanentLossLeveragedReserveLSPL
  ? ImpermanentLossLeveragedReserveLSPLValidParams
  : LSPParams;

type LSPLConfiguration<T = DefiToolLibs> = {
  library: T;
  validParameters: ParamsFor<T>;
  invalidParameters: [params: Partial<ParamsFor<T>>, reason: string][];
  knownResults?: { price: BigNumber; result: BigNumber }[];
};

const createDefiToolsFixture = deployments.createFixture(
  async ({ getNamedAccounts, ethers }) => {
    await deployments.fixture(["DefiTools"]);
    const { deployer } = await getNamedAccounts();

    const allDeployments = await deployments.all();
    const libDeployments = Object.fromEntries(
      Object.entries(allDeployments).filter((v) => v[0] in DefiToolLibs)
    ) as Record<DefiToolLibs, Deployment>;

    const mockEMP = "ExpiringMultiPartyMock" as const;
    const mockEMPDeployment = await deployments.get(mockEMP);
    const mockEMPContract = await ethers.getContractAt(
      mockEMP,
      mockEMPDeployment.address
    );

    const ImpermanentLossLeveragedReserveLSPL = await ethers.getContractAt(
      DefiToolLibs.ImpermanentLossLeveragedReserveLSPL,
      libDeployments[DefiToolLibs.ImpermanentLossLeveragedReserveLSPL].address
    );
    const LeveragedReserveLSPL = await ethers.getContractAt(
      DefiToolLibs.LeveragedReserveLSPL,
      libDeployments[DefiToolLibs.LeveragedReserveLSPL].address
    );
    const ReserveLSPL = await ethers.getContractAt(
      DefiToolLibs.ReserveLSPL,
      libDeployments[DefiToolLibs.ReserveLSPL].address
    );

    return {
      deployer: {
        address: deployer,
        mockContract: mockEMPContract,
        ReserveLSPL,
        LeveragedReserveLSPL,
        ImpermanentLossLeveragedReserveLSPL,
      },
    };
  }
);

const setParams = async (
  library: DefiToolLibs,
  validParams: Partial<ParamsFor>,
  fixture?: Awaited<ReturnType<typeof createDefiToolsFixture>>,
  mockAddress?: string
) => {
  const { deployer } = fixture ?? (await createDefiToolsFixture());
  const { mockContract } = deployer;
  const lspAddress = mockAddress ?? mockContract.address;
  switch (library) {
    case DefiToolLibs.ReserveLSPL: {
      const params: Partial<ReserveLSPLValidParams> = validParams;
      const contract = deployer[library];
      const { upperBound, pctLongCap } = params;
      const callParameters = [
        ...[lspAddress],
        ...[upperBound, pctLongCap],
        ...[{ from: deployer.address }],
      ] as Parameters<typeof contract["setLongShortPairParameters"]>;
      await contract.setLongShortPairParameters(...callParameters);
      break;
    }
    case DefiToolLibs.LeveragedReserveLSPL: {
      const params: Partial<LeveragedReserveLSPLValidParams> = validParams;
      const contract = deployer[library];
      const { upperBound, pctLongCap, initialPrice, leverageFactor } = params;
      const callParameters = [
        ...[lspAddress],
        ...[upperBound, pctLongCap, initialPrice, leverageFactor],
        ...[{ from: deployer.address }],
      ] as Parameters<typeof contract["setLongShortPairParameters"]>;
      await contract.setLongShortPairParameters(...callParameters);
      break;
    }
    case DefiToolLibs.ImpermanentLossLeveragedReserveLSPL: {
      const params: Partial<ImpermanentLossLeveragedReserveLSPLValidParams> =
        validParams;
      const contract = deployer[library];
      const { upperBound, pctLongCap, initialPrice, leverageFactor } = params;
      const callParameters = [
        ...[lspAddress],
        ...[upperBound, pctLongCap, initialPrice, leverageFactor],
        ...[{ from: deployer.address }],
      ] as Parameters<typeof contract["setLongShortPairParameters"]>;
      await contract.setLongShortPairParameters(...callParameters);
      break;
    }
  }
  return { deployer };
};

type DefiToolsFixture = Awaited<ReturnType<typeof createDefiToolsFixture>>;

const readParams = async (
  library: DefiToolLibs,
  fixture?: DefiToolsFixture
): Promise<BigNumber[]> => {
  const { deployer } = fixture ?? (await createDefiToolsFixture());
  const contract = deployer[library];
  return contract.longShortPairParameters(deployer.mockContract.address);
};

const checkPercentageLongFor = async (
  library: DefiToolLibs,
  price: BigNumber,
  fixture?: DefiToolsFixture
): Promise<BigNumber> => {
  const { deployer }: DefiToolsFixture =
    fixture ?? (await createDefiToolsFixture());

  // Impersonate the mock contract calling.
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [deployer.mockContract.address],
  });

  // Reconnect to contract with the impersonated signer
  const impersonatedContract = deployer[library].connect(
    await ethers.getSigner(deployer.mockContract.address)
  );

  // Calling as the mocked contract.
  const percentageLongFor =
    await impersonatedContract.percentageLongCollateralAtExpiry(price);

  // Stop Impersonating
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [deployer.mockContract.address],
  });

  return percentageLongFor;
};

const testFixture: {
  [library in DefiToolLibs]: LSPLConfiguration<library>[];
} = {
  [DefiToolLibs.ReserveLSPL]: [
    {
      library: DefiToolLibs.ReserveLSPL,
      validParameters: {
        upperBound: toEther("100"),
        pctLongCap: toEther(".90"),
      },
      invalidParameters: [
        [{ upperBound: toEther("-1") }, ""],
        [
          { pctLongCap: toEther("1") },
          "reverted with custom error 'InvalidCap()'",
        ],
        [
          { upperBound: toEther("0") },
          "reverted with custom error 'InvalidBound()'",
        ],
      ],
      knownResults: [
        { price: toEther("50"), result: toEther(".50") },
        { price: toEther("100"), result: toEther(".90") },
        { price: toEther("10"), result: toEther(".10") },
      ],
    },
  ],
  [DefiToolLibs.LeveragedReserveLSPL]: [
    {
      library: DefiToolLibs.LeveragedReserveLSPL,
      validParameters: {
        upperBound: toEther("100"),
        pctLongCap: toEther(".90"),
        initialPrice: toEther("50"),
        leverageFactor: toEther("1"),
      },
      invalidParameters: [
        [{ upperBound: toEther("-1") }, ""],
        [
          { pctLongCap: toEther("1") },
          "reverted with custom error 'InvalidCap()'",
        ],
        [
          { upperBound: toEther("0") },
          "reverted with custom error 'InvalidBound()'",
        ],
        [
          { initialPrice: toEther("0") },
          "reverted with custom error 'InvalidInitialPrice()'",
        ],
        [
          { leverageFactor: toEther("0") },
          "reverted with custom error 'InvalidLeverage()'",
        ],
      ],
      knownResults: [
        { price: toEther("50"), result: toEther(".50") },
        { price: toEther("100"), result: toEther(".90") },
        { price: toEther("10"), result: toEther(".10") },
      ],
    },
  ],
  [DefiToolLibs.ImpermanentLossLeveragedReserveLSPL]: [
    {
      library: DefiToolLibs.ImpermanentLossLeveragedReserveLSPL,
      validParameters: {
        upperBound: toEther("2"),
        pctLongCap: toEther(".90"),
        initialPrice: toEther("4000"),
        leverageFactor: toEther("20"),
      },
      invalidParameters: [
        [{ upperBound: toEther("-1") }, ""],
        [
          { pctLongCap: toEther("1") },
          "reverted with custom error 'InvalidCap()'",
        ],
        [
          { upperBound: toEther("0") },
          "reverted with custom error 'InvalidBound()'",
        ],
        [
          { initialPrice: toEther("0") },
          "reverted with custom error 'InvalidInitialPrice()'",
        ],
        [
          { leverageFactor: toEther("0") },
          "reverted with custom error 'InvalidLeverage()'",
        ],
      ],
      knownResults: [
        { price: toEther("4000"), result: toEther("0.5") },
        { price: toEther("3500"), result: toEther("0.522246968602822980") },
        { price: toEther("-1"), result: toEther(".9") },
      ],
    },
  ],
};

const testDeploy = async (config: LSPLConfiguration) => {
  const { deployer } = await createDefiToolsFixture();
  expect(deployer[config.library].address).to.contain("0x");
};

const testValidParams = async (config: LSPLConfiguration) => {
  const fixture = await setParams(config.library, config.validParameters);
  const contractParams = await readParams(config.library, fixture);
  expect(contractParams).to.deep.equal(Object.values(config.validParameters));
};

const testKnownResults = async (config: LSPLConfiguration) => {
  const fixture = await setParams(config.library, config.validParameters);
  if (config.knownResults) {
    for (const { price, result } of config.knownResults) {
      const contractResult = await checkPercentageLongFor(
        config.library,
        price,
        fixture
      );
      expect(contractResult).to.deep.equal(result);
    }
  }
};

const testInvalidParam = async (config: LSPLConfiguration) => {
  if (config.invalidParameters) {
    for (const [params, reason] of config.invalidParameters) {
      const parameter = Object.assign({}, config.validParameters, params);
      if (reason === "") {
        await expect(setParams(config.library, parameter)).to.be.reverted;
      } else {
        await expect(setParams(config.library, parameter)).to.be.revertedWith(
          reason
        );
      }
    }
  }
};

const testInvalidLSPAddress = async (config: LSPLConfiguration) => {
  await expect(
    setParams(
      config.library,
      config.validParameters,
      undefined,
      "0x0000000000000000000000000000000000000000"
    )
  ).to.be.reverted;
};

const testDoubleSetParams = async (config: LSPLConfiguration) => {
  const fixture = await setParams(config.library, config.validParameters);
  //set the params again, this time it should revert.
  await expect(setParams(config.library, config.validParameters, fixture)).to.be
    .reverted;
};

const testParamsNotSet = async (config: LSPLConfiguration) => {
  const fixture = await createDefiToolsFixture();
  await expect(checkPercentageLongFor(config.library, toEther("0"), fixture)).to
    .be.reverted;
};

const runDefaultTests = (config: LSPLConfiguration) => {
  const parameters = config.validParameters;
  describe(`
      Configuring: ${JSON.stringify(Object.keys(parameters))}
      With: ${JSON.stringify(
        Object.values(parameters).map((param: BigNumber) => formatEther(param))
      )}
      `, () => {
    it("Should Deploy", async () => {
      await testDeploy(config);
    });
    it("Should accept parameters", async () => {
      await testValidParams(config);
    });
    it("should return a known result from a valid value", async () => {
      await testKnownResults(config);
    });
    it("should revert on an invalid parameter", async () => {
      await testInvalidParam(config);
    });
    it("should revert on an invalid lsp address", async () => {
      await testInvalidLSPAddress(config);
    });
    it("should revert when params have already been set", async () => {
      await testDoubleSetParams(config);
    });
    it("should revert when retrieving percentageLong without params set", async () => {
      await testParamsNotSet(config);
    });
  });
};

describe("DefiTools", () => {
  describe("ReserveLSPL", () => {
    testFixture["ReserveLSPL"].forEach(runDefaultTests);
  });
  describe("LeveragedReserveLSPL", () => {
    testFixture["LeveragedReserveLSPL"].forEach(runDefaultTests);
  });
  describe("ImpermanentLossLeveragedReserveLSPL", () => {
    testFixture["ImpermanentLossLeveragedReserveLSPL"].forEach(runDefaultTests);
  });
});
