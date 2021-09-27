import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();

  await deployments.deploy("LeveragedReserveLSPL", {
    from: deployer,
    args: [],
  });
};
export default func;

func.tags = ["LeveragedReserveLSPL"];
