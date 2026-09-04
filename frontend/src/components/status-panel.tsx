import { AlertCircleIcon, CheckCircle2Icon, RefreshCwIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { getHealth, getStatus, triggerIndex, type StatusResponse } from "@/lib/api"

export function StatusPanel() {
  const [health, setHealth] = useState<boolean | null>(null)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [indexing, setIndexing] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const [h, s] = await Promise.all([getHealth(), getStatus()])
      setHealth(h.ok)
      setStatus(s)
    } catch (error) {
      setHealth(false)
      toast.error(error instanceof Error ? error.message : "状态拉取失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function onIndex() {
    setIndexing(true)
    try {
      const result = await triggerIndex()
      if (result.ok) {
        toast.success(result.engine === "zg" ? "zg index 完成" : "mock：已跳过真实索引")
      } else {
        toast.error(result.message || "索引失败")
      }
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "索引失败")
    } finally {
      setIndexing(false)
    }
  }

  if (loading && !status) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        {status?.zgAvailable ? <CheckCircle2Icon /> : <AlertCircleIcon />}
        <AlertTitle>{status?.zgAvailable ? "zg 在 PATH 上" : "zg 未安装 · mock 模式"}</AlertTitle>
        <AlertDescription>
          {status?.message ??
            "Flask 会先调 zg query/index/status；失败或缺失时回落到 sample-kb 关键词打分。"}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Health"
          value={health ? "ok" : "down"}
          hint="GET /api/health"
          badge={health ? "live" : "dead"}
        />
        <StatCard
          title="Engine"
          value={status?.engine ?? "—"}
          hint={status?.zgAvailable ? "CLI 可用" : "deterministic mock"}
          badge={status?.engine ?? "unknown"}
        />
        <StatCard
          title="Freshness"
          value={status?.index.freshness ?? "—"}
          hint={
            status?.index.updatedAt
              ? `index mtime ${status.index.updatedAt}`
              : "无 .zvec-grep/ 或 mock"
          }
          badge={status?.index.exists ? "index dir" : "no index"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>工作区</CardTitle>
          <CardDescription>ZG_ROOT / embedding / 文档数</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 font-mono text-xs">
          <Row label="workspace" value={status?.workspace ?? "—"} />
          <Separator />
          <Row label="embedding" value={status?.embedding ?? "—"} />
          <Separator />
          <Row
            label="docs"
            value={`${status?.docCount ?? 0} listed · index.fileCount=${status?.index.fileCount ?? 0}`}
          />
          {status?.raw ? (
            <>
              <Separator />
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-muted-foreground">
                {status.raw}
              </pre>
            </>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onIndex()} disabled={indexing}>
            {indexing ? <Spinner data-icon="inline-start" /> : null}
            触发索引
          </Button>
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCwIcon data-icon="inline-start" />
            刷新状态
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
  badge,
}: {
  title: string
  value: string
  hint: string
  badge: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="font-mono text-lg">{value}</span>
        <Badge variant="outline">{badge}</Badge>
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right">{value}</span>
    </div>
  )
}
