import { ethers } from "hardhat";
import { Signer } from "ethers";
import { expect } from "chai";
import { Greeter } from "../src/types/contracts";

async function deploy(name: string, ...params: any) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

describe("Token", function () {
  let accounts: Signer[];

  beforeEach(async function () {
    accounts = await ethers.getSigners();
  });

  it("should return the new greeting once it's changed", async function () {
    const greeter = (await deploy("Greeter", "Hello, world!")) as Greeter;

    expect(await greeter.greet()).to.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    /// @dev Wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
