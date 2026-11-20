import { parseAbi } from 'viem';

/** Subset of the ArbOwner precompile (0x70) used by set-l2-params.ts */
export const arbOwnerAbi = parseAbi([
  'function setMinimumL2BaseFee(uint256 priceInWei)',
  'function setL2BaseFee(uint256 priceInWei)',
  'function setL1PricingRewardRecipient(address recipient)',
  'function setL1PricingRewardRate(uint64 weiPerUnit)',
  'function setL1PricePerUnit(uint256 pricePerUnit)',
  'function setL1PricingEquilibrationUnits(uint256 equilibrationUnits)',
  'function setPerBatchGasCharge(int64 cost)',
  'function setAmortizedCostCapBips(uint64 cap)',
  'function setNetworkFeeAccount(address newNetworkFeeAccount)',
  'function setInfraFeeAccount(address newInfraFeeAccount)',
  'function setSpeedLimit(uint64 limit)',
  'function setMaxTxGasLimit(uint64 limit)',
  'function setBrotliCompressionLevel(uint64 level)',
  'function addChainOwner(address newOwner)',
  'function removeChainOwner(address ownerToRemove)',
  'function scheduleArbOSUpgrade(uint64 newVersion, uint64 timestamp)',
]);

/** ArbOwnerPublic (0x6b) */
export const arbOwnerPublicAbi = parseAbi([
  'function getAllChainOwners() view returns (address[])',
  'function isChainOwner(address addr) view returns (bool)',
  'function getNetworkFeeAccount() view returns (address)',
  'function getInfraFeeAccount() view returns (address)',
  'function getBrotliCompressionLevel() view returns (uint64)',
]);

/** ArbGasInfo (0x6c) */
export const arbGasInfoAbi = parseAbi([
  'function getMinimumGasPrice() view returns (uint256)',
  'function getL1BaseFeeEstimate() view returns (uint256)',
  'function getL1RewardRate() view returns (uint64)',
  'function getL1RewardRecipient() view returns (address)',
  'function getL1PricingEquilibrationUnits() view returns (uint256)',
  'function getPerBatchGasCharge() view returns (int64)',
  'function getAmortizedCostCapBips() view returns (uint64)',
  'function getGasBacklog() view returns (uint64)',
  'function getPricesInWei() view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function getGasAccountingParams() view returns (uint256 speedLimitPerSecond, uint256 gasPoolMax, uint256 maxTxGasLimit)',
]);

/** ArbSys (0x64) */
export const arbSysAbi = parseAbi([
  'function arbChainID() view returns (uint256)',
  'function arbOSVersion() view returns (uint256)',
  'function arbBlockNumber() view returns (uint256)',
]);

/** ERC20Inbox on the parent chain (custom-gas-token chains): deposit native token to the same address on L2 */
export const erc20InboxAbi = parseAbi([
  'function depositERC20(uint256 amount) returns (uint256)',
  'function bridge() view returns (address)',
]);

export const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

/** SequencerInbox (parent chain) */
export const sequencerInboxAbi = parseAbi([
  'function batchCount() view returns (uint256)',
  'function isBatchPoster(address) view returns (bool)',
  'function totalDelayedMessagesRead() view returns (uint256)',
]);
