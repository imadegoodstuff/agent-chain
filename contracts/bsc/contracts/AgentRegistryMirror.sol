// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentGate} from "./AgentGate.sol";

/// @title AgentRegistryMirror
/// @notice BSC-side registry of agents who opted in to AGENT CHAIN.
///
///         Any address holding a Binance Agent ID (or BAB token) calls `register()`
///         for ITSELF exactly once. The registry is read by AGENT CHAIN infrastructure
///         (bridge relayer, genesis snapshot, sequencer allow-list mirror).
///
///         Design constraints (SPEC section 8):
///         - No `registerFor(address)`: nobody can register, look up by name, or act
///           on behalf of someone else. The only input is `msg.sender`.
///         - No personal data: the contract stores an address, a 1-based index and a
///           timestamp. Nothing else.
///         - Registration is permanent and un-revocable by the owner. The only owner
///           permission is `setBab` inherited from AgentGate.
contract AgentRegistryMirror is AgentGate {
    struct Registration {
        uint128 index;        // 1-based position in the registry (0 = not registered)
        uint64 registeredAt;  // block.timestamp at registration
    }

    mapping(address => Registration) private _registrations;
    address[] private _agents;

    /// @notice Emitted once per agent, when it registers itself.
    event AgentRegistered(address indexed agent, uint256 index);

    /// @notice `register()` was called by an address that is already registered.
    error AlreadyRegistered(address agent);
    /// @notice Index out of range for `agentAt`.
    error IndexOutOfRange(uint256 index);

    constructor(address agentId_, address bab_, address owner_) AgentGate(agentId_, bab_, owner_) {}

    /// @notice Register the caller. Requires the caller to hold an Agent ID (or BAB).
    /// @return index 1-based registry index of the caller.
    function register() external onlyAgent returns (uint256 index) {
        if (_registrations[msg.sender].index != 0) revert AlreadyRegistered(msg.sender);
        _agents.push(msg.sender);
        index = _agents.length;
        _registrations[msg.sender] = Registration({
            index: uint128(index),
            registeredAt: uint64(block.timestamp)
        });
        emit AgentRegistered(msg.sender, index);
    }

    /// @notice Number of registered agents.
    function count() external view returns (uint256) {
        return _agents.length;
    }

    /// @notice True if `account` has registered.
    function isRegistered(address account) external view returns (bool) {
        return _registrations[account].index != 0;
    }

    /// @notice Timestamp at which `account` registered (0 if not registered).
    function registeredAt(address account) external view returns (uint256) {
        return _registrations[account].registeredAt;
    }

    /// @notice 1-based registry index of `account` (0 if not registered).
    function indexOf(address account) external view returns (uint256) {
        return _registrations[account].index;
    }

    /// @notice Agent at 1-based `index`. Reverts if out of range.
    function agentAt(uint256 index) external view returns (address) {
        if (index == 0 || index > _agents.length) revert IndexOutOfRange(index);
        return _agents[index - 1];
    }
}
