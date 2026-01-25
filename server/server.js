// Express backend example for verifying devnet USDC (SPL) transfers and accepting play results

const express = require('express');
const bodyParser = require('body-parser');
const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const nacl = require('tweetnacl');

const app = express();
app.use(bodyParser.json());

// CONFIG
const NETWORK = 'devnet';
const RPC_URL = clusterApiUrl(NETWORK);
const connection = new Connection(RPC_URL, 'confirmed');
const USDC_MINT = 'USDC_MINT_PLACEHOLDER';
const TREASURY_PUBKEY = 'TREASURY_PUBLIC_KEY_PLACEHOLDER';

// simple in-memory points db
const userPoints = {};
function addPoints(wallet, delta){ if (!userPoints[wallet]) userPoints[wallet] = 0; userPoints[wallet] += delta; if (userPoints[wallet] < 0) userPoints[wallet] = 0; return userPoints[wallet]; }

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { txSignature, buyer, amount } = req.body;
    if (!txSignature || !buyer || !amount) return res.json({ success:false, error:'参数缺失' });

    const tx = await connection.getTransaction(txSignature, { commitment: 'confirmed' });
    if (!tx) return res.json({ success:false, error:'无法查询交易或未确认' });

    // look for token balance changes in meta.postTokenBalances
    const meta = tx.meta;
    if (!meta) return res.json({ success:false, error:'交易缺少 meta' });

    const post = meta.postTokenBalances || [];
    const found = post.find(p => p.mint === USDC_MINT && p.owner === TREASURY_PUBKEY);
    if (!found) return res.json({ success:false, error:'未发现 USDC 转入 Treasury' });

    // verify amount (ui amount). uiTokenAmount.amount is in raw units string
    const decimals = found.uiTokenAmount.decimals || 6;
    const rawNeeded = BigInt(amount) * BigInt(Math.pow(10, decimals));
    const rawReceived = BigInt(found.uiTokenAmount.amount);
    if (rawReceived >= rawNeeded) {
      const newPoints = addPoints(buyer, amount);
      return res.json({ success:true, addedPoints: amount, newPoints });
    }
    return res.json({ success:false, error:'接收金额不足' });
  } catch (e) { console.error(e); res.json({ success:false, error:e.message }); }
});

app.post('/api/play', async (req, res) => {
  try {
    const { result, signature } = req.body;
    if (!result || !signature) return res.json({ success:false, error:'参数缺失' });

    const message = Buffer.from(JSON.stringify(result));
    let sig;
    try { sig = Buffer.from(signature, 'base64'); }
    catch(e){ try { sig = bs58.decode(signature);} catch(e2){ return res.json({ success:false, error:'无法解析签名' }); } }

    const pubkey = new PublicKey(result.wallet);
    const ok = nacl.sign.detached.verify(new Uint8Array(message), new Uint8Array(sig), pubkey.toBuffer());
    if (!ok) return res.json({ success:false, error:'签名验证失败' });

    const newPoints = addPoints(result.wallet, result.delta);
    return res.json({ success:true, newPoints });
  } catch (e) { console.error(e); res.json({ success:false, error:e.message }); }
});

app.get('/api/points/:wallet', (req, res) => { const w = req.params.wallet; res.json({ points: userPoints[w] || 0 }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
