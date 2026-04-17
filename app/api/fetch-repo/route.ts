import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import { z } from 'zod'

const RequestSchema = z.object({
  url: z.string().min(1),
})

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const { hostname, pathname } = new URL(normalized)
    if (hostname !== 'github.com') return null
    const parts = pathname.replace(/^\//, '').replace(/\.git$/, '').split('/')
    if (parts.length < 2 || !parts[0] || !parts[1]) return null
    return { owner: parts[0], repo: parts[1] }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  const coords = parseGitHubUrl(parsed.data.url)
  if (!coords) {
    return NextResponse.json({ error: 'URL GitHub invalide (format attendu : https://github.com/owner/repo)' }, { status: 400 })
  }

  const octokit = new Octokit()
  const { owner, repo } = coords

  // Fetch repo metadata first — bail early on 404/403
  let repoMeta
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo })
    repoMeta = data
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e.status === 404) return NextResponse.json({ error: 'Repo introuvable ou privé' }, { status: 404 })
    if (e.status === 403) return NextResponse.json({ error: 'Rate limit GitHub atteint, réessaie dans quelques minutes' }, { status: 429 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  // Parallel fetches — all optional, failures are silent
  const [commitsResult, languagesResult, readmeResult] = await Promise.allSettled([
    octokit.rest.repos.listCommits({ owner, repo, per_page: 10 }),
    octokit.rest.repos.listLanguages({ owner, repo }),
    octokit.rest.repos.getReadme({ owner, repo }),
  ])

  const languages =
    languagesResult.status === 'fulfilled' ? Object.keys(languagesResult.value.data) : []

  const commits =
    commitsResult.status === 'fulfilled'
      ? commitsResult.value.data.map((c) => ({
          message: c.commit.message.split('\n')[0],
          date: c.commit.author?.date,
          author: c.commit.author?.name,
        }))
      : []

  const readme =
    readmeResult.status === 'fulfilled'
      ? Buffer.from(readmeResult.value.data.content, 'base64').toString('utf-8').slice(0, 3000)
      : ''

  // Fetch package.json only for JS/TS repos
  let dependencies: { runtime: string[]; dev: string[] } | null = null
  if (languages.some((l) => ['TypeScript', 'JavaScript'].includes(l))) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: 'package.json' })
      if ('content' in data) {
        const pkg = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
        dependencies = {
          runtime: Object.keys(pkg.dependencies ?? {}),
          dev: Object.keys(pkg.devDependencies ?? {}),
        }
      }
    } catch {
      // No package.json or parse error — skip silently
    }
  }

  return NextResponse.json({
    repo: {
      fullName: repoMeta.full_name,
      description: repoMeta.description,
      stars: repoMeta.stargazers_count,
      forks: repoMeta.forks_count,
      topics: repoMeta.topics ?? [],
      createdAt: repoMeta.created_at,
      updatedAt: repoMeta.updated_at,
      license: repoMeta.license?.name ?? null,
    },
    languages,
    dependencies,
    recentCommits: commits,
    readme,
  })
}
