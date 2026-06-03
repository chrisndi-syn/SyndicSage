-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — Phase 4: AI Conversations
--
-- The AI layer tables (extractions, summaries, embeddings) were
-- created in 20260527000002_ai_layer.sql.
-- This migration adds the conversational AI tables for AI Sage chat.
-- ─────────────────────────────────────────────────────────────

-- ── AI Conversations ──────────────────────────────────────────
-- One conversation per user per building context (or org-wide).
-- building_id is nullable — org-level conversations have no building scope.
CREATE TABLE ai_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  building_id     UUID        REFERENCES buildings ON DELETE CASCADE,
  title           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user     ON ai_conversations (user_id);
CREATE INDEX idx_ai_conversations_building ON ai_conversations (building_id);

-- ── AI Messages ───────────────────────────────────────────────
-- Individual messages within a conversation.
-- role: 'user' | 'assistant'
-- token_count is approximate — used for billing/credit tracking.
CREATE TABLE ai_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES ai_conversations ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  model           TEXT,
  token_count     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages (conversation_id, created_at);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages      ENABLE ROW LEVEL SECURITY;

-- Users see only their own conversations
CREATE POLICY "ai_conversations_owner" ON ai_conversations
  FOR ALL USING (user_id = auth.uid());

-- Messages are visible if the user owns the conversation
CREATE POLICY "ai_messages_owner" ON ai_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  );

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_ai_conversation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ai_conversations SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_messages_touch_conversation
  AFTER INSERT ON ai_messages
  FOR EACH ROW EXECUTE FUNCTION touch_ai_conversation();
