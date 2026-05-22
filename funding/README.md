# Funding materials — Smart Dental Desk

Two artifacts:

1. **[pitch-deck.html](pitch-deck.html)** — 14-slide investor deck. Open in a browser. Press `P` to print to PDF, or use Chrome → *Print* → *Save as PDF* and the slide CSS automatically reflows to print-friendly. The PDF can be imported into PowerPoint or Google Slides as a starting point.
2. **[grant-proposal.md](grant-proposal.md)** — Long-form written proposal targeting a Canadian healthcare-AI grant program. Pre-seed / seed framing.

## Audience framing

Both documents are written for a **Canadian healthcare AI grant program** (pre-seed / seed). Geography is reframed: India is the validated pilot/launch market, Canada is the commercialization target. The country-agnostic architecture (insurance strategy pattern, with CDCP + Sun Life Canada already seeded) is the technical bridge.

## Placeholders to fill before submission

Search both files for `[TBD]` and `[X]` markers. Key items:

### Numbers / traction
- `[X]` clinics live (pilot market)
- `[X]K` MRR
- Per-clinic no-show cost (CAD)
- TAM / SAM / SOM dollar values
- Annual no-show loss per clinic

### Financial ask
- Total ask in CAD
- Runway / program duration in months
- Final CAD pricing for Standard and Growth (currently $49–69 and $99–149 range)

### People (Slide 12 of deck, Section 10 of proposal)
- Founder / CEO name + background
- Clinical advisor name + credentials
- Identified advisors / Canadian market lead candidates

### Consortium / collaboration (Section 8 of proposal, Slide 11 of deck)
- Academic partner (Schulich / U of T / UBC) — name once confirmed
- Pilot clinic LOIs
- Compliance consultant
- Cloud / infra partner

### Unit economics (Section 9.4 of proposal)
- CAC, ACV, payback period, LTV/CAC targets

## Exporting the deck to PowerPoint

Easiest path:
1. Open `pitch-deck.html` in Chrome
2. `Ctrl+P` → *Save as PDF* → use **Background graphics: ON**
3. In PowerPoint: *Insert → New Slide from Outline* won't preserve layout. Instead, use a PDF-to-PPTX converter (Adobe Acrobat *Export PDF*, or `pdf2pptx`) — each PDF page becomes a slide image you can layer text on top of, or you can rebuild slides in PPT using the deck as the visual reference.

For pure presentation use, the HTML deck works as-is — `→` / `←` arrows navigate, `P` prints.

## Source material reused

The proposal pulls from existing repo artifacts so you can swap in real text/screenshots:
- `ARCHITECTURE.md`
- `SECURITY-CHECKLIST.md`
- `PHASE_STATUS.md` (phase completion)
- `brochure.html`, `demo-deck.html` (visual reference for the Smart Dental Desk brand)

## Honest framing

The deck and proposal claim:
- 7 AI features in production ✓ (verified against memory)
- Phases 1–6 complete, Phase 7 in progress ✓
- Pilot revenue in India ✓ (paying clinics exist)
- Country-agnostic insurance architecture ✓ (verified — Canadian providers seeded)

They do **not** claim:
- ML-trained predictors (we use LLMs + rules-based scoring — honestly labeled)
- Canadian clinics already onboarded (positioned as next milestone)
- Specific traction numbers (left as `[TBD]` for you to fill)

This matters: grant reviewers and investors check claims. Don't inflate the `[TBD]` numbers; honest small numbers + working product beats hyped vapor.
