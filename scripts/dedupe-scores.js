/*
Dedupe script for `scores` table.
Runs using SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL env vars.

Behavior:
- Finds duplicate rows with same (user_id, score_date)
- Keeps the most recent `created_at` per group and deletes the rest (batched)

Usage:
  export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
  export NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
  node scripts/dedupe-scores.js

Be careful: this permanently deletes rows. Backup your DB before running.
*/

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  console.log('Fetching all scores (this may be slow on large tables)...');

  // Fetch duplicates grouped by user_id + score_date
  // We'll retrieve id, user_id, score_date, created_at ordered so newest rows come first per group
  let { data, error } = await supabaseAdmin
    .from('scores')
    .select('id, user_id, score_date, created_at')
    .order('user_id', { ascending: true })
    .order('score_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scores:', error.message || error);
    process.exit(1);
  }

  const rows = data || [];
  console.log('Total score rows:', rows.length);

  let lastKey = null;
  let keepId = null;
  const toDelete = [];

  for (const r of rows) {
    const key = `${r.user_id}||${r.score_date}`;
    if (key !== lastKey) {
      // this is the first (newest) row for this group - keep it
      lastKey = key;
      keepId = r.id;
    } else {
      // duplicate - mark for deletion
      toDelete.push(r.id);
    }
  }

  console.log('Duplicate rows to remove:', toDelete.length);

  if (toDelete.length === 0) {
    console.log('No duplicates found. Nothing to delete.');
    return;
  }

  // Delete in batches of 100
  const batchSize = 100;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error: delErr } = await supabaseAdmin
      .from('scores')
      .delete()
      .in('id', batch);

    if (delErr) {
      console.error('Error deleting batch:', delErr.message || delErr);
      process.exit(1);
    }

    console.log(`Deleted batch ${i / batchSize + 1}: ${batch.length} rows`);
  }

  console.log('Dedupe complete.');
}

run().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
