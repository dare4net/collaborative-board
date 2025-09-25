"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
    <div className="bg-card border-b border-border p-3 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Document Info */}
        {currentDocument && (
          <div className="flex items-center gap-2 text-sm">
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

        {/* File Operations */}
        <div className="flex items-center gap-1">
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

        {/* Selection Tool */}
        <div className="flex items-center gap-1">
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

        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
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

        {/* Shape Tools */}
        <div className="flex items-center gap-1">
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

        {/* Colors */}
        <div className="flex items-center gap-1">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                currentColor === color ? "border-foreground shadow-md scale-110" : "border-border"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select ${color} color`}
              title={`Color: ${color}`}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Stroke Width */}
        <div className="flex items-center gap-1">
          {strokeWidths.map((width) => (
            <button
              key={width}
              onClick={() => setCurrentStrokeWidth(width)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                currentStrokeWidth === width ? "border-foreground bg-accent scale-110" : "border-border"
              }`}
              aria-label={`Select ${width}px stroke width`}
              title={`Stroke width: ${width}px`}
            >
              <div className="rounded-full bg-foreground" style={{ width: `${width}px`, height: `${width}px` }} />
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* History */}
        <div className="flex items-center gap-1">
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
        <div className="flex items-center gap-1">
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
        <div className="flex items-center gap-1">
          <KeyboardShortcutsHelp />
        </div>

        {/* Selection Info */}
        {selectedStrokes.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground">
              {selectedStrokes.length} item{selectedStrokes.length !== 1 ? "s" : ""} selected
            </span>
          </>
        )}
      </div>
    </div>
  )
}
