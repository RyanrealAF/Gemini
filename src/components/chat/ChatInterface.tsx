"use client"

import * as React from "react"
import { Send, Terminal, Loader2, History, Trash2, Zap, Bot, ShieldCheck, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageBubble } from "./MessageBubble"
import { ConfigPanel } from "./ConfigPanel"
import { useAI } from "@/lib/ai/useAI"
import { useAIStream } from "@/lib/ai/useAIStream"
import type { ChatMessage, GenerationConfig, PerformanceMeta } from "@/lib/chat-types"
import type { AIMessage } from "@/lib/ai/types"

export function ChatInterface() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [config, setConfig] = React.useState<GenerationConfig>({
    temperature: 0.7,
    maxOutputTokens: 2048,
    topP: 1.0,
  })
  
  const { loading: batchLoading, error: batchError, fromCache, query } = useAI()
  const { text: streamingText, streaming, stream, stop } = useAIStream()
  
  const [performance, setPerformance] = React.useState<Record<string, PerformanceMeta>>({})
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isProcessing = batchLoading || streaming

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  const handleSend = async (mode: 'batch' | 'stream') => {
    if (!input.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ text: input.trim() }],
      timestamp: new Date(),
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInput("")

    const payload = {
      contents: currentMessages.map(m => ({
        role: m.role as 'user' | 'model',
        parts: m.parts
      })),
      generationConfig: config,
      systemInstruction: { parts: [{ text: "You are Edge Intel, a highly efficient AI deployed on the global edge. Provide concise, technical, and accurate information." }] }
    }

    if (mode === 'batch') {
      const result = await query(payload)
      if (result) {
        const modelMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          parts: [{ text: result.text }],
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, modelMessage])
        setPerformance(prev => ({
          ...prev,
          [modelMessage.id]: result.meta
        }))
      }
    } else {
      await stream(payload)
    }
  }

  // Handle finalization of stream
  React.useEffect(() => {
    if (!streaming && streamingText) {
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        parts: [{ text: streamingText }],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, modelMessage])
      // Stream meta is usually live
      setPerformance(prev => ({
        ...prev,
        [modelMessage.id]: { cacheStatus: 'DYNAMIC', latencyMs: 0 }
      }))
    }
  }, [streaming])

  const clearHistory = () => {
    setMessages([])
    setPerformance({})
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background lg:flex-row overflow-hidden">
      {/* Sidebar (Config) */}
      <aside className="w-full border-b border-border bg-card/10 lg:w-[400px] lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20">
                <Terminal className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold tracking-tight text-foreground">EdgeAI Arsenal</h1>
            </div>
            <Badge variant="outline" className="font-code text-[10px] border-primary/30 text-primary uppercase">v4.0.0-PRO</Badge>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4">
              <ConfigPanel config={config} onConfigChange={setConfig} />
              
              <div className="rounded-lg border border-border bg-card/30 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                    <History className="h-4 w-4 text-accent" />
                    Session Matrix
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 px-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    FORMAT
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Gateway Tunnel</span>
                    <span className="font-code text-accent">SECURE_TLS_1.3</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Proxy Status</span>
                    <span className="flex items-center gap-1.5 text-green-400 font-medium">
                      <div className="h-1 w-1 rounded-full bg-green-400" />
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cache Hits</span>
                    <span className="font-code text-primary">
                      {Object.values(performance).filter(p => p.cacheStatus === 'HIT').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-primary/5 p-4 border-dashed">
                <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  E2E ENCRYPTION
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider">
                  All transmissions are tunneled through hardened edge nodes with zero-knowledge persistence.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col relative">
        <div className="absolute top-0 left-0 right-0 z-10 h-16 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span className="text-[10px] font-code uppercase tracking-widest text-muted-foreground font-bold">Node: BWB-GLOBAL-01</span>
          </div>
          <div className="flex items-center gap-4">
             {fromCache && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 font-code text-[10px] gap-1">
                  <Zap className="h-3 w-3" />
                  EDGE_CACHED
                </Badge>
             )}
             <div className="hidden md:flex items-center gap-2 text-[10px] font-code text-muted-foreground bg-secondary/50 px-2 py-1 rounded border border-border/50">
               <Activity className="h-3 w-3 text-primary" />
               SYS_LATENCY: 12ms
             </div>
          </div>
        </div>

        <ScrollArea className="flex-1 mt-16 scrollbar-hide">
          <div className="flex flex-col">
            {messages.length === 0 ? (
              <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 px-6 text-center">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/10">
                   <Bot className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl font-headline font-black tracking-tight text-foreground">Awaiting Directives</h2>
                <p className="max-w-md text-sm text-muted-foreground font-medium leading-relaxed">
                  Secure bridge established. Send an encrypted signal to begin edge-accelerated intelligence generation.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                  {["System diagnostics", "Network audit", "Edge logic deployment", "Latency report"].map((t) => (
                    <Button key={t} variant="outline" className="justify-start font-code text-[11px] h-auto py-3 bg-card/20 hover:bg-primary/10 hover:border-primary/50 transition-all group" onClick={() => { setInput(t); }}>
                      <span className="text-primary mr-2 opacity-50 group-hover:opacity-100">0x</span> {t}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} meta={performance[m.id]} />
                ))}
                {streaming && (
                  <MessageBubble 
                    message={{
                      id: "streaming",
                      role: "model",
                      parts: [{ text: streamingText }],
                      timestamp: new Date()
                    }} 
                    isStreaming 
                  />
                )}
              </>
            )}
            <div ref={scrollRef} className="h-4" />
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="p-6 bg-gradient-to-t from-background via-background/95 to-transparent pt-12">
          {batchError && (
            <div className="max-w-4xl mx-auto mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-code">
              [CRITICAL ERROR] {batchError.message}
            </div>
          )}
          <div className="mx-auto max-w-4xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent/50 to-primary opacity-20 blur group-focus-within:opacity-40 transition duration-1000"></div>
            <div className="relative flex flex-col gap-2 rounded-xl bg-card/80 border border-border/80 backdrop-blur-xl p-3 shadow-2xl">
              <Textarea
                placeholder="Talk to BuildWhileBleeding AI..."
                className="min-h-[80px] w-full resize-none border-none bg-transparent focus-visible:ring-0 px-3 py-2 text-base font-body text-foreground placeholder:text-muted-foreground/50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend('batch')
                  }
                }}
              />
              <div className="flex items-center justify-between pt-2 px-1">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-code text-muted-foreground uppercase tracking-[0.2em] font-bold">
                     {isProcessing ? "Transmitting..." : "Ready to Send"}
                   </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-9 px-4 font-code text-[11px] font-bold text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                    onClick={() => handleSend('stream')}
                    disabled={isProcessing || !input.trim()}
                  >
                    STREAM
                  </Button>
                  {streaming ? (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="h-9 px-5 gap-2 font-headline font-bold" 
                      onClick={stop}
                    >
                      STOP
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="h-9 px-5 gap-2 font-headline font-bold shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90" 
                      onClick={() => handleSend('batch')}
                      disabled={isProcessing || !input.trim()}
                    >
                      {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      EXECUTE
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold opacity-40">
            Proprietary Architecture &bull; End-to-End Encryption Active
          </p>
        </div>
      </main>
    </div>
  )
}
