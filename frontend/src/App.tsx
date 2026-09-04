import { BookOpenIcon, ActivityIcon, SearchIcon } from "lucide-react"

import { DocsPanel } from "@/components/docs-panel"
import { SearchPanel } from "@/components/search-panel"
import { StatusPanel } from "@/components/status-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function App() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-medium tracking-tight">zg-demo</h1>
              <Badge variant="outline">local-first</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Zvec + zvec-grep 工作区搜索切片 · Flask / React / shadcn
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">
              <SearchIcon data-icon="inline-start" />
              搜索
            </TabsTrigger>
            <TabsTrigger value="docs">
              <BookOpenIcon data-icon="inline-start" />
              知识库
            </TabsTrigger>
            <TabsTrigger value="status">
              <ActivityIcon data-icon="inline-start" />
              状态
            </TabsTrigger>
          </TabsList>
          <TabsContent value="search">
            <SearchPanel />
          </TabsContent>
          <TabsContent value="docs">
            <DocsPanel />
          </TabsContent>
          <TabsContent value="status">
            <StatusPanel />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>无账号 · 无云端 KB · mock 路径零密钥</span>
          <span className="font-mono">ZG_EMBEDDING=local/potion-retrieval-32m</span>
        </div>
      </footer>
    </div>
  )
}

export default App
