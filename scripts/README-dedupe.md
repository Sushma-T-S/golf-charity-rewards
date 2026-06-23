Dedupe & unique-index instructions

1) Purpose

The repository includes a server-side constraint requirement: only one score per user per date.
We provide a dedupe script and a migration to add a unique index on `(user_id, score_date)`.

2) Safety steps (recommended)

- BACKUP your database before running destructive operations.
- Run the dedupe script first to remove duplicate rows.
- After dedupe completes, apply the migration to add the unique index.

3) Run the dedupe script

Configure env vars (PowerShell / Linux):

Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role_key>"
node scripts/dedupe-scores.js
```

Linux / macOS shell:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
node scripts/dedupe-scores.js
```

4) Apply the migration (add unique index)

After verifying duplicates removed, apply the SQL migration. Options:

- Using `psql` (if you have DB connection):

```bash
psql "postgres://postgres:<password>@<host>:5432/postgres" -f migrations/20260622_add_unique_user_score_date.sql
```

- Using Supabase SQL editor: paste the contents of `migrations/20260622_add_unique_user_score_date.sql` into the SQL editor and run.

- Using `supabase` CLI (if installed):

```bash
supabase db query "$(cat migrations/20260622_add_unique_user_score_date.sql)"
```

5) Verification

- Confirm unique index exists and that `SELECT COUNT(*) FROM scores` matched expected counts.
- Try inserting a duplicate row; it should fail with unique constraint error.

6) Rollback

If you need to remove the unique index:

```sql
DROP INDEX IF EXISTS idx_scores_userid_scoredate;
```

7) Notes

- The dedupe script uses the Supabase service-role key; keep it secret.
- Test on a staging or development copy before applying to production.
