// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title MockAgentId
/// @notice Test/testnet stand-in for the Binance Agent ID ERC-721 (mainnet only).
///         Anyone can `mint()` one token to themselves or `mintTo(address)`.
///         Deployed on BSC Testnet by scripts/deploy.ts; never on mainnet.
contract MockAgentId is ERC721 {
    uint256 private _nextId = 1;

    constructor() ERC721("Mock Agent ID", "mAI") {}

    /// @notice Mint one token to the caller.
    function mint() external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(msg.sender, tokenId);
    }

    /// @notice Mint one token to `to`.
    function mintTo(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(to, tokenId);
    }
}
