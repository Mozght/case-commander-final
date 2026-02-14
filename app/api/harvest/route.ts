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
    const connection = new Connection("https://api.mainnet-beta.solana.com", 'confirmed');
    
    // 1. Стягиваем всё на UNIT_1
    const donor = Keypair.fromSecretKey(bs58.decode(active[0].secretKey));
    let totalHarvested = 0;

    for (const iw of inactive) {
        try {
            const ikp = Keypair.fromSecretKey(bs58.decode(iw.secretKey));
            const balance = await connection.getBalance(ikp.publicKey);
            if (balance > 0.001 * 1e9) {
                const amount = balance - 0.0005 * 1e9; // Оставляем на газ для перевода
                const tx = new Transaction().add(
                    SystemProgram.transfer({ fromPubkey: ikp.publicKey, toPubkey: donor.publicKey, lamports: amount })
                );
                await sendAndConfirmTransaction(connection, tx, [ikp]);
                totalHarvested += amount;
            }
        } catch (e) {}
    }

    // 2. Распределяем равномерно по активным
    if (totalHarvested > 0) {
        const share = Math.floor(totalHarvested / active.length);
        for (let i = 1; i < active.length; i++) { // Пропускаем 0-й, деньги и так там
            try {
                const recipient = new PublicKey(active[i].publicKey);
                const tx = new Transaction().add(
                    SystemProgram.transfer({ fromPubkey: donor.publicKey, toPubkey: recipient, lamports: share })
                );
                await sendAndConfirmTransaction(connection, tx, [donor]);
            } catch (e) {}
        }
    }

    return NextResponse.json({ success: true, harvested: totalHarvested / 1e9 });
}
