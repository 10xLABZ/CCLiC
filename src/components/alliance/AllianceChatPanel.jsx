import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export default function AllianceChatPanel({ allianceId, currentUser, members }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!allianceId) return;
    loadMessages();
    const unsub = base44.entities.AllianceChat.subscribe((event) => {
      if (event.data?.alliance_id !== allianceId) return;
      if (event.type === 'create') {
        setMessages(prev => {
          // avoid duplicates
          if (prev.find(m => m.id === event.id)) return prev;
          return [...prev, event.data];
        });
      }
      if (event.type === 'delete') setMessages(prev => prev.filter(m => m.id !== event.id));
    });
    return unsub;
  }, [allianceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const msgs = await base44.entities.AllianceChat.filter({ alliance_id: allianceId }, 'created_date', 50);
    setMessages(msgs);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const myMember = members?.find(m => m.user_id === currentUser?.id);
    const optimisticMsg = {
      id: `tmp_${Date.now()}`,
      alliance_id: allianceId,
      user_id: currentUser?.id,
      username: currentUser?.full_name || myMember?.username || "Player",
      message: text.trim(),
      role: myMember?.role || "member",
      timestamp: Date.now(),
    };
    // Optimistic update
    setMessages(prev => [...prev, optimisticMsg]);
    const sentText = text.trim();
    setText("");
    try {
      await base44.entities.AllianceChat.create({
        alliance_id: allianceId,
        user_id: currentUser?.id,
        username: optimisticMsg.username,
        message: sentText,
        role: optimisticMsg.role,
        timestamp: optimisticMsg.timestamp,
      });
      // Remove optimistic, real one comes via subscription
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const ROLE_COLORS = { leader: "text-amber-400", officer: "text-blue-400", member: "text-slate-400" };
  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

  return (
    <div className="flex flex-col bg-[#0a0f1a] border border-amber-900/20 rounded-xl overflow-hidden" style={{ height: '360px' }}>
      <div className="px-3 py-2 border-b border-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
        💬 Alliance Chat
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-slate-600 text-xs py-8">No messages yet. Say hello!</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.user_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
            <div className={`max-w-[75%] ${msg.user_id === currentUser?.id ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`flex items-center gap-1.5 mb-0.5 ${msg.user_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                <span className={`text-[10px] font-semibold ${ROLE_COLORS[msg.role] || 'text-slate-400'}`}>{msg.username}</span>
                <span className="text-[9px] text-slate-700">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`px-3 py-1.5 rounded-xl text-sm leading-snug ${msg.user_id === currentUser?.id ? 'bg-amber-800/40 text-amber-100 rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                {msg.message}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-slate-800 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message your alliance..."
          className="bg-slate-900 border-slate-700 text-white text-sm h-9"
          maxLength={200}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="bg-amber-600 hover:bg-amber-500 text-black h-9 px-3">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}