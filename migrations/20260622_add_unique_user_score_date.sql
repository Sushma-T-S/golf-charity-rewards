-- Migration: add unique index to prevent duplicate scores per user per date
-- WARNING: Run the dedupe script before applying this migration to avoid failure.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_scores_userid_scoredate
ON scores (user_id, score_date);
