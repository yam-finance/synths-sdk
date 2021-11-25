// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Libraries
import "openzeppelin-contracts/utils/cryptography/MerkleProof.sol";

// Contracts
import "openzeppelin-contracts/access/Ownable.sol";
import "openzeppelin-contracts/token/ERC20/ERC20.sol";

contract MerkleDistributor is Ownable {
    /// @dev The erc20 token used for the rewards.
    ERC20 public immutable token;
    /// @dev Tracks the reward period.
    uint32 public period;
    /// @dev Identifier to check if the rewards can be redeemed.
    bool public frozen;
    /// @dev Mapping of period to merkle root.
    mapping(uint32 => bytes32) public roots;
    /// @dev Mapping of period to treasury weight.
    mapping(uint32 => uint256) public treasuryWeights;
    /// @dev Mapping of period to rewards amount.
    mapping(uint32 => uint256) public rewards;

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
    constructor(
        address token_,
        bytes32 root,
        uint256 treasuryWeight
    ) {
        token = ERC20(token_);
        roots[period] = root;
        treasuryWeights[period] = treasuryWeight;
    }

    modifier notFrozen() {
        require(!frozen, "MerkleDistributor: contract is frozen");
        _;
    }

    /**
     * @dev Assumes that 1e18 = 100% and 1e16 = 1%.
     * @param root The merkletree root.
     * @param treasuryWeight Treasury weight of total period rewards.
     */
    function updateMerkleRoot(bytes32 root, uint256 treasuryWeight) public onlyOwner {
        period += 1;
        roots[period] = root;
        treasuryWeights[period] = treasuryWeight;

        emit MerkleRootUpdated(roots[period], period);
    }

    /**
     * @notice Allows to freeze reward claims.
     */
    function freeze() public onlyOwner notFrozen {
        frozen = true;

        emit ContractFrozen();
    }

    /**
     * @notice Allows to unfreeze reward claims if they are freezed.
     */
    function unfreeze() public onlyOwner {
        require(frozen, "MerkleDistributor: contract is not frozen");
        frozen = false;

        emit ContractUnfrozen();
    }

    // TODO Redeem rewards stake according to the periods treasury weight.
    function redeemTreasuryRewards() public notFrozen {}

    function depositRewards(address from, uint256 amount) public notFrozen {
        token.transferFrom(from, address(this), amount);
        rewards[period] += amount;
    }

    /**
     * @dev Assumes that 1e18 = 100% and 1e16 = 1%.
     * @param account Address to which the rewards will be send.
     * @param weight Rewards weight assigned to the user in the given period.
     * @param period_ Number of the rewards period.
     * @param proof Merkletree proof.
     */
    function redeem(
        address account,
        uint256 weight,
        uint32 period_,
        bytes32[] calldata proof
    ) external notFrozen {
        require(_verify(_leaf(account, weight), period_, proof), "MerkleDistributor: invalid merkle proof");

        uint256 remaindingRewards = rewards[period_] - ((rewards[period_] * treasuryWeights[period_]) / 1e18);
        uint256 amount = (remaindingRewards * weight) / 1e18;

        token.transfer(account, amount);
    }

    function _leaf(address account, uint256 weight) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, weight));
    }

    function _verify(
        bytes32 leaf,
        uint32 period_,
        bytes32[] memory proof
    ) internal view returns (bool) {
        return MerkleProof.verify(proof, roots[period_], leaf);
    }
}
