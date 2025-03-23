User-to-User Transfers:

Users send/receive funds using phone numbers as identifiers.
Map phone numbers to wallet addresses in the User model.
Support cross-chain transfers (World Chain, zkSync, Mantle) using USDC or native tokens.
Use a simple in-memory mapping for testnets (later, integrate a bridge or relayer).


Business Payments:
Users pay businesses using their merchantId.
Businesses receive funds in USDC or native tokens based on the chain.
Leverage existing Business model with merchantId.


Token Logic:

Prefer USDC (contract addresses provided below).
Fallback to native tokens: WETH (World Chain), ETH (zkSync), MNT (Mantle).
For testnets: Sepolia (World Chain), zkSync Era Testnet, Mantle Testnet.


Considerations:
Project User model (in models.ts) has phoneNumber and walletAddress.
Project Business model (in businessModel.ts) has merchantId and smartWalletAddress.
No cross-chain bridging yet—assume funds are on the same chain for simplicity.
Token Details (Testnets)


World Chain (Sepolia Testnet):
USDC: 0x1c7D4B196Cb0C7B01d743fbc6116a902379C7238
Native: WETH (wrapped ETH)


zkSync Era Testnet:
USDC: 0x05a9C1bC9F7359BF9DF8fED53fBCc66E59eSimulate
Native: ETH


Mantle Testnet:
USDC: Not natively deployed; use bridged USDC or native MNT for now.
Native: MNT
For simplicity, we’ll simulate USDC transfers and use native tokens where USDC isn’t available.