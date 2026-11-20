# AGENT CHAIN — operational addresses

Generated: 2026-11-20T05:39:22.098Z

Private keys are **only** in `apps/chain/.env` (gitignored). This file lists public addresses so they can be funded.
The same addresses are used on BSC Testnet (97) and BSC Mainnet (56); fund per network.

| Role | Env var | Address | Fund with |
|---|---|---|---|
| Chain owner / deployer | `CHAIN_OWNER_PRIVATE_KEY` | `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443` | BNB for ~25 contract deployments + createRollup; ANTB/tANTB for retryable fees; later: ArbOwner calls on L2 (ANTB) |
| Batch poster | `BATCH_POSTER_PRIVATE_KEY` | `0xC7b182073535A8aA849b304Caf834f81aD0F253F` | BNB (continuous: calldata batches to SequencerInbox) |
| Validator / BoLD staker | `VALIDATOR_PRIVATE_KEY` | `0xc33dCf1d3314506B0f4b06E20bEdC7690c53e78F` | BNB for assertions + WBNB base stake (0.01 testnet / 1 mainnet) |
| Sequencer (feed signer) | `SEQUENCER_PRIVATE_KEY` | `0xc464b85A4124CA92168ed865078514850b3C1072` | none |

## Funding checklist (testnet)

- Chain owner: ≥ 0.5 tBNB (faucet: https://www.bnbchain.org/en/testnet-faucet) + tANTB (mint via deploy-tantb.ts, owner receives initial supply)
- Batch poster: ≥ 0.2 tBNB
- Validator: ≥ 0.1 tBNB + 0.02 WBNB (wrap at 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd)

## Funding checklist (mainnet)

- Chain owner: ≥ 0.15 BNB + ≥ 0.05 ANTB (retryable fees for factory deployment)
- Batch poster: ≥ 0.1 BNB, top up weekly (see RESEARCH.md cost model)
- Validator: ≥ 0.05 BNB + 1.1 WBNB (1 WBNB base stake + buffer; wrap at 0xbb4CdB9CBd36B01bD1cBaEbF2De08d9173bc095c)
