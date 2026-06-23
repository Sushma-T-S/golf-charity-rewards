# TODO Fix Subscriptions

- [x] Update Dashboard subscription buttons to perform optimistic UI state update, then refresh from `/api/subscription/status` after success.
- [x] Improve error payloads in `/api/subscription/subscribe` and `/api/subscription/status` so the client can see exact Supabase error.
- [ ] If errors show role/privilege mismatch, adjust `migrations/20260623_fix_subscriptions_permissions.sql` grants/policies accordingly (make sure `service_role` role is covered).
- [ ] Re-run flow: click Monthly/Yearly; confirm subscription becomes active and no "permission denied" message appears.

## New steps
- [x] Broaden privileges/policies in `migrations/20260623_fix_subscriptions_permissions.sql` to cover additional role aliases likely used by the service-key connection (e.g. `supabase_admin`, `postgres`, etc.)
- [x] Added matching `for all` RLS policies for those roles when RLS is enabled.
- [ ] (Optional) Add a temporary diagnostic in the subscribe endpoint to confirm which role is used.


