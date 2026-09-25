import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { getPlayerData } from "@/components/utils/playerStorage";
import { updateRegenStats } from "@/components/utils/regenHelper";

const ADMIN_EMAIL = "cryptodollarproject@gmail.com"; // Only this account sees this page

const typeColors = {
  purchase_consumable: 'border-blue-800/50 bg-blue-950/10',
  purchase_nonconsumable: 'border-emerald-800/50 bg-emerald-950/10',
  vip_purchase: 'border-yellow-800/50 bg-yellow-950/10',
  restore_success: 'border-purple-800/50 bg-purple-950/10',
  restore_failed: 'border-red-800/50 bg-red-950/10',
  system_event: 'border-slate-700/40 bg-slate-900/20',
};

const typeIcons = {
  purchase_consumable: '🛒',
  purchase_nonconsumable: '📦',
  vip_purchase: '🌟',
  restore_success: '🔁',
  restore_failed: '❌',
  system_event: '⚙️',
};

const ITEMS_PER_PAGE = 30;

export default function AdminLogPage() {
  const [playerData, setPlayerData] = useState(() => updateRegenStats());
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [reissuing, setReissuing] = useState({});

  useEffect(() => {
    base44.auth.me().then(u => setUser(u));
  }, []);

  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      loadMessages(0);
    }
  }, [user, filterType]);

  const handleReissue = async (msg) => {
    setReissuing(r => ({ ...r, [msg.id]: true }));
    try {
      const res = await base44.functions.invoke('adminReissuePowerPack', { target_user_id: msg.user_id });
      alert(`✅ Reissued! Delivered: ${res.data?.delivered?.join(', ')}`);
      loadMessages(page);
    } catch (e) {
      alert('❌ Reissue failed: ' + e.message);
    }
    setReissuing(r => ({ ...r, [msg.id]: false }));
  };

  const loadMessages = async (pageNum) => {
    setLoading(true);
    const query = filterType !== 'all' ? { type: filterType } : {};
    const all = await base44.entities.SystemMessage.filter(query, '-timestamp', ITEMS_PER_PAGE * (pageNum + 1));

    setMessages(all);
    setTotalCount(all.length);
    setHasMore(all.length === ITEMS_PER_PAGE * (pageNum + 1));
    setPage(pageNum);
    setLoading(false);
  };

  const filteredMessages = filterUser
    ? messages.filter(m => m.user_id?.toLowerCase().includes(filterUser.toLowerCase()) || m.item_name?.toLowerCase().includes(filterUser.toLowerCase()))
    : messages;

  // Access control
  if (!user) {
    return (
      <div className="min-h-screen bg-[#060a12] text-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#060a12] text-white flex items-center justify-center">
        <div className="text-red-500 text-sm">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-24">
      <TopHUD playerData={playerData} onUpdate={setPlayerData} />

      <div className="pt-[130px] max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-lg font-black text-red-400 uppercase tracking-widest mb-1">🔐 Admin Log</h1>
          <p className="text-[10px] text-slate-600">System-wide transaction audit — visible to admin only</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'purchase_consumable', 'purchase_nonconsumable', 'vip_purchase', 'restore_success'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                filterType === t
                  ? 'bg-red-700 border-red-600 text-white'
                  : 'border-slate-700 text-slate-500 hover:border-slate-500'
              }`}
            >
              {t === 'all' ? 'ALL' : typeIcons[t] + ' ' + t.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <input
            type="text"
            placeholder="Search by user_id or item name..."
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500"
          />
        </div>

        <div className="text-[10px] text-slate-600 mb-3">{filteredMessages.length} record{filteredMessages.length !== 1 ? 's' : ''} shown</div>

        {loading ? (
          <div className="text-center text-slate-600 py-12 text-sm">Loading audit log...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-slate-600 py-12 text-sm">No records found.</div>
        ) : (
          <div className="space-y-2">
            {filteredMessages.map(msg => (
              <div
                key={msg.id}
                className={`border rounded-xl p-3 ${typeColors[msg.type] || 'border-slate-800 bg-slate-900/20'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{typeIcons[msg.type] || '📋'}</span>
                    <span className="text-xs font-bold text-slate-200">{msg.title}</span>
                    {msg.restored && (
                      <span className="text-[8px] bg-purple-900/40 border border-purple-700/40 text-purple-400 px-1 py-0.5 rounded-full">RESTORED</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-600 shrink-0">{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-slate-500 mb-1">{msg.body}</div>
                <div className="flex flex-wrap gap-2 text-[9px]">
                  <span className="text-slate-600 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded">uid: {msg.user_id?.slice(0, 12)}...</span>
                  {msg.item_id && <span className="text-slate-600 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded">item: {msg.item_id}</span>}
                  {msg.amount_paid > 0 && <span className="text-amber-600 bg-amber-950/30 border border-amber-900/30 px-1.5 py-0.5 rounded">{msg.amount_paid} {msg.currency?.toUpperCase()}</span>}
                  {msg.is_consumable && <span className="text-blue-500 bg-blue-950/30 border border-blue-900/30 px-1.5 py-0.5 rounded">consumable</span>}
                  {msg.category && <span className="text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">{msg.category}</span>}
                </div>
                {msg.category === 'power_pack' && !msg.is_consumable && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleReissue(msg)}
                      disabled={reissuing[msg.id]}
                      className="text-[10px] h-6 bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                    >
                      {reissuing[msg.id] ? '⏳ Reissuing...' : '☢️ REISSUE ALL PACK ITEMS'}
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {hasMore && (
              <div className="pt-2 text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadMessages(page + 1)}
                  className="border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}