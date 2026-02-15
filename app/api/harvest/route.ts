import { NextResponse } from 'next/server';
import { Connection, Keypair, SystemProgram, Transaction, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

export async function POST(req: Request) {
    const { unitCount } = await req.json();
    const WALLETS_DATA = process.env.WALLETS_DATA;
    if (!WALLETS_DATA) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

    const allWallets = JSON.parse(WALLETS_DATA);
    const active = allWallets.slice(0, unitCount);
    const inactive = allWallets.slice(unitCount);
    
    // Используем Helius для надежности
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=f1577c5c-7d92-49cc-8646-63bf7ec84643", 'confirmed');
    
    const donor = Keypair.fromSecretKey(bs58.decode(active[0].secretKey));
    let totalHarvested = 0;
    let errors = [];

    // 1. Стягиваем всё на UNIT_1 (Donor)
    for (const iw of inactive) {
        try {
            const ikp = Keypair.fromSecretKey(bs58.decode(iw.secretKey));
            const balance = await connection.getBalance(ikp.publicKey);
            
            // Если баланс больше минимального порога (0.001 SOL)
            if (balance > 1000000) {
                // Оставляем 0.0001 SOL на всякий случай для мелких нужд
                const amount = balance - 100000; 
                
                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: ikp.publicKey,
                        toPubkey: donor.publicKey,
                        lamports: amount
                    })
                );
                
                // Используем простую отправку для скорости
                const sig = await sendAndConfirmTransaction(connection, tx, [ikp], { skipPreflight: true });
                totalHarvested += amount;
            }
        } catch (e: any) {
            errors.push(`Unit ${iw.index}: ${e.message}`);
        }
        // Небольшая задержка между запросами
        await new Promise(r => setTimeout(r, 200));
    }

    // 2. Распределяем по оставшимся активным (если есть профит)
    if (totalHarvested > 0 && active.length > 1) {
        const share = Math.floor(totalHarvested / active.length);
        for (let i = 1; i < active.length; i++) {
            try {
                const recipient = new PublicKey(active[i].publicKey);
                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: donor.publicKey,
                        toPubkey: recipient,
                        lamports: share
                    })
                );
                await sendAndConfirmTransaction(connection, tx, [donor], { skipPreflight: true });
            } catch (e: any) {
                errors.push(`Dist Asset -> ${active[i].index}: ${e.message}`);
            }
        }
    }

    return NextResponse.json({ 
        success: true, 
        harvested: totalHarvested / 1e9,
        errors: errors.length > 0 ? errors : null
    });
}
