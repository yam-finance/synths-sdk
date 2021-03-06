// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.9;

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
        uint184 upperBound;
        uint72 pctLongCap;
        uint184 initialPrice;
        uint72 leverageFactor;
    }

    mapping(address => ImpermanentLossLeveragedReserveParameters) public longShortPairParameters;

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

        ImpermanentLossLeveragedReserveParameters memory params = longShortPairParameters[longShortPair];

        if (params.upperBound != 0) revert ParametersSet();

        longShortPairParameters[longShortPair] = ImpermanentLossLeveragedReserveParameters({
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
        ImpermanentLossLeveragedReserveParameters memory params = longShortPairParameters[msg.sender];

        if (params.upperBound == 0) revert ParametersNotSet();
        // Find price ratio -> denoted as 'p' in the IL approximation formula
        int256 priceRatio = int256(
            (uint256(params.initialPrice) * 1 ether) / (expiryPrice <= 1 ? uint256(1) : uint256(expiryPrice))
        );
        // Perform IL calculation
        int256 numerator = 2 ether * PRBMathSD59x18.sqrt(priceRatio);
        int256 denominator = priceRatio + 1 ether;
        int256 impLoss = (numerator / denominator) - 1 ether;

        // Take absolute value of IL, multiply by leverage, and add 1 to make positive synth payout
        uint256 impLossTransformed = uint256(
            PRBMathSD59x18.abs(impLoss).mul(int256(uint256(params.leverageFactor))) + 1 ether
        );
        uint256 effectiveUpperBound = (params.upperBound * params.pctLongCap) / 1 ether;
        uint256 effectiveLowerBound = (params.upperBound * (1 ether - params.pctLongCap)) / 1 ether;

        if (impLossTransformed >= effectiveUpperBound) return params.pctLongCap;
        if (impLossTransformed <= effectiveLowerBound) return (1 ether - params.pctLongCap);

        return (impLossTransformed * 1 ether) / params.upperBound;
    }
}
