# Chime 🔔
> *feedback into focus*

Chime turns NPS survey responses into the 2-3 things actually worth acting on — instead of a spreadsheet nobody has time to read. A vibe-coded project, built mostly by prompting rather than writing code by hand.

**live at → [getchimed.site](https://getchimed.site)**

---

## -> what it does

- upload a CSV, or import straight from a Google Sheet
- an LLM clusters responses into themes — separately for promoters, passives, and detractors, since averaging everyone together hides what matters
- get an NPS score benchmarked against your industry, word-cloud themes, and a prioritized fix list by team
- export as a PDF, a Google Sheet, a CSV, or a copy-paste Slack summary

built on Rahul Vohra's product-market fit framework from Superhuman.

---

## -> built with

vercel v0 · claude design + claude code · supabase · anthropic API · google OAuth + drive/sheets · vercel hosting · spaceship

---

## -> what's next

- a downloadable NPS question template so people design the right survey before they ever get to upload

---

## -> known gaps

- [ ] RLS policies need a periodic re-check
- [ ] google sheets export is one combined sheet, not multi-tab (tradeoff for a non-sensitive OAuth scope)

---

Made by [Swabhi](https://www.linkedin.com/in/swabhi-gupta/)
