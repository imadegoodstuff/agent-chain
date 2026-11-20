// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title FeeKeeper (stub)
/// @notice Stores the USD price of gas and the ANTB/USD price, and derives the
///         minimum base fee in wei. Devnet stub of the mainnet fee keeper that
///         re-prices the base fee from the ANTB market every 5 minutes.
///
///         usdPerGas : USD per 1 gas, scaled by 1e18.  $0.045 / 1,000,000 gas => 45_000_000_000
///         antbUsd   : USD per 1 ANTB, scaled by 1e8.  $97.17                 => 9_717_000_000
///
///         minBaseFeeWei = usdPerGas * 1e8 / antbUsd
///           (= (usdPerGas / 1e18) / (antbUsd / 1e8) ANTB per gas, times 1e18 wei/ANTB)
contract FeeKeeper {
    address public owner;

    /// @notice USD per gas, 1e18-scaled.
    uint256 public usdPerGas;
    /// @notice ANTB price in USD, 1e8-scaled.
    uint256 public antbUsd;
    /// @notice Block timestamp of the last price write.
    uint256 public lastUpdated;

    event UsdPerGasUpdated(uint256 usdPerGas);
    event BaseFeeUpdated(uint256 antbUsd, uint256 minBaseFeeWei);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error ZeroValue();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(uint256 initialUsdPerGas, uint256 initialAntbUsd) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        if (initialUsdPerGas != 0) _setUsdPerGas(initialUsdPerGas);
        if (initialAntbUsd != 0) _setAntbUsd(initialAntbUsd);
    }

    /// @notice Set the USD price of gas (1e18-scaled).
    function setUsdPerGas(uint256 newUsdPerGas) external onlyOwner {
        _setUsdPerGas(newUsdPerGas);
    }

    /// @notice Set the ANTB/USD price (1e8-scaled). Emits BaseFeeUpdated.
    function setAntbUsd(uint256 newAntbUsd) external onlyOwner {
        _setAntbUsd(newAntbUsd);
    }

    /// @notice Minimum base fee in wei per gas implied by the current prices.
    function minBaseFeeWei() public view returns (uint256) {
        if (antbUsd == 0) return 0;
        return (usdPerGas * 1e8) / antbUsd;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _setUsdPerGas(uint256 v) internal {
        if (v == 0) revert ZeroValue();
        usdPerGas = v;
        lastUpdated = block.timestamp;
        emit UsdPerGasUpdated(v);
        if (antbUsd != 0) emit BaseFeeUpdated(antbUsd, minBaseFeeWei());
    }

    function _setAntbUsd(uint256 v) internal {
        if (v == 0) revert ZeroValue();
        antbUsd = v;
        lastUpdated = block.timestamp;
        emit BaseFeeUpdated(v, minBaseFeeWei());
    }
}
