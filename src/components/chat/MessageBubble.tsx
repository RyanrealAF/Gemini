"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Bot, User, Cpu } from "lucide-react"
import type { ChatMessage, PerformanceMeta } from "@/lib/chat-types"

interface MessageBubbleProps {
  message: ChatMessage;
  meta?: PerformanceMeta;
  isStreaming?: boolean;
}

export function MessageBubble({ message, meta, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full gap-4 px-4 py-6 transition-colors", isUser ? "bg-transparent" : "bg-secondary/30")}>
      <div className="flex flex-col items-center gap-2">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-card text-accent border border-accent/20"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
      </div>
      
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {isUser ? "Agent" : "Edge Intel"}
          </span>
          {!isUser && meta && (
            <div className="flex items-center gap-3 font-code text-[10px]">
              <span className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5",
                meta.cacheStatus === 'HIT' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
              )}>
                <Cpu className="h-3 w-3" />
                {meta.cacheStatus}
              </span>
              <span className="text-muted-foreground">{meta.latencyMs}ms</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "max-w-none whitespace-pre-wrap leading-relaxed text-sm md:text-base",
          isUser ? "text-foreground" : "text-foreground font-body"
        )}>
          {message.parts[0].text}
          {isStreaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-accent" />}
        </div>
      </div>
    </div>
  )
}