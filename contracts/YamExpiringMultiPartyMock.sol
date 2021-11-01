// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.4;

import "@uma/core/contracts/financial-templates/test/ExpiringMultiPartyMock.sol";

contract YamExpiringMultiPartyMock is ExpiringMultiPartyMock {
    constructor(
        address _financialProductLibraryAddress,
        uint256 _expirationTimestamp,
        FixedPoint.Unsigned memory _collateralRequirement,
        bytes32 _priceIdentifier,
        address _timerAddress
    )
        ExpiringMultiPartyMock(
            _financialProductLibraryAddress,
            _expirationTimestamp,
            _collateralRequirement,
            _priceIdentifier,
            _timerAddress
        )
    {}
}
