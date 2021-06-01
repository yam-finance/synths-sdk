
import Web3 from "web3";
import Assets from "../src/assets.json";
import { ExternalProvider, Web3Provider } from "@ethersproject/providers";
import { Degenerative } from "../src";

let SDK: Degenerative;
let globals: any;
const network = "mainnet";
const account = "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be";

beforeAll(async () => {
  const web3 = await new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL_HTTP || ""));
  const provider: ExternalProvider = (new Web3Provider(web3.currentProvider as any)).provider;
  SDK = await new Degenerative({
    provider: provider,
    network: network,
    account: account,
  });
});

describe('SDK Initialization', () => {

  it("sdk network must be a string: \"mainnet\" or \"kovan\"", async () => {
    expect(SDK.network).toBe("mainnet" || "kovan");
  });

  it("sdk must return the user account attached", async () => {
    expect(SDK.account).toBe(account);
  });

  it("sdk must contain the assets.json assets", async () => {
    expect(SDK.assets["ugas"][1].name).toBe(Assets[network]["ugas"][1].name);
  });

  it("sdk synthetics must be initialized", async () => {
    expect(SDK.synthetics["ugas"]["feb21"].asset.name).toBe(Assets[network]["ugas"][1].name);
  });

});

describe('General function testing', () => {

  it("getUserBalanceWETH must return a string", async () => {
    const getUserBalanceWETH = await SDK.methods.getUserBalanceWETH();
    expect(typeof getUserBalanceWETH).toBe("string");
  });

  it("getUserBalanceUSDC must return a string", async () => {
    const getUserBalanceUSDC = await SDK.methods.getUserBalanceUSDC();
    expect(typeof getUserBalanceUSDC).toBe("string");
  });

  it("getTVL must return a string", async () => {
    const getTVL = await SDK.methods.getTVL(Assets[network]["ugas"][0]);
    expect(typeof getTVL).toBe("string");
  });

  it("getPositions must return an object", async () => {
    const pos = await SDK.methods.getPositions();
    expect(typeof pos).toBe("object");
  });

  it("getGCR must return an string", async () => {
    const gcr = await SDK.methods.getGCR(Assets[network]["ustonks"][0]);
    console.debug("gcr", gcr)
    expect(typeof gcr).toBe("string");
  });

  it("getPositionCR must return an string", async () => {
    const pos = await SDK.methods.getPositionCR(Assets[network]["ustonks"][0]);
    console.debug("pos", pos)
    expect(typeof pos).toBe("string");
  });

  it("getMiningRewards must return a string", async () => {
    const apr = await SDK.methods.getMiningRewards(Assets[network]["ugas"][3]);
    console.debug("APR: ", apr)
    expect(typeof apr).toBe("number");
  });

  // TODO Optimize loading time
  // it("getUserStats must return an object", async () => {
  //   const userStats = await SDK.methods.getUserStats();
  //   console.debug("userStats", userStats)
  //   expect(typeof userStats).toBe("object");
  // })

});
