import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Прямой запрос к API Pump.fun для получения новейших созданных токенов
        const response = await axios.get('https://frontend-api.pump.fun/coins/latest?limit=20&offset=0&includeNsfw=false');
        const coins = response.data || [];
        
        const data = coins.map((c: any) => ({
            id: c.mint, 
            name: c.name,
            symbol: c.symbol,
            price: c.usd_market_cap ? (c.usd_market_cap / 1000000000).toString() : "0", // Условная цена
            liquidity: 0, // На pump.fun ликвидность виртуальная до миграции
            mcap: c.usd_market_cap || 0,
            age: c.created_timestamp ? Math.floor((Date.now() - c.created_timestamp) / 60000) + "m" : "now"
        }));

        return NextResponse.json(data);
    } catch (e) {
        console.error("Pump.fun Native API error:", e);
        return NextResponse.json({ error: 'Sensor failure' }, { status: 500 });
    }
}
