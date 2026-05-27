# SyndicSage — Incident Response Plan

**Last reviewed:** 2026-05-27
**Owner:** Chris (fill in before launch)

---

## 1. Who Gets Alerted

| Severity | Who | How | Within |
|---|---|---|---|
| Critical (data breach, system down) | Chris | Phone + email | Immediately |
| High (security anomaly, failed auth spike) | Chris | Email + Sentry alert | 30 min |
| Medium (elevated errors, slow DB) | Chris | Sentry alert | 2 hours |

*Update this table as the team grows.*

---

## 2. How to Isolate the System

**Kill switches (via feature_flags table — no deploy needed):**
```sql
UPDATE feature_flags SET enabled = false WHERE key = 'uploads_enabled';
UPDATE feature_flags SET enabled = false WHERE key = 'exports_enabled';
UPDATE feature_flags SET enabled = false WHERE key = 'logins_enabled';
```

**Take the app fully offline:**
- Vercel: set maintenance mode in project settings or redeploy a maintenance page
- Railway API: pause the service in Railway dashboard

---

## 3. How to Rotate Secrets

| Secret | Location | How to rotate |
|---|---|---|
| Supabase service role key | Railway env vars | Supabase dashboard → API settings → regenerate → update Railway |
| Supabase anon key | Vercel env vars | Same as above → update Vercel |
| Anthropic API key | Railway env vars | Anthropic console → regenerate → update Railway |
| Resend API key | Railway env vars | Resend dashboard → regenerate → update Railway |

After rotating: redeploy affected services. Verify old key is revoked.

---

## 4. How to Investigate a Breach

1. Pull audit logs for the affected building/user
2. Check Sentry for error spikes around the incident time
3. Review Railway API logs for unusual request patterns
4. Identify what data was accessed (audit_log.resource_type + resource_id)
5. Determine scope: one building? One user? All users?

---

## 5. How to Notify Users / Regulators

**Belgian GDPR breach notification:**
- Must notify the Belgian DPA (APD/GBA) within **72 hours** of becoming aware
- Notification portal: https://www.dataprotectionauthority.be
- Must include: nature of breach, categories + volume of data, likely consequences, measures taken

**Notify affected users:**
- If high risk to their rights → notify them directly without delay
- Use Resend to send templated email to affected building members
- Be specific: what data, what period, what we know, what we're doing

---

## 6. How to Restore from Backup

**Database:**
1. Supabase dashboard → Database → Backups
2. Select point-in-time restore (Pro plan)
3. Restore to a new project first, verify data integrity
4. Switch connection strings if confirmed clean

**Storage files:**
- No automatic backup — manual export script needed (see backups section)
- ⚠️ This is a known gap — add export script before launch

---

## 7. Post-Incident

1. Write a brief incident report: what happened, timeline, root cause, fix
2. Update `docs/vendors.json` if a vendor was involved
3. Add a new audit_log action if the incident revealed a logging gap
4. Review and update this document if the process had gaps
