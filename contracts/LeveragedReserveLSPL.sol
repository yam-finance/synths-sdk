// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.4;

import "@uma/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries/LongShortPairFinancialProductLibrary.sol";
import "@uma/core/contracts/common/implementation/Lockable.sol";

/**
 * @title Linear Long Short Pair Financial Product Library.
 * @notice Adds settlement logic to modify the linearLSP to allow for leveraged LSPs.
 * Also includes a capped percentage payable to the long (& short) token to
 * make market making both the long and short tokens easier in a v2 style AMM.
 */
contract LeveragedReserveLSPL is
    LongShortPairFinancialProductLibrary,
    Lockable
{
    struct LeveragedReserveLongShortPairParameters {
        uint184 upperBound;
        uint72 pctLongCap;
        uint184 initialPrice;
        uint72 leverageFactor;
    }

    mapping(address => LeveragedReserveLongShortPairParameters)
        public longShortPairParameters;

    /// `longShortPair` is not a valid LSP address.
    /// @param longShortPair The address of the LSP contract.
    error InvalidLSPAddress(address longShortPair);

    /// `upperBound` has to be greater than zero.
    /// @param upperBound The upper price that the LSP will operate within.
    error InvalidBound(uint184 upperBound);

    /// `pctLongCap` has to be less than 1 ether.
    /// @param pctLongCap The cap on the percentage that can be allocated to the long token - enforced for improving MM on v2 AMMs for both L&S tokens.
    error InvalidCap(uint72 pctLongCap);

    /// `initialPrice` has to be greater than zero.
    /// @param initialPrice The price of the asset at LSP deployment, used to calculate returns.
    error InvalidInitialPrice(uint184 initialPrice);

    /// `leverageFactor` has to be greater than 0.
    /// @param leverageFactor The amount of leverage you want to apply to the asset return.
    error InvalidLeverage(uint72 leverageFactor);

    /// @notice Parameters already set for calling LSP.
    error ParametersSet();

    /// @notice Parameters not set for calling LSP.
    error ParametersNotSet();

    /**
     * @notice Enables any address to set the parameters for an associated financial product.
     * @param longShortPair The address of the LSP contract.
     * @param upperBound The upper price that the LSP will operate within.
     * @param pctLongCap The cap on the percentage that can be allocated to the long token - enforced for improving MM on v2 AMMs for both L&S tokens.
     * @param initialPrice The price of the asset at LSP deployment, used to calculate returns.
     * @param leverageFactor The amount of leverage you want to apply to the asset return.
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
        uint184 upperBound,
        uint72 pctLongCap,
        uint184 initialPrice,
        uint72 leverageFactor
    ) public nonReentrant {
        if (ExpiringContractInterface(longShortPair).expirationTimestamp() == 0)
            revert InvalidLSPAddress(longShortPair);
        if (upperBound == 0) revert InvalidBound(upperBound);
        if (pctLongCap >= 1 ether) revert InvalidCap(pctLongCap);
        if (initialPrice == 0) revert InvalidInitialPrice(initialPrice);
        if (leverageFactor == 0) revert InvalidLeverage(leverageFactor);

        LeveragedReserveLongShortPairParameters
            memory params = longShortPairParameters[longShortPair];

        if (params.upperBound != 0) revert ParametersSet();

        longShortPairParameters[
            longShortPair
        ] = LeveragedReserveLongShortPairParameters({
            upperBound: upperBound,
            pctLongCap: pctLongCap,
            initialPrice: initialPrice,
            leverageFactor: leverageFactor
        });
    }

    /**
     * @notice Returns a number between 0 and 1e18 to indicate how much collateral each long and short token is entitled
     * to per collateralPerPair.
     * @param expiryPrice The price from the optimistic oracle for the LSP price identifier.
     * @return expiryPercentLong to indicate how much collateral should be sent between long and short tokens.
     */
    function percentageLongCollateralAtExpiry(int256 expiryPrice)
        public
        view
        override
        nonReentrantView
        returns (uint256)
    {
        LeveragedReserveLongShortPairParameters
            memory params = longShortPairParameters[msg.sender];
        if (params.upperBound == 0) revert ParametersNotSet();
        if (expiryPrice <= 0) return (1 ether - params.pctLongCap);
        if (expiryPrice >= int184(params.upperBound)) return params.pctLongCap;

        int256 unScaledReturnFactor = ((expiryPrice) * 1 ether) /
            int256(int184(params.initialPrice)) -
            1 ether;

        int256 scaledReturnFactor = (unScaledReturnFactor *
            int256(int72(params.leverageFactor))) / 1 ether;

        int256 scaledReturn = ((int256((int184(params.upperBound) * 1 ether)) /
            2 ether) * (scaledReturnFactor + 1 ether)) / 1 ether;

        uint256 scaledPrice = scaledReturn < 0 ? 0 : uint256(scaledReturn);

        if (scaledPrice >= (params.upperBound * params.pctLongCap) / 1 ether)
            return params.pctLongCap;
        if (
            scaledPrice <=
            (params.upperBound * (1 ether - params.pctLongCap)) / 1 ether
        ) return (1 ether - params.pctLongCap);

        return (scaledPrice * 1 ether) / params.upperBound;
    }
}
