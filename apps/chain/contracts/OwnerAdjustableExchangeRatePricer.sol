// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Nitro's fee-token pricer interface (nitro-contracts `ISequencerInbox.sol`).
///         Returns the number of child-chain fee tokens (ANTB, 18 dec) per 1 parent-chain native token (BNB),
///         denominated in 18 decimals.
interface IFeeTokenPricer {
    function getExchangeRate() external returns (uint256);
}

/// @title OwnerAdjustableExchangeRatePricer
/// @notice Minimal pricer: the owner (fee keeper) sets `ANTB per BNB` manually.
///         Mirrors OffchainLabs' unaudited example in nitro-contracts/test/foundry/fee-token-pricers.
///
/// Why it exists for AGENT CHAIN:
///   * The SequencerInbox only emits "batch spending reports" for a custom-fee-token rollup when a pricer
///     is configured. Those reports are what trigger ArbOS' L1-pricing update, which in turn pays the
///     L1 pricing *reward* to the reward recipient. Without a pricer no reports are sent and L1 fees
///     collected on the L2 are never disbursed.
///   * On BSC `block.basefee == 0`, so the reported parent gas price is 0 regardless of the exchange
///     rate. The dynamic part of the L1 pricer therefore converges to ~0; the fixed reward rate
///     (ArbOwner.setL1PricingRewardRate) is what actually recovers batch-posting BNB costs.
///     The exchange rate still matters if BSC ever adopts a non-zero base fee, so keep it honest.
contract OwnerAdjustableExchangeRatePricer is IFeeTokenPricer {
    address public owner;
    uint256 public exchangeRate; // ANTB-wei per 1 BNB (1e18 = 1:1)

    event ExchangeRateSet(uint256 rate);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error ZeroRate();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(uint256 initialExchangeRate) {
        if (initialExchangeRate == 0) revert ZeroRate();
        owner = msg.sender;
        exchangeRate = initialExchangeRate;
        emit OwnershipTransferred(address(0), msg.sender);
        emit ExchangeRateSet(initialExchangeRate);
    }

    function setExchangeRate(uint256 rate) external onlyOwner {
        if (rate == 0) revert ZeroRate();
        exchangeRate = rate;
        emit ExchangeRateSet(rate);
    }

    function getExchangeRate() external view override returns (uint256) {
        return exchangeRate;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
