import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { create } from "zustand";
import "./index.css";

const SERVER = "http://localhost:5000";
const API = axios.create({ baseURL: `${SERVER}/api` });

// ============= STORE =============
const useAuthStore = create((set) => ({
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  login: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },
  updateUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ============= HELPERS =============
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "hozirgina";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} daq`;
  if (diff < 86400000) return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Bugun";
  if (d.toDateString() === yesterday.toDateString()) return "Kecha";
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" });
}

const AVATARS = ["👋","🤟","✌️","🖐️","👏","🙌","🎯","🚀","⚡","🔥","🌟","🦋","🎭","🎨","🎮","🦊","🐯","🦁","🐺","🦅"];

// ============= SPLASH =============
function Splash({ onReady }) {
  useEffect(() => { setTimeout(onReady, 1400); }, []);
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl mb-4 animate-bounce">🤟</div>
        <h1 className="text-4xl font-bold text-white mb-2">SignSpeak</h1>
        <p className="text-brand-green text-sm">Real-time chat</p>
        <div className="mt-6 flex justify-center gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= LOGIN/REGISTER =============
function LoginRegister() {
  const [tab, setTab] = useState("login");
  const [formData, setFormData] = useState({ name: "", username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const endpoint = tab === "login" ? "/login" : "/register";
      const { data } = await API.post(endpoint, formData);
      API.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      login(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🤟</div>
          <h1 className="text-3xl font-bold text-white mb-1">SignSpeak</h1>
          <p className="text-gray-500 text-sm">Talabalar uchun real-time chat</p>
        </div>

        <div className="bg-dark-card rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-1 mb-6 bg-dark-bg rounded-xl p-1">
            {["login","register"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t ? "bg-brand-green text-black shadow" : "text-gray-400 hover:text-white"}`}>
                {t === "login" ? "Kirish" : "Ro'yxat"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "register" && (
              <>
                <input type="text" placeholder="Ism va familiya" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green outline-none transition" />
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">@</span>
                  <input type="text" placeholder="username" value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")})}
                    className="w-full bg-dark-bg border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:border-brand-green outline-none transition" />
                </div>
              </>
            )}
            <input type="email" placeholder="Email" value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-green outline-none transition" />
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="Parol" value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:border-brand-green outline-none transition" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-3 text-gray-400 hover:text-brand-green text-lg">
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-green text-black font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition text-sm">
              {loading ? "⏳ Kutilmoqda..." : tab === "login" ? "🔑 Kirish" : "✅ Ro'yxatdan o'tish"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============= MAIN APP =============
function ChatApp() {
  const { user, logout, updateUser } = useAuthStore();
  const [view, setView] = useState("chats"); // chats | groups | profile
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active chat
  const [activeChat, setActiveChat] = useState(null); // { type: 'user'|'group', data: {...} }
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  // Group creation
  const [groupForm, setGroupForm] = useState({ name: "", description: "", avatar: "👥", memberIds: [] });

  // Profile edit
  const [profileEdit, setProfileEdit] = useState({ name: "", username: "", bio: "", avatar: "" });

  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingRef = useRef(null);

  const addToast = useCallback((type, txt) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, txt }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  // Init socket
  useEffect(() => {
    if (!user) return;
    API.defaults.headers.common["Authorization"] = `Bearer ${localStorage.getItem("token")}`;

    socketRef.current = io(SERVER, { transports: ["websocket", "polling"] });
    socketRef.current.emit("user:login", user.id);

    socketRef.current.on("message:new", (msg) => {
      setUsers(prev => prev.map(u => {
        if (u.id === msg.senderId._id) {
          return { ...u, lastMessage: msg.text, lastMessageTime: msg.createdAt, unreadCount: (u.unreadCount || 0) + 1 };
        }
        return u;
      }));
      setActiveChat(current => {
        if (current?.type === "user" && current.data.id === msg.senderId._id) {
          setMessages(p => [...p, msg]);
          socketRef.current?.emit("messages:read", { userId: user.id, senderId: msg.senderId._id });
          return current;
        }
        addToast("msg", `💬 ${msg.senderId.name}: ${msg.text.slice(0, 40)}`);
        return current;
      });
    });

    socketRef.current.on("message:sent", (msg) => {
      setMessages(p => {
        // Avoid duplicate
        if (p.find(m => m._id === msg._id)) return p;
        return [...p, msg];
      });
      setUsers(prev => prev.map(u => {
        if (u.id === msg.receiverId) {
          return { ...u, lastMessage: msg.text, lastMessageTime: msg.createdAt };
        }
        return u;
      }));
    });

    socketRef.current.on("group:message:new", (msg) => {
      setGroups(prev => prev.map(g => {
        if (g.id === msg.groupId) {
          return { ...g, lastMessage: msg.text, lastMessageTime: msg.createdAt, lastMessageSender: msg.senderId.name };
        }
        return g;
      }));
      setActiveChat(current => {
        if (current?.type === "group" && current.data.id === msg.groupId) {
          setMessages(p => {
            if (p.find(m => m._id === msg._id)) return p;
            return [...p, msg];
          });
          return current;
        }
        addToast("msg", `👥 ${msg.senderId.name}: ${msg.text.slice(0, 40)}`);
        return current;
      });
    });

    socketRef.current.on("user:status", ({ userId, online }) => {
      setUsers(prev => prev.map(u => u.id == userId ? { ...u, online } : u));
    });

    socketRef.current.on("typing:active", ({ userId }) => {
      setTypingUsers(p => ({ ...p, [userId]: true }));
    });
    socketRef.current.on("typing:inactive", ({ userId }) => {
      setTypingUsers(p => { const n = {...p}; delete n[userId]; return n; });
    });
    socketRef.current.on("group:typing:active", ({ userId, groupId }) => {
      setTypingUsers(p => ({ ...p, [`g${groupId}_${userId}`]: true }));
    });
    socketRef.current.on("group:typing:inactive", ({ userId, groupId }) => {
      setTypingUsers(p => { const n = {...p}; delete n[`g${groupId}_${userId}`]; return n; });
    });
    socketRef.current.on("messages:read:ack", () => {
      setMessages(p => p.map(m => ({ ...m, read: 1 })));
    });

    loadUsers();
    loadGroups();

    return () => socketRef.current?.disconnect();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUsers = async () => {
    try {
      const { data } = await API.get("/users");
      setUsers(data);
    } catch (e) { console.error(e); }
  };

  const loadGroups = async () => {
    try {
      const { data } = await API.get("/groups");
      setGroups(data || []);
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    try {
      const { data } = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data);
    } catch (e) { setSearchResults([]); }
  };

  const openUserChat = async (u) => {
    setActiveChat({ type: "user", data: u });
    setShowChatInfo(false);
    setMessages([]);
    try {
      const { data } = await API.get(`/messages/${u.id}`);
      setMessages(data);
      setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, unreadCount: 0 } : usr));
      socketRef.current?.emit("messages:read", { userId: user.id, senderId: u.id });
    } catch (e) { console.error(e); }
  };

  const openGroupChat = async (g) => {
    setActiveChat({ type: "group", data: g });
    setShowChatInfo(false);
    setMessages([]);
    try {
      const { data } = await API.get(`/groups/${g.id}/messages`);
      setMessages(data);
    } catch (e) { console.error(e); }
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !activeChat) return;
    const text = msgInput.trim();
    setMsgInput("");

    if (activeChat.type === "user") {
      socketRef.current?.emit("message:send", {
        senderId: user.id, receiverId: activeChat.data.id, text
      });
      socketRef.current?.emit("typing:stop", { userId: user.id, receiverId: activeChat.data.id });
    } else {
      socketRef.current?.emit("group:message", {
        senderId: user.id, groupId: activeChat.data.id, text
      });
      socketRef.current?.emit("group:typing:stop", { userId: user.id, groupId: activeChat.data.id });
    }
  };

  const handleTyping = (e) => {
    setMsgInput(e.target.value);
    if (!activeChat) return;
    if (activeChat.type === "user") {
      socketRef.current?.emit("typing:start", { userId: user.id, receiverId: activeChat.data.id });
      clearTimeout(typingRef.current);
      typingRef.current = setTimeout(() => {
        socketRef.current?.emit("typing:stop", { userId: user.id, receiverId: activeChat.data.id });
      }, 1500);
    } else {
      socketRef.current?.emit("group:typing:start", { userId: user.id, groupId: activeChat.data.id });
      clearTimeout(typingRef.current);
      typingRef.current = setTimeout(() => {
        socketRef.current?.emit("group:typing:stop", { userId: user.id, groupId: activeChat.data.id });
      }, 1500);
    }
  };

  const createGroup = async () => {
    if (!groupForm.name.trim()) { addToast("error", "❌ Guruh nomi kerak"); return; }
    if (groupForm.memberIds.length === 0) { addToast("error", "❌ Kamida 1 a'zo tanlang"); return; }
    try {
      const { data } = await API.post("/groups", groupForm);
      setGroups(prev => [data, ...prev]);
      setShowGroupModal(false);
      setGroupForm({ name: "", description: "", avatar: "👥", memberIds: [] });
      addToast("success", "✅ Guruh yaratildi!");
      openGroupChat(data);
      setView("groups");
    } catch (e) {
      addToast("error", e.response?.data?.error || "❌ Xatolik");
    }
  };

  const saveProfile = async () => {
    try {
      const { data } = await API.put(`/users/${user.id}`, profileEdit);
      updateUser({ ...user, ...data });
      setShowProfileEdit(false);
      addToast("success", "✅ Profil yangilandi!");
    } catch (e) {
      addToast("error", e.response?.data?.error || "❌ Xatolik");
    }
  };

  const leaveGroup = async (groupId) => {
    if (!confirm("Guruhdan chiqmoqchimisiz?")) return;
    try {
      await API.delete(`/groups/${groupId}/leave`);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeChat?.data?.id === groupId) setActiveChat(null);
      addToast("success", "Guruhdan chiqdingiz");
    } catch (e) { addToast("error", "Xatolik"); }
  };

  // Typing indicator text
  const getTypingText = () => {
    if (!activeChat) return "";
    if (activeChat.type === "user") {
      return typingUsers[activeChat.data.id] ? "yozmoqda..." : "";
    } else {
      const typingInGroup = Object.keys(typingUsers)
        .filter(k => k.startsWith(`g${activeChat.data.id}_`))
        .map(k => {
          const uid = k.split("_")[1];
          const m = activeChat.data.members?.find(m => String(m.id) === uid);
          return m?.name || "";
        }).filter(Boolean);
      if (typingInGroup.length === 0) return "";
      if (typingInGroup.length === 1) return `${typingInGroup[0]} yozmoqda...`;
      return `${typingInGroup.length} kishi yozmoqda...`;
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  const displayList = searchQuery.trim() ? searchResults : (view === "chats" ? users : groups);

  return (
    <div className="flex h-screen bg-dark-bg text-white overflow-hidden">

      {/* ===== SIDEBAR ===== */}
      <div className={`${activeChat ? "hidden md:flex" : "flex"} w-full md:w-80 bg-dark-card flex-col border-r border-gray-800`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{user?.avatar}</span>
              <div>
                <p className="font-bold text-sm leading-none">{user?.name}</p>
                <p className="text-xs text-brand-green">@{user?.username || "..."}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setView("profile"); setActiveChat(null); }}
                className="w-8 h-8 rounded-full bg-dark-bg hover:bg-dark-card2 flex items-center justify-center text-sm">
                ⚙️
              </button>
              <button onClick={logout} className="w-8 h-8 rounded-full bg-dark-bg hover:bg-red-500/20 flex items-center justify-center text-sm">
                🚪
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-dark-bg rounded-xl p-1 mb-3">
            {[["chats","💬","Chatlar"],["groups","👥","Guruhlar"]].map(([v,ic,lb]) => (
              <button key={v} onClick={() => { setView(v); setSearchQuery(""); setSearchResults([]); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${view===v ? "bg-brand-green text-black" : "text-gray-400 hover:text-white"}`}>
                {ic} {lb}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">🔍</span>
            <input type="text" placeholder={view === "chats" ? "Qidirish: ism, @username, ID..." : "Guruh qidirish..."}
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full bg-dark-bg border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-green outline-none transition" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-2 text-gray-400 hover:text-white">✕</button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {view === "chats" && (
            <>
              {searchQuery ? (
                searchResults.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-2xl mb-2">🔍</p>
                    <p className="text-sm">Topilmadi</p>
                    <p className="text-xs text-gray-600 mt-1">@username yoki ID bilan qidiring</p>
                  </div>
                ) : searchResults.map(u => (
                  <UserItem key={u.id} u={u} active={activeChat?.data?.id === u.id} onClick={() => openUserChat(u)} />
                ))
              ) : (
                users.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-2xl mb-2">👥</p>
                    <p className="text-sm">Hali hech kim yo'q</p>
                    <p className="text-xs text-gray-600 mt-1">Yuqoridan qidiring</p>
                  </div>
                ) : users.map(u => (
                  <UserItem key={u.id} u={u} active={activeChat?.type==="user" && activeChat?.data?.id === u.id} onClick={() => openUserChat(u)} />
                ))
              )}
            </>
          )}

          {view === "groups" && !searchQuery && (
            <>
              <button onClick={() => setShowGroupModal(true)}
                className="w-full p-3 border-b border-gray-800 flex items-center gap-3 hover:bg-dark-card2 transition text-brand-green">
                <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-lg">➕</div>
                <span className="font-semibold text-sm">Yangi Guruh yaratish</span>
              </button>
              {groups.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-2xl mb-2">👥</p>
                  <p className="text-sm">Guruhlar yo'q</p>
                </div>
              ) : groups.map(g => (
                <GroupItem key={g.id} g={g} active={activeChat?.type==="group" && activeChat?.data?.id === g.id} onClick={() => openGroupChat(g)} currentUserId={user.id} />
              ))}
            </>
          )}

          {view === "profile" && (
            <ProfileView user={user}
              onEdit={() => { setProfileEdit({ name: user.name, username: user.username||"", bio: user.bio||"", avatar: user.avatar }); setShowProfileEdit(true); }}
              onLogout={logout} />
          )}
        </div>
      </div>

      {/* ===== CHAT AREA ===== */}
      <div className={`${activeChat ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-dark-card border-b border-gray-800 p-3 flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-400 hover:text-white mr-1">←</button>
              <button onClick={() => setShowChatInfo(!showChatInfo)} className="flex items-center gap-3 flex-1 text-left hover:bg-dark-card2 rounded-xl p-1 transition">
                <div className="relative">
                  <span className="text-3xl">{activeChat.type === "user" ? activeChat.data.avatar : activeChat.data.avatar}</span>
                  {activeChat.type === "user" && activeChat.data.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-card"></span>
                  )}
                </div>
                <div>
                  <p className="font-bold leading-none">{activeChat.type === "user" ? activeChat.data.name : activeChat.data.name}</p>
                  <p className="text-xs text-gray-400">
                    {getTypingText() || (activeChat.type === "user"
                      ? (activeChat.data.online ? "🟢 Online" : "⚫ Offline")
                      : `${activeChat.data.members?.length || 0} a'zo`)}
                  </p>
                </div>
              </button>
              {activeChat.type === "group" && (
                <button onClick={() => leaveGroup(activeChat.data.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10">Chiqish</button>
              )}
            </div>

            {/* Chat Info Panel */}
            {showChatInfo && (
              <div className="bg-dark-card2 border-b border-gray-800 p-4">
                {activeChat.type === "user" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{activeChat.data.avatar}</span>
                    <div>
                      <p className="font-bold">{activeChat.data.name}</p>
                      <p className="text-sm text-brand-green">@{activeChat.data.username || "—"}</p>
                      <p className="text-xs text-gray-500">ID: {activeChat.data.id}</p>
                      {activeChat.data.bio && <p className="text-xs text-gray-400 mt-1">{activeChat.data.bio}</p>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{activeChat.data.avatar}</span>
                      <div>
                        <p className="font-bold">{activeChat.data.name}</p>
                        {activeChat.data.description && <p className="text-xs text-gray-400">{activeChat.data.description}</p>}
                        <p className="text-xs text-gray-500">{activeChat.data.members?.length || 0} a'zo · ID: {activeChat.data.id}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeChat.data.members?.map(m => (
                        <div key={m.id} className="flex items-center gap-1 bg-dark-bg rounded-full px-2 py-1 text-xs">
                          <span>{m.avatar}</span>
                          <span>{m.name}</span>
                          {m.id === activeChat.data.admin && <span className="text-yellow-400">👑</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1"
              style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "20px 20px" }}>
              {Object.entries(groupedMessages).map(([date, dayMsgs]) => (
                <div key={date}>
                  <div className="flex justify-center my-3">
                    <span className="bg-dark-card2 text-gray-400 text-xs px-3 py-1 rounded-full">{date}</span>
                  </div>
                  {dayMsgs.map((msg, i) => {
                    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                    const isMe = senderId === user.id || senderId === String(user.id);
                    const prevMsg = dayMsgs[i - 1];
                    const prevSenderId = typeof prevMsg?.senderId === 'object' ? prevMsg.senderId._id : prevMsg?.senderId;
                    const sameAuthor = prevMsg && prevSenderId === senderId;
                    return (
                      <MessageBubble key={msg._id || i} msg={msg} isMe={isMe}
                        isGroup={activeChat.type === "group"} sameAuthor={sameAuthor} />
                    );
                  })}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <span className="text-5xl mb-3">{activeChat.type === "user" ? activeChat.data.avatar : "👥"}</span>
                  <p className="text-gray-500 text-sm">Hozircha xabarlar yo'q</p>
                  <p className="text-gray-600 text-xs mt-1">Birinchi xabar yozing 👋</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-dark-card border-t border-gray-800 p-3">
              <div className="flex gap-2 items-end">
                <input type="text" value={msgInput} onChange={handleTyping}
                  onKeyPress={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Xabar yozing..."
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-brand-green outline-none transition resize-none" />
                <button onClick={sendMessage}
                  disabled={!msgInput.trim()}
                  className="bg-brand-green text-black w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center opacity-40">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-400 font-semibold">Suhbat tanlang</p>
              <p className="text-gray-600 text-sm mt-1">Chap tarafdan foydalanuvchi tanlang</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== GROUP MODAL ===== */}
      {showGroupModal && (
        <Modal onClose={() => { setShowGroupModal(false); setGroupForm({ name:"", description:"", avatar:"👥", memberIds:[] }); }}>
          <h3 className="text-lg font-bold mb-4">👥 Yangi Guruh</h3>

          {/* Avatar */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Guruh belgisi</label>
            <div className="flex flex-wrap gap-2">
              {["👥","🎯","🚀","⚡","🔥","🌟","🎮","🎨","📚","💼"].map(a => (
                <button key={a} onClick={() => setGroupForm(p => ({...p, avatar: a}))}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition ${groupForm.avatar===a ? "bg-brand-green ring-2 ring-brand-green ring-offset-2 ring-offset-dark-card" : "bg-dark-bg hover:bg-dark-card2"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <input type="text" placeholder="Guruh nomi *" value={groupForm.name}
            onChange={e => setGroupForm(p => ({...p, name: e.target.value}))}
            className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-green outline-none mb-3" />

          <input type="text" placeholder="Tavsif (ixtiyoriy)" value={groupForm.description}
            onChange={e => setGroupForm(p => ({...p, description: e.target.value}))}
            className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-green outline-none mb-3" />

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">A'zolar tanlang ({groupForm.memberIds.length} tanlandi):</p>
            <div className="bg-dark-bg rounded-xl p-2 max-h-44 overflow-y-auto space-y-1">
              {users.length > 0 ? users.map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-card2 cursor-pointer">
                  <input type="checkbox" checked={groupForm.memberIds.includes(u.id)}
                    onChange={e => setGroupForm(p => ({
                      ...p, memberIds: e.target.checked ? [...p.memberIds, u.id] : p.memberIds.filter(id => id !== u.id)
                    }))}
                    className="w-4 h-4 accent-green-400" />
                  <span className="text-xl">{u.avatar}</span>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-gray-500">@{u.username || u.email}</p>
                  </div>
                </label>
              )) : <p className="text-gray-500 text-sm text-center py-2">Foydalanuvchilar yo'q</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={createGroup} className="flex-1 bg-brand-green text-black font-bold py-2.5 rounded-xl hover:opacity-90 text-sm">✅ Yaratish</button>
            <button onClick={() => setShowGroupModal(false)} className="flex-1 bg-dark-bg text-white py-2.5 rounded-xl hover:bg-dark-card2 text-sm">❌ Bekor</button>
          </div>
        </Modal>
      )}

      {/* ===== PROFILE EDIT MODAL ===== */}
      {showProfileEdit && (
        <Modal onClose={() => setShowProfileEdit(false)}>
          <h3 className="text-lg font-bold mb-4">✏️ Profilni tahrirlash</h3>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Avatar tanlang</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button key={a} onClick={() => setProfileEdit(p => ({...p, avatar: a}))}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition ${profileEdit.avatar===a ? "bg-brand-green ring-2 ring-brand-green ring-offset-2 ring-offset-dark-card" : "bg-dark-bg hover:bg-dark-card2"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Ism va familiya</label>
              <input type="text" value={profileEdit.name}
                onChange={e => setProfileEdit(p => ({...p, name: e.target.value}))}
                className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-green outline-none mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Username</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-2.5 text-gray-500 text-sm">@</span>
                <input type="text" value={profileEdit.username}
                  onChange={e => setProfileEdit(p => ({...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")}))}
                  className="w-full bg-dark-bg border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:border-brand-green outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">Bio</label>
              <textarea value={profileEdit.bio}
                onChange={e => setProfileEdit(p => ({...p, bio: e.target.value}))}
                className="w-full bg-dark-bg border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-green outline-none mt-1 resize-none"
                rows={3} placeholder="O'zingiz haqingizda..." />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={saveProfile} className="flex-1 bg-brand-green text-black font-bold py-2.5 rounded-xl hover:opacity-90 text-sm">✅ Saqlash</button>
            <button onClick={() => setShowProfileEdit(false)} className="flex-1 bg-dark-bg text-white py-2.5 rounded-xl hover:bg-dark-card2 text-sm">❌ Bekor</button>
          </div>
        </Modal>
      )}

      {/* ===== TOASTS ===== */}
      <div className="fixed top-4 right-4 space-y-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2.5 rounded-xl text-sm shadow-xl backdrop-blur-sm animate-pulse-once max-w-xs
            ${t.type==="msg" ? "bg-gray-800/95 text-white border border-gray-700"
            : t.type==="success" ? "bg-green-600/90 text-white"
            : "bg-red-600/90 text-white"}`}>
            {t.txt}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= SUB COMPONENTS =============

function UserItem({ u, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full p-3 border-b border-gray-800/50 text-left flex items-center gap-3 hover:bg-dark-card2 transition-all ${active ? "bg-brand-green/10 border-l-2 border-l-brand-green" : ""}`}>
      <div className="relative flex-shrink-0">
        <span className="text-3xl">{u.avatar}</span>
        {u.online ? <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-card"></span>
          : <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 rounded-full border-2 border-dark-card"></span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="font-semibold text-sm truncate">{u.name}</p>
          {u.lastMessageTime && <span className="text-xs text-gray-500 flex-shrink-0 ml-1">{timeAgo(u.lastMessageTime)}</span>}
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 truncate">
            {u.lastMessage ? u.lastMessage.slice(0, 35) + (u.lastMessage.length > 35 ? "..." : "") : `@${u.username || u.email}`}
          </p>
          {u.unreadCount > 0 && (
            <span className="bg-brand-green text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-1">
              {u.unreadCount > 9 ? "9+" : u.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function GroupItem({ g, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full p-3 border-b border-gray-800/50 text-left flex items-center gap-3 hover:bg-dark-card2 transition-all ${active ? "bg-brand-green/10 border-l-2 border-l-brand-green" : ""}`}>
      <span className="text-3xl flex-shrink-0">{g.avatar}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <p className="font-semibold text-sm truncate">{g.name}</p>
          {g.lastMessageTime && <span className="text-xs text-gray-500 flex-shrink-0 ml-1">{timeAgo(g.lastMessageTime)}</span>}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {g.lastMessage
            ? `${g.lastMessageSender}: ${g.lastMessage.slice(0, 30)}`
            : `${g.members?.length || 0} a'zo`}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({ msg, isMe, isGroup, sameAuthor }) {
  const sender = typeof msg.senderId === 'object' ? msg.senderId : { avatar: '👤', name: 'Unknown' };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${sameAuthor ? "mt-0.5" : "mt-2"}`}>
      {!isMe && !sameAuthor && isGroup && (
        <span className="text-lg mr-2 self-end mb-1">{sender.avatar || '👤'}</span>
      )}
      {!isMe && sameAuthor && isGroup && <span className="w-7 mr-2"></span>}
      <div className={`max-w-xs lg:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {!isMe && !sameAuthor && isGroup && (
          <span className="text-xs text-brand-green mb-0.5 ml-1">{sender.name || 'Unknown'}</span>
        )}
        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe
          ? "bg-brand-green text-black rounded-br-sm"
          : "bg-dark-card2 text-white rounded-bl-sm"}`}>
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
            <span className="text-xs opacity-60">{formatTime(msg.createdAt)}</span>
            {isMe && <span className="text-xs opacity-70">{msg.read ? "✓✓" : "✓"}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, onEdit, onLogout }) {
  return (
    <div className="p-4">
      <div className="bg-dark-card2 rounded-2xl p-5 text-center mb-4">
        <div className="text-6xl mb-3">{user?.avatar}</div>
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-brand-green text-sm mt-0.5">@{user?.username || "—"}</p>
        <p className="text-gray-500 text-xs mt-1">{user?.email}</p>
        {user?.bio && <p className="text-gray-400 text-sm mt-3 bg-dark-bg rounded-xl px-3 py-2">{user?.bio}</p>}
        <div className="mt-3 bg-dark-bg rounded-xl px-3 py-2">
          <p className="text-xs text-gray-500">ID</p>
          <p className="text-lg font-mono font-bold text-brand-green">{user?.id}</p>
          <p className="text-xs text-gray-600">Boshqalar siz bilan bog'lanishi uchun</p>
        </div>
      </div>
      <button onClick={onEdit} className="w-full bg-brand-green text-black font-bold py-2.5 rounded-xl hover:opacity-90 mb-3 text-sm">✏️ Profilni tahrirlash</button>
      <button onClick={onLogout} className="w-full bg-red-500/20 text-red-400 font-semibold py-2.5 rounded-xl hover:bg-red-500/30 text-sm">🚪 Chiqish</button>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        {children}
      </div>
    </div>
  );
}

// ============= ROOT =============
export default function App() {
  const [ready, setReady] = useState(false);
  const { token } = useAuthStore();
  if (!ready) return <Splash onReady={() => setReady(true)} />;
  if (!token) return <LoginRegister />;
  return <ChatApp />;
}
