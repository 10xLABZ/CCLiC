import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Users, User, Trash2 } from "lucide-react";
import { getPlayerData } from "@/components/utils/playerStorage";
import MemberPlayerCard from "./MemberPlayerCard";
import AllianceMemberProfileModal from "@/components/alliance/AllianceMemberProfileModal";

const ROLE_COLORS = { leader: "text-amber-400", officer: "text-cyan-400", member: "text-amber-300" };
const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
const makeThreadId = (a, b) => [a, b].sort().join("_");

export default function GlobalChatBar() {
  const [open, setOpen] = useState(false);
  const [chatTab, setChatTab] = useState("alliance");
  const [allianceMessages, setAllianceMessages] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmConversations, setDmConversations] = useState([]); // list of {member, threadId}
  const [activeDmThread, setActiveDmThread] = useState(null); // member object
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myGameUsername, setMyGameUsername] = useState("");
  const [myProfileImage, setMyProfileImage] = useState("");
  const [myAlliance, setMyAlliance] = useState(null);
  const [myMembership, setMyMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);
  const [hasUnreadAlliance, setHasUnreadAlliance] = useState(false);
  const [hasUnreadDM, setHasUnreadDM] = useState(false);
  // Per-member unread: { [user_id]: true }
  const [unreadByMember, setUnreadByMember] = useState({});
  const lastSeenAllianceCount = useRef(0);
  const lastSeenDMCount = useRef(0);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  // Load player game username from local storage
  useEffect(() => {
    const pd = getPlayerData();
    setMyGameUsername(pd.username || "");
    setMyProfileImage(pd.profileImageDataUrl || "");
  }, []);

  // Load alliance state on mount
  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user) { setLoaded(true); return; }
        setCurrentUser(user);
        const membership = await base44.entities.AllianceMember.filter({ user_id: user.id });
        if (membership.length > 0) {
          setMyMembership(membership[0]);
          const allianceList = await base44.entities.Alliance.filter({ id: membership[0].alliance_id });
          if (allianceList.length > 0) {
            setMyAlliance(allianceList[0]);
            const roster = await base44.entities.AllianceMember.filter({ alliance_id: allianceList[0].id });
            setMembers(roster);
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Subscribe to alliance chat
  useEffect(() => {
    if (!myAlliance?.id) return;
    loadAllianceMessages();
    const unsub = base44.entities.AllianceChat.subscribe((event) => {
      if (event.data?.alliance_id !== myAlliance.id) return;
      if (event.type === 'create') {
        setAllianceMessages(prev => {
          if (prev.find(m => m.id === event.id)) return prev;
          const next = [...prev, event.data];
          // If chat is not open on alliance tab, mark as unread
          setHasUnreadAlliance(o => true);
          return next;
        });
      }
      if (event.type === 'delete') setAllianceMessages(prev => prev.filter(m => m.id !== event.id));
    });
    return unsub;
  }, [myAlliance?.id]);

  // Subscribe to DMs — watch all incoming DMs for current user
  useEffect(() => {
    if (!currentUser) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg) return;
      // Incoming DM to me
      if (msg.to_user_id === currentUser.id) {
        setHasUnreadDM(true);
        // Mark per-member unread (the sender)
        setUnreadByMember(prev => ({ ...prev, [msg.from_user_id]: true }));
      }
      // If active thread is open for this DM
      if (activeDmThread) {
        const threadId = makeThreadId(currentUser.id, activeDmThread.user_id);
        if (msg.thread_id === threadId) {
          setDmMessages(prev => prev.find(m => m.id === event.id) ? prev : [...prev, msg]);
        }
      }
    });
    return unsub;
  }, [currentUser?.id, activeDmThread?.user_id]);

  // Load DM messages when thread is selected
  useEffect(() => {
    if (!activeDmThread || !currentUser) return;
    const threadId = makeThreadId(currentUser.id, activeDmThread.user_id);
    loadDmMessages(threadId);
  }, [activeDmThread?.user_id, currentUser?.id]);

  // Scroll to bottom on new messages or tab switch
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [allianceMessages, dmMessages, open, chatTab]);

  const loadAllianceMessages = async () => {
    if (!myAlliance?.id) return;
    try {
      // Fetch newest 50 messages (descending), then reverse for display
      const msgs = await base44.entities.AllianceChat.filter({ alliance_id: myAlliance.id }, '-timestamp', 50);
      const ordered = msgs.reverse();
      setAllianceMessages(ordered);
      return ordered;
    } catch {
      return null;
    }
  };

  const DM_CAP = 25;

  const loadDmMessages = async (threadId) => {
    try {
      const msgs = await base44.entities.DirectMessage.filter({ thread_id: threadId }, '-timestamp', DM_CAP);
      const ordered = msgs.reverse(); // oldest → newest
      setDmMessages(ordered);
      return ordered;
    } catch {
      return null;
    }
  };

  const handleClearDMs = async () => {
    if (!activeDmThread || !currentUser) return;
    const threadId = makeThreadId(currentUser.id, activeDmThread.user_id);
    try {
      const all = await base44.entities.DirectMessage.filter({ thread_id: threadId }, 'timestamp', 25);
      all.forEach(m => base44.entities.DirectMessage.delete(m.id).catch(() => {}));
    } catch {}
    setDmMessages([]);
  };

  const openDmWith = (member) => {
    setActiveDmThread(member);
    setChatTab("dm");
    setOpen(true);
  };

  const handleSendAlliance = async () => {
    if (!text.trim() || sending || !myAlliance || !currentUser) return;
    setSending(true);
    const myMember = members?.find(m => m.user_id === currentUser.id);
    const msg = {
      id: `tmp_${Date.now()}`,
      alliance_id: myAlliance.id,
      user_id: currentUser.id,
      username: myGameUsername || myMember?.username || "Player",
      profile_image_url: myProfileImage || myMember?.profile_image_url || "",
      level: myMember?.level || 1,
      message: text.trim(),
      role: myMember?.role || "member",
      timestamp: Date.now(),
    };
    setAllianceMessages(prev => [...prev, msg]);
    const sentText = text.trim();
    setText("");
    try {
      await base44.entities.AllianceChat.create({
        alliance_id: myAlliance.id,
        user_id: currentUser.id,
        username: msg.username,
        profile_image_url: msg.profile_image_url,
        level: msg.level,
        message: sentText,
        role: msg.role,
        timestamp: msg.timestamp,
      });
      // Remove the optimistic temp message — the real one arrives via subscription
      setAllianceMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch {
      setAllianceMessages(prev => prev.filter(m => m.id !== msg.id));
    }
    setSending(false);
  };

  const handleRecallMessage = async (msgId) => {
    try {
      await base44.entities.AllianceChat.delete(msgId);
      setAllianceMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
  };

  const handleSendDM = async () => {
    if (!text.trim() || sending || !activeDmThread || !currentUser) return;
    setSending(true);
    const threadId = makeThreadId(currentUser.id, activeDmThread.user_id);
    const msg = {
      id: `tmp_${Date.now()}`,
      from_user_id: currentUser.id,
      to_user_id: activeDmThread.user_id,
      from_username: myGameUsername || "Player",
      to_username: activeDmThread.username,
      from_profile_image_url: myProfileImage || "",
      message: text.trim(),
      timestamp: Date.now(),
      thread_id: threadId,
    };
    setDmMessages(prev => [...prev, msg]);
    const sentText = text.trim();
    setText("");
    try {
      await base44.entities.DirectMessage.create({ ...msg, id: undefined, read: false });
      // Remove the optimistic temp message — the real one arrives via subscription
      setDmMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch {
      setDmMessages(prev => prev.filter(m => m.id !== msg.id));
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatTab === "alliance" ? handleSendAlliance() : handleSendDM();
    }
  };

  const toggleOpen = () => setOpen(prev => !prev);
  const closeChat = (e) => { e.stopPropagation(); setOpen(false); };

  if (!loaded) return (
    <div className="fixed left-0 right-0 z-50 flex items-center justify-center bg-[#060c1a] border-t border-slate-800" style={{ bottom: '64px', height: '32px' }}>
      <MessageCircle className="w-4 h-4 text-slate-700" />
    </div>
  );

  return (
    <>
      {/* Always-visible chat strip above BottomNav */}
      <div
        className="fixed left-0 right-0 z-50 flex items-stretch select-none"
        style={{ bottom: '64px', height: '32px' }}
      >
        {/* Chat toggle — full width */}
        <div
          className="flex items-center justify-center gap-2 cursor-pointer flex-1"
          style={{ background: 'linear-gradient(90deg,#050a18,#0b1230,#050a18)', borderTop: '1px solid #1e2d50', borderBottom: '1px solid #1e2d50' }}
          onPointerDown={toggleOpen}
        >
          {hasUnreadAlliance && (
            <Users className="w-3.5 h-3.5 text-pink-500 shrink-0 animate-pulse" style={{ filter: 'drop-shadow(0 0 4px rgba(236,72,153,0.9))' }} />
          )}
          <MessageCircle className="w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.7))' }} />
          {hasUnreadDM && (
            <User className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.9))' }} />
          )}
        </div>
      </div>

      {/* Chat Panel — sits between TopHUD (110px) and chat strip (32px above BottomNav 64px = bottom 96px) */}
      {open && (
        <div
          className="fixed left-0 right-0 z-[45] flex flex-col bg-[#060a12] border-t border-slate-800 shadow-2xl"
          style={{ top: '110px', bottom: '96px' }}
        >
          {/* Tabs + Close */}
          <div className="flex items-center gap-1 bg-[#0a0f1a] border-b border-slate-800 px-3 py-2 shrink-0">
            <button
              onPointerDown={() => { setChatTab("alliance"); setActiveDmThread(null); setHasUnreadAlliance(false); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${chatTab === "alliance" ? "bg-amber-600 text-black" : "text-slate-400 hover:text-white"}`}
            >
              💬 Alliance
            </button>
            <button
              onPointerDown={() => {
                if (chatTab === "dm" && activeDmThread) {
                  setActiveDmThread(null);
                  setDmMessages([]);
                }
                setChatTab("dm");
                setHasUnreadDM(false);
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${chatTab === "dm" ? "bg-amber-600 text-black" : "text-slate-400 hover:text-white"}`}
            >
              ✉️ DMs
            </button>
            <button
              onPointerDown={() => { setOpen(false); navigate(createPageUrl("AlliancePage")); }}
              className="px-2 py-1 rounded-md text-[9px] font-bold text-amber-500 hover:text-amber-400 border border-amber-900/50 hover:border-amber-700 transition-colors whitespace-nowrap"
            >
              TO ALLIANCE PAGE →
            </button>
            <button
              onPointerDown={closeChat}
              className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Close chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ALLIANCE CHAT */}
          {chatTab === "alliance" && (
            !myAlliance ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="text-3xl">🤝</div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Join an Alliance to chat</div>
                <Button
                  onPointerDown={() => { setOpen(false); navigate(createPageUrl("AlliancePage")); }}
                  className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
                >
                  BROWSE ALLIANCES
                </Button>
              </div>
            ) : (
              <>
                <div className="px-3 py-1 shrink-0 text-[10px] text-amber-700/70 uppercase tracking-widest border-b border-slate-900">
                  {myAlliance.name} [{myAlliance.tag}]
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
                  {allianceMessages.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-8">No messages yet. Say hello! 👋</div>
                  )}
                  {allianceMessages.map(msg => {
                    const liveLevel = members.find(m => m.user_id === msg.user_id)?.level || msg.level;
                    const isMine = msg.user_id === currentUser?.id;
                    return (
                      <ChatMessage
                        key={msg.id}
                        msg={{ ...msg, liveLevel }}
                        isMine={isMine}
                        onRecall={isMine && msg.id && !msg.id.startsWith('tmp_') ? () => handleRecallMessage(msg.id) : null}
                        onAvatarClick={(m) => {
                          if (m.user_id !== currentUser?.id) {
                            const memberObj = members.find(mem => mem.user_id === m.user_id) || m;
                            setViewingMember({ ...memberObj, level: memberObj.level || m.liveLevel || m.level || 1 });
                          }
                        }}
                      />
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="px-3 py-2 border-t border-slate-800 flex gap-2 shrink-0">
                  <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message your alliance..."
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                    maxLength={200}
                  />
                  <Button onPointerDown={handleSendAlliance} disabled={sending || !text.trim()} className="bg-amber-600 hover:bg-amber-500 text-black px-3 h-9 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )
          )}

          {/* DMs */}
          {chatTab === "dm" && (
            !activeDmThread ? (
              <div className="flex-1 flex flex-col">
                {/* List of DM-able members */}
                {!myAlliance ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                    <div className="text-3xl">✉️</div>
                    <div className="text-sm text-slate-500">Join an Alliance to DM members</div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-3 py-2">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Alliance Members</div>
                    {members.filter(m => m.user_id !== currentUser?.id).map(m => {
                      const hasUnread = !!unreadByMember[m.user_id];
                      return (
                        <button
                          key={m.id}
                          onPointerDown={() => {
                            setActiveDmThread(m);
                            setText("");
                            // Clear unread for this member
                            setUnreadByMember(prev => { const next = { ...prev }; delete next[m.user_id]; return next; });
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors mb-1 text-left"
                        >
                          <div className="w-9 h-9 rounded-lg border border-slate-700 overflow-hidden bg-slate-900 shrink-0">
                            {m.profile_image_url ? (
                              <img src={m.profile_image_url} alt={m.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg">👤</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold ${hasUnread ? 'text-white' : 'text-amber-400'}`}>{m.username}</div>
                            <div className="text-[10px] text-slate-500">Lv {m.level || 1} • <span className="capitalize">{m.role}</span></div>
                          </div>
                          <MessageCircle
                            className="w-4 h-4 shrink-0"
                            style={hasUnread ? {
                              color: '#f97316',
                              fill: '#f97316',
                              animation: 'dmUnreadBlink 0.8s ease-in-out infinite alternate',
                              filter: 'drop-shadow(0 0 5px rgba(249,115,22,0.9))',
                            } : { color: '#475569' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* DM thread header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-[#0a0f1a] shrink-0">
                  <button onPointerDown={() => { setActiveDmThread(null); setDmMessages([]); }} className="text-xs text-slate-400 hover:text-white">← Back</button>
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                    {activeDmThread.profile_image_url ? (
                      <img src={activeDmThread.profile_image_url} alt={activeDmThread.username} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-slate-600">👤</div>}
                  </div>
                  <span className="text-xs font-bold text-amber-400">{activeDmThread.username}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">Lv {activeDmThread.level || 1}</span>
                  <button
                    onPointerDown={handleClearDMs}
                    className="ml-2 p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                    title="Clear DM history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
                  {dmMessages.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-8">Start the conversation!</div>
                  )}
                  {dmMessages.map(msg => {
                    const isMine = msg.from_user_id === currentUser?.id;
                    const liveLevel = isMine
                      ? (members.find(m => m.user_id === currentUser?.id)?.level || 1)
                      : (members.find(m => m.user_id === activeDmThread?.user_id)?.level || activeDmThread?.level || 1);
                    const dmMsg = {
                      user_id: msg.from_user_id,
                      username: msg.from_username,
                      profile_image_url: msg.from_profile_image_url,
                      level: liveLevel,
                      liveLevel,
                      message: msg.message,
                      timestamp: msg.timestamp,
                      role: "member",
                    };
                    return <ChatMessage key={msg.id} msg={dmMsg} isMine={isMine} />;
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="px-3 py-2 border-t border-slate-800 flex gap-2 shrink-0">
                  <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeDmThread.username}...`}
                    className="bg-slate-900 border-slate-700 text-white text-sm h-9"
                    maxLength={200}
                  />
                  <Button onPointerDown={handleSendDM} disabled={sending || !text.trim()} className="bg-amber-600 hover:bg-amber-500 text-black px-3 h-9 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Member profile modal — full profile view */}
      {viewingMember && (
        <AllianceMemberProfileModal
          member={viewingMember}
          open={!!viewingMember}
          onClose={() => setViewingMember(null)}
          onDM={(m) => { setActiveDmThread(m); setChatTab("dm"); setDmMessages([]); setViewingMember(null); }}
          currentUserId={currentUser?.id}
          isOwnAlliance={true}
        />
      )}
    </>
  );
}

// Chat message row styled like the reference image
function ChatMessage({ msg, isMine, onAvatarClick, onRecall }) {
  const [confirmRecall, setConfirmRecall] = useState(false);

  return (
    <div className="flex gap-2 items-start group">
      {/* Avatar — left side always */}
      <button
        onPointerDown={() => onAvatarClick?.(msg)}
        className="w-10 h-10 rounded-lg border border-amber-900/50 overflow-hidden bg-slate-900 shrink-0 mt-0.5"
        style={onAvatarClick ? { cursor: 'pointer' } : { cursor: 'default' }}
      >
        {msg.profile_image_url ? (
          <img src={msg.profile_image_url} alt={msg.username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg">👤</div>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: Lv + username LEFT, time RIGHT */}
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[11px] font-bold ${isMine ? "text-emerald-400" : (ROLE_COLORS[msg.role] || "text-amber-300")}`}>
            (Lv.{msg.liveLevel || msg.level || 1}) {msg.username}
          </span>
          <span className="text-[10px] text-slate-400 ml-2 shrink-0">{formatTime(msg.timestamp)}</span>
        </div>
        {/* Message bubble + recall */}
        <div className="flex items-end gap-1.5">
          <div className={`inline-block px-3 py-1.5 rounded-lg text-sm leading-snug max-w-[85%] ${isMine ? "bg-emerald-900/40 text-emerald-100" : "bg-[#1a1208] text-amber-50 border border-amber-900/30"}`}>
            {msg.message}
          </div>
          {onRecall && !confirmRecall && (
            <button
              onPointerDown={() => setConfirmRecall(true)}
              className="opacity-0 group-hover:opacity-100 text-[9px] text-slate-600 hover:text-red-400 transition-all shrink-0 mb-0.5"
              title="Recall message"
            >
              ✕
            </button>
          )}
          {onRecall && confirmRecall && (
            <div className="flex items-center gap-1 shrink-0 mb-0.5">
              <span className="text-[9px] text-slate-500">Delete?</span>
              <button onPointerDown={onRecall} className="text-[9px] text-red-400 font-bold hover:text-red-300">Yes</button>
              <button onPointerDown={() => setConfirmRecall(false)} className="text-[9px] text-slate-500 hover:text-slate-300">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}