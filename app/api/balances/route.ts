import { NextResponse } from 'next/server';

const WALLETS = [
  "HwHU1KdBYdGL3UqEK8tVzb3ZsMC9sa7dkvrPiY55B8pf",
  "BWPk424XFzti62Sq5Yjc2Yv7uxzbeQWCfqvFTxenfDkf",
  "BM2ejzf6ft7pwwNNH3KvpL7ZMrRLcu8N4iZDgd6W9cai",
  "7C3mAVTd3TAv253J8VkcXskFRKqdgR44GBfMvNbKQhrF",
  "3vqPkJwFJ6RyXeAniNFvAhEvKLmQdwnBVJtXBAKSiQUL",
  "46GbWJyRbz6XxsKvfUr6vEd78LEHnKvpHbPL7MtrkyvT",
  "TFwEUxLFAiapQJGTdqo2Np4F4d33SbEX6vNTK9UFC2g",
  "BShqcuevEBrqVwt1LJRuJxi7vLNXpB2sNTXJ9AqLR77p",
  "Gu7xr8oFzvXzdRTpmZn2m1Ec7dJr9oxsWG1RkRzW86wE",
  "8N6ye2LSEKjrq48pva59zqLXQzKJPvGpYD4q6G5z1Uz4"
];

export async function GET() {
    try {
        const results = await Promise.all(WALLETS.map(async (addr, index) => {
            const resp = await fetch('https://api.mainnet-beta.solana.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getBalance",
                    params: [addr]
                })
            });
            const data = await resp.json();
            return { id: index + 1, balance: (data.result?.value || 0) / 1e9 };
        }));

        const balanceMap = results.reduce((acc: any, curr) => {
            acc[curr.id] = curr.balance;
            return acc;
        }, {});

        return NextResponse.json(balanceMap);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
