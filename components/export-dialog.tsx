"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { useWhiteboardStore } from "@/hooks/use-whiteboard-store"
import { Download, FileImage, FileCode } from "lucide-react"
import { exportToPNG, exportToSVG } from "@/lib/export-utils"

interface ExportDialogProps {
  children: React.ReactNode
}

export function ExportDialog({ children }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<"png" | "svg">("png")
  const [filename, setFilename] = useState("whiteboard")
  const [scale, setScale] = useState("2")
  const [isExporting, setIsExporting] = useState(false)

  const { strokes, currentDocument } = useWhiteboardStore()

  const handleExport = async () => {
    if (strokes.length === 0) {
      alert("Nothing to export! Please draw something first.")
      return
    }

    setIsExporting(true)
    try {
      const exportFilename = filename || (currentDocument?.name ?? "whiteboard")

      if (format === "png") {
        await exportToPNG(strokes, exportFilename, Number.parseFloat(scale))
      } else {
        await exportToSVG(strokes, exportFilename)
      }

      setOpen(false)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Whiteboard
          </DialogTitle>
          <DialogDescription>Export your whiteboard as an image or vector file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as "png" | "svg")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="flex items-center gap-2 cursor-pointer">
                  <FileImage className="h-4 w-4" />
                  PNG Image
                  <span className="text-sm text-muted-foreground">(Raster, good for sharing)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="svg" id="svg" />
                <Label htmlFor="svg" className="flex items-center gap-2 cursor-pointer">
                  <FileCode className="h-4 w-4" />
                  SVG Vector
                  <span className="text-sm text-muted-foreground">(Scalable, good for printing)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename"
            />
          </div>

          {format === "png" && (
            <div className="space-y-2">
              <Label htmlFor="scale">Quality Scale</Label>
              <RadioGroup value={scale} onValueChange={setScale}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="scale1" />
                  <Label htmlFor="scale1" className="cursor-pointer">
                    1x (Standard)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="scale2" />
                  <Label htmlFor="scale2" className="cursor-pointer">
                    2x (High Quality)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="scale3" />
                  <Label htmlFor="scale3" className="cursor-pointer">
                    3x (Ultra High Quality)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
