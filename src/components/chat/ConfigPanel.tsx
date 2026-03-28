"use client"

import * as React from "react"
import { Settings2, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import type { GenerationConfig } from "@/lib/chat-types"

interface ConfigPanelProps {
  config: GenerationConfig;
  onConfigChange: (config: GenerationConfig) => void;
}

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-headline">AI Arsenal Configuration</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">Adjust parameters for precision control.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Temperature</Label>
            <span className="font-code text-xs text-accent">{(config.temperature ?? 0.7).toFixed(1)}</span>
          </div>
          <Slider
            value={[config.temperature ?? 0.7]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={([val]) => onConfigChange({ ...config, temperature: val })}
          />
          <p className="text-[10px] text-muted-foreground">Higher values increase creativity, lower values increase focus.</p>
        </div>

        <Separator className="bg-border/50" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Max Tokens</Label>
            <span className="font-code text-xs text-accent">{config.maxOutputTokens ?? 2048}</span>
          </div>
          <Slider
            value={[config.maxOutputTokens ?? 2048]}
            min={1}
            max={8192}
            step={128}
            onValueChange={([val]) => onConfigChange({ ...config, maxOutputTokens: val })}
          />
          <p className="text-[10px] text-muted-foreground">Maximum length of the generated response.</p>
        </div>

        <Separator className="bg-border/50" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Top P</Label>
            <span className="font-code text-xs text-accent">{(config.topP ?? 1.0).toFixed(1)}</span>
          </div>
          <Slider
            value={[config.topP ?? 1.0]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([val]) => onConfigChange({ ...config, topP: val })}
          />
        </div>

        <div className="mt-6 rounded-lg bg-primary/10 p-3 border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Edge Optimized</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Current settings are optimized for sub-100ms latency across global edge nodes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}