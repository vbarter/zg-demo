import { BookOpenIcon, FileTextIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { getDoc, listDocs, type DocDetail, type DocListItem } from "@/lib/api"
import { cn } from "@/lib/utils"

export function DocsPanel() {
  const [files, setFiles] = useState<DocListItem[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(false)

  useEffect(() => {
    let cancelled = false
    listDocs()
      .then((payload) => {
        if (cancelled) return
        setFiles(payload.files)
        if (payload.files[0]) setActive(payload.files[0].path)
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "无法列出文档")
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoadingDoc(true)
    getDoc(active)
      .then((payload) => {
        if (!cancelled) setDoc(payload)
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "无法读取文档")
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false)
      })
    return () => {
      cancelled = true
    }
  }, [active])

  if (loadingList) {
    return (
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>知识库是空的</EmptyTitle>
          <EmptyDescription>检查 ZG_ROOT / sample-kb 是否存在。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <Card size="sm" className="h-fit">
        <CardHeader>
          <CardTitle>sample-kb</CardTitle>
          <CardDescription>{files.length} 个文件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {files.map((file) => (
              <Button
                key={file.path}
                type="button"
                variant={active === file.path ? "secondary" : "ghost"}
                className="h-auto w-full justify-start px-2 py-2 text-left"
                onClick={() => setActive(file.path)}
              >
                <FileTextIcon data-icon="inline-start" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">{file.title}</span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {file.path}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-96">
        <CardHeader>
          <CardTitle>{doc?.title ?? active}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{doc?.path ?? active}</span>
            {doc ? <Badge variant="outline">{doc.size} B</Badge> : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDoc || !doc ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <ScrollArea className="h-[28rem]">
              <pre
                className={cn(
                  "font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground"
                )}
              >
                {doc.content}
              </pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
