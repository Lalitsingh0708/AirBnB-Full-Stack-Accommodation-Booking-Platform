# StayNest — Design & Copy Rules (Non-Negotiable)

## Core Principle
This project must NEVER look like it was built by AI. Every line of copy, every design decision, every UI element must feel like a real human product team made it.

---

## What to NEVER Do

### Copy / Text
- No vague hero text ("Find your perfect stay", "Discover amazing places", "Your home away from home")
- No em dashes (—) in copy
- No buzzwords: "seamless", "effortless", "curated", "handpicked", "discover", "unlock"
- No fake taglines that say nothing
- No hardcoded fake data ("Entire villa hosted by Admin", "4 guests — 2 bedrooms")
- No hardcoded names ("Welcome, Lalit Baghel")
- No "Made with AI" tags anywhere
- No fake review snippets
- No fake customer counters ("10,000+ happy guests")
- No fake metrics / fake social proof

### Design
- No purple gradients
- No pill-shaped buttons (no border-radius 9999px on CTA buttons)
- No emoji icons anywhere in the UI (no house emoji, pin emoji, hamburger emoji, sparkles etc.)
- No cursor animations / custom cursor JS
- No crazy scroll animations (parallax, text that flies in on scroll)
- No AI-generated photos (Unsplash filler photos also off-limits for hero sections)
- No glassmorphism for the sake of it (only if it serves a real purpose)
- No floating gradient orbs / blobs as decoration

### Technical
- No res.send() raw HTML strings as responses — always use res.render() or res.redirect()
- No .ejs extension in route URLs
- No emoji as favicon

---

## What to Always Do

### Copy
- Write copy like a real product — specific, functional, direct
- Describe the actual feature, not a feeling
- Use Indian Rupee (Rs.) for pricing since the project targets India
- Page titles: "Property Name | StayNest" format

### Design
- Use SVG icons (Heroicons or Feather Icons) — never emoji as UI icons
- Typography: Inter or Outfit from Google Fonts
- Favicon: custom SVG favicon with StayNest brand mark
- Buttons: border-radius 8px to 12px max — not pill, not sharp square
- Colors: StayNest brand is rose/warm red (#E8234A primary) — no random color switches
- Consistent spacing system
- Real footer with Privacy Policy + Terms links + copyright

### Meta / SEO
- Every page needs a title tag in "Page | StayNest" format
- Every page needs a meta description tag
- Use semantic HTML (header, main, section, article, footer, nav)
- All images need descriptive alt text

### Data
- All displayed data must come from the database / model — nothing hardcoded in views
- Property details (bedrooms, bathrooms, guest count) must be real fields stored in the model

---

## Brand
- Name: StayNest
- Primary color: #E8234A (rose red)
- Font: Inter (body)
- Logo: Text-based wordmark "StayNest" — no house emoji

---

## Checklist Before Every Feature
1. Does the copy sound like a real human wrote it?
2. Are there any emoji used as icons?
3. Is any data hardcoded in the view that should come from the DB?
4. Does the button look like a pill? Fix it.
5. Is there a fake counter, fake review, or fake metric anywhere?
6. Does the page have a proper title and meta description?

---

## Location & Search Unbiased Policy (Non-Negotiable)
- **Unbiased & Dynamic Location-Awareness**: Never bias the project or search results towards the United States. Location search, map autocomplete, and geocoding MUST dynamically prioritize the user's current device location and country (defaulting to India `countrycodes=in` for this project).
- When a user searches (e.g., "Lovely Professional University", "Love", "Agra", "Munnar", "Kochi"), prioritize matching landmarks and streets within the local country and region first rather than US/Canada towns.
- Auto-detect the device's actual country dynamically (via GPS coordinates, timezone, or browser locale), and bias search viewbox to the user's active viewport/coordinates. International destinations should still be searchable if typed explicitly, but local proximity always takes precedence.
