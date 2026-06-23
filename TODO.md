# TODO

## Admin user controls should list all registered users

- [ ] Add server-side profile upsert for signup using service-role (avoid client-side RLS blocking profiles creation)
- [ ] Update `/app/signup/page.tsx` to call the new server route instead of writing `profiles` from the client
- [ ] Add better error display in `/app/admin/page.tsx` for the “Admin user controls” section when `/api/admin/users` fails
- [ ] Ensure `/api/admin/users` returns enough profile fields (id/email/subscription fields if present) for the admin table
- [ ] Run TypeScript build / tests if available

