// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AgentRegistry
/// @notice Owner-managed mirror of Binance Agent ID state on AGENT CHAIN.
///         Maps an address to a handle hash plus an active flag. On mainnet the
///         owner is the bridge/oracle that mirrors BSC; on devnet it is the deployer.
contract AgentRegistry {
    struct Agent {
        bytes32 handleHash; // keccak256 of the agent handle, e.g. keccak256("alice.ai")
        bool active;        // true while the Agent ID is valid
    }

    address public owner;
    mapping(address => Agent) private _agents;
    uint256 private _agentCount; // number of currently active agents

    event AgentRegistered(address indexed account, bytes32 indexed handleHash);
    event AgentRevoked(address indexed account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error ZeroAddress();
    error NotRegistered();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Register (or update the handle of) an agent address.
    function register(address account, bytes32 handleHash) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        Agent storage a = _agents[account];
        if (!a.active) {
            a.active = true;
            _agentCount += 1;
        }
        a.handleHash = handleHash;
        emit AgentRegistered(account, handleHash);
    }

    /// @notice Revoke an agent address (keeps the handle hash for history).
    function revoke(address account) external onlyOwner {
        Agent storage a = _agents[account];
        if (!a.active) revert NotRegistered();
        a.active = false;
        _agentCount -= 1;
        emit AgentRevoked(account);
    }

    /// @notice True if `account` currently holds a valid Agent ID mirror.
    function isAgent(address account) external view returns (bool) {
        return _agents[account].active;
    }

    /// @notice Handle hash and active flag for `account`.
    function agentOf(address account) external view returns (bytes32 handleHash, bool active) {
        Agent storage a = _agents[account];
        return (a.handleHash, a.active);
    }

    /// @notice Number of currently active agents.
    function agentCount() external view returns (uint256) {
        return _agentCount;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
