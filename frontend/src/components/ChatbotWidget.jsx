import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_EMOJI } from './MapView';

// ── Role-aware placeholder text ───────────────────────────────────────────────
const PLACEHOLDERS = {
  citizen:     'Ask for safety advice or nearest shelter…',
  volunteer:   'Ask for safety guidance…',
  ngo:         'Ask for safety guidance…',
  eoc:         'Search incidents: "critical floods" or "unresolved fires"…',
  admin:       'Search incidents or ask for a situation summary…',
  rescue_team: 'Search active incidents by type or area…',
  hospital:    'Ask about nearby shelters or resource info…',
  shelter:     'Ask about nearby shelters or resource info…',
};

const WELCOME = {
  citizen:     'Hi! I can give you safety advice and find nearby shelters. How can I help?',
  volunteer:   'Hi! Ask me about safety guidance or active incidents in your area.',
  ngo:         'Hi! Ask me about active incidents or safety information.',
  eoc:         'EOC Assistant ready. Search incidents by type, severity, or status.',
  admin:       'Admin Assistant ready. Ask about active incidents or situation summaries.',
  rescue_team: 'Field Assistant ready. Search active incidents by category or area.',
  hospital:    'Hi! Ask me about nearby shelters, capacity, or current alerts.',
  shelter:     'Hi! Ask me about nearby facilities or active alerts.',
};

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs shrink-0 mr-2 mt-0.5">
          🤖
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-red-600 text-white rounded-br-sm'
            : 'bg-navy-700 text-slate-200 border border-slate-600/50 rounded-bl-sm'
        }`}
      >
        {msg.text}

        {/* EOC incident search results */}
        {msg.incidents?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {msg.incidents.slice(0, 5).map((inc) => (
              <li
                key={inc._id}
                className="flex items-center gap-1.5 text-xs text-slate-300 bg-navy-800/60 rounded-lg px-2 py-1"
              >
                <span>{CATEGORY_EMOJI[inc.category] ?? '⚠️'}</span>
                <span className="truncate flex-1">{inc.title}</span>
                <span className="text-slate-500 capitalize shrink-0">{inc.severity}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Nearest shelter card */}
        {msg.nearestShelter && (
          <div className="mt-2 p-2 rounded-lg bg-navy-800/60 border border-slate-600/40 text-xs">
            <p className="text-emerald-400 font-semibold">🏠 {msg.nearestShelter.name}</p>
            <p className="text-slate-400">{msg.nearestShelter.distanceKm} km away</p>
            {msg.nearestShelter.address && (
              <p className="text-slate-500">{msg.nearestShelter.address}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-2">
      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs shrink-0">
        🤖
      </div>
      <div className="bg-navy-700 border border-slate-600/50 rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChatbotWidget() {
  const { user } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [location,  setLocation]  = useState(null); // { lat, lng } from browser
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Build welcome message once when widget first opens
  useEffect(() => {
    if (open && messages.length === 0 && user) {
      setMessages([{
        id:   Date.now(),
        role: 'bot',
        text: WELCOME[user.role] ?? 'Hi! How can I help you?',
      }]);
    }
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Silently grab location for citizen-mode nearest-shelter queries
  useEffect(() => {
    if (user && ['citizen', 'volunteer', 'ngo'].includes(user.role)) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silent — location is optional
      );
    }
  }, [user]);

  if (!user) return null;

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const payload = { message: trimmed };
      if (location) { payload.lng = location.lng; payload.lat = location.lat; }

      const { data } = await api.post('/ai/chat', payload);

      setMessages((m) => [
        ...m,
        {
          id:             Date.now() + 1,
          role:           'bot',
          text:           data.reply,
          incidents:      data.incidents,
          nearestShelter: data.nearestShelter,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id:   Date.now() + 1,
          role: 'bot',
          text: err.response?.data?.message || 'Something went wrong — please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Expanded chat panel ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-[2000] w-[360px] max-w-[calc(100vw-2rem)]
                     flex flex-col rounded-2xl shadow-panel border border-slate-700/60 bg-navy-900
                     overflow-hidden"
          style={{ height: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-navy-800 border-b border-slate-700/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-semibold text-slate-100">ReliefHub Assistant</p>
                <p className="text-[10px] text-slate-500 capitalize">{user.role.replace('_', ' ')} mode</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {messages.map((msg) => (
              <Bubble key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-700/50 shrink-0 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDERS[user.role] ?? 'Ask something…'}
              className="input flex-1 py-2 text-sm"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm
                         font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ── FAB toggle button ──────────────────────────────────────────────── */}
      {/* Positioned at bottom-4 right-4, above the citizen Report button (bottom-24) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          fixed bottom-4 right-4 z-[2000]
          w-14 h-14 rounded-full shadow-glow
          flex items-center justify-center text-2xl
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-navy-950
          ${open
            ? 'bg-navy-700 border border-slate-600 rotate-0 scale-95'
            : 'bg-red-600 hover:bg-red-500 hover:scale-105'}
        `}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? '✕' : '🤖'}
      </button>
    </>
  );
}
