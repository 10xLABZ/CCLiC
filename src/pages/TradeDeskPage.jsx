import React, { useState, useEffect, useRef } from "react";
import { getPlayerData } from "../components/utils/playerStorage";
import { applyServerReward } from "../lib/playerServerSync";
import { updateRegenStats } from "../components/utils/regenHelper";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { kvGet, kvSet, subscribe } from "@/lib/playerMemory";
import TradeDeskTutorial from "@/components/trading/TradeDeskTutorial";

const SYMBOLS = [
  { ticker: "TRNX", type: "STOCK", anchor: 182.00 },
  { ticker: "VLTA", type: "STOCK", anchor: 415.00 },
  { ticker: "QNTM", type: "STOCK", anchor: 196.00 },
  { ticker: "HYPR", type: "STOCK", anchor: 388.00 },
  { ticker: "ZENT", type: "STOCK", anchor: 264.00 },
  { ticker: "NEXA", type: "STOCK", anchor: 143.00 },
  { ticker: "KRVX", type: "STOCK", anchor: 74.00 },
  { ticker: "ORVN", type: "STOCK", anchor: 29.00 },
  { ticker: "PXLM", type: "STOCK", anchor: 61.00 },
  { ticker: "BRIX", type: "STOCK", anchor: 12.00 },
  { ticker: "BTC", type: "CRYPTO", anchor: 67000.00 },
  { ticker: "ETH", type: "CRYPTO", anchor: 2800.00 },
  { ticker: "SOL", type: "CRYPTO", anchor: 120.00 },
  { ticker: "BNB", type: "CRYPTO", anchor: 820.00 },
  { ticker: "LINK", type: "CRYPTO", anchor: 18.00 },
  { ticker: "AVAX", type: "CRYPTO", anchor: 42.00 },
  { ticker: "ATOM", type: "CRYPTO", anchor: 11.00 },
  { ticker: "LTC", type: "CRYPTO", anchor: 77.00 },
  { ticker: "BCH", type: "CRYPTO", anchor: 520.00 },
  { ticker: "XMR", type: "CRYPTO", anchor: 410.00 }
];

class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const CHART_ACTION_POOL = ["chop", "uptrend", "downtrend", "reversal", "spike"];

const generateCandles = (symbol, seed) => {
  const rng = new SeededRNG(seed);
  const candles = [];
  const startVariation = symbol.type === "STOCK" ? 0.90 + rng.next() * 0.20 : 0.85 + rng.next() * 0.30;
  let price = parseFloat((symbol.anchor * startVariation).toFixed(2));
  const floor = symbol.type === "STOCK" ? Math.max(0.25, symbol.anchor * 0.10) : symbol.anchor * 0.05;
  
  // Roll a new trend every 50 bars, no consecutive duplicates
  const segments = [];
  let prevType = null;
  for (let i = 0; i < 5; i++) {
    const pool = prevType ? CHART_ACTION_POOL.filter(t => t !== prevType) : [...CHART_ACTION_POOL];
    const type = pool[Math.floor(rng.next() * pool.length)];
    segments.push({ type, bars: 50 });
    prevType = type;
  }
  
  let spikeCluster = 0;
  
  for (const segment of segments) {
    let trend = 0;
    if (segment.type === "uptrend") trend = 0.0005;
    else if (segment.type === "downtrend") trend = -0.0005;
    else if (segment.type === "reversal") trend = 0.0003;
    
    for (let i = 0; i < segment.bars; i++) {
      if (segment.type === "reversal" && i > segment.bars / 2) trend = -trend;
      
      let movePercent;
      const isSpike = spikeCluster > 0 || (segment.type === "spike" && rng.next() < 0.2);
      
      if (isSpike) {
        movePercent = symbol.type === "STOCK"
          ? (rng.next() < 0.5 ? 0.0050 : 0.0120) * (rng.next() < 0.5 ? 1 : -1)
          : (rng.next() < 0.5 ? 0.0120 : 0.0300) * (rng.next() < 0.5 ? 1 : -1);
        if (spikeCluster === 0) spikeCluster = 10 + Math.floor(rng.next() * 15);
      } else {
        movePercent = symbol.type === "STOCK"
          ? (0.0002 + rng.next() * 0.0010) * (rng.next() < 0.5 ? 1 : -1)
          : (0.0005 + rng.next() * 0.0020) * (rng.next() < 0.5 ? 1 : -1);
      }
      
      price = Math.max(floor, price * (1 + trend + movePercent));
      
      const volatility = symbol.type === "STOCK" 
        ? price * (0.001 + rng.next() * 0.004)
        : price * (0.002 + rng.next() * 0.008);
      
      const open = price;
      const close = Math.max(floor, price * (1 + (rng.next() - 0.5) * (symbol.type === "STOCK" ? 0.005 : 0.010)));
      const high = Math.max(open, close) + rng.next() * volatility;
      const low = Math.max(floor, Math.min(open, close) - rng.next() * volatility);
      
      candles.push({ open, high, low, close });
      price = close;
      
      if (spikeCluster > 0) spikeCluster--;
    }
  }
  
  return candles;
};

