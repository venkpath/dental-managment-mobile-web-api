# Smart Dental Desk — SEO Plan & Tracker

**Owner:** Prasanth
**Started:** 2026-04-18
**Goal:** Rank on page 1 for "dental clinic management software India" and 20+ long-tail variants within 12 months.
**Tool:** Ubersuggest (Neil Patel) — 7-day free trial → decision after day 7.

---

## Baseline (2026-04-18)

| Metric | Value |
|---|---|
| On-page SEO score | 77 → **86** after fixes |
| Organic monthly traffic | 0 |
| Organic keywords ranked | 0 |
| Backlinks | 1 |
| Indexed pages | 17 |
| Domain age | New |

---

## Phase 0 — Done ✅ (2026-04-18)

- [x] Title duplication bug fixed across 11 pages
- [x] `/blog` listing expanded from 17 → ~900 words (categories, popular topics)
- [x] `/demo` page expanded from 154 → ~900 words (trust strip, timeline, FAQ + FAQPage schema)
- [x] `/features/appointments` renamed to `/features/appointment-scheduling-software` with 301 redirect
- [x] FAQPage JSON-LD added to `/demo` and `/features/appointment-scheduling-software`
- [x] Long-form intro + 6 FAQs added to appointments feature page
- [x] `seoTitle` field on blog posts (short `<title>` + long H1)
- [x] Sitemap + internal links updated

---

## Phase 1 — 7-Day Ubersuggest Trial Sprint (REVISED after Day 1 data analysis)

**Deadline:** 2026-04-25 (trial ends)

### Day 1 — Competitor data extraction ✅ (2026-04-18, Prasanth)

- [x] Added 8 competitors in Ubersuggest: `cliniify.com`, `dentee.com`, `dentalclinicapp.com`, `practo.com`, `mocdoc.com`, `bestosys.com`, `healthplix.com`, `dentsoft-dental-software.com`
- [x] Exported **Top Pages** PDFs → `dental-frontend/src/seo-audit/top pages/`
- [x] Exported **Keywords Gap** CSVs → `dental-frontend/src/seo-audit/keywords-gap/`
- [x] Exported **Backlinks** CSVs → `dental-frontend/src/seo-audit/backlinks/`

### Day 2 — Data analysis ✅ (2026-04-19, Claude)

- [x] Built Python analysis pipeline (`_analyze.py`) with dental-B2B filter + US-entity blacklist
- [x] Processed 5,748 keyword rows → 240 genuine B2B-relevant targets
- [x] Outputs: winnable (74), stretch (41), head (80) + 10 topical clusters + 243 outreach targets
- [x] **Key finding:** original 8-city plan invalid — only Chennai shows real demand in competitor data

**Analysis outputs:** [dental-frontend/src/seo-audit/_analysis/](dental-frontend/src/seo-audit/_analysis/)

### Day 3–4 — Chennai city page + 4 cornerstone blogs ✅ (2026-04-19, Claude)

Replaced the 8-city plan with data-driven content based on actual competitor gap:

- [x] `/dental-software/chennai` — ~1,500-word Chennai city page (targets "billing software chennai" 2,900 vol, SD 11). BreadcrumbList + FAQPage schema.
- [x] `/blog/best-dental-practice-management-software-india-2026` — named comparison cornerstone (Cliniify, Dentee, Mocdoc, Practo Ray, Bestosys, us). Targets 8,100-vol "practice management software dental" head term.
- [x] `/blog/dental-emr-software-india-guide` — covers the 29-keyword EMR cluster.
- [x] `/blog/online-dental-appointment-booking-reduce-no-shows` — 720-vol "booking dental appointment online" + 10 cluster terms.
- [x] `/blog/gst-compliant-dental-billing-software-india-2026` — supports Chennai page + 11-term GST cluster.
- [x] `Organization` + `SoftwareApplication` JSON-LD added to root layout
- [x] `sitemap.ts` updated with Chennai + 4 new blog slugs

**Killed from original plan** (empty/weak keyword clusters): "How to Start a Dental Clinic" (1-term cluster), "DPDP compliance" (0-term cluster), 7 of the 8 city pages (no demand evidence in gap data).

### Day 5–7 — Prasanth's ops work (runs in parallel)

