import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiSend,
  FiArrowLeft,
  FiDownload,
  FiFileText,
  FiSearch,
  FiMessageSquare,
  FiCheck,
  FiCheckCircle,
  FiHome,
  FiClock,
  FiUser,
  FiBell,
  FiBellOff,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/propertyPricing';

export default function ChatInbox() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(null); // 'txt' | 'pdf' | null
  const [errorMsg, setErrorMsg] = useState('');

  // Audio & Browser Notification settings
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('rentease_chat_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Synthesized notification chime (Web Audio API - no external assets needed)
  const playNotificationChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // AudioContext might be blocked until user gesture, safely ignore
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rentease_chat_sound', String(next));
      } catch {}
      if (next) playNotificationChime();
      return next;
    });
  };

  const toggleBrowserNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      setBrowserNotifEnabled((prev) => !prev);
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notifications are blocked by your browser settings. Please permit notifications in your browser address bar.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserNotifEnabled(true);
        new Notification('Rent Ease Notifications Enabled', {
          body: 'You will receive alerts when a new negotiation message arrives.',
        });
      } else {
        setBrowserNotifEnabled(false);
      }
    } catch (err) {
      console.error('Notification permission error:', err);
    }
  };

  // 1. Fetch user's conversations
  const fetchConversations = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingConversations(true);
    try {
      const res = await api.get('/chat/conversations');
      if (res.data?.success) {
        const list = res.data.conversations || [];
        setConversations(list);
        return list;
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      if (isInitial) setErrorMsg('Unable to load conversations. Please check your connection.');
    } finally {
      if (isInitial) setLoadingConversations(false);
    }
    return [];
  }, []);

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (convId, isInitial = false) => {
      if (!convId) return;
      if (isInitial) setLoadingMessages(true);
      try {
        const res = await api.get(`/chat/conversations/${convId}/messages`);
        if (res.data?.success) {
          const newMsgs = res.data.messages || [];
          setMessages(newMsgs);

          const currentUserId = String(user?.id || user?._id || '');

          if (isInitial) {
            seenMessageIdsRef.current = new Set(newMsgs.map((m) => String(m._id || m.createdAt)));
            setTimeout(() => scrollToBottom(false), 80);
          } else {
            // Find newly arrived messages from other participant
            const incoming = newMsgs.filter(
              (m) =>
                !seenMessageIdsRef.current.has(String(m._id || m.createdAt)) &&
                String(m.senderId?._id || m.senderId) !== currentUserId
            );

            if (incoming.length > 0) {
              if (soundEnabled) playNotificationChime();
              if (browserNotifEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const latest = incoming[incoming.length - 1];
                new Notification(`Rent Ease: New message from ${latest.senderName}`, {
                  body: latest.content.slice(0, 100),
                });
              }
            }

            // Update seen set
            newMsgs.forEach((m) => seenMessageIdsRef.current.add(String(m._id || m.createdAt)));
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        if (isInitial) setLoadingMessages(false);
      }
    },
    [user, soundEnabled, browserNotifEnabled, playNotificationChime]
  );

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchConversations(true);
      if (!mounted) return;

      if (conversationId) {
        const target = list.find((c) => String(c._id) === String(conversationId));
        if (target) {
          setSelectedConv(target);
          fetchMessages(target._id, true);
        } else {
          // Attempt direct fetch if not in top list
          try {
            const single = await api.get(`/chat/conversations/${conversationId}`);
            if (single.data?.success && mounted) {
              setSelectedConv(single.data.conversation);
              fetchMessages(conversationId, true);
            }
          } catch (e) {
            console.error('Direct conversation lookup failed:', e);
          }
        }
      } else if (list.length > 0 && window.innerWidth >= 768) {
        // Desktop default to first conversation
        setSelectedConv(list[0]);
        fetchMessages(list[0]._id, true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [conversationId, fetchConversations, fetchMessages]);

  // Polling for live updates (paused when document tab is hidden)
  useEffect(() => {
    if (!selectedConv?._id) return;

    const interval = setInterval(() => {
      if (document.hidden) return; // Pause polling when tab is hidden
      fetchMessages(selectedConv._id, false);
      fetchConversations(false);
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedConv?._id, fetchMessages, fetchConversations]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  // Handle select conversation
  const handleSelectConversation = (conv) => {
    setSelectedConv(conv);
    navigate(`/messages/${conv._id}`, { replace: true });
    fetchMessages(conv._id, true);
    setErrorMsg('');
  };

  // Handle sending a message with send-lock and duplicate prevention
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const content = inputText.trim();
    if (!content || !selectedConv?._id || sending) return;

    if (content.length > 2000) {
      alert('Message cannot exceed 2000 characters.');
      return;
    }

    setSending(true);
    setInputText('');
    setErrorMsg('');

    const currentUserId = user?.id || user?._id;
    const isTenant = user?.role === 'tenant' || String(currentUserId) === String(selectedConv.tenantId?._id);

    // Optimistic UI message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      conversationId: selectedConv._id,
      senderId: currentUserId,
      senderRole: isTenant ? 'tenant' : 'landlord',
      senderName: user?.name || (isTenant ? 'Tenant' : 'Landlord'),
      content,
      read: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    seenMessageIdsRef.current.add(tempId);
    setTimeout(() => scrollToBottom(true), 40);

    try {
      const res = await api.post(`/chat/conversations/${selectedConv._id}/messages`, {
        content,
      });

      if (res.data?.success && res.data.message) {
        const persisted = res.data.message;
        seenMessageIdsRef.current.add(String(persisted._id));
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? persisted : m))
        );
        fetchConversations(false);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInputText(content);
      setErrorMsg('Message delivery failed. Please check your network and try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle transcript export
  const handleExport = async (format) => {
    if (!selectedConv?._id || exporting) return;
    setExporting(format);

    try {
      const res = await api.get(
        `/chat/conversations/${selectedConv._id}/export?format=${format}`,
        { responseType: 'blob' }
      );

      const mimeType = format === 'pdf' ? 'application/pdf' : 'text/plain;charset=utf-8';
      const blob = new Blob([res.data], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeTitle = (selectedConv.propertyId?.title || 'Negotiation').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      a.download = `RentEase_Negotiation_${safeTitle}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export download failed:', err);
      alert(`Failed to download ${format.toUpperCase()} transcript. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const propTitle = c.propertyId?.title?.toLowerCase() || '';
      const otherUser =
        user?.role === 'landlord' ? c.tenantId?.name?.toLowerCase() : c.landlordId?.name?.toLowerCase();
      const lastMsg = c.lastMessage?.text?.toLowerCase() || '';
      return propTitle.includes(q) || (otherUser && otherUser.includes(q)) || lastMsg.includes(q);
    });
  }, [conversations, searchQuery, user?.role]);

  // Determine other participant for selected conversation
  const otherParty = useMemo(() => {
    if (!selectedConv || !user) return null;
    const isTenant = user.role === 'tenant' || String(user.id || user._id) === String(selectedConv.tenantId?._id);
    return isTenant
      ? { ...selectedConv.landlordId, roleTitle: 'Landlord / Property Owner' }
      : { ...selectedConv.tenantId, roleTitle: 'Prospective Tenant' };
  }, [selectedConv, user]);

  return (
    <div className="section py-6">
      {/* Page Title & Breadcrumb */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Property Negotiation Messages</h1>
          <p className="text-xs text-ink/60 dark:text-slate-400">
            Real-time, persistent negotiations between verified tenants and property owners
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="btn-ghost !py-1.5 !px-3 self-start text-xs flex items-center gap-1.5"
        >
          <FiArrowLeft /> Back
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* Main Chat Container */}
      <div className="card grid h-[78vh] min-h-[550px] overflow-hidden p-0 md:grid-cols-12">
        {/* LEFT COLUMN: INBOX & CONVERSATION LIST */}
        <div
          className={`flex flex-col border-r border-surface-border/20 dark:border-slate-800 md:col-span-5 lg:col-span-4 ${
            selectedConv && 'hidden md:flex'
          }`}
        >
          {/* Search Bar */}
          <div className="border-b border-surface-border/20 p-3.5 dark:border-slate-800">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm" />
              <input
                type="text"
                placeholder="Search properties or participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input !py-1.5 !pl-9 text-xs"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-border/10 dark:divide-slate-800/60">
            {loadingConversations ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-xs text-ink/50 dark:text-slate-400">Loading inbox...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink/50 dark:text-slate-400">
                <FiMessageSquare className="mx-auto mb-2 text-3xl opacity-40" />
                <p className="font-semibold text-ink/70 dark:text-slate-300">No conversations yet</p>
                <p className="mt-1">
                  Start a negotiation on any verified property listing using the "Chat & Negotiate" button.
                </p>
                <Link to="/search" className="btn-primary mt-4 !py-1.5 !px-3 inline-block">
                  Browse Properties
                </Link>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedConv?._id === c._id;
                const isTenant = user?.role === 'tenant' || String(user?.id || user?._id) === String(c.tenantId?._id);
                const participant = isTenant ? c.landlordId : c.tenantId;
                const unreadCount = isTenant ? c.unreadTenantCount : c.unreadLandlordCount;

                return (
                  <button
                    key={c._id}
                    onClick={() => handleSelectConversation(c)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary'
                        : 'hover:bg-surface/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Property / User Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-sm">
                        {participant?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Metadata & Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-semibold text-ink dark:text-white">
                          {participant?.name || 'User'}
                        </p>
                        {c.lastMessage?.createdAt && (
                          <span className="shrink-0 text-[10px] text-ink/40">
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs font-medium text-primary/90 mt-0.5">
                        {c.propertyId?.title || 'Property'}
                      </p>

                      <p className="truncate text-xs text-ink/50 dark:text-slate-400 mt-1">
                        {c.lastMessage?.text ? (
                          c.lastMessage.text
                        ) : (
                          <span className="italic opacity-60">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT VIEW */}
        <div
          className={`flex flex-col bg-surface/40 dark:bg-slate-900/40 md:col-span-7 lg:col-span-8 ${
            !selectedConv && 'hidden md:flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/20 p-3.5 dark:border-slate-800 bg-surface/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  {/* Mobile Back to List Button */}
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="btn-ghost !p-1.5 md:hidden text-ink/70"
                    title="Back to inbox"
                  >
                    <FiArrowLeft size={18} />
                  </button>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-sm">
                    {otherParty?.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold leading-tight text-ink dark:text-white flex items-center gap-2">
                      {otherParty?.name || 'Participant'}
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-normal text-ink/60 dark:bg-slate-800 dark:text-slate-400">
                        {otherParty?.roleTitle || 'Verified User'}
                      </span>
                    </h3>
                    <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                      <FiHome className="text-[11px]" />
                      <Link
                        to={`/property/${selectedConv.propertyId?._id || selectedConv.propertyId?.id || selectedConv.propertyId}`}
                        className="hover:underline truncate max-w-[200px] sm:max-w-xs inline-block align-bottom"
                      >
                        {selectedConv.propertyId?.title || 'View Property'}
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Right Action Buttons: Sound, Desktop Alert, TXT, PDF */}
                <div className="flex items-center gap-1.5">
                  {/* Sound Toggle */}
                  <button
                    onClick={toggleSound}
                    className={`btn-ghost !p-1.5 text-xs flex items-center gap-1 border border-surface-border/30 ${
                      soundEnabled ? 'text-primary' : 'text-ink/40'
                    }`}
                    title={soundEnabled ? 'Sound alerts enabled (click to mute)' : 'Sound alerts muted (click to unmute)'}
                  >
                    {soundEnabled ? <FiVolume2 size={15} /> : <FiVolumeX size={15} />}
                  </button>

                  {/* Browser Notification Toggle */}
                  <button
                    onClick={toggleBrowserNotif}
                    className={`btn-ghost !p-1.5 text-xs flex items-center gap-1 border border-surface-border/30 ${
                      browserNotifEnabled ? 'text-emerald-500' : 'text-ink/40'
                    }`}
                    title={
                      browserNotifEnabled
                        ? 'Desktop notifications active'
                        : 'Enable desktop notifications'
                    }
                  >
                    {browserNotifEnabled ? <FiBell size={15} /> : <FiBellOff size={15} />}
                  </button>

                  {/* Export TXT */}
                  <button
                    onClick={() => handleExport('txt')}
                    disabled={exporting !== null}
                    className="btn-ghost !py-1 !px-2 text-xs flex items-center gap-1 text-ink/70 dark:text-slate-300 border border-surface-border/40 hover:border-primary"
                    title="Download chat history as text file"
                  >
                    <FiDownload className="text-xs" />
                    <span>{exporting === 'txt' ? 'TXT...' : 'TXT'}</span>
                  </button>

                  {/* Export PDF */}
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting !== null}
                    className="btn-ghost !py-1 !px-2 text-xs flex items-center gap-1 text-ink/70 dark:text-slate-300 border border-surface-border/40 hover:border-primary"
                    title="Download chat history as signed PDF transcript"
                  >
                    <FiFileText className="text-xs text-amber-500" />
                    <span>{exporting === 'pdf' ? 'PDF...' : 'PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Message History Bubble Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Security & Disclaimer Notice */}
                <div className="mx-auto max-w-md rounded-xl border border-surface-border/30 bg-surface/50 p-2 text-center text-[11px] text-ink/50 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <FiClock className="inline mr-1 -mt-0.5" />
                  Messages in this conversation are persistent and recorded for negotiation transparency.
                </div>

                {loadingMessages ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="mx-auto my-auto max-w-sm rounded-2xl border border-surface-border/40 bg-surface/50 p-6 text-center backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FiMessageSquare size={24} />
                    </div>
                    <h4 className="font-display text-sm font-semibold text-ink dark:text-white">
                      No messages in this negotiation yet
                    </h4>
                    <p className="mt-1 text-xs text-ink/60 dark:text-slate-400">
                      Send an inquiry, schedule a property visit, or submit a custom rental offer using the input below.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const currentUserIdStr = String(user?.id || user?._id || '');
                    const senderIdStr = String(m.senderId?._id || m.senderId || '');
                    const isMyMessage = Boolean(currentUserIdStr && senderIdStr && currentUserIdStr === senderIdStr);
                    const isTenantMessage = m.senderRole === 'tenant';

                    const timeStr = m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={m._id || m.createdAt}
                        className={`flex w-full flex-col ${
                          isTenantMessage ? 'items-end self-end' : 'items-start self-start'
                        }`}
                      >
                        {/* Bubble Container: Tenant on Right (Blue/Indigo), Landlord on Left (Midnight Navy & Amber) */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md transition-all ${
                            isTenantMessage
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border border-blue-400/20'
                              : 'bg-gradient-to-r from-amber-800 via-amber-900 to-stone-900 text-amber-50 rounded-tl-none border border-amber-600/30'
                          }`}
                        >
                          {/* Sender Identity Header */}
                          <div className="mb-1 flex items-center justify-between gap-2 border-b border-white/10 pb-0.5">
                            <span
                              className={`text-[11px] font-bold ${
                                isTenantMessage ? 'text-blue-100' : 'text-amber-200'
                              }`}
                            >
                              {isTenantMessage
                                ? (isMyMessage ? 'You (Tenant)' : `${m.senderName} (Tenant)`)
                                : (isMyMessage ? 'You (Landlord)' : `${m.senderName} (Landlord / Owner)`)}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
                                isTenantMessage
                                  ? 'bg-blue-950/70 text-blue-200'
                                  : 'bg-stone-950/80 text-amber-300'
                              }`}
                            >
                              {isTenantMessage ? 'Tenant' : 'Landlord'}
                            </span>
                          </div>

                          {/* Message Body */}
                          <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                            {m.content}
                          </p>

                          {/* Footer: Time & Sent/Read Receipts */}
                          <div
                            className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                              isTenantMessage ? 'text-blue-200/80' : 'text-amber-200/70'
                            }`}
                          >
                            <span>{timeStr}</span>
                            {isMyMessage && (
                              <span className="flex items-center gap-0.5">
                                {m.isOptimistic ? (
                                  <span className="opacity-60 italic">Sending...</span>
                                ) : m.read ? (
                                  <span className="flex items-center gap-0.5 text-emerald-300 font-medium" title="Read by recipient">
                                    <FiCheckCircle className="inline text-xs" /> Read
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 opacity-80" title="Delivered to conversation">
                                    <FiCheck className="inline text-xs" /> Sent
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form with Send Lock */}
              <div className="border-t border-surface-border/20 p-3 dark:border-slate-800 bg-surface/60 dark:bg-slate-900/60 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type your negotiation message or offer... (Enter to send)"
                      value={inputText}
                      maxLength={2000}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={sending}
                      className="input !py-2.5 !pr-14 text-sm disabled:opacity-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink/30">
                      {inputText.length}/2000
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="btn-primary !p-2.5 rounded-xl shadow-md disabled:opacity-40"
                    title="Send message"
                  >
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <FiSend size={16} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State: No conversation selected */
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-ink/40">
              <FiMessageSquare className="mb-3 text-5xl opacity-30 text-primary" />
              <h3 className="font-display text-lg font-semibold text-ink/70 dark:text-slate-300">
                Select a negotiation to view messages
              </h3>
              <p className="mt-1 max-w-sm text-xs text-ink/50 dark:text-slate-400">
                Pick a conversation from the left inbox or visit any listing and click "Chat & Negotiate" with the landlord.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
