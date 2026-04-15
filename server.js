import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ============= SETUP =============
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
  transports: ["websocket", "polling"],
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "signspeakai_secret_2024";

// ============= SUPABASE =============
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("❌ .env faylida SUPABASE_URL va SUPABASE_SERVICE_KEY kerak!");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ============= HELPERS =============
const hashPw = (pw) => bcryptjs.hashSync(pw, 10);
const checkPw = (pw, hash) => bcryptjs.compareSync(pw, hash);
const makeToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token yo'q" });
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ error: "Token noto'g'ri" });
  }
};

function safeUsername(str) {
  return str.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);
}

// ============= AUTH =============

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Barcha maydonlar kerak" });

    const uname = username
      ? safeUsername(username)
      : safeUsername(name) + Math.floor(Math.random() * 9999);

    if (uname.length < 3)
      return res.status(400).json({ error: "Username kamida 3 belgi" });

    // Check duplicate email
    const { data: existEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();
    if (existEmail) return res.status(400).json({ error: "Bu email band" });

    // Check duplicate username
    const { data: existUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", uname)
      .single();
    if (existUser) return res.status(400).json({ error: "Bu username band, boshqasini tanlang" });

    const avatars = ["👋","🤟","✌️","🖐️","👏","🙌","🎯","🚀","⚡","🔥","🌟","🦋"];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ name, username: uname, email, password: hashPw(password), avatar, bio: "" })
      .select("id, name, username, email, avatar, bio")
      .single();

    if (error) throw error;

    res.json({ token: makeToken(newUser.id), user: newUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user || !checkPw(password, user.password))
      return res.status(401).json({ error: "Email yoki parol xato" });

    await supabase
      .from("users")
      .update({ online: true, last_seen: new Date().toISOString() })
      .eq("id", user.id);

    res.json({
      token: makeToken(user.id),
      user: { id: user.id, name: user.name, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============= USERS =============

// All users with last message preview
app.get("/api/users", auth, async (req, res) => {
  try {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, username, email, avatar, bio, online, last_seen")
      .neq("id", req.userId)
      .order("name");

    // Enrich with last message and unread count
    const enriched = await Promise.all(
      users.map(async (u) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("text, created_at")
          .or(`and(sender_id.eq.${u.id},receiver_id.eq.${req.userId}),and(sender_id.eq.${req.userId},receiver_id.eq.${u.id})`)
          .is("group_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unread } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", u.id)
          .eq("receiver_id", req.userId)
          .eq("read", false);

        return {
          ...u,
          lastMessage: lastMsg?.text || "",
          lastMessageTime: lastMsg?.created_at || "",
          unreadCount: unread || 0,
        };
      })
    );

    // Sort: chats with messages first
    enriched.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime)
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search users
app.get("/api/users/search", auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) return res.json([]);

    const query = q.trim();
    let data;

    // Search by ID
    if (/^\d+$/.test(query)) {
      const { data: byId } = await supabase
        .from("users")
        .select("id, name, username, email, avatar, bio, online")
        .eq("id", parseInt(query))
        .neq("id", req.userId);
      data = byId || [];
    } else {
      const sq = query.startsWith("@") ? query.slice(1) : query;
      const { data: byText } = await supabase
        .from("users")
        .select("id, name, username, email, avatar, bio, online")
        .neq("id", req.userId)
        .or(`name.ilike.%${sq}%,username.ilike.%${sq}%,email.ilike.%${sq}%`)
        .limit(20);
      data = byText || [];
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get me
app.get("/api/users/me", auth, async (req, res) => {
  try {
    const { data } = await supabase
      .from("users")
      .select("id, name, username, email, avatar, bio, online")
      .eq("id", req.userId)
      .single();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update profile
app.put("/api/users/:id", auth, async (req, res) => {
  try {
    if (String(req.userId) !== String(req.params.id))
      return res.status(403).json({ error: "Ruxsat yo'q" });

    const { name, username, bio, avatar } = req.body;
    const updates = { name: name || "", bio: bio || "", avatar: avatar || "👤" };

    if (username) {
      const clean = safeUsername(username);
      if (clean.length < 3) return res.status(400).json({ error: "Username kamida 3 belgi" });

      const { data: exists } = await supabase
        .from("users")
        .select("id")
        .eq("username", clean)
        .neq("id", req.userId)
        .single();
      if (exists) return res.status(400).json({ error: "Bu username band" });

      updates.username = clean;
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", req.userId)
      .select("id, name, username, email, avatar, bio")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============= MESSAGES =============

// Get direct messages
app.get("/api/messages/:otherId", auth, async (req, res) => {
  try {
    const otherId = req.params.otherId;

    const { data: msgs } = await supabase
      .from("messages")
      .select(`
        id, sender_id, receiver_id, text, created_at, read,
        sender:users!sender_id(id, name, username, avatar)
      `)
      .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${req.userId})`)
      .is("group_id", null)
      .order("created_at", { ascending: true });

    // Mark as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", otherId)
      .eq("receiver_id", req.userId)
      .eq("read", false);

    res.json(
      (msgs || []).map((m) => ({
        _id: m.id,
        text: m.text,
        createdAt: m.created_at,
        read: m.read,
        senderId: { _id: m.sender_id, ...m.sender },
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============= GROUPS =============

// Create group
app.post("/api/groups", auth, async (req, res) => {
  try {
    const { name, description, memberIds, avatar } = req.body;
    if (!name) return res.status(400).json({ error: "Guruh nomi kerak" });

    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name, description: description || "", avatar: avatar || "👥", admin: req.userId })
      .select()
      .single();

    if (error) throw error;

    // Add members
    const members = [req.userId, ...(memberIds || []).filter((id) => id !== req.userId)];
    await supabase.from("group_members").insert(
      members.map((userId) => ({ group_id: group.id, user_id: userId }))
    );

    res.json(await getFullGroup(group.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get my groups
app.get("/api/groups", auth, async (req, res) => {
  try {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", req.userId);

    const groupIds = (memberships || []).map((m) => m.group_id);
    if (groupIds.length === 0) return res.json([]);

    const groups = await Promise.all(groupIds.map((id) => getFullGroup(id)));
    groups.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime)
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      return 0;
    });

    res.json(groups.filter(Boolean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get group messages
app.get("/api/groups/:groupId/messages", auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const { data: member } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", req.userId)
      .single();

    if (!member) return res.status(403).json({ error: "Guruh a'zosi emassiz" });

    const { data: msgs } = await supabase
      .from("messages")
      .select(`
        id, sender_id, group_id, text, created_at,
        sender:users!sender_id(id, name, username, avatar)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    res.json(
      (msgs || []).map((m) => ({
        _id: m.id,
        text: m.text,
        createdAt: m.created_at,
        groupId: m.group_id,
        senderId: { _id: m.sender_id, ...m.sender },
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Leave group
app.delete("/api/groups/:groupId/leave", auth, async (req, res) => {
  try {
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", req.params.groupId)
      .eq("user_id", req.userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add member to group
app.post("/api/groups/:groupId/members", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const { data: group } = await supabase.from("groups").select("admin").eq("id", groupId).single();
    if (!group) return res.status(404).json({ error: "Topilmadi" });
    if (group.admin !== req.userId) return res.status(403).json({ error: "Faqat admin" });

    const { data: exists } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();
    if (exists) return res.status(400).json({ error: "Allaqachon a'zo" });

    await supabase.from("group_members").insert({ group_id: groupId, user_id: userId });
    res.json(await getFullGroup(groupId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper: get full group info
async function getFullGroup(groupId) {
  const { data: g } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();
  if (!g) return null;

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user:users(id, name, username, avatar, online)")
    .eq("group_id", groupId);

  const members = (memberRows || []).map((r) => r.user).filter(Boolean);

  const { data: lastMsg } = await supabase
    .from("messages")
    .select("text, created_at, sender:users!sender_id(name)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    id: g.id,
    name: g.name,
    avatar: g.avatar,
    description: g.description,
    admin: g.admin,
    members,
    lastMessage: lastMsg?.text || "",
    lastMessageSender: lastMsg?.sender?.name || "",
    lastMessageTime: lastMsg?.created_at || "",
    createdAt: g.created_at,
  };
}

// ============= SOCKET.IO =============
const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  socket.on("user:login", async (userId) => {
    onlineUsers.set(String(userId), socket.id);
    userSockets.set(socket.id, String(userId));

    await supabase.from("users").update({ online: true }).eq("id", userId);
    io.emit("user:status", { userId, online: true });

    // Join group rooms
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    (memberships || []).forEach((m) => socket.join(`group:${m.group_id}`));
  });

  // Direct message
  socket.on("message:send", async (data) => {
    try {
      const { senderId, receiverId, text } = data;
      if (!text?.trim()) return;

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({ sender_id: senderId, receiver_id: receiverId, text: text.trim() })
        .select(`
          id, sender_id, receiver_id, text, created_at, read,
          sender:users!sender_id(id, name, username, avatar)
        `)
        .single();

      if (error) throw error;

      const formatted = {
        _id: msg.id,
        senderId: { _id: msg.sender_id, ...msg.sender },
        receiverId: msg.receiver_id,
        text: msg.text,
        createdAt: msg.created_at,
        read: msg.read,
      };

      const receiverSocket = onlineUsers.get(String(receiverId));
      if (receiverSocket) io.to(receiverSocket).emit("message:new", formatted);
      socket.emit("message:sent", formatted);
    } catch (e) {
      socket.emit("error", { msg: e.message });
    }
  });

  // Group message
  socket.on("group:message", async (data) => {
    try {
      const { senderId, groupId, text } = data;
      if (!text?.trim()) return;

      // Check membership
      const { data: member } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", senderId)
        .single();
      if (!member) return;

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({ sender_id: senderId, group_id: groupId, text: text.trim() })
        .select(`
          id, sender_id, group_id, text, created_at,
          sender:users!sender_id(id, name, username, avatar)
        `)
        .single();

      if (error) throw error;

      const formatted = {
        _id: msg.id,
        senderId: { _id: msg.sender_id, ...msg.sender },
        groupId: msg.group_id,
        text: msg.text,
        createdAt: msg.created_at,
      };

      io.to(`group:${groupId}`).emit("group:message:new", formatted);
    } catch (e) {
      console.error(e);
    }
  });

  // Typing
  socket.on("typing:start", ({ userId, receiverId }) => {
    const rs = onlineUsers.get(String(receiverId));
    if (rs) io.to(rs).emit("typing:active", { userId });
  });

  socket.on("typing:stop", ({ userId, receiverId }) => {
    const rs = onlineUsers.get(String(receiverId));
    if (rs) io.to(rs).emit("typing:inactive", { userId });
  });

  socket.on("group:typing:start", ({ userId, groupId }) => {
    socket.to(`group:${groupId}`).emit("group:typing:active", { userId, groupId });
  });

  socket.on("group:typing:stop", ({ userId, groupId }) => {
    socket.to(`group:${groupId}`).emit("group:typing:inactive", { userId, groupId });
  });

  // Mark read
  socket.on("messages:read", async ({ userId, senderId }) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", senderId)
      .eq("receiver_id", userId)
      .eq("read", false);

    const ss = onlineUsers.get(String(senderId));
    if (ss) io.to(ss).emit("messages:read:ack", { readBy: userId });
  });

  socket.on("disconnect", async () => {
    const uid = userSockets.get(socket.id);
    if (uid) {
      onlineUsers.delete(uid);
      userSockets.delete(socket.id);
      await supabase
        .from("users")
        .update({ online: false, last_seen: new Date().toISOString() })
        .eq("id", uid);
      io.emit("user:status", { userId: uid, online: false });
    }
  });
});

// ============= START =============
httpServer.listen(PORT, () => {
  console.log(`✅ Supabase ulandi`);
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
