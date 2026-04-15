-- =====================================================
-- SignSpeak AI — Supabase SQL Schema (CORRECT ORDER)
-- =====================================================

-- 1. USERS jadvali (birinchi)
CREATE TABLE IF NOT EXISTS public.users (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  avatar      TEXT DEFAULT '👤',
  bio         TEXT DEFAULT '',
  online      BOOLEAN DEFAULT false,
  last_seen   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GROUPS jadvali (ikkinchi - messages dan oldin!)
CREATE TABLE IF NOT EXISTS public.groups (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  avatar      TEXT DEFAULT '👥',
  description TEXT DEFAULT '',
  admin       BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGES jadvali (groups dan keyin)
CREATE TABLE IF NOT EXISTS public.messages (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  group_id    BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GROUP_MEMBERS jadvali
CREATE TABLE IF NOT EXISTS public.group_members (
  id        BIGSERIAL PRIMARY KEY,
  group_id  BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 5. Indekslar (tezlik uchun)
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 6. Row Level Security o'chirish
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
