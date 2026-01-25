# Backend (Express) for Ring-Toss Game (devnet demo)

This example server provides two endpoints:
- POST /api/verify-payment : verify a USDC (SPL) transfer on devnet and credit points
- POST /api/play : accept a client-signed play result (identity check) and adjust points

Configuration:
- Edit server/server.js and replace `USDC_MINT` and `TREASURY_PUBKEY` with your devnet test token mint and treasury pubkey.

Running locally:
- cd server
- npm install
- npm start

How to get a test USDC on devnet:
- Devnet doesn't host the mainnet USDC. You can create a local test mint with the Solana CLI & spl-token:
  - `solana config set --url https://api.devnet.solana.com`
  - `spl-token create-token` -> note the token mint
  - `spl-token create-account <MINT>` -> creates associated token account for your wallet
  - `spl-token mint <MINT> <AMOUNT> <RECIPIENT_TOKEN_ACCOUNT>`
- Use that mint address as `USDC_MINT` in both front-end and server.

Security:
- Do NOT store treasury private keys in the repo. This server only verifies incoming transactions by inspecting on-chain data.
