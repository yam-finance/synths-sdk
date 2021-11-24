// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Interfaces
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Libraries
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Contracts
import "@openzeppelin/contracts/access/Ownable.sol";


contract MerkleDistributor is Ownable {
    /// @dev The erc20 token used for the rewards.
    ERC20 immutable public token;
    /// @dev Tracks the reward period.
    uint32 public period;
    /// @dev Identifier to check if the rewards can be redeemed.
    bool public frozen;
    /// @dev Mapping of period to merkle root.
    mapping(uint32 => bytes32) public roots;
    /// @dev Mapping of period to treasury weight.
    mapping(uint32 => uint32) public treasuryWeights;

    /// @dev Emitted when `root` gets updated.
    event MerkleRootUpdated(bytes32 indexed root, uint32 indexed period);    
    /// @dev Emitted when the contract has been frozen.
    event ContractFrozen();
    /// @dev Emitted when the contract has ben unfrozen.
    event ContractUnfrozen();

    /**
     * @param token_ The erc20 token address used for the rewards.
     * @param root The merkle root for the initial rewards period.
     * @param treasuryWeight The treasury weight for the initial rewards period.
     */
    constructor(address token_, bytes32 root, uint32 treasuryWeight)
    {
        token = ERC20(token_);
        period = 0;
        roots[period] = root;
        treasuryWeights[period] = treasuryWeight;
        frozen = false;
    }

    modifier notFrozen() {
        require(!frozen, "MerkleDistributor: contract is frozen");
        _;
    }

    function updateMerkleRoot(bytes32 root, uint32 treasuryWeight) public onlyOwner {
        period += 1;
        roots[period] = root;
        treasuryWeights[period] = treasuryWeight;
        
        emit MerkleRootUpdated(roots[period], period);
    }    

    function freeze() public onlyOwner notFrozen {
        frozen = true;

        emit ContractFrozen();
    } 

    function unfreeze() public onlyOwner {
        require(frozen, "MerkleDistributor: contract is not frozen");
        frozen = false;

        emit ContractUnfrozen();
    }

    // TODO Calculate treasury weight.
    function redeemTreasuryRewards() public notFrozen {}
    
    /**
     * @notice Assumes that the amount of rewards is calculated off-chain.
     * @param account Address to which the rewards will be send.
     * @param amount Number of rewards that will be send to `account`.
     * @param period_ Number of the rewards period.
     * @param proof Merkletree proof.
     */
    function redeem(address account, uint256 amount, uint32 period_, bytes32[] calldata proof)
    external notFrozen
    {
        require(_verify(_leaf(account, amount), period_, proof), "MerkleDistributor: invalid merkle proof");
        token.transferFrom(address(this), account, amount);
    }

    function _leaf(address account, uint256 amount)
    internal pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(amount, account));
    }

    function _verify(bytes32 leaf, uint32 period_, bytes32[] memory proof)
    internal view returns (bool)
    {
        return MerkleProof.verify(proof, roots[period_], leaf);
    }
}
