"use client";
import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

export default function CaseCommander() {
  const [targetToken, setTargetToken] = useState('');
  const [unitCount, setUnitCount] = useState(3);
  const [slippage, setSlippage] = useState(15);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reconData, setReconData] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  const fetchBalances = async () => {
    try {
      const resp = await fetch('/api/balances');
      const data = await resp.json();
      if (data && !data.error) setBalances(data);
    }
    catch (e) { console.error("Balance sync failed"); }
  };

  const fetchRecon = async () => {
    try {
      const resp = await fetch('/api/sensor');
      const data = await resp.json();
      if (Array.isArray(data)) setReconData(data);
    }
    catch (e) { console.error("Recon failed"); }
  };

  useEffect(() => {
    fetchBalances();
    fetchRecon();
    const bInterval = setInterval(fetchBalances, 30000);
    const rInterval = setInterval(fetchRecon, 2500);
    return () => {
      clearInterval(bInterval);
      clearInterval(rInterval);
    };
  }, []);

  const executeAction = async (action: string) => {
    if (!targetToken) { alert("Сначала выбери цель (Target CA)"); return; }
    setIsLoading(true);
    addLog(`INIT: ${action} | Slip: ${slippage}% | Units: ${unitCount}`);
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetToken, unitCount, slippage })
      });
      const data = await response.json();
      if (data.results) {
        data.results.forEach((res: any) => {
          if (res.status === 'SUCCESS') {
            addLog(`UNIT_${res.id}: DONE. [${res.sig.slice(0,10)}...]`);
          } else {
            addLog(`UNIT_${res.id}: FAIL - ${res.message}`);
          }
        });
      }
    }
    catch (e) { addLog("Comm Failure."); }
    finally {
      setIsLoading(false);
      setTimeout(fetchBalances, 2000);
    }
  };

  const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-[#010309] text-slate-100 font-mono text-xs">
      <div className="w-full bg-[#050915] border-b border-blue-900/40 px-4 md:px-10 py-6">
          <header className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Shield className="text-blue-500 w-10 h-10" />
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">CASE <span className="text-blue-600 animate-pulse font-bold tracking-widest ml-2">v4.5 ADVANCED</span></h1>
                <p className="text-slate-600 text-[8px] mt-1 uppercase tracking-[0.6em]">Absolute Strategic Superiority</p>
              </div>
            </div>
            <div className="flex gap-4">
               <div className="bg-slate-900 p-3 rounded-xl border border-blue-900/20 flex items-center gap-4">
                  <span className="text-[9px] text-slate-500 uppercase">Units: {unitCount}</span>
                  <input type="range" min="1" max="10" value={unitCount} onChange={(e) => setUnitCount(parseInt(e.target.value))} className="w-24 accent-blue-600 h-1 bg-slate-800 rounded-lg cursor-pointer appearance-none" />
               </div>
               <div className="bg-slate-900 p-3 rounded-xl border border-blue-900/20 flex items-center gap-2 text-xs">
                  <span className="text-[9px] text-slate-500 uppercase">SLIP %</span>
                  <input type="number" min="1" max="100" value={slippage} onChange={(e) => setSlippage(parseInt(e.target.value))} className="w-12 bg-transparent text-blue-500 font-black focus:outline-none" />
               </div>
               <input type="text" placeholder="TARGET_CA" className="md:w-64 bg-[#0f172a] border border-blue-900/40 rounded-xl px-4 py-3 focus:outline-none text-blue-300 font-mono" value={targetToken} onChange={(e) => setTargetToken(e.target.value)} />
               <button className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition mx-2 uppercase" onClick={() => fetchBalances()}><RefreshCw className="w-4 h-4" /></button>
            </div>
          </header>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="h-[660px] bg-black rounded-[2.5rem] border-2 border-blue-900/40 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            {targetToken ? (
                <iframe src={`https://dexscreener.com/solana/${targetToken}?embed=1&theme=dark&trades=1&info=0`} className="w-full h-full border-none pt-4" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-900 text-xl font-black tracking-[1em]">AWAITING_COORDINATES</div>
            )}
          </div>
          <div className="bg-slate-900/40 border border-blue-900/10 rounded-3xl p-6 overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead><tr className="text-slate-600 border-b border-blue-900/20 uppercase font-black"><th className="pb-4">Unit</th><th className="pb-4">Price</th><th className="pb-4 text-right">MCap</th></tr></thead>
                <tbody>
                  {reconData.map((token: any) => (
                    <tr key={token.id} className="border-b border-blue-900/5 hover:bg-blue-600/5 cursor-pointer" onClick={() => setTargetToken(token.id)}>
                      <td className="py-4 text-blue-400 font-bold">{token.symbol}</td>
                      <td className="py-4 text-slate-300">
                        ${token.price && Number(token.price) > 0 ? Number(token.price).toFixed(9) : "?.?"}
                      </td>
                      <td className="py-4 text-right text-green-600">
                        {token.mcap ? `$${Math.round(token.mcap).toLocaleString()}` : "?.?"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-6">
              <button onClick={() => executeAction('BUNDLE_BUY')} disabled={isLoading} className="h-32 bg-blue-600/10 hover:bg-blue-600 text-blue-500 border-2 border-blue-600/40 rounded-[2rem] font-black uppercase transition-all">
                <Zap className={`w-10 h-10 mx-auto mb-1 ${isLoading ? 'animate-pulse' : ''}`} /> Execute
              </button>
              <button onClick={() => executeAction('PANIC_SELL')} disabled={isLoading} className="h-32 bg-red-600/10 hover:bg-red-600 text-red-500 border-2 border-red-600/40 rounded-[2rem] font-black uppercase transition-all">
                <AlertTriangle className={`w-10 h-10 mx-auto mb-1 ${isLoading ? 'animate-bounce' : ''}`} /> Panic
              </button>
          </div>
          <div className="bg-slate-900/30 border border-blue-900/20 rounded-[2rem] p-8 shadow-inner">
            <div className="flex justify-between items-center mb-8 border-l-4 border-blue-600 pl-4">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Fleet_Status</h3>
              <div className="text-right text-lg font-black text-blue-400 font-mono">{totalBalance.toFixed(5)} <span className="text-[9px] text-blue-900 ml-1">SOL</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id => (
                <div key={id} className={`bg-black/50 p-4 rounded-2xl border transition-all ${id > unitCount ? 'opacity-20 grayscale border-slate-900' : 'opacity-100 border-blue-900/30 shadow-[0_0_15px_rgba(59,130,246,0.05)]'}`}>
                  <div className="text-[9px] text-slate-600 mb-2 font-bold font-mono">UNIT_{id}</div>
                  <div className="text-[15px] font-black text-white">{balances[id]?.toFixed(5) || "0.00000"}</div>
                  <div className="mt-3 w-full h-[2px] bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${Math.min((balances[id] || 0) * 1000, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/80 border border-blue-900/20 rounded-[2rem] p-8 min-h-[300px]">
            <div className="flex justify-between text-[10px] text-slate-600 uppercase mb-6 font-black tracking-widest border-b border-blue-900/10 pb-4">
              <div className="flex items-center gap-2"><RefreshCw className={`w-3 h-3 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} /> Tactical_Link</div>
              <span className={isLoading ? 'text-yellow-500 animate-pulse' : 'text-green-900'}>{isLoading ? 'ACTIVE' : 'IDLE'}</span>
            </div>
            {logs.map((log, i) => (<div key={i} className={`text-[10px] ${i === 0 ? 'text-blue-400 font-black' : 'text-slate-700'} border-l border-blue-900/30 pl-4 py-1 leading-tight mb-2`}>{log}</div>))}
          </div>
        </div>
      </div>
      <footer className="w-full text-center py-10 text-slate-900 font-mono text-[9px] uppercase tracking-[1.5em]">CASE MISSION CONTROL / ABOLUTE_V4.5_FINAL</footer>
    </main>
  );
}
