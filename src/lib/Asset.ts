import { ethers, BigNumber } from "ethers";
import { request } from 'graphql-request';
import { AssetClassConfig, EmpState, AssetsConfig, AssetConfig } from "../types/assets.t";
import { ExpiringMultiParty } from "../types/contracts"
import EmpAbi from "../abi/emp.json";
import ERC20Abi from "../abi/erc20.json";
import UNIFactContract from "../abi/uniFactory.json";
import UNIContract from "../abi/uni.json"
import { WETH, USDC } from "./config"
import { UNISWAP_ENDPOINT, SUSHISWAP_ENDPOINT, UNISWAP_PAIR_DATA, SUSHISWAP_PAIR_DATA } from "../utils/queries";

class Asset {
    #ethersProvider!: any;
    #signer!: any;
    #assets!: AssetsConfig;
    #config!: AssetConfig;
    #contract!: ExpiringMultiParty;

    /**
     * Connects an instance of the Asset.
     * @param config - Ethers Asset configuration
     * @return The Asset instance
     */
    static async connect({
        ethersProvider,
        assets,
        assetIdentifier,
    }: AssetClassConfig): Promise<Asset> {
        const asset = new Asset();
        await asset.init({
            ethersProvider,
            assets,
            assetIdentifier,
        });
        return asset;
    }

    /**
     * Initializes the Asset instance.
     * @param config - Ethers Asset configuration
     */
    private async init({
        ethersProvider,
        assets,
        assetIdentifier,
    }: AssetClassConfig): Promise<void> {
        this.#ethersProvider = ethersProvider;
        this.#assets = assets; 

        // @todo Check alternatives
        // this.#signer = await this.#ethersProvider.getSigner();
        this.#signer = ethers.Wallet.createRandom();

        const assetIdentifierSplit = assetIdentifier.split("-");

        // @todo Check EmpAbi error
        for (const assetCycle of assets[assetIdentifierSplit[0]]) { 
            if ((assetCycle.cycle + assetCycle.year) == assetIdentifierSplit[1]) {
                this.#config = assetCycle; 
                this.#contract = new ethers.Contract(
                    assetCycle.emp.address,
                    EmpAbi,
                    this.#ethersProvider) as ExpiringMultiParty;
                break;
            }
        }

        if (!this.#contract) {
          throw new Error("Synths contract with the passed identifier not found in the current network");
        }
    }

