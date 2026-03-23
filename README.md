# Map My Reads

A personal project turned public tool. Upload your reading export from Goodreads or StoryGraph and see the world through your books — which countries your authors come from, which literatures you keep returning to, which corners of the map you haven't touched yet.

It's a work in progress. Things might be rough around the edges.

**Live at [mapmyreads.com](https://mapmyreads.com)**

---

## How it works

Export your library from [Goodreads](https://www.goodreads.com/review/import) or [StoryGraph](https://app.thestorygraph.com/user-export) and drop the CSV into the app. No account needed — your data stays in your browser.

The app looks up each author on Wikidata to figure out their country of origin, then colours the map accordingly. Book covers come from Open Library. Both are cached so repeat lookups are instant.

You can manually correct any country that's wrong or missing, and share your map via a link.

---

## Running locally

```bash
npm install
npm run dev
```

You'll need a PostgreSQL database (the app uses it as a cache for author and cover lookups). Copy `.env.example` to `.env` and add your `DATABASE_URL`, then run:

```bash
npx prisma db push
```

---

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- MapLibre GL
- Prisma + PostgreSQL (Neon)
- Wikidata API for author countries
- Open Library for book covers

---

## Roadmap

This is still early. A lot of things work, but a lot of things could be better.
- **Adding books** — after the initial upload of books in the csv, add a mechanism for users to keep their maps updated
- **User accounts** — save your map between sessions, come back to it, track it over time
- **Translations** — the app is English-only right now, would love to support Spanish, French, and others
- **Reading stats** — breakdowns by year, genre, gender, language of original publication
- **More CSV formats** — beyond Goodreads and StoryGraph

---

## Privacy

Your book data never leaves your browser. The only things that touch the server are author names and ISBNs, used to look up countries and covers. Nothing is tied to you personally.

---

## License

MIT
