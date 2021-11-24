// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Interfaces
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Libraries
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "prb-math/contracts/PRBMathUD60x18Typed.sol";

// Contracts
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleDistributor is Ownable {
    using PRBMathUD60x18Typed for PRBMath.UD60x18;

    /// @dev The erc20 token used for the rewards.
    ERC20 public immutable token;
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
    constructor(
        address token_,
        bytes32 root,
        uint32 treasuryWeight
    ) {
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

    function redeemTreasuryRewards() public notFrozen {}

    function depositRewards() public notFrozen {}

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
        PRBMath.UD60x18 memory denominator = PRBMath.UD60x18({value: 100});
        PRBMath.UD60x18 memory treasuryWeight = PRBMath.UD60x18({value: 1e16 * 30}); // 30% of total period rewards.
        PRBMath.UD60x18 memory userWeight = PRBMath.UD60x18({value: 1e16 * 50}); // 50% of remainding rewards.
        PRBMath.UD60x18 memory totalRewards = PRBMath.UD60x18({value: 150}); // total rewards in current period.
        PRBMath.UD60x18 memory remaindingRewards = PRBMath.UD60x18({
            value: totalRewards.value - (totalRewards.mul(treasuryWeight).div(denominator).value)
        }); // remainding rewards for users.
        uint256 amount = remaindingRewards.mul(userWeight).div(denominator).value;
        token.transferFrom(address(this), account, amount);
    }

    function _leaf(address account, uint256 weight) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(weight, account));
    }

    function _verify(
        bytes32 leaf,
        uint32 period_,
        bytes32[] memory proof
    ) internal view returns (bool) {
        return MerkleProof.verify(proof, roots[period_], leaf);
    }
}
