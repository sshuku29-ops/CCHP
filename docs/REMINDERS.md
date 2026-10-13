# Reminders and the email digest

The platform sends two kinds of reminders:

1. **In-app notifications** (the bell in the sidebar, `/notifications`)
   - `TASK_DUE` — a task assigned to you is due today, tomorrow or the day after
   - `TASK_OVERDUE` — a task assigned to you is past its due date and not done
   - `WAITING_ON` — an outreach item you own has waited longer than its "remind after N days"
2. **One email digest per person per run**, listing their due/overdue tasks and,
   for admins, overdue outreach follow-ups and sessions in the next 7 days.
   People with nothing to report get no email. People without an email
   address on their Account page get no email.

Both are produced by one function: `runReminders()` in `src/lib/reminders/run.ts`.
Notifications are de-duplicated (no repeat while an identical unread one from the
last 24 hours exists). Emails are **not** de-duplicated, so run the job **once a day**.

## Running it

### A. Vercel cron (recommended if hosted on Vercel)

Add a `vercel.json` at the repo root:

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 12 * * *" }
  ]
}
```

`0 12 * * *` is 12:00 UTC = 8:00 AM Eastern (7:00 AM during daylight time). Vercel
calls the route with `Authorization: Bearer $CRON_SECRET` automatically as long as
`CRON_SECRET` is set in the project's environment variables.

### B. Any other cron (Railway, Fly, a Raspberry Pi, cron-job.org, ...)

Call the endpoint once a day with the secret. Either form works:

```bash
# header form
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-site.example/api/cron/reminders

# query-string form (for hosts that cannot set headers)
curl -fsS "https://your-site.example/api/cron/reminders?secret=$CRON_SECRET"
```

Example crontab line (daily at 8 AM server time):

```
0 8 * * * curl -fsS -H "Authorization: Bearer YOUR_SECRET" https://your-site.example/api/cron/reminders >/dev/null
```

The route accepts GET and POST and answers with JSON like
`{"ok":true,"ranAt":"...","taskDue":2,"taskOverdue":1,"waitingOn":0,"emails":3}`.
It returns 401 if the secret is wrong and 500 if `CRON_SECRET` is not configured.

### C. By hand

A Main Admin can press **"Run reminders now"** on `/notifications`. Useful for
testing and for the day the cron forgot to run.

## Environment variables

| Variable | What it does |
| --- | --- |
| `CRON_SECRET` | Random string that protects `/api/cron/reminders`. Generate with `openssl rand -hex 32`. |
| `APP_URL` | Public URL of the site, used for links inside emails (e.g. `https://cchp.example.org`). |
| `EMAIL_PROVIDER` | `console` (default) or `resend`. See below. |
| `EMAIL_FROM` | The From address, e.g. `CCHP <noreply@cchp.example.org>`. Must be a verified sender at your provider. |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend`. |

### How EMAIL_PROVIDER works

All email goes through one function, `sendEmail()` in `src/lib/email/index.ts`.

- `EMAIL_PROVIDER=console` — nothing is sent. Each email is printed to the server
  log instead. This is the default and what you want in development.
- `EMAIL_PROVIDER=resend` — sends through the Resend HTTP API using `RESEND_API_KEY`.
  Create a free Resend account, verify your sending domain, create an API key, and
  set `EMAIL_FROM` to an address on that domain.
- To use another provider (SES, Postmark, SMTP), add one more `if (provider === "...")`
  branch to `sendEmail()`. Nothing else in the app needs to change.

Reminder digests are the **only** email the platform sends. There is no email
open-tracking anywhere; the "Waiting on" tracker only counts days since sent.

## Troubleshooting

- *No emails arrive* — check `EMAIL_PROVIDER` is `resend` (not `console`), the API key
  is set, and the user has an email on their Account page. Then check the server log
  for `[reminders] email to ... failed`.
- *Duplicate notifications* — they only repeat after the earlier one is read or after
  24 hours. That is intended: a still-overdue task reminds you again the next day.
- *Nothing happens* — the response JSON shows counts of what was created. All zeros
  simply means nothing is due.
