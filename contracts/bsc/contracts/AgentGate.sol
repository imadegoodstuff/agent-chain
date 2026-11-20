// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IAgentCredential} from "./interfaces/IAgentCredential.sol";

/// @title AgentGate
/// @notice Abstract base that answers "is this address a verified human's agent?".
///         Inheriting contracts use the `onlyAgent` modifier on every scored action.
///
///         isAgent(a) = agentId.balanceOf(a) > 0 || (bab != 0 && bab.balanceOf(a) > 0)
///
///         - `agentId` is immutable: on BSC mainnet it is the Binance Agent ID
///           registry 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F.
///         - `bab` is owner-settable so the alternative credential can be enabled,
///           rotated (the BAB token is an upgradeable proxy) or disabled (address(0)).
///
///         The gate only ever reads `balanceOf`. It never resolves names, never acts
///         on behalf of a third party and never stores personal data.
abstract contract AgentGate is Ownable, IAgentCredential {
    /// @dev Agent ID ERC-721 (non-transferable, one per KYC'd human).
    IERC721 private immutable _agentId;

    /// @dev Optional BAB token ERC-721. address(0) disables the alternative credential.
    IERC721 private _bab;

    /// @notice Emitted when the owner changes the BAB credential contract.
    event BabUpdated(address indexed previousBab, address indexed newBab);

    /// @notice Caller does not hold an Agent ID (nor a BAB token when enabled).
    error NotAgent(address account);
    /// @notice Zero address passed where a contract is required.
    error ZeroAddress();

    /// @param agentId_ Agent ID ERC-721 contract. Must be non-zero.
    /// @param bab_     BAB ERC-721 contract, or address(0) to disable.
    /// @param owner_   Initial owner (may change `bab`).
    constructor(address agentId_, address bab_, address owner_) Ownable(owner_) {
        if (agentId_ == address(0)) revert ZeroAddress();
        _agentId = IERC721(agentId_);
        _bab = IERC721(bab_);
        if (bab_ != address(0)) emit BabUpdated(address(0), bab_);
    }

    /// @notice Reverts with `NotAgent` unless `msg.sender` passes `isAgent`.
    modifier onlyAgent() {
        if (!isAgent(msg.sender)) revert NotAgent(msg.sender);
        _;
    }

    /// @inheritdoc IAgentCredential
    function isAgent(address account) public view virtual override returns (bool) {
        if (_agentId.balanceOf(account) > 0) return true;
        IERC721 bab_ = _bab;
        return address(bab_) != address(0) && bab_.balanceOf(account) > 0;
    }

    /// @inheritdoc IAgentCredential
    function agentId() public view override returns (address) {
        return address(_agentId);
    }

    /// @inheritdoc IAgentCredential
    function bab() public view override returns (address) {
        return address(_bab);
    }

    /// @notice OWNER: set or clear the BAB credential contract.
    /// @dev    Owner permission. Only widens/narrows who counts as an agent via the
    ///         alternative credential; the Agent ID path can never be disabled.
    function setBab(address newBab) external onlyOwner {
        address previous = address(_bab);
        _bab = IERC721(newBab);
        emit BabUpdated(previous, newBab);
    }
}
