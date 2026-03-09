#!/bin/bash
set -euo pipefail

DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"

echo "Auto-categorizing emails..."

# Newsletter domains
duckdb "$DB" <<'SQL'
UPDATE emails
SET category = 'newsletter', updated_at = current_timestamp
WHERE category = 'uncategorized'
  AND (
    from_email LIKE '%@substack.com'
    OR from_email LIKE '%substack%'
    OR from_email LIKE '%elevenlabs.io'
    OR from_email LIKE '%@cult.fit'
    OR from_email LIKE '%@medium.com'
    OR from_email LIKE '%@beehiiv.com'
    OR from_email LIKE '%@mail.cartesia.ai'
    OR from_email LIKE '%@send.relay.app'
    OR from_email LIKE '%@mail.granola.so'
    OR from_email LIKE '%@boardy.ai'
    OR from_email LIKE '%@updates.langfuse.com'
    OR from_email LIKE '%@updates.resend.com'
    OR from_email LIKE '%@groq.co'
    OR from_email LIKE '%@tailscale.com'
    OR from_email LIKE '%@email.wework.com'
    OR from_email LIKE '%@variant.ai'
  );
SQL
echo "  Newsletters categorized."

# Platform notifications (Google, GitHub, Discord, Slack, security alerts, etc.)
duckdb "$DB" <<'SQL'
UPDATE emails
SET category = 'notification', updated_at = current_timestamp
WHERE category = 'uncategorized'
  AND (
    from_email LIKE '%calendar-notification@google.com%'
    OR from_email LIKE '%drive-shares%noreply@google.com%'
    OR from_email LIKE '%comments-noreply@docs.google.com%'
    OR from_email LIKE '%@accounts.google.com'
    OR from_email LIKE '%noreply@github.com%'
    OR from_email LIKE '%noreply@discord.com%'
    OR from_email LIKE '%notification@slack.com%'
    OR from_email LIKE '%noreply@zohoaccounts.com%'
    OR from_email LIKE '%notification@zohostore%'
    OR from_email LIKE '%security-noreply@linkedin.com%'
    OR from_email LIKE '%@notifications@linear.app%'
    OR from_email LIKE '%@linear.app%'
    OR from_email LIKE '%gitlab@mg.gitlab.com%'
    OR from_email LIKE '%@mail.gitlab.com%'
    OR from_email LIKE '%noreply@razorpay.com%'
    OR from_email LIKE '%donotreply@upwork.com%'
    OR from_email LIKE '%@ahrefs.com'
    OR from_email LIKE '%@contra.com'
    OR from_email LIKE '%@key.email'
    OR from_email LIKE '%noreply@email.claude.com'
    OR from_email LIKE '%no-reply@email.claude.com'
    OR from_email LIKE '%workspace-noreply@google.com'
    OR from_email LIKE '%CloudPlatform-noreply@google.com'
    OR from_email LIKE '%googlecloud@google.com'
    OR from_email LIKE '%payments-noreply@google.com'
    OR from_email LIKE '%gemini-notes@google.com'
    OR from_email LIKE '%exa.ai'
    OR subject LIKE '%Accepted:%'
    OR subject LIKE '%Cancelled event:%'
    OR subject LIKE '%Updated invitation:%'
    OR subject LIKE '%Proposed new time:%'
  );
SQL
echo "  Notifications categorized."

# Calendar invitations and meetings
duckdb "$DB" <<'SQL'
UPDATE emails
SET category = 'meeting', updated_at = current_timestamp
WHERE category = 'uncategorized'
  AND (
    subject LIKE 'Invitation:%'
    OR subject LIKE '%@ Mon %' OR subject LIKE '%@ Tue %' OR subject LIKE '%@ Wed %'
    OR subject LIKE '%@ Thu %' OR subject LIKE '%@ Fri %' OR subject LIKE '%@ Sat %'
    OR subject LIKE '%@ Sun %'
  );
SQL
echo "  Meetings categorized."

# Business/spam (LLP compliance, recruitment pitches, etc.)
duckdb "$DB" <<'SQL'
UPDATE emails
SET category = 'business', updated_at = current_timestamp
WHERE category = 'uncategorized'
  AND (
    from_email LIKE '%@mydbiz.in'
    OR from_email LIKE '%@mcaregistration.in'
    OR from_email LIKE '%@gstsk%'
    OR from_email LIKE '%@bharat-edge.com'
    OR from_email LIKE '%@ashvyaservices.com'
    OR from_email LIKE '%@llpfilings.com'
    OR from_email LIKE '%@legalease%'
    OR from_email LIKE '%@zappire.co'
    OR from_email LIKE '%@visarsoft.com'
    OR lower(subject) LIKE '%llp compliance%'
    OR lower(subject) LIKE '%campus hiring%'
    OR lower(subject) LIKE '%hire exceptional%'
  );
SQL
echo "  Business/spam categorized."

# Applications (intern, job applications, founder's office)
duckdb "$DB" <<'SQL'
UPDATE emails
SET category = 'application', updated_at = current_timestamp
WHERE category = 'uncategorized'
  AND (
    lower(subject) LIKE '%intern%'
    OR lower(subject) LIKE '%application for%'
    OR lower(subject) LIKE '%founder''s office%'
    OR lower(subject) LIKE '%founders office%'
    OR lower(subject) LIKE '%job application%'
    OR lower(subject) LIKE '%aspiring to work%'
    OR lower(subject) LIKE '%your 1st hire%'
    OR lower(body_preview) LIKE '%founder''s office intern%'
    OR lower(body_preview) LIKE '%founders office intern%'
  );
SQL
echo "  Applications categorized."

echo ""
echo "=== Category Summary ==="
duckdb "$DB" -box <<'SQL'
SELECT
    category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'unseen') as unseen
FROM emails
GROUP BY category
ORDER BY total DESC;
SQL

echo ""
echo "=== Uncategorized Emails (for manual review) ==="
duckdb "$DB" -box <<'SQL'
SELECT
    gmail_id,
    substr(from_name || ' <' || from_email || '>', 1, 45) as "from",
    substr(COALESCE(subject, '(no subject)'), 1, 55) as subject,
    strftime(date, '%Y-%m-%d') as date
FROM emails
WHERE category = 'uncategorized'
ORDER BY date DESC
LIMIT 50;
SQL

UNCATEGORIZED=$(duckdb "$DB" -noheader -csv "SELECT COUNT(*) FROM emails WHERE category = 'uncategorized';")
echo ""
echo "$UNCATEGORIZED emails remain uncategorized."
