// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentCredential
/// @notice Minimal interface every Agent-ID-gated AGENT CHAIN contract on BSC exposes.
///         An address is an "agent" when it holds a Binance Agent ID (ERC-721,
///         non-transferable, one per KYC'd human) or, as an alternative credential,
///         a BAB token (Binance Account Bound, also a non-transferable ERC-721).
interface IAgentCredential {
    /// @notice True if `account` holds an Agent ID or (when configured) a BAB token.
    function isAgent(address account) external view returns (bool);

    /// @notice Agent ID ERC-721 contract (immutable).
    function agentId() external view returns (address);

    /// @notice BAB token ERC-721 contract, or address(0) when BAB is not accepted.
    function bab() external view returns (address);
}
