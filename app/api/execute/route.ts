import { NextResponse } from 'next/server';
import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export async function POST(req: Request) {
    const body = await req.json();
    const { action, targetToken, unitCount = 10 } = body;
    const WALLETS_DATA = process.env.WALLETS_DATA;

    if (!WALLETS_DATA) {
        return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    if (!targetToken) {
        return NextResponse.json({ error: 'Target token missing' }, { status: 400 });
    }

    const wallets = JSON.parse(WALLETS_DATA).slice(0, unitCount);
    // Используем Helius RPC ключ
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=f1577c5c-7d92-49cc-8646-63bf7ec84643", 'confirmed');
    
    const results = [];

    // Параметры для микро-балансов
    const BUY_AMOUNT = 0.0005; 
    const PRIORITY_FEE = 0.0005; 

    // Выполняем ПОСЛЕДОВАТЕЛЬНО
    for (const w of wallets) {
        try {
            const kp = Keypair.fromSecretKey(bs58.decode(w.secretKey));
            let amount: any = BUY_AMOUNT;

            if (action === 'PANIC_SELL') {
                // Ищем аккаунты токена (и Token-2022 тоже)
                const accounts = await connection.getParsedTokenAccountsByOwner(kp.publicKey, { mint: new PublicKey(targetToken) });
                let total = 0;
                accounts.value.forEach(a => total += Number(a.account.data.parsed.info.tokenAmount.amount));
                
                if (total === 0) {
                    results.push({ id: w.index, status: 'SKIPPED', message: 'Balance 0' });
                    continue;
                }
                amount = total.toString();
            }

            const trade = await fetch('https://pumpportal.fun/api/trade-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "publicKey": kp.publicKey.toBase58(),
                    "action": action === 'BUNDLE_BUY' ? 'buy' : 'sell',
                    "mint": targetToken,
                    "amount": amount,
                    "denominatedInSol": action === 'BUNDLE_BUY' ? "true" : "false",
                    "slippage": 30,
                    "priorityFee": PRIORITY_FEE,
                    "pool": "pump" 
                })
            });

            if (!trade.ok) {
                // Пробуем AMM пул если Pump не нашел кривую
                const tradeAmm = await fetch('https://pumpportal.fun/api/trade-local', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        "publicKey": kp.publicKey.toBase58(),
                        "action": action === 'BUNDLE_BUY' ? 'buy' : 'sell',
                        "mint": targetToken,
                        "amount": amount,
                        "denominatedInSol": action === 'BUNDLE_BUY' ? "true" : "false",
                        "slippage": 30,
                        "priorityFee": PRIORITY_FEE,
                        "pool": "pump-amm"
                    })
                });
                if (!tradeAmm.ok) {
                    results.push({ id: w.index, status: 'ERROR', message: 'Trade failed on both pools' });
                    continue;
                }
                const dataAmm = await tradeAmm.arrayBuffer();
                const txAmm = VersionedTransaction.deserialize(new Uint8Array(dataAmm));
                txAmm.sign([kp]);
                const sig = await connection.sendRawTransaction(txAmm.serialize(), { skipPreflight: true });
                results.push({ id: w.index, status: 'SUCCESS', sig });
            } else {
                const data = await trade.arrayBuffer();
                const tx = VersionedTransaction.deserialize(new Uint8Array(data));
                tx.sign([kp]);
                const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
                results.push({ id: w.index, status: 'SUCCESS', sig });
            }
            
            await new Promise(r => setTimeout(r, 200));

        } catch (e: any) {
            results.push({ id: w.index, status: 'ERROR', message: e.message });
        }
    }

    return NextResponse.json({ action, results });
}
