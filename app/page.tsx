'use client'

import { useState } from 'react'

type Post = {
  tone: 'narrative' | 'technical' | 'rex'
  label: string
  content: string
  hook: string
}

type GeneratedPosts = { posts: [Post, Post, Post] }

type Status = 'idle' | 'fetching' | 'generating' | 'done' | 'error'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<GeneratedPosts | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function generate() {
    if (!url.trim()) return
    setStatus('fetching')
    setError('')
    setResult(null)

    // Step 1 — fetch repo data
    const fetchRes = await fetch('/api/fetch-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    })

    if (!fetchRes.ok) {
      const { error: msg } = await fetchRes.json().catch(() => ({ error: 'Erreur réseau' }))
      setError(msg ?? 'Erreur lors de la récupération du repo')
      setStatus('error')
      return
    }

    const repoContext = await fetchRes.json()

    // Step 2 — generate posts
    setStatus('generating')
    const genRes = await fetch('/api/generate-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repoContext),
    })

    if (!genRes.ok) {
      const { error: msg } = await genRes.json().catch(() => ({ error: 'Erreur réseau' }))
      setError(msg ?? 'Erreur lors de la génération')
      setStatus('error')
      return
    }

    const posts = await genRes.json()
    setResult(posts)
    setStatus('done')
  }

  async function copy(tone: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(tone)
    setTimeout(() => setCopied(null), 2000)
  }

  const statusLabel: Record<Status, string> = {
    idle: '',
    fetching: 'Récupération du repo GitHub...',
    generating: 'Génération des posts avec Claude...',
    done: '',
    error: '',
  }

  return (
    <div className="flex flex-col min-h-full">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3">LinkedIn Post Generator</h1>
          <p className="text-zinc-500 text-base">
            Colle une URL de repo GitHub → 3 posts LinkedIn prêts à publier
          </p>
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-10 max-w-2xl mx-auto">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="https://github.com/owner/repo"
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-200 bg-white text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition placeholder:text-zinc-400"
          />
          <button
            onClick={generate}
            disabled={status === 'fetching' || status === 'generating' || !url.trim()}
            className="px-6 py-3 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Générer
          </button>
        </div>

        {/* Status */}
        {(status === 'fetching' || status === 'generating') && (
          <div className="flex items-center justify-center gap-3 text-zinc-500 text-sm mb-10">
            <span className="inline-block w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
            {statusLabel[status]}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="max-w-2xl mx-auto mb-10 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Posts */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {result.posts.map((post) => (
              <div
                key={post.tone}
                className="flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {post.label}
                  </span>
                  <button
                    onClick={() => copy(post.tone, post.content)}
                    className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 transition text-zinc-600 font-medium"
                  >
                    {copied === post.tone ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <div className="flex-1 px-5 py-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
                    {post.content}
                  </p>
                </div>
                <div className="px-5 py-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">{post.content.length} caractères</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-400">
        Made by{' '}
        <a
          href="https://guyboireau.com"
          className="underline hover:text-zinc-600 transition"
          target="_blank"
          rel="noopener noreferrer"
        >
          guyboireau.com
        </a>
      </footer>
    </div>
  )
}
