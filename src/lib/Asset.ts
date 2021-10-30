import { ethers, BigNumber } from "ethers";
import { request } from "graphql-request";
import {
  AssetClassConfig,
  EmpState,
  AssetsConfig,
  AssetConfig,
} from "../types/assets.t";
import { Emp as ExpiringMultiParty } from "../types/abi";
import { Erc20 } from "types/abi";
import EmpAbi from "../abi/emp.json";
import ERC20Abi from "../abi/erc20.json";
import { WETH, USDC } from "./config/contracts";
import {
  UNISWAP_ENDPOINT,
  SUSHISWAP_ENDPOINT,
  UNISWAP_PAIR_DATA,
  SUSHISWAP_PAIR_DATA,
} from "../utils/queries";

class Asset {
  #ethersProvider!: ethers.providers.Web3Provider;
  #signer!: ethers.Signer;
  #assets!: AssetsConfig;
  #config!: AssetConfig;
  #contract!: ExpiringMultiParty;

  /**
   * Connects an instance of the Asset.
   * @param config - Ethers Asset configuration
   * @return The Asset instance
   */
  static connect({
    ethersProvider,
    assets,
    assetIdentifier,
  }: AssetClassConfig): Asset {
    const asset = new Asset();

    asset.init({
      ethersProvider,
      assets,
      assetIdentifier,
    });

    return asset;
  }

  /**
   * Get expiring multi party (EMP) state
   *
   * @return A promise with the info of the metapool contract
   */
  async getEmpState(): Promise<EmpState | undefined> {
    try {
      /// @dev Because of an overload error, we split the calls into separate promises

      const result1 = await Promise.all([
        this.#contract.expirationTimestamp(),
        this.#contract.collateralCurrency(),
        this.#contract.priceIdentifier(),
        this.#contract.tokenCurrency(),
        this.#contract.collateralRequirement(),
        this.#contract.disputeBondPercentage(),
        this.#contract.disputerDisputeRewardPercentage(),
        this.#contract.sponsorDisputeRewardPercentage(),
        this.#contract.minSponsorTokens(),
        this.#contract.timerAddress(),
      ]);

      const result2 = await Promise.all([
        this.#contract.cumulativeFeeMultiplier(),
        this.#contract.rawTotalPositionCollateral(),
        this.#contract.totalTokensOutstanding(),
        this.#contract.liquidationLiveness(),
        this.#contract.withdrawalLiveness(),
        this.#contract.getCurrentTime(),
        this.#contract.contractState(),
        this.#contract.finder(),
        this.#contract.expiryPrice(),
      ]);

      const data: EmpState = {
        expirationTimestamp: result1[0],
        collateralCurrency: result1[1],
        priceIdentifier: result1[2],
        tokenCurrency: result1[3],
        collateralRequirement: result1[4],
        disputeBondPercentage: result1[5],
        disputerDisputeRewardPercentage: result1[6],
        sponsorDisputeRewardPercentage: result1[7],
        minSponsorTokens: result1[8],
        timerAddress: result1[9],
        cumulativeFeeMultiplier: result2[0],
        rawTotalPositionCollateral: result2[1],
        totalTokensOutstanding: result2[2],
        liquidationLiveness: result2[3],
        withdrawalLiveness: result2[4],
        currentTime: result2[5],
        isExpired: Number(result2[5]) >= Number(result1[0]),
        contractState: Number(result2[6]),
        finderAddress: result2[7],
        expiryPrice: result2[8],
      };

      return data;
    } catch (e) {
      console.error("error", e);
      return undefined;
    }
  }

  /**
   * Fetch the position of an asset in relation to the connected user address
   *
   * @return A promise with the user position
   */
  async getPosition() {
    try {
      const address = await this.#signer.getAddress();
      return this.#contract.positions(address);
    } catch (e) {
      console.error("error", e);
      return undefined;
    }
  }

