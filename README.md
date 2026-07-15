# Chime 🔔

> *feedback into focus*

Chime turns NPS survey responses into the 2-3 things actually worth acting on — instead of a spreadsheet nobody has time to read.

**live at → [getchimed.site](https://getchimed.site)**

---

## -> what it does

- upload a CSV, or import straight from a Google Sheet
- an LLM reads the real responses and clusters them into themes — separately for promoters, passives, and detractors, since averaging everyone together hides what actually matters
- get an NPS score benchmarked against your real industry, word-cloud themes, and a prioritized fix list by team
- export as a polished PDF, a Google Sheet, a CSV, or a copy-paste Slack summary

---

## -> tools & learning used to build this

second vibe-coded project (after [verbe.store](https://verbe.store)) — still mostly prompting my way through this, not writing code from scratch.

- **vercel v0** — UI generation and iteration
- **claude design + claude code** — the actual redesign pass, backend logic, auth debugging, most of the real engineering
- **supabase** — database, auth, row-level security
- **anthropic API** — the actual clustering, 3 separate calls per analysis (promoter/passive/detractor)
- **google cloud + OAuth** — sign-in, and Drive/Sheets import-export
- **vercel** — hosting + cron jobs (keeping supabase's free tier from pausing)
- **spaceship** — domain registration for getchimed.site

---

## -> what i learned building this

- OAuth scopes matter more than i expected — Google classifies some as "sensitive" and caps unverified apps at ~100 users, so i had to redesign the Drive integration around a non-sensitive scope instead of the obvious one
- popup-based auth flows are genuinely tricky — a full-page redirect will wipe out any in-progress work, learned that one the hard way mid-session
- LLM clustering only works if you tell it explicitly not to force-fit ambiguous feedback into a theme — letting it say "unclustered" instead of guessing was a real design decision, not an afterthought
- v0 will happily regenerate a file and quietly lose a bug fix you made two sessions ago — worth re-checking, not just assuming a fix stuck

---

## -> how this idea came about

i first ran into rahul vohra's product-market fit framework (from superhuman) while working with my co-founder at quso.ai — we were digging through NPS surveys trying to figure out which feedback actually mattered. the framework stuck with me: segment by promoter/passive/detractor, ask each group a different question, don't average everyone together.

years later, still in customer success, still reading NPS surveys for a living — i decided to just build the tool i wished existed.

---

## -> what's next

- **NPS question template** — a downloadable file/guide showing exactly which 4 questions to ask (matching the vohra framework: recommend score, who benefits most, main benefit, one thing to improve), so people actually send the right survey before they ever get to the upload step. right now the tool assumes you already have the right columns — it doesn't yet help you *design* the survey in the first place

---

## -> known gaps + what i'd improve next

- [ ] **RLS policies** need a periodic re-check — should always be scoped to the signed-in user, not left permissive
- [ ] **google sheets export** is a single combined sheet, not the cleaner multi-tab version — tradeoff for staying on a non-sensitive OAuth scope

---

## -> about me

**Swabhi Gupta** — customer success professional turned builder.

6+ years in CS across India, the Middle East, Singapore, and North America. Chime is what i wished i had every time i sat down with an NPS export and a deadline.

communities: women of CS · CS network · success hub

---

*built solo, mostly by asking nicely and iterating a lot.*
