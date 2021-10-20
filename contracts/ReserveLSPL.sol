// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@uma/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries/LongShortPairFinancialProductLibrary.sol";
import "@uma/core/contracts/common/implementation/Lockable.sol";

/**
 * @title Linear Long Short Pair Financial Product Library.
 * @notice Adds settlement logic to create linear LSPs that have a capped percentage payable to the long (& short) token to
 * make market making both the long and short tokens easier in a v2 style AMM.
 */
contract ReserveLSPL is LongShortPairFinancialProductLibrary, Lockable {
    struct ReserveLinearLongShortPairParameters {
        uint256 upperBound;
        uint256 pctLongCap;
    }

    mapping(address => ReserveLinearLongShortPairParameters)
        public longShortPairParameters;

    /// @notice Invalid LSP address.
    error InvalidLSPAddress();
    /// @notice Invalid bound.
    error InvalidBound();
    /// @notice Invalid cap.
    error InvalidCap();
    /// @notice Parameters already set.
    error ParametersSet();
    /// @notice Parameters not set for calling LSP.
    error ParametersNotSet();

    /**
     * @notice Enables any address to set the parameters for an associated financial product.
     * @param longShortPair address of the LSP contract.
     * @param upperBound the upper price that the LSP will operate within.
     * @param pctLongCap the cap on the percentage that can be allocated to the long token - enforced for improving MM on v2 AMMs for both L&S tokens
     * @dev Note:
     * a) Any address can set these parameters
     * b) existing LSP parameters for address not set.
     * c) upperBound > 0.
     * d) parameters can only be set once to prevent the deployer from changing the parameters after the fact.
     * e) For safety, parameters should be set before depositing any synthetic tokens in a liquidity pool.
     * f) longShortPair must expose an expirationTimestamp method to validate it is correctly deployed.
     */
    function setLongShortPairParameters(
        address longShortPair,
        uint256 upperBound,
        uint256 pctLongCap
    ) public nonReentrant {
        if (ExpiringContractInterface(longShortPair).expirationTimestamp() == 0) revert InvalidLSPAddress();
        // upperBound at 0 would cause a division by 0
        if (upperBound <= 0) revert InvalidBound(); 
        if (pctLongCap >= 1 ether) revert InvalidCap(); 

        ReserveLinearLongShortPairParameters
            memory params = longShortPairParameters[longShortPair];

        if (params.upperBound != 0) revert ParametersSet(); 

        longShortPairParameters[
            longShortPair
        ] = ReserveLinearLongShortPairParameters({
            upperBound: upperBound,
            pctLongCap: pctLongCap
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
        nonReentrantView
        returns (uint256)
    {
        ReserveLinearLongShortPairParameters
            memory params = longShortPairParameters[msg.sender];
        if (params.upperBound == 0) revert ParametersNotSet();
        uint256 positivePrice = expiryPrice < 0 ? 0 : uint256(expiryPrice);

        if (positivePrice >= (params.upperBound * params.pctLongCap) / 1 ether)
            return params.pctLongCap;
        if (
            positivePrice <=
            (params.upperBound * (1 ether - params.pctLongCap)) / 1 ether
        ) return (1 ether - params.pctLongCap);

        return (positivePrice * 1 ether) / params.upperBound;
    }
}
