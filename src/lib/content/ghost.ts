/**
 * Ghost Content API client with engagement-aware helpers
 * Aligns with FRD-001/002/010/013 and PRD analytics objectives.
 */
import GhostContentAPI from '@tryghost/content-api'

export interface GhostConfig {
  url: string
  key: string
  version?: 'v5.0' | 'v4.0'
}

export type GhostPost = {
  id: string
  title: string
  slug: string
  url?: string
  feature_image?: string | null
  excerpt?: string | null
  html?: string | null
  plaintext?: string | null
  published_at?: string | null
  updated_at?: string | null
  reading_time?: number
  tags?: { name: string; slug: string }[]
  primary_tag?: { name: string; slug: string } | null
  authors?: { id: string; name: string; slug: string }[]
}

let client: ReturnType<typeof createClient> | null = null

function createClient(cfg: GhostConfig) {
  return new GhostContentAPI({
    url: cfg.url,
    key: cfg.key,
    version: cfg.version ?? 'v5.0',
  })
}

export function getGhostClient() {
  if (client) return client
  const url = process.env.GHOST_API_URL
  const key = process.env.GHOST_CONTENT_API_KEY
  if (!url || !key) {
    throw new Error('Ghost API env vars missing: GHOST_API_URL and/or GHOST_CONTENT_API_KEY')
  }
  client = createClient({ url, key, version: 'v5.0' })
  return client
}

export async function getRecentPosts(limit = 10): Promise<GhostPost[]> {
  const api = getGhostClient()
  const posts = await api.posts.browse({
    limit,
    include: ['tags', 'authors'],
    order: 'published_at DESC',
    fields: [
      'id',
      'title',
      'slug',
      'feature_image',
      'excerpt',
      'published_at',
      'reading_time',
    ] as any,
  })
  // Ghost SDK returns objects with many fields; cast to our shape
  return posts as unknown as GhostPost[]
}

export async function getPostBySlug(slug: string): Promise<GhostPost | null> {
  const api = getGhostClient()
  try {
    const post = await api.posts.read(
      { slug },
      { include: ['tags', 'authors'] }
    )
    return post as unknown as GhostPost
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export async function getRelatedByTag(primaryTagSlug: string, limit = 5): Promise<GhostPost[]> {
  const api = getGhostClient()
  const posts = await api.posts.browse({
    filter: `tag:${primaryTagSlug}`,
    limit,
    include: ['tags', 'authors'],
    order: 'published_at DESC',
  })
  return posts as unknown as GhostPost[]
}