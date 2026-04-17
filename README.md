# LinkedIn Post Generator from GitHub

Paste a GitHub repo URL → get 3 LinkedIn post drafts in different tones (narrative, technical, feedback).

**[→ Live demo](https://linkedin-post-generator-rouge.vercel.app)**

## What it does

1. Fetches the repo's README, last 10 commits, detected stack, and languages via GitHub API
2. Sends structured context to Claude (Anthropic) via Vercel AI SDK
3. Returns 3 ready-to-publish LinkedIn posts in different tones:
   - **Narratif** — storytelling, the why and how
   - **Technique** — architecture, tech choices, for devs
   - **Retour d'expérience** — honest lessons learned

## Stack

- **Next.js 15** — App Router, TypeScript strict
- **Vercel AI SDK** + **Anthropic Claude** — structured generation with `generateObject`
- **Octokit** — GitHub data fetching
- **Tailwind CSS** — styling, no component library

## Run locally

```bash
git clone https://github.com/guyboireau/linkedin-post-generator
cd linkedin-post-generator
npm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY in .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/guyboireau/linkedin-post-generator&env=ANTHROPIC_API_KEY)

You'll need an [Anthropic API key](https://console.anthropic.com).

## Architecture

```text
app/
├── api/
│   ├── fetch-repo/      # GitHub data extraction (Octokit)
│   └── generate-posts/  # LLM structured generation (generateObject + Zod)
└── page.tsx             # Single-page UI, no framework
```

## License

MIT — Made by [guyboireau.com](https://guyboireau.com)
