# Deliverability Dossier — artofficialintelligence.academy

Purpose
Evidence and configuration for SPF, DKIM, and DMARC to ensure newsletter deliverability and audit completeness. Sender: artofficialintelligence.academy via Ghost(Pro) (Mailgun-managed).

Scope
- Domain: artofficialintelligence.academy
- Provider: Ghost(Pro) built-in mail (Mailgun under the hood)
- Newsletter: Ghost native newsletter

DNS Records (Authoritative)
Note: Replace example values with actual production records from Ghost/Mailgun dashboard. Keep verification screenshots in /docs/dns/evidence/.

1) SPF (TXT at root)
Host: @
Type: TXT
Value (example): v=spf1 include:mailgun.org -all
Policy: Enforce include:mailgun.org; hard fail (-all) preferred. At minimum ~all is acceptable during rollout, but p=quarantine DMARC requires alignment and strong SPF.

2) DKIM (CNAMEs)
Mailgun typically provisions s1 and s2 domainkeys:
Host: s1._domainkey
Type: CNAME
Target: s1.domainkey.artofficialintelligence.academy.mailgun.org.
Host: s2._domainkey
Type: CNAME
Target: s2.domainkey.artofficialintelligence.academy.mailgun.org.

3) DMARC (TXT)
Host: _dmarc
Type: TXT
Value (target policy): v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@artofficialintelligence.academy; ruf=mailto:dmarc-failures@artofficialintelligence.academy; fo=1; adkim=s; aspf=s
Policy requirement (per project gate): p=quarantine or stronger (p=reject). Alignment: strict (s) preferred.

4) MX (Reference)
If Mailgun is used for sending-only, primary MX for receiving may remain with current mail host. Include Mailgun MX if using routes:
Host: @
Type: MX
Value (optional for routing): mxa.mailgun.org. (priority 10), mxb.mailgun.org. (priority 10)

Verification Evidence
Attach dated screenshots and DNS query outputs:
- Ghost(Pro)/Mailgun DNS setup page showing:
  - Domain verified (green)
  - DKIM keys active
  - SPF status: Pass
  - DMARC status: Policy recognized
- DNS queries (dig/nslookup) captured at time of verification

Store files under: docs/dns/evidence/YYYY-MM-DD-<artifact>.png or .txt

Sample Verification Commands
Replace domain values as needed.

SPF
dig TXT artofficialintelligence.academy +short
nslookup -type=TXT artofficialintelligence.academy

DKIM
dig CNAME s1._domainkey.artofficialintelligence.academy +short
dig CNAME s2._domainkey.artofficialintelligence.academy +short

DMARC
dig TXT _dmarc.artofficialintelligence.academy +short
nslookup -type=TXT _dmarc.artofficialintelligence.academy

Acceptance Criteria (Deliverability Gate)
- SPF includes Mailgun include:mailgun.org and ends with -all (or ~all during initial rollout). No conflicting multiple SPF TXT records.
- Two DKIM selectors (s1 and s2) present and resolvable to Mailgun targets.
- DMARC p=quarantine or p=reject; rua mailbox established for aggregate reports; strict alignment (adkim=s; aspf=s) preferred.
- Evidence stored in repo with date and runbook link.

Runbook Links
- Success and ownership: docs/success-measurement-and-growth-protocols.md
- Business objectives: docs/business-objective-tracking.md
- Architecture fitness: docs/architecture-decisions.json (Newsletter open rate ≥ 35%; performance gates)

Change Log
- 2025-08-02: Initial dossier created; CI dns-verify planned to enforce SPF/DKIM/DMARC checks.
