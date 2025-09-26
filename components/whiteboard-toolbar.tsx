"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import React, { useState } from "react"
import { useWhiteboardStore } from "@/hooks/use-whiteboard-store"
import { FileManagerDialog } from "./file-manager-dialog"
import { ExportDialog } from "./export-dialog"
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help"
import {
  Pen,
  Hand,
  Square,
  Circle,
  Minus,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  MousePointer,
  FileText,
  Plus,
} from "lucide-react"

const colors = [
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#ca8a04", // Yellow
  "#9333ea", // Purple
  "#ea580c", // Orange
  "#0891b2", // Cyan
  "#be185d", // Pink
  "#374151", // Gray
  "#000000", // Black
]

const strokeWidths = [2, 4, 6, 8, 12]

export function WhiteboardToolbar() {
  const [styleOpen, setStyleOpen] = useState(false)
  const {
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    currentStrokeWidth,
    setCurrentStrokeWidth,
    zoom,
    setZoom,
    resetView,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    selectedStrokes,
    deleteSelected,
    currentDocument,
    isModified,
    saveDocument,
    newDocument,
    strokes,
  } = useWhiteboardStore()

  const handleZoomIn = () => setZoom(Math.min(5, zoom * 1.2))
  const handleZoomOut = () => setZoom(Math.max(0.1, zoom / 1.2))

  const handleQuickSave = () => {
    if (currentDocument) {
      saveDocument()
    } else {
      // If no current document, trigger save dialog
      saveDocument(`Whiteboard ${new Date().toLocaleDateString()}`)
    }
  }

  const handleNewDocument = () => {
    if (isModified && strokes.length > 0) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to create a new document?")
      if (!confirmed) return
    }
    newDocument()
  }

  return (
    <div className="border-b border-border p-0 shadow-sm bg-[#eaf7ea]">{/* pastel green header */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-2">
        {/* Document Info */}
        {currentDocument && (
          <div className="flex items-center gap-2 text-sm" title="Current document name">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{currentDocument.name}</span>
            {isModified && (
              <span className="text-orange-600 font-bold" title="Unsaved changes">
                •
              </span>
            )}
          </div>
        )}

        {currentDocument && <Separator orientation="vertical" className="h-6" />}

        {/* File */}
        <div className="flex items-center gap-1" aria-label="File" title="File actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewDocument}
            className="h-9 w-9"
            title="New Document (Ctrl+N)"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickSave}
            className={`h-9 w-9 ${isModified ? "text-orange-600 hover:text-orange-600" : ""}`}
            title={`${currentDocument ? "Save" : "Save As"} (Ctrl+S)`}
          >
            <Save className="h-4 w-4" />
          </Button>
          <FileManagerDialog mode="open">
            <Button variant="ghost" size="sm" className="h-9 w-9" title="Open Document">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </FileManagerDialog>
          <ExportDialog>
            <Button variant="ghost" size="sm" className="h-9 w-9" title="Export (PNG/SVG)">
              <Download className="h-4 w-4" />
            </Button>
          </ExportDialog>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Select */}
        <div className="flex items-center gap-1" aria-label="Select" title="Selection tool">
          <Button
            variant={currentTool === "select" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("select")}
            className="h-9 w-9"
            title="Select Tool (V or S)"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Draw */}
        <div className="flex items-center gap-1" aria-label="Draw" title="Drawing tools">
          <Button
            variant={currentTool === "pen" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("pen")}
            className="h-9 w-9"
            title="Pen Tool (P)"
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "eraser" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("eraser")}
            className="h-9 w-9"
            title="Eraser Tool (E)"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "pan" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("pan")}
            className="h-9 w-9"
            title="Pan Tool (H or Space)"
          >
            <Hand className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Shapes */}
        <div className="flex items-center gap-1" aria-label="Shapes" title="Shape tools">
          <Button
            variant={currentTool === "rectangle" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("rectangle")}
            className="h-9 w-9"
            title="Rectangle Tool (R)"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "ellipse" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("ellipse")}
            className="h-9 w-9"
            title="Ellipse Tool (O)"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "line" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("line")}
            className="h-9 w-9"
            title="Line Tool (L)"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentTool("text")}
            className="h-9 w-9"
            title="Text Tool (T)"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Style (Dialog) */}
        <div className="flex items-center gap-1" aria-label="Style" title="Open style dialog">
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setStyleOpen(true)} title="Style (Color & Width)">
            Style
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* History */}
        <div className="flex items-center gap-1" aria-label="History" title="History controls">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="h-9 w-9"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="h-9 w-9"
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (strokes.length > 0) {
                const confirmed = window.confirm("Are you sure you want to clear the entire whiteboard?")
                if (confirmed) clear()
              }
            }}
            className="h-9 w-9"
            title="Clear All"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {selectedStrokes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelected}
              className="h-9 w-9 text-destructive hover:text-destructive"
              title="Delete Selected (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* View Controls */}
        <div className="flex items-center gap-1" aria-label="View" title="View controls">
          <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-9 w-9" title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono min-w-[4rem] text-center" title="Current zoom level">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-9 w-9" title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetView} className="h-9 w-9" title="Reset View (Fit to Screen)">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Help */}
        <div className="flex items-center gap-1" aria-label="Help" title="Keyboard shortcuts">
          <KeyboardShortcutsHelp />
        </div>
        
      </div>

      {/* Style Dialog */}
      {styleOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setStyleOpen(false)} />
          <div className="relative mt-16 w-full max-w-md rounded-lg bg-white shadow-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Style</h3>
              <button className="text-sm px-2 py-1 rounded hover:bg-muted" title="Close" onClick={() => setStyleOpen(false)}>Close</button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Colors</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => { setCurrentColor(color); setStyleOpen(false) }}
                      className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${currentColor === color ? "border-foreground shadow-md scale-110" : "border-border"}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color} color`}
                      title={`Color: ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Stroke width</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {strokeWidths.map((width) => (
                    <button
                      key={width}
                      onClick={() => { setCurrentStrokeWidth(width); setStyleOpen(false) }}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${currentStrokeWidth === width ? "border-foreground bg-accent scale-110" : "border-border"}`}
                      aria-label={`Select ${width}px stroke width`}
                      title={`Stroke width: ${width}px`}
                    >
                      <div className="rounded-full bg-foreground" style={{ width: `${width}px`, height: `${width}px` }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