- [x] **P0** Submit updated sitemap in Google Search Console — ✅ 2026-04-19 (20 URLs discovered)
- [x] **P0** Bing Webmaster Tools — verify + submit sitemap — ✅ 2026-04-19 (20 URLs processed)
- [x] **P0** Request indexing in GSC for 5 new URLs (Chennai + 4 blogs) — ✅ 2026-04-19
- [x] **P0** Request indexing in Bing for 6 priority URLs — ✅ 2026-04-19
- [ ] **P1** Submit to 10 directories (3-4 hrs one sitting):
  - [x] Capterra — submitted 2026-04-18, in review
  - [x] SoftwareSuggest — LIVE 2026-04-20 → https://www.softwaresuggest.com/smart-dental-desk
  - [x] Goodfirms — submitted 2026-04-19
  - [x] SaaSHub — submitted 2026-04-19
  - [x] IndianYellowPages — submitted 2026-04-19
  - [x] Techjockey — submitted 2026-04-19
  - [ ] BetaList (needs pitch paragraph from Claude)
  - [ ] JustDial (phone-heavy, plan for calls)
  - [ ] Sulekha (phone-heavy)
  - [ ] ~~G2~~ — **deferred to Month 3** when 2-3 pilots committed (ICP doesn't browse G2 anyway)
  - [ ] ~~Clutch~~ — **skip indefinitely** (agency-focused, not SaaS)
- [ ] **P1** HARO (Connectively) + Qwoted signup; respond 2×/week to dental/SMB queries
- [ ] **P2** Review [06_backlink_outreach_list.csv](dental-frontend/src/seo-audit/_analysis/06_backlink_outreach_list.csv), pick top 30 DA domains → Claude drafts outreach email template

### Day 7 — Decision point (2026-04-25)

**Recommendation: cancel Ubersuggest.** CSVs now contain 6 months of content direction. GSC + Bing Webmaster cover tracking. Re-subscribe for one month if rankings stall around month 4.

---

## Small backlinks tracker (Tier 1 — social/profile backlinks)

- [x] **Crunchbase** (DA 91) — submitted 2026-04-19 ✅
- [ ] **LinkedIn Company Page** (DA 100) — waiting 1-2 days for account activation
- [ ] **Wellfound / AngelList** (DA 87)
- [ ] **Facebook Business Page** (DA 100)
- [x] **X (Twitter) profile** (DA 100) — @smartdentaldesk live 2026-04-19 ✅
- [x] **Instagram Business** (DA 100) — @smartdentaldesk live 2026-04-19 ✅

## Small backlinks tracker (Tier 2 — next weekend)

- [ ] StartupIndia (DA 70)
- [ ] Udyam MSME registration (DA 80)
- [ ] IndieHackers founder profile (DA 69)
- [ ] Product Hunt Maker profile (DA 90)
- [ ] Alternative.to (DA 75)

## Live task state (updated 2026-04-19)

### Claude — pending work (what I owe you)
- [ ] **Feature bullet list** (8-10 bullets) reusable for G2, BetaList, IndianYellowPages
- [ ] **BetaList pitch paragraph** (2-3 sentences)
- [ ] **50/150-word descriptions for G2 + Capterra format** (different from Goodfirms)
- [ ] **Outreach email template** — blocked: waiting for Prasanth's top-30 domain shortlist from `06_backlink_outreach_list.csv`
- [ ] **Add ERP4Dentist as 9th competitor** to `/blog/best-dental-practice-management-software-india-2026` — blocked: waiting for Prasanth's go-ahead
- [ ] **Navbar `rel="nofollow"` on /login and /register** (~2 min edit, silences 2 cosmetic Bing errors, low priority)
- [ ] **Weekly blog content** (Phase 5, starts once directory grind is done)
- [ ] **Next city pages** — Bengaluru, Hyderabad, Mumbai (Phase 5, after Chennai shows GSC traction in 4-6 weeks)

### Prasanth — pending work (what's on your plate)
- [ ] **Set up work email** `prasanth@smartdentaldesk.com` (blocks G2)
- [ ] **Line up 2-3 pilot dentist clinics** (ask sister's dentist network) — needed for G2 review + case studies
- [ ] **Review `_analysis/06_backlink_outreach_list.csv`** → send Claude top-30 DA domains for outreach template
- [ ] **Decide**: add ERP4Dentist as 9th competitor to comparison blog? yes/no
- [ ] **Submit IndianYellowPages** (tonight, 10 min, copy ready)
- [ ] **HARO + Qwoted signup** (15 min one-time)
- [ ] **Ubersuggest cancel/extend decision** on 2026-04-25

---

## Phase 2 — Foundation (Week 1, in parallel)

### Prasanth

- [x] Google Search Console verified (already done)
- [x] Google Analytics connected (already done)
- [ ] Submit updated `sitemap.xml` in Search Console after Phase 1 deploy
- [ ] Bing Webmaster Tools — verify + submit sitemap (10 min)
- [ ] Redeploy current code so title fixes + expanded pages go live
- [ ] Re-crawl Ubersuggest → confirm score > 90

### Skip for now
- ~~Google Business Profile~~ (skipped per Prasanth)

---

## Phase 3 — Technical + Trust (Weeks 4–6)

### Claude
- [ ] Core Web Vitals audit (PageSpeed Insights on `/`, `/pricing`, `/demo`)
- [ ] Image optimization pass — WebP/AVIF, lazy loading, proper sizing
- [ ] Add `Organization` schema to root layout
- [ ] Add `SoftwareApplication` schema (with `AggregateRating` once reviews exist)
- [ ] Check image `alt` tags across marketing pages

### Prasanth
- [ ] Collect 3–5 real case studies / testimonials (clinic name, photo, metrics)
- [ ] Send to Claude for building a `/case-studies/[slug]` section

---

## Phase 4 — Off-Page / Backlinks (Month 2–3, ongoing)

**This is the real grind. Tools don't do this for you.**

### Directory submissions (target: 15 listings by end of Month 2)
- [ ] IndianYellowPages
- [ ] Sulekha
- [ ] JustDial
- [ ] IndiaMart
- [ ] IDA (Indian Dental Association) member directory
- [ ] Dentalkart blog / directory
- [ ] Dental Tribune India
- [ ] StartupIndia / MSME listing
- [ ] G2 / Capterra / SoftwareSuggest (paid SaaS directories)
- [ ] Goodfirms
- [ ] TrustPilot
- [ ] Clutch
- [ ] Product Hunt launch
- [ ] SaaSHub
- [ ] BetaList

### Guest posts (target: 1/month)
- [ ] Month 1: pitch 5 dental/SMB blogs
- [ ] Month 2: publish first guest post with backlink
- [ ] Ongoing: maintain 1/month cadence

### HARO / Qwoted / SourceBottle
- [ ] Sign up for HARO (now Connectively) + Qwoted
- [ ] Respond to "dental expert India" queries daily
- [ ] Target: 2–3 media backlinks/month

### Competitor backlink outreach
- [ ] Export competitor backlinks (Day 1 Ubersuggest exports)
- [ ] Filter for do-follow, DA > 30, dental/SMB relevance
- [ ] Email template + outreach (target 10/week)

---

## Phase 5 — Ongoing cadence (Month 3+)

- [ ] 1 blog post/week (non-negotiable for 12 months)
- [ ] Weekly rank check in Ubersuggest (or Search Console if canceled)
- [ ] Monthly Search Console review — new query opportunities
- [ ] Monthly audit re-run — catch regressions
- [ ] Quarterly content refresh — update top 10 ranking pages

---

## Key metrics to watch (monthly)

| Metric | Source | Target by Month 3 | Target by Month 6 | Target by Month 12 |
|---|---|---|---|---|
| Organic traffic | Search Console | 200/mo | 1,500/mo | 8,000/mo |
| Ranking keywords | Ubersuggest / GSC | 20 | 100 | 400 |
| Backlinks | Ubersuggest | 15 | 40 | 100 |
| Indexed pages | Search Console | 40 | 60 | 100+ |
| Audit score | Ubersuggest | 90+ | 92+ | 92+ |

---

## Decision log

- **2026-04-18** — Started SEO push after Neil Patel audit showed score 77.
- **2026-04-18** — Renamed `/features/appointments` → `/features/appointment-scheduling-software` (rationale: zero traffic/backlinks now, best time for slug changes).
- **2026-04-18** — Skipped Google Business Profile (no physical clinic address).
- **2026-04-19** — Analysed Day-1 competitor data. Killed 7-of-8 city pages (no demand signal) and 2 blog posts from original plan (empty clusters). Replaced with Chennai city page + 4 cornerstone blogs aligned to real keyword opportunity.
- **2026-04-19** — Decided to name competitors directly in comparison post (Cliniify, Dentee, Mocdoc, Practo Ray, Bestosys) for branded-query SEO; guardrail is fair + fact-based tone.
- **2026-04-19** — Added `Organization` + `SoftwareApplication` JSON-LD to root layout.
- **2026-04-25** — _(pending)_ Ubersuggest trial decision. Current recommendation: cancel.

---

## References

- Audit CSVs: [dental-frontend/src/seo-audit/](dental-frontend/src/seo-audit/)
- Sitemap: [dental-frontend/src/app/sitemap.ts](dental-frontend/src/app/sitemap.ts)
- Robots: [dental-frontend/src/app/robots.ts](dental-frontend/src/app/robots.ts)
- Root metadata: [dental-frontend/src/app/layout.tsx](dental-frontend/src/app/layout.tsx)
- Blog data: [dental-frontend/src/app/(marketing)/blog/data.ts](dental-frontend/src/app/(marketing)/blog/data.ts)
