// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@uma/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries/LongShortPairFinancialProductLibrary.sol";
import "@uma/core/contracts/common/implementation/Lockable.sol";

/**
 * @title Linear Long Short Pair Financial Product Library.
 * @notice Adds settlement logic to modify the linearLSP to allow for leveraged LSPs.
 * Also includes a capped percentage payable to the long (& short) token to
 * make market making both the long and short tokens easier in a v2 style AMM.
 */
contract LeveragedReservePercentageLSPL is LongShortPairFinancialProductLibrary, Lockable {

    struct LeveragedLongShortPairParameters {
        uint256 upperBound;
        uint256 pctLongCap;
        int256 initialPrice;
        uint256 leverageFactor;
    }

    mapping(address => LeveragedLongShortPairParameters) public longShortPairParameters;

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

        LeveragedLongShortPairParameters memory params = longShortPairParameters[longShortPair];
        require(params.upperBound == 0, "Parameters already set");

        longShortPairParameters[longShortPair] = LeveragedLongShortPairParameters({
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
        LeveragedLongShortPairParameters memory params = longShortPairParameters[msg.sender];
        require(params.upperBound != 0, "Params not set for calling LSP");
        int256 unScaledReturnFactor = ((expiryPrice * 1 ether) / params.initialPrice) - 1 ether;

        int256 scaledReturnFactor = (unScaledReturnFactor * int256(params.leverageFactor)) / 1 ether;

        int256 scaledReturn = (int256((params.upperBound * 1 ether) / 2 ether) * (scaledReturnFactor + 1 ether)) / 1 ether;

        uint256 positivePrice = scaledReturn < 0 ? 0 : uint256(scaledReturn);

        if (positivePrice >= (params.upperBound * params.pctLongCap) / 1 ether) return params.pctLongCap;
        if (positivePrice <= (params.upperBound * (1 ether - params.pctLongCap)) / 1 ether) return (1 ether - params.pctLongCap);

        return (positivePrice * 1 ether) / params.upperBound;
    }
}