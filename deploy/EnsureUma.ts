import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { getAddress } from "@uma/contracts-node";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { chainId } = await hre.ethers.provider.getNetwork();
  const finderAddress = await getAddress(
    "Finder",
    chainId === 31337 ? 1 : chainId
  );
  if (finderAddress) {
    hre.deployments.log(`UMA protocol is available!`);
  }
};
export default func;

const skipIfTest = async (hre: HardhatRuntimeEnvironment) => {
  return Promise.resolve(hre.network.live);
};

func.skip = skipIfTest;
func.tags = ["EnsureUma"];
