-- Add majority_type to votes table
-- Belgian VME law requires different thresholds per decision type:
-- simple_50 = >50% (normal majority)
-- two_thirds = ≥2/3 (qualified majority)
-- four_fifths = ≥4/5 (exceptional majority for structural works)

ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS majority_type TEXT NOT NULL DEFAULT 'simple_50'
  CHECK (majority_type IN ('simple_50', 'two_thirds', 'four_fifths'));
