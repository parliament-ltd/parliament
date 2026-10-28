# Hosting

Where Parliament's address, site and mail live, so any of them can be rebuilt
elsewhere. Checked by public lookup on 15 October 2026. Nothing here is secret:
every record below can be read by anyone with a DNS lookup.

| Part | Where | Notes |
|---|---|---|
| Address | `parliament.ltd` | The bare domain redirects to `www.parliament.ltd` |
| Registrar | Squarespace Domains | Two-factor, domain lock, auto-renew and WHOIS privacy are on |
| DNS | deSEC (`ns1.desec.io`, `ns2.desec.org`) | Signed with DNSSEC; the DS record is published at the registrar |
| Site | Netlify, site `project-apollo-v1` | Certificate from Let's Encrypt, renewed by Netlify |
| Mail | Proton Mail | |
| Code mirror | Bitbucket, workspace `parliament-ltd` | Two-factor on. The repository is made at going public; each release is pushed to it with GitHub (C264 (i)) |
| Standby site | Cloudflare Pages | Two-factor on. The site is made from the public repository in stage 15, piece 8 |

## Records

| Name | Type | Value | For |
|---|---|---|---|
| `parliament.ltd` | A | `75.2.60.5` | Netlify's load balancer, for the bare domain |
| `www.parliament.ltd` | CNAME | `project-apollo-v1.netlify.app` | The site |
| `parliament.ltd` | MX | `10 mail.protonmail.ch` | Mail |
| `parliament.ltd` | MX | `20 mailsec.protonmail.ch` | Mail, backup server |
| `parliament.ltd` | TXT | `v=spf1 include:_spf.protonmail.ch ~all` | Which servers may send as the domain |
| `parliament.ltd` | TXT | `protonmail-verification=…` | Proves the domain to Proton; Proton shows the value again if it is needed |
| `_dmarc.parliament.ltd` | TXT | `v=DMARC1; p=quarantine` | What receivers do with mail that fails the checks |
| `protonmail._domainkey` | CNAME | `protonmail.domainkey.<id>.domains.proton.ch` | Signing keys for outgoing mail (DKIM); the full values are in Proton's domain settings |
| `protonmail2._domainkey` | CNAME | `protonmail2.domainkey.<id>.domains.proton.ch` | The same |
| `protonmail3._domainkey` | CNAME | `protonmail3.domainkey.<id>.domains.proton.ch` | The same |

## If the site has to move

1. Deploy the same build to the standby host, with the same headers.
2. At deSEC, point the A record for `parliament.ltd` and the CNAME for `www` at the standby.
3. Check that the standby has issued a certificate for both names before announcing anything.

The address stays the same, so everyone's chats and settings, which belong to
the address in their browser, are still there.

## If DNS has to move

DNSSEC makes this the one step that can take the address down if done in the
wrong order.

1. At the registrar, remove the DS record, then wait at least a day.
2. Create the records above at the new DNS host.
3. At the registrar, switch the nameservers to the new host.
4. Once the new host signs the zone, publish its DS record at the registrar.
