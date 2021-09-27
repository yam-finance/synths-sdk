// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@uma/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries/LongShortPairFinancialProductLibrary.sol";
import "@uma/core/contracts/common/implementation/Lockable.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
/**
 * @title Leveraged IL Long Short Pair Financial Product Library.
 * @notice Adds settlement logic to create leveraged IL payouts for LSP
 */
contract ImpermanentLossLeveragedReserveLSPL is LongShortPairFinancialProductLibrary, Lockable {
    using PRBMathSD59x18 for int256;
    struct ImpermanentLossLeveragedReserveParameters {
        uint256 upperBound;
        uint256 pctLongCap;
        int256 initialPrice;
        uint256 leverageFactor;
    }

    mapping(address => ImpermanentLossLeveragedReserveParameters) public longShortPairParameters;

    /**
     * @notice Enables any address to set the parameters for an associated financial product.
     * @param longShortPair address of the LSP contract.
     * @param upperBound the upper price that the LSP will operate within.
     * @param pctLongCap the cap on the percentage that can be allocated to the long token - enforced for improving MM on v2 AMMs for both L&S tokens
     * @param initialPrice the price of the asset at LSP deployment, used to calculate returns
     * @param leverageFactor the amount of leverage you want to apply to the asset return
     * @dev Note:
     * a) Any address can set these parameters
     * b) existing LSP parameters for address not set.
     * c) upperBound > lowerBound.
     * d) parameters can only be set once to prevent the deployer from changing the parameters after the fact.
     * e) For safety, parameters should be set before depositing any synthetic tokens in a liquidity pool.
     * f) longShortPair must expose an expirationTimestamp method to validate it is correctly deployed.
     */
    function setLongShortPairParameters(
        address longShortPair,
        uint256 upperBound,
        uint256 pctLongCap,
        int256 initialPrice,
        uint256 leverageFactor
    ) public nonReentrant() {
        require(ExpiringContractInterface(longShortPair).expirationTimestamp() != 0, "Invalid LSP address");
        require(upperBound > 0, "Invalid bound");
        require(pctLongCap < 1 ether, "Invalid cap");
        require(initialPrice > 0, "Invalid initial price");
        require(leverageFactor > 0, "Invalid leverage");

        ImpermanentLossLeveragedReserveParameters memory params = longShortPairParameters[longShortPair];
        require(params.upperBound == 0, "Parameters already set");

        longShortPairParameters[longShortPair] = ImpermanentLossLeveragedReserveParameters({
        upperBound : upperBound,
        pctLongCap : pctLongCap,
        initialPrice : initialPrice,
        leverageFactor : leverageFactor
        });
    }

    /**
     * @notice Returns a number between 0 and 1e18 to indicate how much collateral each long and short token is entitled
     * to per collateralPerPair.
     * @param expiryPrice price from the optimistic oracle for the LSP price identifier.
     * @return expiryPercentLong to indicate how much collateral should be sent between long and short tokens.
     */
    function percentageLongCollateralAtExpiry(int256 expiryPrice)
    public
    view
    override
    nonReentrantView()
    returns (uint256)
    {
        ImpermanentLossLeveragedReserveParameters memory params = longShortPairParameters[msg.sender];
        require(params.upperBound != 0, "Params not set for calling LSP");
        // Find price ratio -> denoted as 'p' in the IL approximation formula
        int256 priceRatio = (params.initialPrice * 1 ether) / (expiryPrice <= 0 ? int256(1) : expiryPrice);
        // Perform IL calculation
        int256 numerator = 2 ether * PRBMathSD59x18.sqrt(priceRatio);
        int256 denominator = priceRatio + 1 ether;
        int256 impLoss = (numerator / denominator) - 1 ether;

        // Take absolute value of IL, multiply by leverage, and add 1 to make positive synth payout
        uint256 expiryPriceTransformed = uint256(PRBMathSD59x18.abs(impLoss).mul(int256(params.leverageFactor)) + 1 ether);

        if (expiryPriceTransformed >= (params.upperBound * params.pctLongCap) / 1 ether) return params.pctLongCap;
        if (expiryPriceTransformed <= (params.upperBound * (1 ether - params.pctLongCap)) / 1 ether) return (1 ether - params.pctLongCap);

        return (expiryPriceTransformed * 1 ether) / params.upperBound;
    }
}