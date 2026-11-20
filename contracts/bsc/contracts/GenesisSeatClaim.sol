// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {AgentGate} from "./AgentGate.sol";

/// @title GenesisSeatClaim
/// @notice Agent ID holders claim their numbered AGENT CHAIN Genesis Seat on BSC.
///
///         - One seat per address, `seatId` sequential from 1 in claim order.
///         - Non-transferable (soulbound): every transfer and approval reverts.
///           Only minting via `claim()` is possible. There is no burn.
///         - Metadata is fully on-chain (`tokenURI` returns a data: URI with JSON and
///           an inline SVG showing the seat number).
///
///         WHAT A SEAT IS: a Genesis Seat is an identity and priority marker. It records
///         that the holder was a verified human's agent before AGENT CHAIN mainnet and it
///         is mirrored into the L2 genesis block. Priority features (e.g. early access,
///         ordering in genesis) are protocol parameters.
///
///         WHAT A SEAT IS NOT: a seat confers no rights to revenue, equity, profit or
///         returns of any kind. Any protocol fee distribution referenced elsewhere is a
///         governance parameter that can change and is not promised by this contract.
///         Nothing about a seat is investment advice. (SPEC section 5 disclaimers.)
///
///         Owner permissions: `pause`/`unpause`, `setClaimDeadline`, `setBab`. The owner
///         cannot mint, burn, move or reassign seats.
contract GenesisSeatClaim is ERC721, Pausable, AgentGate {
    using Strings for uint256;

    uint256 private _totalSeats;
    mapping(address => uint256) private _seatOf; // holder => seatId (0 = none)

    /// @notice Unix timestamp after which `claim()` reverts. 0 = no deadline.
    uint256 public claimDeadline;

    /// @notice Emitted when `holder` claims `seatId`.
    event SeatClaimed(address indexed holder, uint256 indexed seatId);
    /// @notice Emitted when the owner changes the claim deadline.
    event ClaimDeadlineUpdated(uint256 previousDeadline, uint256 newDeadline);

    error AlreadyClaimed(address holder);
    error ClaimClosed(uint256 deadline);
    error NonTransferable();

    constructor(address agentId_, address bab_, address owner_)
        ERC721("AGENT CHAIN Genesis Seat", "SEAT")
        AgentGate(agentId_, bab_, owner_)
    {}

    // ---------------------------------------------------------------- claim --

    /// @notice Claim the caller's Genesis Seat. One per address, Agent ID required.
    /// @return seatId The sequential seat id assigned to the caller.
    function claim() external whenNotPaused onlyAgent returns (uint256 seatId) {
        uint256 deadline = claimDeadline;
        if (deadline != 0 && block.timestamp > deadline) revert ClaimClosed(deadline);
        if (_seatOf[msg.sender] != 0) revert AlreadyClaimed(msg.sender);

        seatId = ++_totalSeats;
        _seatOf[msg.sender] = seatId;
        _safeMint(msg.sender, seatId);
        emit SeatClaimed(msg.sender, seatId);
    }

    // ---------------------------------------------------------------- views --

    /// @notice Total seats claimed so far (also the highest seatId).
    function totalSeats() external view returns (uint256) {
        return _totalSeats;
    }

    /// @notice Seat id held by `holder`, or 0 if none.
    function seatOf(address holder) external view returns (uint256) {
        return _seatOf[holder];
    }

    /// @notice True while `claim()` is open for new holders (not paused, before deadline).
    function claimOpen() external view returns (bool) {
        return !paused() && (claimDeadline == 0 || block.timestamp <= claimDeadline);
    }

    /// @notice On-chain metadata: data:application/json;base64 with name, description,
    ///         seat attribute and an inline SVG image.
    function tokenURI(uint256 seatId) public view override returns (string memory) {
        _requireOwned(seatId);
        string memory n = seatId.toString();
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#0B0C10"/>',
            '<rect x="20" y="20" width="360" height="360" fill="none" stroke="#262833"/>',
            '<text x="40" y="70" font-family="monospace" font-size="14" fill="#9A948A">01 / GENESIS</text>',
            '<text x="40" y="200" font-family="monospace" font-size="36" fill="#EDE6DA">SEAT #', n, '</text>',
            '<text x="40" y="350" font-family="monospace" font-size="14" fill="#F0B35B">AGENT CHAIN</text>',
            '</svg>'
        );
        string memory json = string.concat(
            '{"name":"Genesis Seat #', n,
            '","description":"AGENT CHAIN Genesis Seat. Identity and priority marker for an Agent ID holder; non-transferable; confers no rights to revenue or returns.",',
            '"attributes":[{"trait_type":"Seat","display_type":"number","value":', n, '}],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    // ---------------------------------------------------------------- owner --

    /// @notice OWNER: stop new claims (existing seats are unaffected).
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice OWNER: resume claims.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice OWNER: set the claim deadline (unix seconds). 0 removes the deadline.
    function setClaimDeadline(uint256 newDeadline) external onlyOwner {
        emit ClaimDeadlineUpdated(claimDeadline, newDeadline);
        claimDeadline = newDeadline;
    }

    // ------------------------------------------------------------ soulbound --

    /// @dev Allow mint (from == 0) only. Any transfer or burn reverts.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert NonTransferable();
        return super._update(to, tokenId, auth);
    }

    /// @dev Approvals are meaningless for a soulbound token; revert to avoid confusion.
    function approve(address, uint256) public pure override {
        revert NonTransferable();
    }

    /// @dev See `approve`.
    function setApprovalForAll(address, bool) public pure override {
        revert NonTransferable();
    }
}
