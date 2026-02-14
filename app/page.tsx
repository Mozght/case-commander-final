"use client";
import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

export default function CaseCommander() {
  const [targetToken, setTargetToken] = useState('');
  const [unitCount, setUnitCount] = useState(10);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reconData, setReconData] = useState<any[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [balances, setBalances] = useState<Record<number, number>>({});

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  const fetchBalances = async () => {
    try {
      const resp = await fetch('/api/balances');
      const data = await resp.json();
      if (data && !data.error) setBalances(data);
    } catch (e) { console.error("Balance sync failed"); }
  };

  const fetchRecon = async () => {
    try {
      const resp = await fetch('/api/sensor');
      const data = await resp.json();
      if (Array.isArray(data)) setReconData(data);
    } catch (e) { console.error("Recon failed"); }
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
    addLog(`Инициализация протокола ${action} для ${unitCount} юнитов...`);
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetToken, unitCount })
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
    } catch (e) { addLog("System Error: Comm link failed."); } finally {
      setIsLoading(false);
      setTimeout(fetchBalances, 2000);
    }
  };

  const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);

  return (
    <>
    <main className="min-h-screen bg-[#020611] text-slate-100 font-mono text-xs relative">
      <div className="w-full bg-[#050915] border-b border-blue-900/30 px-4 md:px-10 py-6">
          <header className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Shield className="text-blue-600 w-10 h-10" />
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">CASE COMMANDER <span className="text-blue-900 text-xs ml-2">v4.0 Relay</span></h1>
                <p className="text-slate-600 text-[8px] mt-1 uppercase tracking-[0.6em]">Smart Strategic Deployment</p>
              </div>
            </div>
            <div className="flex gap-4">
               <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-4">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Active Units: {unitCount}</span>
                  <input type="range" min="1" max="10" value={unitCount} onChange={(e) => setUnitCount(parseInt(e.target.value))} className="w-32 accent-blue-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
               </div>
               <input type="text" placeholder="Target CA..." className="md:w-80 bg-[#0f172a] border border-blue-900/40 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 text-blue-400 font-mono" value={targetToken} onChange={(e) => setTargetToken(e.target.value)} />
               <button className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition text-xs uppercase" onClick={() => fetchBalances()}><Zap className="w-4 h-4" /></button>
            </div>
          </header>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="h-[650px] bg-black rounded-[2rem] border-2 border-blue-900/20 overflow-hidden shadow-2xl relative">
            {targetToken ? (
                <iframe src={`https://dexscreener.com/solana/${targetToken}?embed=1&theme=dark&trades=1&info=0`} className="w-full h-full border-none" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 p-20 text-center uppercase tracking-widest opacity-20">Awaiting_Coordinates</div>
            )}
          </div>

          <div className="bg-[#0f172a]/20 border border-blue-900/10 rounded-2xl overflow-hidden backdrop-blur-sm p-4">
              <table className="w-full text-left font-mono">
                <thead><tr className="text-slate-600 border-b border-blue-900/10 uppercase"><th className="pb-3 px-2">Unit</th><th className="pb-3">Price USD</th><th className="pb-3">Liq</th><th className="pb-3 text-right">MCap</th></tr></thead>
                <tbody>
                  {reconData.map((token: any) => (
                    <tr key={token.id} className="border-b border-blue-900/5 hover:bg-blue-600/10 cursor-pointer group" onClick={() => setTargetToken(token.id)}>
                      <td className="py-3 px-2 text-blue-400 font-black">{token.symbol}</td>
                      <td className="py-3 text-slate-300">${token.price && Number(token.price) > 0 ? Number(token.price).toFixed(8) : "?.?"}</td>
                      <td className="py-3 text-slate-500">${Math.round(token.liquidity).toLocaleString()}</td>
                      <td className="py-3 text-right text-green-600 font-bold">${Math.round(token.mcap).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
              <button onClick={() => executeAction('BUNDLE_BUY')} disabled={isLoading} className="h-24 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border-2 border-blue-600/30 rounded-[1.5rem] font-black transition-all flex flex-col items-center justify-center gap-2 uppercase text-xs">
                <Zap className={`w-8 h-8 ${isLoading ? 'animate-pulse' : ''}`} /> Execute
              </button>
              <button onClick={() => executeAction('PANIC_SELL')} disabled={isLoading} className="h-24 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border-2 border-red-600/30 rounded-[1.5rem] font-black transition-all flex flex-col items-center justify-center gap-2 uppercase text-xs">
                <AlertTriangle className={`w-8 h-8 ${isLoading ? 'animate-bounce' : ''}`} /> Panic
              </button>
          </div>

          <div className="bg-[#0f172a]/30 border border-blue-900/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase text-slate-500 italic">Battle_Group_HQ</h3>
              <div className="text-right"><div className="text-[12px] font-black text-blue-400">{totalBalance.toFixed(5)} <span className="text-[8px] text-blue-900">SOL</span></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id => (
                <div key={id} className={`bg-black/40 p-3 rounded-xl border relative overflow-hidden transition-opacity ${id > unitCount ? 'opacity-20' : 'opacity-100 border-blue-900/20'}`}>
                  <div className="text-[8px] text-slate-600 mb-1">UNIT_{id}</div>
                  <div className="text-[13px] font-bold text-white tracking-tighter tabular-nums">
                    {balances[id]?.toFixed(5) || "0.00000"} <span className="text-[8px] text-slate-700">SOL</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-900/20"><div className="h-full bg-blue-600" style={{ width: `${Math.min((balances[id] || 0) * 1000, 100)}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-black/60 border border-blue-900/20 rounded-2xl p-6 min-h-[300px] shadow-inner">
            <div className="text-[10px] text-slate-500 mb-6 flex justify-between uppercase">
              <div className="flex items-center gap-2"><RefreshCw className={`w-3 h-3 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} /> Link_Status</div>
              <span className="text-green-500">{isLoading ? 'BUSY' : 'READY'}</span>
            </div>
            <div className="flex flex-col gap-3">
              {logs.map((log, i) => (<div key={i} className={`text-[10px] ${i === 0 ? 'text-blue-400' : 'text-slate-600'} border-l-2 border-blue-900/50 pl-4 py-1 leading-none`}>{log}</div>))}
              {logs.length === 0 && <div className="text-[10px] text-slate-800 italic">Awaiting orders...</div>}
            </div>
          </div>
        </div>
      </div>
      <footer className="w-full text-center py-10 text-slate-800 font-mono text-[9px] uppercase tracking-[0.8em]">CASE STRATEGIC / SMART RELAY v4.0</footer>
    </main>
    </>
  );
}
