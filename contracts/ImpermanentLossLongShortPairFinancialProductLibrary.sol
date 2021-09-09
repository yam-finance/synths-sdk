// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.4;

import "@uma/core/contracts/financial-templates/common/financial-product-libraries/long-short-pair-libraries/LongShortPairFinancialProductLibrary.sol";
import "@uma/core/contracts/common/implementation/Lockable.sol";

import "prb-math/contracts/PRBMathSD59x18.sol";

//import "prb-math/contracts/PRBMathUD60x18.sol";

/**
 * @title Impermanent Loss Long Short Pair Financial Product Library
 */
contract ImpermanentLossLongShortPairFinancialProductLibrary is
    LongShortPairFinancialProductLibrary,
    Lockable
{
    using PRBMathSD59x18 for int256;

    struct ImpermanentLossParameters {
        uint256 priceCap;
        uint256 priceFloor;
        uint256 initialPrice; // Price in terms of paired asset
        uint256 leverageFactor;
    }

    mapping(address => ImpermanentLossParameters)
        public longShortPairParameters;

    function setLongShortPairParameters(
        address longShortPair,
        uint256 priceCap,
        uint256 priceFloor,
        uint256 initialPrice,
        uint256 leverageFactor
    ) public nonReentrant {
        require(
            ExpiringContractInterface(longShortPair).expirationTimestamp() != 0,
            "Invalid LSP address"
        );
        require(priceCap > priceFloor, "Invalid bounds");
        require(leverageFactor <= 5, "Please reduce leverageFactor"); // TODO Should leverage be capped?

        longShortPairParameters[longShortPair] = ImpermanentLossParameters({
            priceCap: priceCap,
            priceFloor: priceFloor,
            initialPrice: initialPrice,
            leverageFactor: leverageFactor
        });
    }

    // il_payout = abs((2 * sqrt(p) / p + 1) - 1) + 1
    //   where p = price_initial / price_expiry

    // TODO write example
    // Ex.
    // price_initial =
    // price_expiry =
    // cap =
    // floor =
    // leverageFactor =

    // p =
    // => il_payout =
    function percentageLongCollateralAtExpiry(int256 expiryPrice)
        public
        view
        override
        nonReentrantView
        returns (uint256)
    {
        ImpermanentLossParameters memory params = longShortPairParameters[
            msg.sender
        ];

        require(
            params.priceCap != 0 || params.priceFloor != 0,
            "Params not set for calling LSP"
        );

        // Expiry price should always be above 0
        int256 positiveExpiryPrice = expiryPrice > 0 ? expiryPrice : int256(0);

        // Find ratio of price_initial to price_expiry
        int256 priceRatio = int256(params.initialPrice).div(
            positiveExpiryPrice
        );

        // Perform IL calculation
        int256 numerator = 2 * PRBMathSD59x18.sqrt(priceRatio);
        int256 denominator = priceRatio + 1;
        int256 impLoss = (numerator.div(denominator)) - 1;

        // Take absolute value of IL, multiply by leverage, and add 1 to make positive synth payout
        int256 impLossPayout = PRBMathSD59x18.abs(impLoss).mul(
            int256(params.leverageFactor)
        ) + 1;

        // If price is out of bounds, return the closest bound instead of the actual payout
        if (impLossPayout <= int256(params.priceFloor))
            return params.priceFloor;
        if (impLossPayout >= int256(params.priceCap)) return params.priceCap;

        return uint256(impLossPayout);
    }
}
