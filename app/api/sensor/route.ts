import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        const response = await axios.get('https://api.dexscreener.com/token-profiles/latest/v1');
        const profiles = response.data || [];
        
        const data = profiles
            .filter((p: any) => p.chainId === 'solana' && p.tokenAddress.endsWith('pump'))
            .slice(0, 15)
            .map((p: any) => ({
                id: p.tokenAddress, 
                name: p.description?.slice(0, 20) || 'Pump Token',
                symbol: 'PUMP',
                price: "0", 
                liquidity: 0,
                mcap: 0,
                age: "new"
            }));

        if (data.length > 0) {
            const addresses = data.map((d:any) => d.id).join(',');
            const statsResponse = await axios.get('https://api.dexscreener.com/latest/dex/tokens/' + addresses);
            const pairs = statsResponse.data.pairs || [];
            
            const enriched = data.map((d: any) => {
                const pair = pairs.find((pair: any) => pair.baseToken.address === d.id);
                if (pair) {
                    return {
                        ...d,
                        name: pair.baseToken.name,
                        symbol: pair.baseToken.symbol,
                        price: pair.priceUsd,
                        liquidity: pair.liquidity?.usd || 0,
                        mcap: pair.fdv || 0,
                    };
                }
                return d;
            });
            return NextResponse.json(enriched);
        }
        return NextResponse.json([]);
    } catch (e) {
        return NextResponse.json({ error: 'Sensor failure' }, { status: 500 });
    }
}
