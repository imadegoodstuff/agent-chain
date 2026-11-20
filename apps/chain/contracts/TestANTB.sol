// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TestANTB (tANTB)
/// @notice Plain 18-decimal ERC-20 used as the AGENT CHAIN Testnet gas token on BSC Testnet (chainId 97).
///         Deliberately boring: no hooks, no fees, no rebasing, no pause — exactly the profile Nitro
///         requires for a custom gas token. Anyone can call `faucet()` once per hour (testnet only).
///         Devnet/testnet tokens have no value.
contract TestANTB {
    string public constant name = "Test Anthropic (AGENT CHAIN Testnet)";
    string public constant symbol = "tANTB";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public owner;
    uint256 public faucetAmount = 10 ether; // 10 tANTB per claim
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public lastFaucetClaim;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error FaucetCooldown(uint256 availableAt);
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---- ERC-20 ----

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    // ---- testnet helpers ----

    function faucet() external {
        uint256 availableAt = lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN;
        if (block.timestamp < availableAt) revert FaucetCooldown(availableAt);
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
    }

    function mint(address to, uint256 value) external onlyOwner {
        _mint(to, value);
    }

    function setFaucetAmount(uint256 value) external onlyOwner {
        faucetAmount = value;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ---- internals ----

    function _transfer(address from, address to, uint256 value) internal {
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - value;
        }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}
