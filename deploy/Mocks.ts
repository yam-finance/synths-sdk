import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { utils } from "ethers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  await deployments.deploy("ExpiringMultiPartyMock", {
    from: deployer,
    args: [
      ZERO_ADDRESS,
      "1000000",
      { rawValue: "1500000000000000000" },
      utils.hexZeroPad(utils.hexlify(utils.toUtf8Bytes("TEST_IDENTIFIER")), 32),
      ZERO_ADDRESS,
    ],
  });
};
export default func;

const skipIfTest = async (hre: HardhatRuntimeEnvironment) => {
  return Promise.resolve(hre.network.live);
};

func.skip = skipIfTest; // Skip mocks when network is "live".
func.tags = ["Mocks"];
