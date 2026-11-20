// Copyright 2021-2022, Offchain Labs, Inc.
// For license information, see https://github.com/OffchainLabs/nitro-contracts/blob/main/LICENSE
// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "../precompiles/ArbSys.sol";

/**
 * AGENT CHAIN patch of nitro-contracts v3.2.0 `ArbitrumChecker` for BNB Smart Chain parents.
 *
 * Upstream forwards ALL remaining gas to `address(100).staticcall(arbOSVersion())`. On BSC, address(100) is the
 * retired `tmHeaderValidate` precompile: it fails with a non-revert error ("deprecated"), and the EVM consumes every
 * unit of gas forwarded to a failing precompile. The probe therefore burns 63/64 of the caller's gas, which makes the
 * constructors of SequencerInbox / RollupCore (RollupAdminLogic, RollupUserLogic) and the runtime call in
 * (ERC20)RollupEventInbox.rollupInitialized() impossible under BSC's 16,777,216 per-transaction gas cap
 * (observed on BSC mainnet 2026-11-20: eth_estimateGas "gas required exceeds 16777216").
 *
 * The patch caps the forwarded gas. `ArbSys.arbOSVersion()` costs far less than PROBE_GAS on a real Arbitrum
 * parent, so the function returns the same result there; on BSC it returns false after burning at most PROBE_GAS.
 */
library ArbitrumChecker {
    uint256 internal constant PROBE_GAS = 100_000;

    function runningOnArbitrum() internal view returns (bool) {
        (bool ok, bytes memory data) =
            address(100).staticcall{gas: PROBE_GAS}(abi.encodeWithSelector(ArbSys.arbOSVersion.selector));
        return ok && data.length == 32;
    }
}
