// Frontend demo: connect Phantom, show USDC (SPL) balance and perform a transfer on devnet
// NOTE: This is a demo. Replace USDC_MINT and TREASURY_PUBKEY with your values in production.

import { Connection, PublicKey, Transaction } from "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.79.0/+esm";
import { getAssociatedTokenAddress, createTransferCheckedInstruction, getAccount, createAssociatedTokenAccountInstruction } from "https://cdn.jsdelivr.net/npm/@solana/spl-token@0.3.5/+esm";

const NETWORK = "https://api.devnet.solana.com";
const connection = new Connection(NETWORK, 'confirmed');

// TODO: Replace these placeholders with your devnet test USDC mint and treasury address
const USDC_MINT = "USDC_MINT_PLACEHOLDER"; // e.g. your test token mint on devnet
const TREASURY_PUBKEY = "TREASURY_PUBLIC_KEY_PLACEHOLDER";

let provider = null;
let walletPubkey = null;

const connectBtn = document.getElementById('connect-btn');
const walletInfo = document.getElementById('wallet-info');
const buyBtn = document.getElementById('buy-btn');
const buyAmountInput = document.getElementById('buy-amount');
const tokenBalanceDiv = document.getElementById('token-balance');
const logDiv = document.getElementById('log');

function log(s){ const d=document.createElement('div'); d.textContent=s; logDiv.prepend(d); }

connectBtn.onclick = async () => {
  if (!window.solana || !window.solana.isPhantom) return alert('请安装 Phantom 钱包');
  try {
    provider = window.solana;
    const resp = await provider.connect();
    walletPubkey = resp.publicKey.toString();
    walletInfo.textContent = '已连接：' + walletPubkey;
    buyBtn.disabled = false;
    log('已连接 ' + walletPubkey);
    await refreshTokenBalance();
  } catch (e) { console.error(e); alert('连接失败'); }
}

async function refreshTokenBalance(){
  if (!walletPubkey) return;
  try {
    const owner = new PublicKey(walletPubkey);
    const mint = new PublicKey(USDC_MINT);
    // get associated token address (ATA)
    const ata = await getAssociatedTokenAddress(mint, owner);
    try {
      const account = await getAccount(connection, ata);
      const ui = Number(account.amount) / Math.pow(10, account.decimals);
      tokenBalanceDiv.textContent = 'USDC 余额: ' + ui;
    } catch (e) {
      tokenBalanceDiv.textContent = 'USDC 余额: 0 (未创建 ATA)';
    }
  } catch (e) { console.error(e); }
}

buyBtn.onclick = async () => {
  if (!provider || !walletPubkey) return alert('请先连接钱包');
  const amount = Number(buyAmountInput.value);
  if (!amount || amount <= 0) return alert('请输入大于0的数量');

  // Build transfer of SPL USDC from user to treasury
  try {
    const connection = new Connection(NETWORK, 'confirmed');
    const mint = new PublicKey(USDC_MINT);
    const from = new PublicKey(walletPubkey);
    const to = new PublicKey(TREASURY_PUBKEY);
    const fromAta = await getAssociatedTokenAddress(mint, from);
    const toAta = await getAssociatedTokenAddress(mint, to);

    const tx = new Transaction();

    // Ensure treasury ATA exists (this instruction will fail if it exists, but that's okay)
    tx.add(createAssociatedTokenAccountInstruction(provider.publicKey, toAta, to, mint));

    // amount in smallest units: assume USDC has 6 decimals
    const decimals = 6;
    const amountSmall = amount * Math.pow(10, decimals);

    tx.add(createTransferCheckedInstruction(fromAta, mint, toAta, from, BigInt(amountSmall), decimals));

    tx.feePayer = provider.publicKey;
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

    // Phantom supports signAndSendTransaction
    const signed = await provider.signAndSendTransaction(tx);
    log('已发送交易，signature=' + signed.signature);
    // You should notify your backend to verify tx and credit points
  } catch (e) {
    console.error(e);
    alert('转账失败，查看控制台');
  }
}

// initial
log('页面加载（devnet 示例，替换 USDC_MINT 与 TREASURY_PUBKEY）');
