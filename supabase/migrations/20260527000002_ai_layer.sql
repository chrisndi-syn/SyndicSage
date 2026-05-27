-- ─────────────────────────────────────────────────────────────
-- SyndicSage V5 — AI Layer Migration
--
-- Architecture decisions baked in:
-- • AI output is "suggested data" — never authoritative truth
-- • Separate tables for extractions, summaries, embeddings
-- • Human validation gate before AI suggestions become official
-- • pgvector for tenant-scoped semantic search (RAG)
-- • Prompt injection defense enforced at application layer
-- • AI results are tenant-scoped — building_id on every row
-- ─────────────────────────────────────────────────────────────

-- Enable pgvector for semantic search / RAG
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Document AI Extractions ───────────────────────────────────
-- Structured fields AI extracted from a document (invoice amount, supplier, dates...).
-- validated_by + validated_at are NULL until a syndic confirms the data.
-- Only validated extractions should flow into authoritative records.
CREATE TABLE document_ai_extractions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL REFERENCES documents ON DELETE CASCADE,
  building_id     UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  extracted_data  JSONB       NOT NULL,
  model           TEXT        NOT NULL,
  provider        TEXT        NOT NULL CHECK (provider IN ('anthropic','openai','local')),
  confidence      NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  validated_by    UUID        REFERENCES auth.users ON DELETE SET NULL,
  validated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_extractions_document  ON document_ai_extractions (document_id);
CREATE INDEX idx_ai_extractions_building  ON document_ai_extractions (building_id);
CREATE INDEX idx_ai_extractions_validated ON document_ai_extractions (validated_at) WHERE validated_at IS NULL;

-- ── Document AI Summaries ─────────────────────────────────────
-- AI-generated summaries of PDFs, meeting minutes, contracts.
-- One summary per document per model run. New runs create new rows.
CREATE TABLE document_ai_summaries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL REFERENCES documents ON DELETE CASCADE,
  building_id     UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  summary         TEXT        NOT NULL,
  model           TEXT        NOT NULL,
  provider        TEXT        NOT NULL CHECK (provider IN ('anthropic','openai','local')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_summaries_document ON document_ai_summaries (document_id);
CREATE INDEX idx_ai_summaries_building ON document_ai_summaries (building_id);

-- ── AI Embeddings (pgvector) ──────────────────────────────────
-- Tenant-scoped embeddings for semantic search (RAG).
-- building_id + organization_id on every row — retrieval is always scoped.
-- Dimension 1536 = OpenAI text-embedding-3-small; adjust for other models.
CREATE TABLE ai_embeddings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type   TEXT        NOT NULL CHECK (resource_type IN (
                                'document','meeting_minutes','charge',
                                'maintenance_request','legal_article'
                              )),
  resource_id     UUID        NOT NULL,
  building_id     UUID        NOT NULL REFERENCES buildings ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations ON DELETE CASCADE,
  embedding       vector(1536) NOT NULL,
  model           TEXT        NOT NULL,
  provider        TEXT        NOT NULL CHECK (provider IN ('anthropic','openai','local')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_type, resource_id)  -- one embedding per resource
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX idx_ai_embeddings_hnsw ON ai_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_ai_embeddings_building ON ai_embeddings (building_id);
CREATE INDEX idx_ai_embeddings_org      ON ai_embeddings (organization_id);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- All AI tables are tenant-scoped — building_id enforced on every policy
-- ─────────────────────────────────────────────────────────────

ALTER TABLE document_ai_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_ai_summaries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_embeddings           ENABLE ROW LEVEL SECURITY;

-- Extractions: staff read + write; residents cannot see AI internals
CREATE POLICY "ai_extractions_staff" ON document_ai_extractions
  FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic']));

-- Summaries: staff read + write
CREATE POLICY "ai_summaries_staff" ON document_ai_summaries
  FOR ALL USING (is_member(building_id, ARRAY['syndic','co_syndic']));

-- Embeddings: never directly readable by clients — managed by Hono AI service only
-- Retrieval happens server-side with scoped queries, not via client Supabase calls
CREATE POLICY "ai_embeddings_staff" ON ai_embeddings
  FOR SELECT USING (is_member(building_id, ARRAY['syndic','co_syndic']));
-- INSERT/UPDATE via service role key only (Hono worker)
