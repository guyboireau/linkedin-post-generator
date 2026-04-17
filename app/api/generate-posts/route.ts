import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const RepoContextSchema = z.object({
  repo: z.object({
    fullName: z.string(),
    description: z.string().nullable(),
    stars: z.number(),
    forks: z.number(),
    topics: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
    license: z.string().nullable(),
  }),
  languages: z.array(z.string()),
  dependencies: z
    .object({
      runtime: z.array(z.string()),
      dev: z.array(z.string()),
    })
    .nullable(),
  recentCommits: z.array(
    z.object({
      message: z.string(),
      date: z.string().optional(),
      author: z.string().optional(),
    })
  ),
  readme: z.string(),
})

const PostsOutputSchema = z.object({
  posts: z.tuple([
    z.object({
      tone: z.literal('narrative'),
      label: z.literal('Narratif'),
      content: z.string().describe('Post LinkedIn narratif, 1200-1800 caractères'),
      hook: z.string().describe('Première phrase accrocheuse du post'),
    }),
    z.object({
      tone: z.literal('technical'),
      label: z.literal('Technique'),
      content: z.string().describe('Post LinkedIn technique, 1200-1800 caractères'),
      hook: z.string().describe('Première phrase accrocheuse du post'),
    }),
    z.object({
      tone: z.literal('rex'),
      label: z.literal("Retour d'expérience"),
      content: z.string().describe("Post LinkedIn REX / lessons learned, 1200-1800 caractères"),
      hook: z.string().describe('Première phrase accrocheuse du post'),
    }),
  ]),
})

function buildContext(ctx: z.infer<typeof RepoContextSchema>): string {
  const lines: string[] = [
    `# Repo : ${ctx.repo.fullName}`,
    `Description : ${ctx.repo.description ?? 'aucune'}`,
    `Stars : ${ctx.repo.stars} | Forks : ${ctx.repo.forks}`,
    `Licence : ${ctx.repo.license ?? 'non spécifiée'}`,
    `Topics : ${ctx.repo.topics.join(', ') || 'aucun'}`,
    `Langages : ${ctx.languages.join(', ') || 'non détectés'}`,
    '',
  ]

  if (ctx.dependencies) {
    const top = ctx.dependencies.runtime.slice(0, 15)
    lines.push(`Dépendances principales : ${top.join(', ')}`)
    lines.push('')
  }

  if (ctx.recentCommits.length > 0) {
    lines.push('## 10 derniers commits')
    ctx.recentCommits.forEach((c) => {
      lines.push(`- ${c.message}${c.author ? ` (${c.author})` : ''}`)
    })
    lines.push('')
  }

  if (ctx.readme) {
    lines.push('## README (extrait)')
    lines.push(ctx.readme.slice(0, 2000))
  }

  return lines.join('\n')
}

const SYSTEM_PROMPT = `Tu es un expert en personal branding pour développeurs sur LinkedIn.
Tu génères des posts percutants à partir d'informations sur un projet GitHub.

Règles absolues :
- Longueur : 1200 à 1800 caractères par post (espaces inclus)
- Pas d'emojis sauf 1-2 maximum si vraiment pertinents
- Pas de hashtags génériques (#innovation, #tech) — 2-3 hashtags ciblés max en fin de post
- Pas de formules creuses ("Dans un monde où...", "La tech évolue vite...")
- Commencer par une accroche forte qui donne envie de cliquer "voir plus"
- Écrire à la première personne, ton naturel et direct
- Terminer par une question ou un call to action concret

Ton NARRATIF : raconte l'histoire du projet — pourquoi, comment, ce qui était dur, ce que ça a changé.
Ton TECHNIQUE : explique un choix technique précis, une architecture, un problème résolu — pour les devs.
Ton REX : bilan honnête — ce qui a marché, ce qui n'a pas marché, ce que tu referais différemment.`

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = RepoContextSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Contexte repo invalide' }, { status: 400 })
  }

  const context = buildContext(parsed.data)

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: PostsOutputSchema,
      system: SYSTEM_PROMPT,
      prompt: `Génère 3 posts LinkedIn pour ce projet GitHub :\n\n${context}`,
    })

    return NextResponse.json(object)
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  }
}