    /**
     * Get expiring multi party (EMP) state
     *
     * @return A promise with the info of the metapool contract
     */
    async getEmpState(): Promise<EmpState | undefined>  {
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
              this.#contract.expiryPrice()
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
        }
    }

    /**
     * Fetch the position of an asset in relation to the connected user address
     *
     * @return A promise with the user position
     */
    async getPosition(): Promise<any | undefined> {
        try {
          const address = await this.#signer.getAddress();
          return this.#contract.positions(address);
        } catch (e) {
          console.error("error", e);
        }
    }

    /**
     * ------------------------------------------------------------------------------
     * @notice The following are helper methods that don't directly call the contract
     * ------------------------------------------------------------------------------
     */
    
    /**
     * Get the current user asset position collateral ratio (CR).
     *
     * @return A promise with the user asset CR
     */
    async getPositionCR(): Promise<string | undefined> {
        try {
            const position = await this.getPosition();
            // @todo Look at alternatives for maintainability
            const collateralAddress = this.#config.collateral == 'WETH' ? WETH : USDC; 
            const collateralDecimals = BigNumber.from(10).pow(BigNumber.from(await this.getERC20Decimals(collateralAddress, this.#ethersProvider)));
            const collateralRatio = BigNumber.from(position.rawCollateral['rawValue']).div(collateralDecimals).toString();

            return collateralRatio;
        } catch (e) {
            console.error("error", e);
        }
    }

    /**
     * Fetch all the positions of an address.
     *
     * @return A promise with an object that contains all positions of an address
     */
    async getPositions(): Promise<{string: ethers.BigNumber} | undefined> {
        try {
            let positions: any = {};

            for (const assetCycles in this.#assets) {
                for (const asset in this.#assets[assetCycles]) {
                    const customEmp = new ethers.Contract(
                        this.#assets[assetCycles][asset].emp.address,
                        EmpAbi,
                        this.#ethersProvider
                    ) as ExpiringMultiParty;

                    const position = await this.getPosition();
                    positions[this.#assets[assetCycles][asset].token.address] = position.tokensOutstanding['rawValue'];
                }
            }

            return positions;
        } catch (e) {
            console.error("error", e);
        }
    }

    /**
     * Get asset global collateral ratio (GCR).
     *
     * @return A promise with the GCR
     */
     async getGCR(): Promise<any | undefined> {
        try {
            let gcr: string;
            const empState = await this.getEmpState();

            if (empState != undefined) {
                const totalTokens = empState["totalTokensOutstanding"].div(BigNumber.from(10).pow(BigNumber.from(this.#config.token.decimals))).toNumber();
                // @todo Look at alternatives for maintainability
                const collateralAddress = this.#config.collateral == 'WETH' ? WETH : USDC; 
                const collateralDecimals = BigNumber.from(10).pow(BigNumber.from(await this.getERC20Decimals(collateralAddress, this.#ethersProvider)));

                /// @dev Get pool data from graph endpoints
                const endpoint = this.#config.pool.location === 'uni' ? UNISWAP_ENDPOINT : SUSHISWAP_ENDPOINT;
                const query = this.#config.pool.location === 'uni' ? UNISWAP_PAIR_DATA : SUSHISWAP_PAIR_DATA;
                const poolData = await request(endpoint, query, {pairAddress: this.#config.pool.address});
                let tokenPrice: number;

                if (poolData['pair'].token0.id === this.#config.token.address) {
                    tokenPrice = poolData['pair'].reserve0 / poolData['pair'].reserve1;
                } else {
                    tokenPrice = poolData['pair'].reserve1 / poolData['pair'].reserve0;
                }

                const feeMultiplier = Number(ethers.utils.formatEther(empState["cumulativeFeeMultiplier"]));
                const totalCollateral = BigNumber.from(feeMultiplier).mul(empState["rawTotalPositionCollateral"].div(collateralDecimals)).toNumber();

                gcr = totalTokens > 0 ? (totalCollateral / totalTokens / tokenPrice).toFixed(4) : '0';
            } else {
                throw new Error("Collateral not found");
            }

            return gcr;
        } catch (e) {
            console.error("error", e);
        }
    }

    /**
     * ----------------------------------------------------------------------------------
     * @notice The following are on-chain helpers that will be moved to another directory
     * ----------------------------------------------------------------------------------
     */

     async getERC20Decimals(address: string, ethersProvider: any): Promise<any | undefined> {
        try {
            const contract = new ethers.Contract(
                address,
                ERC20Abi,
                ethersProvider) as any;
            
            return contract.decimals();
        } catch (e) {
            console.error("error", e);
        }
    }





// ----- Asset -----

// private options;
// private asset;
// public tvl: any;
// public apr: any;
// public gcr: any;
// private methods: AssetMethods;
// constructor(asset: any, options: any, config?: any) {
//   this.options = options;
//   this.asset = asset;
//   this.methods = new AssetMethods(this.options);
//   this.tvl = null; // get asset TVL
//   this.apr = null; // get asset APR
//   this.gcr = null; // get asset GCR
// }

// getTVL = async (combine?: boolean) => {
//   return await this.methods.getTVL(this.asset, combine);
// };

// getPrice = async (tokenAddress: string) => {
//   return await this.methods.getPrice(tokenAddress);
// };

// getAPR = async (_aprMultiplier: string, _cr: string) => {
//   return await this.methods.getAPR(_aprMultiplier, _cr);
// }

// mint = async (tokenQty: string, collateralQty: string, onTxHash?: (txHash: string) => void) => {
//   return await this.methods.mint(this.asset, tokenQty, collateralQty, onTxHash);
// };

// deposit = async (collateralQty: string, onTxHash?: (txHash: string) => void) => {
//   return await this.methods.deposit(this.asset, collateralQty, onTxHash);
// };

// requestWithdrawal = async (collateralQty: string, onTxHash?: (txHash: string) => void) => {
//   return await this.methods.requestWithdrawal(this.asset, collateralQty, onTxHash);
// };

// withdrawRequestFinalize = async (onTxHash?: (txHash: string) => void) => {
//   return await this.methods.withdrawRequestFinalize(this.asset, onTxHash);
// };

// withdraw = async (collateralQty: string, onTxHash?: (txHash: string) => void) => {
//   return await this.methods.withdraw(this.asset, collateralQty, onTxHash);
// };

// redeem = async (tokenQty: string, onTxHash?: (txHash: string) => void) => {
//   return await this.methods.redeem(this.asset, tokenQty, onTxHash);
// };

// settle = async (onTxHash?: (txHash: string) => void) => {
//   return await this.methods.settle(this.asset, onTxHash);
// };

// getAssetTokenBalance = async (onTxHash?: (txHash: string) => void) => {
//   return await this.methods.getAssetTokenBalance(this.asset, onTxHash);
// };






// ----- AssetMethods -----

// import { AbiItem } from "web3-utils";
// import { AssetModel } from "../types/assets.t";
// import { approve, getUniPrice, getBalance, getPriceByContract, getWETH, waitTransaction } from "../utils/helpers";
// import EMPContract from "../../src/abi/emp.json";
// import EMPContractOld from "../../src/abi/empold.json";
// import BigNumber from "bignumber.js";
// import { USDC, WETH } from "../utils/addresses";
// import Assets from "../assets.json";

//   /**
//   * Calculate apr with aprMultiplier
//   * @param {string} aprMultiplier Amount of ETH to wrap
//   * @param {string} cr Collateral requirement
//   * @public
//   * @methods
//   */
//    getAPR = async (aprMultiplier: string, cr: string) => {
//     return ((1 / (Number(cr) + 1)) * Number(aprMultiplier)).toString();
//   }

//   /**
//   * Wrap ETH to WETH
//   * @param {string} amount Amount of ETH to wrap
//   * @public
//   * @methods
//   */
//   wrapETH = async (amount: string, onTxHash?: (txHash: string) => void) => {
//     // console.debug("sdk wrapETH", amount);
//     const weth = await getWETH(this.options.provider);
//     try {
//       const amountValue = new BigNumber(amount).times(new BigNumber(10).pow(18)).toString();
//       const ge = await weth.methods.deposit().estimateGas(
//         {
//           from: this.options.account,
//           value: amountValue,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       const wrap = await weth.methods.deposit().send(
//         {
//           from: this.options.account,
//           value: amountValue,
//           gas: 70000,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("Could not wrap", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Wrap transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//       console.log("wrap", wrap);
//       return wrap;
//     } catch (e) {
//       console.error("error", e);
//       return 0;
//     }
//   };

//   /**
//   * Unwrap WETH to ETH
//   * @param {string} amount Amount of WETH to unwrap
//   * @public
//   * @methods
//   */
//   unwrapETH = async (amount: string, onTxHash?: (txHash: string) => void) => {
//     // console.debug("sdk unwrapETH", amount);
//     const weth = await getWETH(this.options.provider);
//     try {
//       const amountValue = new BigNumber(amount).times(new BigNumber(10).pow(18)).toString();
//       const ge = await weth.methods.withdraw(amountValue).estimateGas(
//         {
//           from: this.options.account,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       const unwrap = await weth.methods.withdraw(amountValue).send(
//         {
//           from: this.options.account,
//           gas: 70000,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("Could not unwrap", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Wrap transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//       console.log("unwrap", unwrap);
//       return unwrap;
//     } catch (e) {
//       console.error("error", e);
//       return 0;
//     }
//   };

//   /**
//   * Get user WETH balance
//   * @public
//   * @methods
//   */
//   getUserBalanceWETH = async () => {
//     // console.debug("sdk getUserBalanceWETH");
//     if (!this.options.account) {
//       return false;
//     }
//     const balance = await getBalance(this.options.provider, WETH, this.options.account);
//     return balance;
//   };

//   /**
//   * Get user USDC balance
//   * @public
//   * @methods
//   */
//   getUserBalanceUSDC = async () => {
//     // console.debug("sdk getUserBalanceUSDC");
//     if (!this.options.account) {
//       return false;
//     }
//     const balance = await getBalance(this.options.provider, USDC, this.options.account);
//     return balance;
//   };

//   /**
//   * Make a contract approval
//   * @param {string} identifier Identifier for the input
//   * @param {string} spenderAddress Spender address
//   * @param {string} tokenAddress Token address
//   * @public
//   * @methods
//   */
//   makeContractApproval = async (identifier: string, spenderAddress: string, tokenAddress: string, onTxHash?: (txHash: string) => void) => {
//     // console.debug("sdk makeContractApproval", identifier, spenderAddress, tokenAddress);
//     if (!this.options.account) {
//       return false;
//     }
//     // TODO check if is already approved (fetchContractApproval) and if so return;
//     const makeApproval = await approve(this.options.account, spenderAddress, tokenAddress, this.options.provider);
//     return makeApproval;
//     // TODO handle update approvals on web
//   };

//   /**
//   * Get the total value locked (TVL) of an asset
//   * @param {AssetModel} asset Asset object
//   * @param {boolean} combine Get TVL of all assets
//   * @public
//   * @methods
//   */
//   getTVL = async (asset: AssetModel, combine?: boolean) => {
//     // console.debug("sdk getTVL", asset, combine);
//     if (!asset) {
//       return
//     };
//     try {
//       /* @ts-ignore */
//       const assetsObject = Assets[this.options.network];
//       const ethPrice = await getPriceByContract(WETH);
//       const formatter = new Intl.NumberFormat('en-US');
//       let contractEmp;
//       let contractEmpCall;
//       let empTVL: any;

//       if (combine) {
//         let assetTVL = new BigNumber(0);
//         for (const assets in assetsObject) {
//           const assetDetails = assetsObject[assets];
//           for (const asset in assetDetails) {
//             const baseAsset = new BigNumber(10).pow(assetDetails[asset].token.decimals);
//             contractEmp = new this.options.web3.eth.Contract((EMPContract.abi as unknown) as AbiItem, assetDetails[asset].emp.address);
//             contractEmpCall = await contractEmp.methods.rawTotalPositionCollateral().call();
//             let currentAssetTVL = new BigNumber(contractEmpCall).dividedBy(baseAsset);
//             currentAssetTVL = currentAssetTVL.multipliedBy(assetDetails[asset].collateral == "WETH" ? ethPrice : 1);
//             assetTVL = assetTVL.plus(currentAssetTVL);
//           }
//         }
//         empTVL = assetTVL.toNumber();
//         empTVL = formatter.format(empTVL.toFixed());
//         return empTVL;
//       } else {
//         const baseAsset = new BigNumber(10).pow(asset.token.decimals);
//         contractEmp = new this.options.web3.eth.Contract((EMPContract.abi as unknown) as AbiItem, asset.emp.address);
//         contractEmpCall = await contractEmp.methods.rawTotalPositionCollateral().call();
//         empTVL = new BigNumber(contractEmpCall).dividedBy(baseAsset);
//         empTVL = empTVL.multipliedBy(asset.collateral == "WETH" ? ethPrice : 1).toNumber();
//         empTVL = formatter.format(empTVL.toFixed()).toString();
//         return empTVL;
//       }
//     } catch (e) {
//       console.error("error", e);
//       return "0";
//     }
//   };

//  /**
//   * Fetch the onchain token price
//   * @param {string} tokenAddress Token address
//   * @public
//   */
//      getPrice = async (tokenAddress: string) => {
//       // console.debug("sdk getPrice", tokenAddress);
//       if (!this.options.account) {
//         return;
//       }

//       const price = await getPriceByContract(tokenAddress)
//       return price
//       // TODO get onchain price of the tokenAddress
//     };

//   /**
//   * Mint token of an asset
//   * @param {AssetModel} asset Asset object for the input
//   * @param {string} tokenQty Token quantity to mint
//   * @param {string} collateralQty Collateral quantity to lock up for the mint
//   * @public
//   */
//   mint = async (asset: AssetModel, tokenQty: string, collateralQty: string, onTxHash?: (txHash: string) => void): Promise<any> => {
//     // console.debug("sdk mint", asset, tokenQty, collateralQty);
//     if (!asset || !this.options.account) {
//       return
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       let data = emp.methods.create([collateralQty], [tokenQty]).encodeABI();
//       data = data.concat(this.options.web3.utils.toHex("0x97990b693835da58a281636296d2bf02787dea17").slice(2));
//       const estimateGas = await this.options.web3.eth.estimateGas({
//         from: this.options.account,
//         to: emp.options.address,
//         data: data,
//         gas: 50000000,
//       });
//       return this.options.web3.eth.sendTransaction({
//         from: this.options.account,
//         to: emp.options.address,
//         data: data,
//         gas: estimateGas,
//       }, async (error: any, txHash: any) => {
//         if (error) {
//           console.error("EMP could not mint tokens", error);
//           onTxHash && onTxHash("");
//           return [false, error];
//         }
//         if (onTxHash) {
//           onTxHash(txHash);
//         }
//         const status = await waitTransaction(this.options.provider, txHash);
//         if (!status) {
//           console.error("Mint transaction failed.");
//           return [false, "Mint transaction failed."];
//         }
//         return [true, ""];
//       });
//     } catch (error) {
//       console.error("error", error);
//       return [false, error];
//     }
//   };

//   /**
//   * Deposit more collateral to the position of an asset
//   * @param {AssetModel} asset Asset object for the input
//   * @param {string} collateralQty Collateral quantity to deposit
//   * @public
//   */
//   deposit = async (asset: AssetModel, collateralQty: string, onTxHash?: (txHash: string) => void): Promise<boolean> => {
//     // console.debug("sdk deposit", asset, collateralQty);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       const ge = await emp.methods.deposit([collateralQty]).estimateGas(
//         {
//           from: this.options.account,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       return emp.methods.deposit([collateralQty]).send(
//         {
//           from: this.options.account,
//           gas: ge,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("EMP could not deposit collateral", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Deposit transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//     } catch (e) {
//       console.error("error", e);
//       return false;
//     }
//   };

//   /**
//   * Request withdrawal for more collateral to go below the collaterization ratio (cr) of the position of an asset
//   * @param {AssetModel} asset Asset object for the input
//   * @param {string} collateralQty Collateral quantity to request for
//   * @public
//   */
//   requestWithdrawal = async (asset: AssetModel, collateralQty: string, onTxHash?: (txHash: string) => void): Promise<boolean> => {
//     // console.debug("sdk requestWithdrawal", asset, collateralQty);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       const ge = await emp.methods.requestWithdrawal([collateralQty]).estimateGas(
//         {
//           from: this.options.account,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       return emp.methods.requestWithdrawal([collateralQty]).send(
//         {
//           from: this.options.account,
//           gas: ge,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("EMP could not request withdraw", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Withdrawal request transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//     } catch (e) {
//       console.error("error", e);
//       return false;
//     }
//   };

//   /**
//   * Withdraw collateral up to the minimum collaterization ratio (cr) of the position of an asset
//   * @param {AssetModel} asset Asset object for the input
//   * @public
//   */
//   withdrawRequestFinalize = async (asset: AssetModel, onTxHash?: (txHash: string) => void): Promise<boolean> => {
//     // console.debug("sdk withdrawRequestFinalize", asset);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       const ge = await emp.methods.withdrawPassedRequest().estimateGas(
//         {
//           from: this.options.account,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       return emp.methods.withdrawPassedRequest().send(
//         {
//           from: this.options.account,
//           gas: ge,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("EMP could not withdraw", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Withdrawal transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//     } catch (e) {
//       console.error("error", e);
//       return false;
//     }
//   };

//   /**
//   * Instantly withdraw collateral up to the global collaterization ratio (gcr) of the position of an asset
//   * @param {AssetModel} asset Asset object for the input
//   * @param {string} collateralQty Collateral quantity to withdraw
//   * @public
//   */
//   withdraw = async (asset: AssetModel, collateralQty: string, onTxHash?: (txHash: string) => void): Promise<boolean> => {
//     // console.debug("sdk withdraw", asset, collateralQty);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       const ge = await emp.methods.withdraw([collateralQty]).estimateGas(
//         {
//           from: this.options.account,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       return emp.methods.withdraw([collateralQty]).send(
//         {
//           from: this.options.account,
//           gas: ge,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("EMP could not instant withdraw", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Instant withdrawal transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//     } catch (e) {
//       console.error("error", e);
//       return false;
//     }
//   };

//   /**
//   * Redeem asset tokens to get back the collateral amount from the position of an asset
//   * @param {AssetModel} asset Asset object for the input
//   * @param {string} tokenQty Token quantity to redeem
//   * @public
//   */
//   redeem = async (asset: AssetModel, tokenQty: string, onTxHash?: (txHash: string) => void): Promise<boolean> => {
//     // console.debug("sdk redeem", asset, tokenQty);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       const ge = await emp.methods.redeem([tokenQty]).estimateGas(
//         {
//           from: this.options.account,
//           gas: 50000000,
//         },
//         async (error: any) => {
//           console.log("SimTx Failed", error);
//           return false;
//         }
//       );
//       return emp.methods.redeem([tokenQty]).send(
//         {
//           from: this.options.account,
//           gas: ge,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("EMP could not redeem", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Redeem transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//     } catch (e) {
//       console.error("error", e);
//       return false;
//     }
//   };

//   /**
//   * Settle position exchanging the asset tokens back to the collateral amount
//   * @param {AssetModel} asset Asset object for the input
//   * @public
//   */
//   settle = async (asset: AssetModel, onTxHash?: (txHash: string) => void): Promise<any> => {
//     // console.debug("sdk settle", asset);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       // TODO try going with estimations again
//       // const ge = await emp.methods.settleExpired().estimateGas(
//       //   {
//       //     from: this.options.account,
//       //     gas: 50000000,
//       //   },
//       //   async (error: any) => {
//       //     console.log("SimTx Failed", error);
//       //     return false;
//       //   }
//       // );
//       return emp.methods.settleExpired().send(
//         {
//           from: this.options.account,
//           gas: 200000,
//         },
//         async (error: any, txHash: string) => {
//           if (error) {
//             console.error("EMP could not Settle", error);
//             onTxHash && onTxHash("");
//             return false;
//           }
//           if (onTxHash) {
//             onTxHash(txHash);
//           }
//           const status = await waitTransaction(this.options.provider, txHash);
//           if (!status) {
//             console.log("Settle transaction failed.");
//             return false;
//           }
//           return true;
//         }
//       );
//     } catch (e) {
//       console.error("error", e);
//       return [false, e];
//     }
//   };

//   /**
//   * Fetch asset tokens balance of an address
//   * @param {AssetModel} asset Asset object for the input
//   * @public
//   */
//   getAssetTokenBalance = async (asset: AssetModel, onTxHash?: (txHash: string) => void) => {
//     // console.debug("sdk getAssetTokenBalance", asset);
//     if (!asset || !this.options.account) {
//       return false;
//     };
//     const emp = (asset.emp.new ? await this.getEmp(asset) : await this.getEmpV1(asset));
//     try {
//       const synth = await emp.methods.tokenCurrency().call();
//       const balance = Number(await getBalance(this.options.provider, synth, this.options.account));
//       return balance;
//     } catch (e) {
//       return 0;
//     }
//   };

}

export default Asset;
