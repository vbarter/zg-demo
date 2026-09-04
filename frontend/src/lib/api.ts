export type SearchHit = {
  path: string
  snippet: string
  score: number
  lines: string
}

export type SearchResponse = {
  query: string
  limit: number
  engine: "zg" | "mock"
  workspace: string
  zgError?: string
  results: SearchHit[]
}

export type DocListItem = {
  path: string
  size: number
  mtime: string
  title: string
}

export type DocDetail = {
  path: string
  title: string
  content: string
  size: number
  mtime: string
}

export type StatusResponse = {
  ok: boolean
  zgAvailable: boolean
  engine: "zg" | "mock"
  workspace: string
  embedding: string
  docCount: number
  message?: string
  raw?: string
  index: {
    exists: boolean
    freshness: string
    fileCount: number
    updatedAt: string | null
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || res.statusText
  } catch {
    return res.statusText
  }
}

export async function getHealth(): Promise<{ ok: boolean }> {
  const res = await fetch("/api/health")
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/status")
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function triggerIndex(): Promise<{
  ok: boolean
  engine: string
  message: string
}> {
  const res = await fetch("/api/index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function searchDocs(
  query: string,
  limit = 8
): Promise<SearchResponse> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function listDocs(): Promise<{
  workspace: string
  files: DocListItem[]
}> {
  const res = await fetch("/api/docs")
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

export async function getDoc(path: string): Promise<DocDetail> {
  const res = await fetch(`/api/docs/${encodeURI(path)}`)
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}
