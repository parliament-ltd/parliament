# Hosting

Where Parliament's address, site and mail live, so any of them can be rebuilt
elsewhere. Checked by public lookup on 15 October 2026, and the key vault's
parts on 29 October, the day of the switch (C278). Nothing here is secret:
every record below can be read by anyone with a DNS lookup.

| Part | Where | Notes |
|---|---|---|
| Address | `parliament.ltd` | The bare domain redirects to `www.parliament.ltd` |
| Registrar | Squarespace Domains | Two-factor, domain lock, auto-renew and WHOIS privacy are on |
| DNS | deSEC (`ns1.desec.io`, `ns2.desec.org`) | Signed with DNSSEC; the DS record is published at the registrar |
| Site | Netlify, site `project-apollo-v1` | Builds `main` of the public repository. Auto publishing is locked, so a release goes live only when its build is published by hand (C276 (d)). Certificate from Let's Encrypt, renewed by Netlify |
| Key vault | Netlify, site `parliament-keys`, at `keys.parliament.ltd` | Builds the public repository's `vault` folder. Auto publishing is locked, and a build is published only when the vault's files change (C170, C277). Certificate from Let's Encrypt for `parliament.ltd` and `*.parliament.ltd`, renewed by Netlify |
| Mail | Proton Mail | |
| Code | GitHub, `parliament-ltd/parliament`, public | Under the organization `parliament-ltd`. `main` cannot be force pushed or deleted. Each release is immutable and carries its two archives and `SHA256SUMS` (C276) |
| Code mirror | Bitbucket, `parliament-ltd/parliament`, public | Two-factor on. Each release is pushed to it with GitHub (C264 (i)) |
| Standby site | Cloudflare Pages | Two-factor on. The site is made from the public repository in stage 15, piece 8 |

## Records

| Name | Type | Value | For |
|---|---|---|---|
| `parliament.ltd` | A | `75.2.60.5` | Netlify's load balancer, for the bare domain |
| `www.parliament.ltd` | CNAME | `project-apollo-v1.netlify.app` | The site |
| `keys.parliament.ltd` | CNAME | `parliament-keys.netlify.app` | The key vault |
| `parliament.ltd` | MX | `10 mail.protonmail.ch` | Mail |
| `parliament.ltd` | MX | `20 mailsec.protonmail.ch` | Mail, backup server |
| `parliament.ltd` | TXT | `v=spf1 include:_spf.protonmail.ch ~all` | Which servers may send as the domain |
| `parliament.ltd` | TXT | `protonmail-verification=…` | Proves the domain to Proton; Proton shows the value again if it is needed |
| `_dmarc.parliament.ltd` | TXT | `v=DMARC1; p=quarantine` | What receivers do with mail that fails the checks |
| `protonmail._domainkey` | CNAME | `protonmail.domainkey.<id>.domains.proton.ch` | Signing keys for outgoing mail (DKIM); the full values are in Proton's domain settings |
| `protonmail2._domainkey` | CNAME | `protonmail2.domainkey.<id>.domains.proton.ch` | The same |
| `protonmail3._domainkey` | CNAME | `protonmail3.domainkey.<id>.domains.proton.ch` | The same |

## Publishing a release

1. Release here with `node scripts/release.mjs`: the check, both builds, both
   archives, `SHA256SUMS` and the tag. It stops if any file has Windows line
   ends (C277).
2. Push `main` and the tag to GitHub and Bitbucket. Never a force push.
3. On GitHub, make the release from the tag, with the two archives and
   `SHA256SUMS` attached. It cannot be changed afterwards.
4. Netlify builds `main` on both sites, and both builds wait. Check the app's
   at its own address against the archive, then press "Publish deploy" on
   `project-apollo-v1`. Publish the vault's only if its files differ from what
   `keys.parliament.ltd` serves.
5. To go back, publish the previous deploy. If the release upgrades stored
   data, that is safe only in the first minutes, since upgraded data does not
   open in the older version.

## If the site has to move

1. Deploy the same builds to the standby host, with the same headers: the app,
   and the vault as a site of its own.
2. At deSEC, point the A record for `parliament.ltd` and the CNAMEs for `www`
   and `keys` at the standby.
3. Check that the standby has issued a certificate for all three names before
   announcing anything. The page frames only `keys.parliament.ltd`, and the
   vault lets only `www.parliament.ltd` frame it, so both move together.

The address stays the same, so everyone's chats and settings, which belong to
the address in their browser, are still there.

## If DNS has to move

DNSSEC makes this the one step that can take the address down if done in the
wrong order.

1. At the registrar, remove the DS record, then wait at least a day.
2. Create the records above at the new DNS host.
3. At the registrar, switch the nameservers to the new host.
4. Once the new host signs the zone, publish its DS record at the registrar.
