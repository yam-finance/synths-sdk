// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Contracts
import "ds-test/test.sol";
import "../MerkleDistributor.sol";
import "openzeppelin-contracts/token/ERC20/ERC20.sol";

contract ERC20User {
    MockERC20 token;

    constructor(MockERC20 _token) {
        token = _token;
    }

    function approve(address spender, uint256 amount) public virtual returns (bool) {
        return token.approve(spender, amount);
    }

    function transfer(address to, uint256 amount) public virtual returns (bool) {
        return token.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual returns (bool) {
        return token.transferFrom(from, to, amount);
    }
}

contract MockERC20 is ERC20 {
    constructor(string memory _name, string memory _symbol) 
    ERC20(_name, _symbol) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }
}

contract MerkleDistributorTest is DSTest {
    // 300000000000000000
    bytes32 internal constant root = bytes32(0x0490d868617ad035c12c2587aa8b3294a611e60be91d110ebda0f6d073bf5cc0);
    address internal constant account = address(0xa111C225A0aFd5aD64221B1bc1D5d817e5D3Ca15);
    bytes32[] internal proof = [bytes32(0x515763bbc375304c2a879ffdd2002711088e67b4910b13ba84c3c734650a8acf)];

    MockERC20 internal token;
    MerkleDistributor internal distributor;

    function setUp() public {
        token = new MockERC20("Token", "TKN");
        distributor = new MerkleDistributor(address(token), root, 30 * 1e16);
    }

    function invariantMetadata() public {
        assertEq(token.name(), "Token");
        assertEq(token.symbol(), "TKN");
    }

    function testMint(address from, uint256 value) public {
        token.mint(from, value);
        assertEq(token.balanceOf(from), value);
        assertEq(token.totalSupply(), value);
    }

    function testDepositRewards(uint256 amount) public {
        ERC20User from = new ERC20User(token);
        token.mint(address(from), amount);
        from.approve(address(distributor), amount);
        assertEq(token.balanceOf(address(distributor)), 0);
        distributor.depositRewards(address(from), amount); 
        assertEq(token.balanceOf(address(distributor)), amount);
    }

    function testRedeem() public {
        testDepositRewards(1 ether);
        assertEq(token.balanceOf(account), 0);
        distributor.redeem(account, 30 * 1e16, 0, proof);
        assertEq(token.balanceOf(account), 210000000000000000);
    }

    function testUpdateMerkleRoot() public {
        distributor.updateMerkleRoot(root, 20 * 1e16);
        testDepositRewards(1 ether);
        assertEq(token.balanceOf(account), 0);
        distributor.redeem(account, 30 * 1e16, 1, proof);
        assertEq(token.balanceOf(account), 240000000000000000);
    }
}
