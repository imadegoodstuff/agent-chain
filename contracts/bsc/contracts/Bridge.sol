// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AgentGate} from "./AgentGate.sol";

/// @title Bridge (ANTB deposit side, Mainnet Beta)
/// @notice Agent ID holders deposit ANTB on BSC to receive native ANTB 1:1 on AGENT CHAIN.
///
///         BETA ESCROW MODEL. Until the Arbitrum Nitro Inbox for AGENT CHAIN is live on
///         BSC, deposits are escrowed in this contract and credited on L2 by the AGENT
///         CHAIN relayer from the `Deposited` events. The owner can move escrowed ANTB
///         with `withdrawTo` — this is how escrowed funds reach the real Inbox (or are
///         returned to depositors) once it exists. This is a trusted step during Beta and
///         is documented in README "Owner permissions". `setInbox` records the future
///         Inbox address; it has no effect on deposit flow in this version.
///
///         Caps (SPEC section 4, Phase 2): per-address 1 ANTB, global 500 ANTB during Beta.
///         Both are owner-settable and counted on cumulative deposits.
///
///         Nothing here promises any return. Bridged ANTB is a gas token on AGENT CHAIN.
contract Bridge is Pausable, ReentrancyGuard, AgentGate {
    using SafeERC20 for IERC20;

    /// @notice The ANTB BEP-20 token (18 decimals, non-rebasing).
    IERC20 public immutable antb;

    /// @notice Max cumulative deposit per address (wei of ANTB).
    uint256 public perAddressCap;
    /// @notice Max cumulative deposit across all addresses (wei of ANTB).
    uint256 public globalCap;

    /// @notice Sum of all deposits ever made (not reduced by withdrawals).
    uint256 public totalDeposited;
    /// @notice Sum of all `withdrawTo` amounts.
    uint256 public totalWithdrawn;
    /// @notice Cumulative deposits per address.
    mapping(address => uint256) public depositedBy;
    /// @notice Number of deposits so far; the next deposit gets nonce == depositCount.
    uint256 public depositCount;

    /// @notice Placeholder for the future Nitro Inbox on BSC. Informational only in Beta.
    address public inbox;

    /// @notice Emitted for every deposit; the L2 relayer credits `l2Recipient` from this.
    event Deposited(address indexed from, address indexed l2Recipient, uint256 amount, uint256 indexed nonce);
    /// @notice Emitted when the owner moves escrowed ANTB (Beta escrow mechanism).
    event EscrowWithdrawn(address indexed to, uint256 amount);
    event CapsUpdated(uint256 perAddressCap, uint256 globalCap);
    event InboxUpdated(address indexed previousInbox, address indexed newInbox);

    error ZeroAmount();
    error PerAddressCapExceeded(address account, uint256 attempted, uint256 cap);
    error GlobalCapExceeded(uint256 attempted, uint256 cap);
    error InsufficientEscrow(uint256 requested, uint256 available);

    /// @param antb_         ANTB token address (0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53 on BSC).
    /// @param agentId_      Agent ID ERC-721.
    /// @param bab_          BAB ERC-721 or address(0).
    /// @param owner_        Initial owner.
    /// @param perAddressCap_ Default 1e18 (1 ANTB).
    /// @param globalCap_     Default 500e18 (500 ANTB).
    constructor(
        address antb_,
        address agentId_,
        address bab_,
        address owner_,
        uint256 perAddressCap_,
        uint256 globalCap_
    ) AgentGate(agentId_, bab_, owner_) {
        if (antb_ == address(0)) revert ZeroAddress();
        antb = IERC20(antb_);
        perAddressCap = perAddressCap_;
        globalCap = globalCap_;
        emit CapsUpdated(perAddressCap_, globalCap_);
    }

    // -------------------------------------------------------------- deposit --

    /// @notice Deposit `amount` ANTB for `l2Recipient` on AGENT CHAIN.
    ///         Caller must hold an Agent ID (or BAB) and must have approved this contract.
    /// @param amount      ANTB amount in wei (18 decimals).
    /// @param l2Recipient Address credited on AGENT CHAIN (usually the caller).
    /// @return nonce      Sequential deposit nonce used by the relayer.
    function deposit(uint256 amount, address l2Recipient)
        external
        whenNotPaused
        nonReentrant
        onlyAgent
        returns (uint256 nonce)
    {
        if (amount == 0) revert ZeroAmount();
        if (l2Recipient == address(0)) revert ZeroAddress();

        uint256 newAddressTotal = depositedBy[msg.sender] + amount;
        if (newAddressTotal > perAddressCap) revert PerAddressCapExceeded(msg.sender, newAddressTotal, perAddressCap);
        uint256 newGlobalTotal = totalDeposited + amount;
        if (newGlobalTotal > globalCap) revert GlobalCapExceeded(newGlobalTotal, globalCap);

        depositedBy[msg.sender] = newAddressTotal;
        totalDeposited = newGlobalTotal;
        nonce = depositCount++;

        antb.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, l2Recipient, amount, nonce);
    }

    // ---------------------------------------------------------------- views --

    /// @notice ANTB currently escrowed in this contract (deposits not yet forwarded).
    function pendingDeposits() external view returns (uint256) {
        return antb.balanceOf(address(this));
    }

    /// @notice Remaining amount `account` may still deposit under the per-address cap.
    function remainingFor(address account) external view returns (uint256) {
        uint256 used = depositedBy[account];
        return used >= perAddressCap ? 0 : perAddressCap - used;
    }

    /// @notice Remaining global deposit capacity.
    function remainingGlobal() external view returns (uint256) {
        return totalDeposited >= globalCap ? 0 : globalCap - totalDeposited;
    }

    // ---------------------------------------------------------------- owner --

    /// @notice OWNER: stop deposits.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice OWNER: resume deposits.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice OWNER: set per-address and global caps (wei of ANTB).
    function setCaps(uint256 newPerAddressCap, uint256 newGlobalCap) external onlyOwner {
        perAddressCap = newPerAddressCap;
        globalCap = newGlobalCap;
        emit CapsUpdated(newPerAddressCap, newGlobalCap);
    }

    /// @notice OWNER: record the future Nitro Inbox address. Informational in Beta;
    ///         deposits are not forwarded automatically in this version.
    function setInbox(address newInbox) external onlyOwner {
        emit InboxUpdated(inbox, newInbox);
        inbox = newInbox;
    }

    /// @notice OWNER (Beta escrow mechanism): move escrowed ANTB to `to`, e.g. the live
    ///         Nitro Inbox / bridge escrow or back to a depositor. Every call is logged
    ///         with `EscrowWithdrawn`. This power is removed when the Inbox replaces this
    ///         contract (see README).
    function withdrawTo(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 available = antb.balanceOf(address(this));
        if (amount > available) revert InsufficientEscrow(amount, available);
        totalWithdrawn += amount;
        antb.safeTransfer(to, amount);
        emit EscrowWithdrawn(to, amount);
    }
}