  /**
   * Get the current user asset position collateral ratio (CR).
   *
   * @return A promise with the user asset CR
   */
  async getPositionCR(): Promise<string | undefined> {
    try {
      const position = await this.getPosition();
      // @todo Look at alternatives for maintainability
      const collateralAddress = this.#config.collateral == "WETH" ? WETH : USDC;
      const collateralDecimals = BigNumber.from(10).pow(
        BigNumber.from(
          await this.getERC20Decimals(collateralAddress, this.#ethersProvider)
        )
      );
      const collateralRatio = BigNumber.from(
        position?.rawCollateral["rawValue"]
      )
        .div(collateralDecimals)
        .toString();

      return collateralRatio;
    } catch (e) {
      console.error("error", e);
      return undefined;
    }
  }

  /**
   * ------------------------------------------------------------------------------
   * @notice The following are helper methods that don't directly call the contract
   * ------------------------------------------------------------------------------
   */

  /**
   * Fetch all the positions of an address.
   *
   * @return A promise with an object that contains all positions of an address
   */
  async getPositions(): Promise<
    { [x: string]: ethers.BigNumber | undefined } | undefined
  > {
    try {
      const positions: { [x: string]: ethers.BigNumber | undefined } = {
        x: undefined,
      };

      for (const assetCycles in this.#assets) {
        for (const asset of this.#assets[assetCycles]) {
          /// @dev Not used at the moment
          // const customEmp = new ethers.Contract(
          //   asset.emp.address,
          //   EmpAbi,
          //   this.#ethersProvider
          // ) as ExpiringMultiParty;

          const position = await this.getPosition();
          positions[asset.token.address] =
            position?.tokensOutstanding["rawValue"];
        }
      }

      return positions;
    } catch (e) {
      console.error("error", e);
      return undefined;
    }
  }

  /**
   * Get asset global collateral ratio (GCR).
   *
   * @return A promise with the GCR
   */
  async getGCR() {
    try {
      let gcr: string;
      const empState = await this.getEmpState();

      if (empState != undefined) {
        const tokenDecimals = await this.getERC20Decimals(
          this.#config.token.address,
          this.#ethersProvider
        );
        const totalTokens = empState["totalTokensOutstanding"]
          .div(BigNumber.from(10).pow(BigNumber.from(tokenDecimals)))
          .toNumber();
        // @todo Look at alternatives for maintainability
        const collateralAddress =
          this.#config.collateral == "WETH" ? WETH : USDC;
        const collateralDecimals = BigNumber.from(10).pow(
          BigNumber.from(
            await this.getERC20Decimals(collateralAddress, this.#ethersProvider)
          )
        );

        /// @dev Get pool data from graph endpoints
        const endpoint =
          this.#config.pool.location === "uni"
            ? UNISWAP_ENDPOINT
            : SUSHISWAP_ENDPOINT;
        const query =
          this.#config.pool.location === "uni"
            ? UNISWAP_PAIR_DATA
            : SUSHISWAP_PAIR_DATA;
        // eslint-disable-next-line
        const poolData: any = await request(endpoint, query, {
          pairAddress: this.#config.pool.address,
        });
        let tokenPrice: number;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (poolData["pair"].token0.id === this.#config.token.address) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          tokenPrice = poolData["pair"].reserve0 / poolData["pair"].reserve1;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          tokenPrice = poolData["pair"].reserve1 / poolData["pair"].reserve0;
        }

        const feeMultiplier = Number(
          ethers.utils.formatEther(empState["cumulativeFeeMultiplier"])
        );
        const totalCollateral = BigNumber.from(feeMultiplier)
          .mul(empState["rawTotalPositionCollateral"].div(collateralDecimals))
          .toNumber();

        gcr =
          totalTokens > 0
            ? (totalCollateral / totalTokens / tokenPrice).toFixed(4)
            : "0";
      } else {
        throw new Error("Collateral not found");
      }

      return gcr;
    } catch (e) {
      console.error("error", e);
      return undefined;
    }
  }

  /**
   * ----------------------------------------------------------------------------------
   * @notice The following are on-chain helpers that will be moved to another directory
   * ----------------------------------------------------------------------------------
   */

  async getERC20Decimals(
    address: string,
    ethersProvider: ethers.providers.Web3Provider
  ): Promise<number | undefined> {
    try {
      const contract = new ethers.Contract(
        address,
        ERC20Abi,
        ethersProvider
      ) as Erc20;
      const decimals: number = await contract.decimals();

      return decimals;
    } catch (e) {
      console.error("error", e);
      return undefined;
    }
  }

  /**
   * Initializes the Asset instance.
   * @param config - Ethers Asset configuration
   */
  private init({
    ethersProvider,
    assets,
    assetIdentifier,
  }: AssetClassConfig): void {
    this.#ethersProvider = ethersProvider;
    this.#assets = assets;

    // @todo Check alternatives
    // this.#signer = await this.#ethersProvider.getSigner();
    this.#signer = ethers.Wallet.createRandom();

    const assetIdentifierSplit = assetIdentifier.split("-");

    // @todo Check EmpAbi error
    for (const assetCycle of assets[assetIdentifierSplit[0]]) {
      if (assetCycle.cycle + assetCycle.year == assetIdentifierSplit[1]) {
        this.#config = assetCycle;
        this.#contract = new ethers.Contract(
          assetCycle.emp.address,
          EmpAbi,
          this.#ethersProvider
        ) as ExpiringMultiParty;
        break;
      }
    }

    if (!this.#contract) {
      throw new Error(
        "Synths contract with the passed identifier not found in the current network"
      );
    }
  }
}
export default Asset;
