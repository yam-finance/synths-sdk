// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";

/// @title A sample contract
/// @author YAM Finance
/// @notice This is a sample contract and can be deleted
/// @dev Use the NatSpec format to document your contract
contract Greeter {
    string greeting;

    constructor(string memory _greeting) {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting = _greeting;
    }

    /// @notice Retrieves the greeting message
    /// @return greeting message
    function greet() public view returns (string memory) {
        return greeting;
    }

    /// @notice Change the greeting message
    /// @dev Passed string is stored in memory
    /// @param _greeting The new greeting message
    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
    }
}