export default function TradeDeskPage() {
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [sessions, setSessions] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [pendingSymbol, setPendingSymbol] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [position, setPosition] = useState(null);
  const [closedTrades, setClosedTrades] = useState([]);
  const [autoMode, setAutoMode] = useState(0); // 0=off, 1=1x, 2=3x
  const [errorDialog, setErrorDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribe(() => setPlayerData(updateRegenStats()));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = kvGet('tradeDeskState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setSessions(state.sessions || {});
        if (state.selectedSymbol) {
          const sym = SYMBOLS.find(s => s.ticker === state.selectedSymbol);
          if (sym) setSelectedSymbol(sym);
        }
        if (state.position) setPosition(state.position);
        if (state.closedTrades) setClosedTrades(state.closedTrades);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const getSession = () => {
    const ticker = selectedSymbol.ticker;
    if (!sessions[ticker]) {
      const seed = Date.now() + Math.random() * 1000000;
      const candles = generateCandles(selectedSymbol, seed);
      const newSession = { seed, candles, currentIndex: 0 };
      setSessions(prev => ({ ...prev, [ticker]: newSession }));
      return newSession;
    }
    return sessions[ticker];
  };

  const session = getSession();
  const currentBar = session.currentIndex;
  const candles = session.candles;
  const currentPrice = candles[currentBar]?.close || selectedSymbol.anchor;
  const gameCash = playerData.cash;

  useEffect(() => {
    const state = {
      sessions,
      selectedSymbol: selectedSymbol.ticker,
      position,
      closedTrades
    };
    kvSet('tradeDeskState', JSON.stringify(state));
  }, [sessions, selectedSymbol, position, closedTrades]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (autoMode > 0 && currentBar < 249) {
      const speed = autoMode === 1 ? 1000 : 333; // 1x = 1s, 3x = 333ms
      intervalRef.current = setInterval(() => {
        setSessions(prev => {
          const ticker = selectedSymbol.ticker;
          const sess = prev[ticker];
          if (sess && sess.currentIndex < 249) {
            return { ...prev, [ticker]: { ...sess, currentIndex: sess.currentIndex + 1 } };
          }
          setAutoMode(0);
          return prev;
        });
      }, speed);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoMode, currentBar, selectedSymbol]);

  const unrealizedPnL = position 
    ? parseFloat((position.side === "LONG"
      ? position.quantity * (currentPrice - position.entryPrice)
      : position.quantity * (position.entryPrice - currentPrice)).toFixed(2))
    : 0;

  const handleSymbolChange = (ticker) => {
    if (position) {
      setPendingSymbol(ticker);
      setConfirmDialog("switch");
      return;
    }
    setSelectedSymbol(SYMBOLS.find(s => s.ticker === ticker));
    setAutoMode(0);
  };

  const handleCloseAndSwitch = async () => {
    if (position) {
      const pnl = parseFloat((position.side === "LONG"
        ? position.quantity * (currentPrice - position.entryPrice)
        : position.quantity * (position.entryPrice - currentPrice)).toFixed(2));
      
      const cashDelta = parseFloat((position.positionCost + pnl).toFixed(2));
      
      if (isNaN(cashDelta) || isNaN(pnl)) {
        setErrorDialog("Trade error");
        return;
      }
      
      const result = await applyServerReward({ cash_delta: cashDelta, reason: 'trade_desk_close_switch' });
      if (!result?.success) {
        setErrorDialog("Server error — trade not processed");
        return;
      }
      
      setClosedTrades(prev => [{
        symbol: selectedSymbol.ticker,
        side: position.side,
        qty: position.quantity,
        entry: parseFloat(position.entryPrice).toFixed(2),
        exit: parseFloat(currentPrice).toFixed(2),
        pnl: pnl.toFixed(2)
      }, ...prev.slice(0, 4)]);
      
      setPosition(null);
    }
    
    setSelectedSymbol(SYMBOLS.find(s => s.ticker === pendingSymbol));
    setConfirmDialog(null);
    setPendingSymbol(null);
    setAutoMode(0);
  };

  const handleBuy = async () => {
    const requiredCash = parseFloat((quantity * currentPrice).toFixed(2));
    if (isNaN(requiredCash)) {
      setErrorDialog("Trade error");
      return;
    }
    if (requiredCash > gameCash) {
      setErrorDialog("Insufficient Cash");
      return;
    }
    
    if (position) {
      if (position.side === "SHORT") {
        // Close SHORT: refund position cost + profit/loss
        const pnl = parseFloat((position.quantity * (position.entryPrice - currentPrice)).toFixed(2));
        const cashDelta = parseFloat((position.positionCost + pnl).toFixed(2));
        
        if (isNaN(cashDelta) || isNaN(pnl)) {
          setErrorDialog("Trade error");
          return;
        }
        
        const result = await applyServerReward({ cash_delta: cashDelta, reason: 'trade_desk_close_short' });
        if (!result?.success) {
          setErrorDialog("Server error — trade not processed");
          return;
        }
        
        setClosedTrades(prev => [{
          symbol: selectedSymbol.ticker,
          side: "SHORT",
          qty: position.quantity,
          entry: parseFloat(position.entryPrice).toFixed(2),
          exit: parseFloat(currentPrice).toFixed(2),
          pnl: pnl.toFixed(2)
        }, ...prev.slice(0, 4)]);
        
        setPosition(null);
        toast.success(`Closed SHORT: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
        return;
      } else {
        toast.error("Already in LONG position");
        return;
      }
    }
    
    const result = await applyServerReward({ cash_delta: -requiredCash, reason: 'trade_desk_open_long' });
    if (!result?.success) {
      setErrorDialog("Server error — trade not processed");
      return;
    }
    
    setPosition({
      side: "LONG",
      quantity,
      entryPrice: parseFloat(currentPrice.toFixed(2)),
      positionCost: requiredCash,
      symbol: selectedSymbol.ticker
    });
    // Force advance 1 bar to eliminate zero-bar arbitrage
    advanceOneBar();
    toast.success("Opened LONG position");
  };

  const handleSell = async () => {
    const requiredCash = parseFloat((quantity * currentPrice).toFixed(2));
    if (isNaN(requiredCash)) {
      setErrorDialog("Trade error");
      return;
    }
    if (requiredCash > gameCash) {
      setErrorDialog("Insufficient Cash");
      return;
    }
    
    if (position) {
      if (position.side === "LONG") {
        // Close LONG: refund position cost + profit/loss
        const pnl = parseFloat((position.quantity * (currentPrice - position.entryPrice)).toFixed(2));
        const cashDelta = parseFloat((position.positionCost + pnl).toFixed(2));
        
        if (isNaN(cashDelta) || isNaN(pnl)) {
          setErrorDialog("Trade error");
          return;
        }
        
        const result = await applyServerReward({ cash_delta: cashDelta, reason: 'trade_desk_close_long' });
        if (!result?.success) {
          setErrorDialog("Server error — trade not processed");
          return;
        }
        
        setClosedTrades(prev => [{
          symbol: selectedSymbol.ticker,
          side: "LONG",
          qty: position.quantity,
          entry: parseFloat(position.entryPrice).toFixed(2),
          exit: parseFloat(currentPrice).toFixed(2),
          pnl: pnl.toFixed(2)
        }, ...prev.slice(0, 4)]);
        
        setPosition(null);
        toast.success(`Closed LONG: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
        return;
      } else {
        toast.error("Already in SHORT position");
        return;
      }
    }
    
    // Deduct cash when opening SHORT
    const result = await applyServerReward({ cash_delta: -requiredCash, reason: 'trade_desk_open_short' });
    if (!result?.success) {
      setErrorDialog("Server error — trade not processed");
      return;
    }
    
    setPosition({
      side: "SHORT",
      quantity,
      entryPrice: parseFloat(currentPrice.toFixed(2)),
      positionCost: requiredCash,
      symbol: selectedSymbol.ticker
    });
    // Force advance 1 bar to eliminate zero-bar arbitrage
    advanceOneBar();
    toast.success("Opened SHORT position");
  };

  const handleClose = async () => {
    if (!position) return;
    
    const pnl = parseFloat((position.side === "LONG"
      ? position.quantity * (currentPrice - position.entryPrice)
      : position.quantity * (position.entryPrice - currentPrice)).toFixed(2));
    
    const cashDelta = parseFloat((position.positionCost + pnl).toFixed(2));
    
    if (isNaN(cashDelta) || isNaN(pnl)) {
      setErrorDialog("Trade error");
      return;
    }
    
    const result = await applyServerReward({ cash_delta: cashDelta, reason: 'trade_desk_close' });
    if (!result?.success) {
      setErrorDialog("Server error — trade not processed");
      return;
    }
    
    setClosedTrades(prev => [{
      symbol: selectedSymbol.ticker,
      side: position.side,
      qty: position.quantity,
      entry: parseFloat(position.entryPrice).toFixed(2),
      exit: parseFloat(currentPrice).toFixed(2),
      pnl: pnl.toFixed(2)
    }, ...prev.slice(0, 4)]);
    
    toast.success(`Closed ${position.side}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    setPosition(null);
  };

  const advanceOneBar = () => {
    setSessions(prev => {
      const ticker = selectedSymbol.ticker;
      const sess = prev[ticker];
      if (sess && sess.currentIndex < 249) {
        return { ...prev, [ticker]: { ...sess, currentIndex: sess.currentIndex + 1 } };
      }
      return prev;
    });
  };

  const handleNextBar = () => {
    if (currentBar < 249) {
      setSessions(prev => ({
        ...prev,
        [selectedSymbol.ticker]: { ...session, currentIndex: currentBar + 1 }
      }));
    }
  };

  const handleResetSession = () => {
    if (position) {
      setErrorDialog("Close your position before resetting this chart.");
      return;
    }
    const seed = Date.now() + Math.random() * 1000000;
    const newCandles = generateCandles(selectedSymbol, seed);
    setSessions(prev => ({
      ...prev,
      [selectedSymbol.ticker]: { seed, candles: newCandles, currentIndex: 0 }
    }));
    toast.success("Chart reset");
  };

  const handleNextChart = () => {
    if (position) {
      setConfirmDialog("nextChart");
      return;
    }
    handleResetSession();
  };

  const visibleCandles = candles.slice(Math.max(0, currentBar - 29), currentBar + 1).filter(c => c); // Filter out undefined candles
  const maxPrice = visibleCandles.length > 0 ? Math.max(...visibleCandles.map(c => c.high)) : currentPrice;
  const minPrice = visibleCandles.length > 0 ? Math.min(...visibleCandles.map(c => c.low)) : currentPrice;
  const priceRange = maxPrice - minPrice;
  const priceLevels = priceRange > 0 ? [
    maxPrice,
    maxPrice - priceRange * 0.25,
    maxPrice - priceRange * 0.50,
    maxPrice - priceRange * 0.75,
    minPrice
  ] : [currentPrice];

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-20">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[118px] max-w-2xl mx-auto px-4">
        <div className="mb-3">
          {position ? (
            <div className="bg-slate-900 border border-orange-600 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-bold text-orange-400">CURRENT POSITION</div>
                <Button size="sm" onClick={handleClose} className="bg-red-600 hover:bg-red-500 text-[10px] h-6 px-2">
                  CLOSE
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div><span className="text-slate-500">Side:</span> <span className={position.side === "LONG" ? "text-green-400" : "text-red-400"}>{position.side}</span></div>
                <div><span className="text-slate-500">Qty:</span> {position.quantity}</div>
                <div><span className="text-slate-500">Entry:</span> ${position.entryPrice.toFixed(2)}</div>
                <div><span className="text-slate-500">P/L:</span> <span className={unrealizedPnL >= 0 ? "text-green-400" : "text-red-400"}>${unrealizedPnL.toFixed(2)}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-center">
              <div className="text-xs text-slate-500">No Position</div>
            </div>
          )}
        </div>

        <div className="border-2 border-orange-600 rounded-lg p-3 mb-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5">
              <Select value={selectedSymbol.ticker} onValueChange={handleSymbolChange}>
                <SelectTrigger className="h-6 bg-transparent border-0 p-0 text-xs font-bold text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {SYMBOLS.map(s => (
                    <SelectItem key={s.ticker} value={s.ticker} className="text-white">
                      {s.ticker} ({s.type}) ${s.anchor.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-center">
              <div className="text-xs font-bold">${currentPrice.toFixed(2)}</div>
            </div>
            <div className={`bg-slate-900 border rounded px-2 py-1.5 text-center ${(250 - currentBar) <= 50 ? 'border-red-500' : 'border-slate-700'}`}>
              <div className={`text-xs font-bold ${(250 - currentBar) <= 50 ? 'text-red-500' : ''}`}>
                BARS: {250 - currentBar}
              </div>
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-lg p-2" style={{ height: '224px' }}>
            <svg className="w-full h-full" viewBox="0 0 320 200">
              {priceLevels.map((level, i) => {
                const y = 10 + (i * 180 / 4);
                return (
                  <g key={i}>
                    <line x1="0" y1={y} x2="280" y2={y} stroke="#333" strokeWidth="0.5" strokeDasharray="2,2" />
                    <text x="285" y={y + 3} fill="#666" fontSize="8">${level.toFixed(2)}</text>
                  </g>
                );
              })}
              
              {visibleCandles.map((candle, i) => {
                if (!candle) return null; // Skip if candle is undefined
                const x = i * (280 / 30) + 5;
                const yHigh = 10 + (1 - (candle.high - minPrice) / priceRange) * 180;
                const yLow = 10 + (1 - (candle.low - minPrice) / priceRange) * 180;
                const yOpen = 10 + (1 - (candle.open - minPrice) / priceRange) * 180;
                const yClose = 10 + (1 - (candle.close - minPrice) / priceRange) * 180;
                const isGreen = candle.close >= candle.open;
                
                return (
                  <g key={i}>
                    <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke="#666" strokeWidth="1" />
                    <rect
                      x={x - 3}
                      y={Math.min(yOpen, yClose)}
                      width="6"
                      height={Math.max(1, Math.abs(yClose - yOpen))}
                      fill={isGreen ? "#22c55e" : "#ef4444"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button onClick={() => setAutoMode((autoMode + 1) % 3)} className={`relative ${autoMode > 0 ? "bg-orange-600 hover:bg-orange-500" : "bg-slate-700 hover:bg-slate-600 auto-off-pulse border border-orange-500"}`}>
            {autoMode === 0 ? <><Play className="w-4 h-4 mr-2" /> AUTO OFF</> : 
             autoMode === 1 ? <><Pause className="w-4 h-4 mr-2" /> AUTO 1X</> :
             <><Pause className="w-4 h-4 mr-2" /> AUTO 3X</>}
          </Button>
          {currentBar >= 249 ? (
            <Button onClick={handleNextChart} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold border-2 border-red-600 animate-pulse">
              NEXT CHART
            </Button>
          ) : (
            <Button onClick={handleNextBar} disabled={currentBar >= 249} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold disabled:opacity-40">
              NEXT BAR
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <Select value={quantity.toString()} onValueChange={(v) => setQuantity(parseInt(v))}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              {[1, 5, 10, 25, 50, 100, 500, 1000].map(q => (
                <SelectItem key={q} value={q.toString()} className="text-white">{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBuy} className="bg-green-600 hover:bg-green-500 font-bold">
            BUY
          </Button>
          <Button onClick={handleSell} className="bg-red-600 hover:bg-red-500 font-bold">
            SELL
          </Button>
        </div>

        {closedTrades.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 mb-3">
            <div className="text-[10px] font-bold text-slate-400 mb-1">RECENT TRADES</div>
            <div className="space-y-1">
              {closedTrades.map((trade, i) => (
                <div key={i} className="text-[9px] flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400">{trade.symbol} {trade.side}</span>
                  <span className="text-slate-500">x{trade.qty}</span>
                  <span className="text-slate-500">${trade.entry}→${trade.exit}</span>
                  <span className={parseFloat(trade.pnl) >= 0 ? "text-green-400" : "text-red-400"}>${trade.pnl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleResetSession} variant="outline" className="w-full border-slate-600 text-slate-400 text-xs">
          Reset Session
        </Button>
      </div>

      <BottomNav />

      {showTutorial && <TradeDeskTutorial onClose={() => setShowTutorial(false)} />}

      <Dialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <DialogContent className="bg-red-950/90 border-red-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Error</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{errorDialog}</p>
          <Button onClick={() => setErrorDialog(null)} className="bg-slate-700">Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialog === "switch"} onOpenChange={() => { setConfirmDialog(null); setPendingSymbol(null); }}>
        <DialogContent className="bg-slate-900 border-orange-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Open Position</DialogTitle>
          </DialogHeader>
          <p className="text-sm">You have an open position on {selectedSymbol.ticker}. Choose:</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmDialog(null); setPendingSymbol(null); }} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleCloseAndSwitch} className="bg-orange-600 hover:bg-orange-500">
              Close Position & Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialog === "nextChart"} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="bg-slate-900 border-yellow-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Close Position First</DialogTitle>
          </DialogHeader>
          <p className="text-sm">You must close your position before loading the next chart.</p>
          <Button onClick={() => setConfirmDialog(null)} className="bg-slate-700">OK</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}