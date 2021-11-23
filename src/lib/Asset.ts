import { BigNumber, ethers } from "ethers";
import {
  ExpiringMultiPartyEthers,
  ExpiringMultiPartyEthers__factory,
  LongShortPairEthers,
  LongShortPairEthers__factory,
} from "@uma/contracts-node";
import {
  assertAssetConfigEMP,
  assertAssetConfigLSP,
  AssetClassConfig,
  AssetConfig,
  AssetsConfig,
  EmpState,
  isAssetConfigEMP,
  isAssetConfigLSP,
} from "../types/assets.t";
import {
  prepareLSPStateCall,
  getTokenDecimals,
  getCurrentDexTokenPrice,
} from "../utils/helpers";
import { USDC, WETH } from "./config/contracts";

class Asset {
  #signer!: ethers.Signer;
  #multicallProvider!: ethers.providers.Provider;
  #assets!: AssetsConfig;
  #config!: AssetConfig;
  #contract!: ExpiringMultiPartyEthers | LongShortPairEthers;

  /**
   * @notice Connects an instance of the Asset.
   * @param config - Ethers Asset configuration.
   * @returns The Asset instance.
   */
  static connect({
    signer,
    multicallProvider,
    assets,
    assetIdentifier,
  }: AssetClassConfig): Asset {
    const asset = new Asset();

    asset.init({
      signer,
      multicallProvider,
      assets,
      assetIdentifier,
    });

    return asset;
  }

  /**
   * @notice Get expiring multi party (EMP) state.
   * @returns A promise with the info of the metapool contract.
   */
  async getEmpState(): Promise<EmpState | undefined> {
    try {
      /// @dev Because of an overload error, we split the calls into separate promises.
      assertAssetConfigEMP(this.#config);
      this.#contract = this.#contract as ExpiringMultiPartyEthers;
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
      return;
    }
  }

  /**
   * @notice Get Long Short Pair (LSP) state.
   * @returns A promise with the info of the metapool contract.
   */
  async getLSPState() {
    try {
      assertAssetConfigLSP(this.#config);
      if ("collateralToken" in this.#contract) {
        const call = prepareLSPStateCall(this.#contract);

        const [
          expirationTimestamp,
          collateralToken,
          priceIdentifier,
          pairName,
          longToken,
          shortToken,
          collateralPerPair,
          timerAddress,
        ] = await call;

        return {
          expirationTimestamp,
          collateralToken,
          priceIdentifier,
          pairName,
          longToken,
          shortToken,
          collateralPerPair,
          timerAddress,
        };
      } else {
        return;
      }
    } catch (e) {
      console.error("error", e);
      return;
    }
  }

  /**
   * @notice Fetch the position of an asset in relation to the connected user address.
   * @returns A promise with the user position.
   */
  async getPosition() {
    try {
      const address = await this.#signer.getAddress();
      assertAssetConfigEMP(this.#config);
      this.#contract = this.#contract as ExpiringMultiPartyEthers;
      return this.#contract.positions(address);
    } catch (e) {
      console.error("error", e);
      return;
    }
  }

  /**
   * @notice Get the current user asset position collateral ratio (CR).
   * @returns A promise with the user asset CR.
   */
  async getPositionCR(): Promise<string | undefined> {
    try {
      const position = await this.getPosition();
      // @todo Look at alternatives for maintainability.
      const collateralAddress = this.#config.collateral == "WETH" ? WETH : USDC;
      const collateralDecimals = BigNumber.from(10).pow(
        BigNumber.from(
          await getTokenDecimals(collateralAddress, this.#multicallProvider)
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
      return;
    }
  }

  /**
   * ------------------------------------------------------------------------------
   * @notice The following are helper methods that don't directly call the contract
   * ------------------------------------------------------------------------------
   */

  /**
   * @notice Fetch all the positions of an address.
   * @returns A promise with an object that contains all positions of an address.
   */
  async getPositions(): Promise<
    { [x: string]: ethers.BigNumber | undefined } | undefined
  > {
    try {
      const positions: { [x: string]: ethers.BigNumber | undefined } = {};

      for (const assetCycles in this.#assets) {
        for (const asset of this.#assets[assetCycles]) {
          /// @dev Not used at the moment.
          // const customEmp = new ethers.Contract(
          //   asset.emp.address,
          //   EmpAbi,
          //   this.#ethersProvider
          // ) as ExpiringMultiParty;
          if (isAssetConfigEMP(asset)) {
            const synth = assertAssetConfigEMP(asset);
            const position = await this.getPosition();
            positions[synth.token.address] =
              position?.tokensOutstanding["rawValue"];
          }
        }
      }

      return positions;
    } catch (e) {
      console.error("error", e);
      return;
    }
  }

  /**
   * @notice Get asset global collateral ratio (GCR).
   * @returns A promise with the GCR.
   */
  async getGCR() {
    try {
      let gcr: string;
      const empState = await this.getEmpState();

      if (empState != undefined && isAssetConfigEMP(this.#config)) {
        const tokenDecimals = await getTokenDecimals(
          this.#config.token.address,
          this.#multicallProvider
        );
        const totalTokens = empState["totalTokensOutstanding"]
          .div(BigNumber.from(10).pow(BigNumber.from(tokenDecimals)))
          .toNumber();
        // @todo Look at alternatives for maintainability.
        const collateralAddress =
          this.#config.collateral == "WETH" ? WETH : USDC;
        const collateralDecimals = BigNumber.from(10).pow(
          BigNumber.from(
            await getTokenDecimals(collateralAddress, this.#multicallProvider)
          )
        );

        const tokenPrice = await getCurrentDexTokenPrice(
          this.#config.pool.location,
          this.#config.pool.address,
          this.#config.token.address
        );

        if (tokenPrice == undefined) return;

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
      return;
    }
  }

  /**
   @notice Gets the contract
   */
  getContract() {
    return this.#contract;
  }

  /**
   * @notice Initializes the Asset instance.
   * @param config - Ethers Asset configuration.
   */
  private init({
    signer,
    multicallProvider,
    assets,
    assetIdentifier,
  }: AssetClassConfig): void {
    this.#multicallProvider = multicallProvider;
    this.#assets = assets;
    this.#signer = signer;

    const assetIdentifierSplit = assetIdentifier.split("-");

    for (const assetCycle of assets[assetIdentifierSplit[0]]) {
      if (assetCycle.cycle + assetCycle.year == assetIdentifierSplit[1]) {
        if (isAssetConfigEMP(assetCycle)) {
          this.#config = assetCycle;
          this.#contract = ExpiringMultiPartyEthers__factory.connect(
            this.#config.emp.address,
            this.#multicallProvider
          );
          break;
        } else if (isAssetConfigLSP(assetCycle)) {
          this.#config = assetCycle;
          this.#contract = LongShortPairEthers__factory.connect(
            this.#config.lsp.address,
            this.#multicallProvider
          );
          break;
        }
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
