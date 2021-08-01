import { ethers } from "hardhat";
import { Greeter } from "../src/types/contracts";

async function deploy(name: string, ...params: any) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

async function main() {
  const [admin] = await ethers.getSigners();
  const greeter = (await deploy("Greeter", "Hello, Hardhat!")) as Greeter;

  console.log(
    `- admin:   ${admin.address} (${ethers.utils.formatEther(
      await admin.getBalance()
    )} ${ethers.constants.EtherSymbol})`
  );
  console.log({ Greeter: greeter.address });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
