# LinkedIn Post Generator from GitHub

Paste a GitHub repo URL → get 3 LinkedIn post drafts in different tones (narrative, technical, feedback).

## Demo

> Coming soon

## Stack

- **Next.js 15** (App Router)
- **Anthropic Claude** via Vercel AI SDK
- **Octokit** for GitHub data fetching
- **Tailwind CSS**

## Run locally

```bash
git clone https://github.com/guyboireau/linkedin-post-generator
cd linkedin-post-generator
npm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY in .env.local
npm run dev
```

## Architecture

```text
app/
├── api/
│   ├── fetch-repo/     # GitHub data extraction
│   └── generate-posts/ # LLM post generation
├── page.tsx            # Main UI
└── components/
```

## License

MIT — Made by [guyboireau.com](https://guyboireau.com)
