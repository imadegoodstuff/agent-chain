// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title GenesisSeat
/// @notice Minimal non-transferable ERC-721-like token. One seat per address,
///         sequential seatId starting at 1. On devnet `mint()` is open to anyone;
///         on mainnet seats are written into genesis for Agent ID holders.
///         Transfers and approvals always revert (soulbound).
contract GenesisSeat {
    string public constant name = "AGENT CHAIN Genesis Seat";
    string public constant symbol = "SEAT";

    uint256 private _totalSeats;
    mapping(uint256 => address) private _ownerOf; // seatId => holder
    mapping(address => uint256) private _seatOf;  // holder => seatId (0 = none)

    event SeatMinted(address indexed to, uint256 indexed seatId);
    /// @dev ERC-721 Transfer event emitted on mint so indexers/explorers pick it up.
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    error AlreadyHasSeat(address holder);
    error NonTransferable();
    error InvalidSeat(uint256 seatId);

    /// @notice Mint the caller's Genesis Seat. Reverts if the caller already has one.
    function mint() external returns (uint256 seatId) {
        if (_seatOf[msg.sender] != 0) revert AlreadyHasSeat(msg.sender);
        seatId = ++_totalSeats;
        _ownerOf[seatId] = msg.sender;
        _seatOf[msg.sender] = seatId;
        emit Transfer(address(0), msg.sender, seatId);
        emit SeatMinted(msg.sender, seatId);
    }

    /// @notice Seat id held by `holder`, or 0 if none.
    function seatOf(address holder) external view returns (uint256) {
        return _seatOf[holder];
    }

    /// @notice Holder of `seatId`. Reverts for unknown ids (ERC-721 semantics).
    function ownerOf(uint256 seatId) external view returns (address) {
        address holder = _ownerOf[seatId];
        if (holder == address(0)) revert InvalidSeat(seatId);
        return holder;
    }

    /// @notice ERC-721 balanceOf: 1 if the address holds a seat, else 0.
    function balanceOf(address holder) external view returns (uint256) {
        return _seatOf[holder] == 0 ? 0 : 1;
    }

    /// @notice Total seats minted so far (also the highest seatId).
    function totalSeats() external view returns (uint256) {
        return _totalSeats;
    }

    /// @notice ERC-721 alias of totalSeats().
    function totalSupply() external view returns (uint256) {
        return _totalSeats;
    }

    // ---- Soulbound: every transfer / approval path reverts ----------------

    function transferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert NonTransferable();
    }

    function approve(address, uint256) external pure {
        revert NonTransferable();
    }

    function setApprovalForAll(address, bool) external pure {
        revert NonTransferable();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }
}
