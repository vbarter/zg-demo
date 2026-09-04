import { FileTextIcon, SearchIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { searchDocs, type SearchHit, type SearchResponse } from "@/lib/api"
import { cn } from "@/lib/utils"

export function SearchPanel() {
  const [query, setQuery] = useState("hybrid search BM25")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error("先输入查询")
      return
    }
    setLoading(true)
    try {
      const result = await searchDocs(q, 8)
      setData(result)
      setOpen(result.results[0]?.path ?? null)
      if (result.results.length === 0) {
        toast("没有命中", { description: "换个词，或打开知识库看语料。" })
      } else if (result.engine === "mock") {
        toast("mock 检索", { description: `${result.results.length} 条 · zg 未接入或 CLI 失败` })
      } else {
        toast.success(`zg · ${result.results.length} 条`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "搜索失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="q">工作区检索</FieldLabel>
            <InputGroup className="h-12">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="hybrid、BM25、本地优先、zg index…"
                autoFocus
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" variant="default" size="sm" disabled={loading}>
                  {loading ? <Spinner data-icon="inline-start" /> : null}
                  搜索
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              有 zg 走 hybrid CLI；否则对 sample-kb 做确定性关键词打分。无需 API key。
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>

      {data ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.engine === "zg" ? "default" : "secondary"}>
            {data.engine}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {data.results.length} hits · {data.workspace}
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      ) : null}

      {!loading && data && data.results.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>没有结果</EmptyTitle>
            <EmptyDescription>
              试试「Zvec」「privacy」「potion」或打开知识库看原文。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!loading && data && data.results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.results.map((hit) => (
            <ResultCard
              key={`${hit.path}:${hit.lines}`}
              hit={hit}
              expanded={open === hit.path}
              onToggle={() => setOpen((cur) => (cur === hit.path ? null : hit.path))}
            />
          ))}
        </div>
      ) : null}

      {!loading && !data ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>从 sample-kb 开始</EmptyTitle>
            <EmptyDescription>
              回车即可。预填查询覆盖 hybrid / BM25，mock 与 zg 都能打到第 3 篇。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  )
}

function ResultCard({
  hit,
  expanded,
  onToggle,
}: {
  hit: SearchHit
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="font-mono text-sm">{hit.path}</CardTitle>
        <CardDescription>{hit.lines ? `L${hit.lines}` : "span unknown"}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{hit.score.toFixed(3)}</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
              {expanded ? "收起" : "展开"}
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn("w-full", expanded ? "h-56" : "h-20")}>
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {hit.snippet || "（无 snippet）"}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
