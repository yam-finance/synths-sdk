import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();

  await deployments.deploy("ImpermanentLossLeveragedReserveLSPL", {
    from: deployer,
    args: [],
  });
  await deployments.deploy("LeveragedReserveLSPL", {
    from: deployer,
    args: [],
  });
  await deployments.deploy("ReserveLSPL", {
    from: deployer,
    args: [],
  });
};
export default func;
func.id = "1";
func.tags = ["DefiTools"];
func.dependencies = ["EnsureUma", "Mocks"];
