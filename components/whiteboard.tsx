"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { WhiteboardToolbar } from "./whiteboard-toolbar"
import { useWhiteboardStore } from "@/hooks/use-whiteboard-store"

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null)
  const [lastDrawTime, setLastDrawTime] = useState(0)
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null)

  const {
    currentTool,
    currentColor,
    currentStrokeWidth,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    strokes,
    addStroke,
    currentStroke,
    setCurrentStroke,
    finishStroke,
    eraseAtPoint,
    isDrawingShape,
    startShape,
    updateShape,
    finishShape,
    editingText,
    startTextEdit,
    updateText,
    finishTextEdit,
    setEditingText,
    selectedStrokes,
    selectStroke,
    clearSelection,
    deleteSelected,
    isSelecting,
    selectionBox,
    startSelection,
    updateSelection,
    finishSelection,
    isDragging,
    startDrag,
    updateDrag,
    finishDrag,
    resizeHandle,
    startResize,
    updateResize,
    finishResize,
    saveDocument,
    currentDocument,
    newDocument,
    undo,
    redo,
    canUndo,
    canRedo,
    setCurrentTool,
  } = useWhiteboardStore()

  // Handle canvas setup and resize
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        redrawCanvas()
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const x = (screenX - rect.left - panX) / zoom
      const y = (screenY - rect.top - panY) / zoom
      return { x, y }
    },
    [panX, panY, zoom],
  )

  // Check if point is on a stroke
  const getStrokeAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i]
        if (stroke.type === "text" && stroke.points.length > 0) {
          const textPoint = stroke.points[0]
          const distance = Math.sqrt(Math.pow(textPoint.x - point.x, 2) + Math.pow(textPoint.y - point.y, 2))
          if (distance <= 20) return stroke
        } else if (stroke.startPoint && stroke.endPoint) {
          const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x) - 5
          const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x) + 5
          const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y) - 5
          const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y) + 5
          if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) return stroke
        } else if (stroke.points.length > 0) {
          const hit = stroke.points.some((p) => {
            const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2))
            return distance <= stroke.strokeWidth + 5
          })
          if (hit) return stroke
        }
      }
      return null
    },
    [strokes],
  )

  // Get resize handle at point
  const getResizeHandle = useCallback(
    (point: { x: number; y: number }) => {
      if (selectedStrokes.length !== 1) return null

      const stroke = strokes.find((s) => s.id === selectedStrokes[0])
      if (!stroke || !stroke.startPoint || !stroke.endPoint) return null

      const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
      const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
      const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
      const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)

      const handleSize = 8 / zoom
      const handles = [
        { name: "nw", x: minX, y: minY },
        { name: "ne", x: maxX, y: minY },
        { name: "sw", x: minX, y: maxY },
        { name: "se", x: maxX, y: maxY },
        { name: "n", x: (minX + maxX) / 2, y: minY },
        { name: "s", x: (minX + maxX) / 2, y: maxY },
        { name: "w", x: minX, y: (minY + maxY) / 2 },
        { name: "e", x: maxX, y: (minY + maxY) / 2 },
      ]

      for (const handle of handles) {
        if (
          point.x >= handle.x - handleSize &&
          point.x <= handle.x + handleSize &&
          point.y >= handle.y - handleSize &&
          point.y <= handle.y + handleSize
        ) {
          return handle.name
        }
      }

      return null
    },
    [selectedStrokes, strokes, zoom],
  )

  // Redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)

    // Save context
    ctx.save()

    // Apply zoom and pan
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    // Draw all strokes
    strokes.forEach((stroke) => drawStroke(ctx, stroke))

    // Draw current stroke if drawing
    if (currentStroke) {
      drawStroke(ctx, currentStroke)
    }

    // Draw selection box
    if (selectionBox && isSelecting) {
      ctx.strokeStyle = "#2563eb"
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      const width = selectionBox.endX - selectionBox.startX
      const height = selectionBox.endY - selectionBox.startY
      ctx.strokeRect(selectionBox.startX, selectionBox.startY, width, height)
      ctx.setLineDash([])
    }

    // Draw selection handles
    if (selectedStrokes.length === 1 && currentTool === "select") {
      const stroke = strokes.find((s) => s.id === selectedStrokes[0])
      if (stroke && stroke.startPoint && stroke.endPoint) {
        drawSelectionHandles(ctx, stroke)
      }
    }

    // Restore context
    ctx.restore()
  }, [strokes, currentStroke, panX, panY, zoom, selectionBox, isSelecting, selectedStrokes, currentTool])

  // Draw grid
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Grid functionality completely disabled for clean white background
      return
    },
    [panX, panY, zoom],
  )

  // Draw selection handles
  const drawSelectionHandles = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: any) => {
      if (!stroke.startPoint || !stroke.endPoint) return

      const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
      const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
      const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
      const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)

      const handleSize = 6 / zoom
      const handles = [
        { x: minX, y: minY }, // nw
        { x: maxX, y: minY }, // ne
        { x: minX, y: maxY }, // sw
        { x: maxX, y: maxY }, // se
        { x: (minX + maxX) / 2, y: minY }, // n
        { x: (minX + maxX) / 2, y: maxY }, // s
        { x: minX, y: (minY + maxY) / 2 }, // w
        { x: maxX, y: (minY + maxY) / 2 }, // e
      ]

      ctx.fillStyle = "#2563eb"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1 / zoom

      handles.forEach((handle) => {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      })
    },
    [zoom],
  )

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: any) => {
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.setLineDash([])

    // Highlight selected strokes
    if (stroke.selected) {
      ctx.shadowColor = "#2563eb"
      ctx.shadowBlur = 10
    }

    switch (stroke.type) {
      case "pen":
        if (stroke.points.length < 1) return

        if (stroke.points.length === 1) {
          // Draw a single dot
          ctx.beginPath()
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.strokeWidth / 2, 0, Math.PI * 2)
          ctx.fill()
          return
        }

        // Use variable line width for pressure simulation
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const current = stroke.points[i]
          const next = stroke.points[i + 1]

          // Simulate pressure based on speed (slower = thicker)
          const distance = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2))
          const speed = Math.min(distance, 20) // Cap the speed
          const pressureFactor = Math.max(0.3, 1 - speed / 20) // Slower = more pressure
          const lineWidth = stroke.strokeWidth * pressureFactor

          ctx.lineWidth = lineWidth
          ctx.beginPath()
          ctx.moveTo(current.x, current.y)

          if (i < stroke.points.length - 2) {
            // Use quadratic curves for smoothness
            const nextNext = stroke.points[i + 2]
            const midX = (next.x + nextNext.x) / 2
            const midY = (next.y + nextNext.y) / 2
            ctx.quadraticCurveTo(next.x, next.y, midX, midY)
          } else {
            ctx.lineTo(next.x, next.y)
          }

          ctx.stroke()
        }
        break

      case "rectangle":
        if (!stroke.startPoint || !stroke.endPoint) return
        ctx.lineWidth = stroke.strokeWidth
        const rectWidth = stroke.endPoint.x - stroke.startPoint.x
        const rectHeight = stroke.endPoint.y - stroke.startPoint.y
        ctx.strokeRect(stroke.startPoint.x, stroke.startPoint.y, rectWidth, rectHeight)
        break

      case "ellipse":
        if (!stroke.startPoint || !stroke.endPoint) return
        ctx.lineWidth = stroke.strokeWidth
        const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2
        const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2
        const radiusX = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2
        const radiusY = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2

        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        ctx.stroke()
        break

      case "line":
        if (!stroke.startPoint || !stroke.endPoint) return
        ctx.lineWidth = stroke.strokeWidth
        ctx.beginPath()
        ctx.moveTo(stroke.startPoint.x, stroke.startPoint.y)
        ctx.lineTo(stroke.endPoint.x, stroke.endPoint.y)
        ctx.stroke()
        break

      case "text":
        if (!stroke.text || stroke.points.length === 0) return
        const textPoint = stroke.points[0]
        const fontSize = stroke.fontSize || 16
        ctx.font = `${fontSize}px Kalam, cursive`
        ctx.fillStyle = stroke.color
        ctx.textBaseline = "top"

        // Handle multi-line text
        const lines = stroke.text.split("\\n")
        lines.forEach((line, index) => {
          ctx.fillText(line, textPoint.x, textPoint.y + index * fontSize * 1.2)
        })
        break
    }

    // Reset shadow
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
  }, [])

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update cursor position for custom cursors
      setCursorPosition({ x: e.clientX, y: e.clientY })

      if (isPanning && lastPanPoint) {
        const deltaX = e.clientX - lastPanPoint.x
        const deltaY = e.clientY - lastPanPoint.y
        setPan(panX + deltaX, panY + deltaY)
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      const point = screenToCanvas(e.clientX, e.clientY)

      if (resizeHandle) {
        updateResize(point)
        return
      }

      if (isDragging && currentTool === "select") {
        updateDrag(point)
        return
      }

      if (isSelecting && currentTool === "select") {
        updateSelection(point)
        return
      }

      if (isDrawing && currentTool === "pen" && lastPoint && currentStroke) {
        const distance = Math.sqrt(Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2))
        const currentTime = Date.now()
        const timeDelta = currentTime - lastDrawTime

        // Only add point if moved enough distance for smoothing, but ensure minimum time interval
        if (distance > 1 && timeDelta > 10) {
          const newStroke = {
            ...currentStroke,
            points: [...currentStroke.points, point],
          }
          setCurrentStroke(newStroke)
          setLastPoint(point)
          setLastDrawTime(currentTime)
        }
      }

      if (isDrawing && currentTool === "eraser" && lastPoint) {
        const distance = Math.sqrt(Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2))

        if (distance > 5) {
          eraseAtPoint(point.x, point.y, currentStrokeWidth * 2)
          setLastPoint(point)
        }
      }

      if (isDrawingShape && (currentTool === "rectangle" || currentTool === "ellipse" || currentTool === "line")) {
        updateShape(point)
      }
    },
    [
      isPanning,
      isDrawing,
      isDrawingShape,
      isSelecting,
      isDragging,
      resizeHandle,
      currentTool,
      lastPanPoint,
      lastPoint,
      currentStroke,
      panX,
      panY,
      setPan,
      setCurrentStroke,
      screenToCanvas,
      lastDrawTime,
      currentStrokeWidth,
      eraseAtPoint,
      updateShape,
      updateSelection,
      updateDrag,
      updateResize,
    ],
  )

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = screenToCanvas(e.clientX, e.clientY)

      if (currentTool === "pan" || e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        setIsPanning(true)
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      if (currentTool === "select") {
        const handle = getResizeHandle(point)
        if (handle) {
          startResize(handle, point)
          return
        }

        const clickedStroke = getStrokeAtPoint(point)
        if (clickedStroke) {
          if (!selectedStrokes.includes(clickedStroke.id)) {
            selectStroke(clickedStroke.id, e.shiftKey)
          }
          startDrag(point)
        } else {
          if (!e.shiftKey) clearSelection()
          startSelection(point)
        }
        return
      }

      if (currentTool === "pen") {
        setIsDrawing(true)
        setLastPoint(point)
        setLastDrawTime(Date.now())
        setCurrentStroke({
          id: Date.now().toString(),
          type: "pen",
          points: [point],
          color: currentColor,
          strokeWidth: currentStrokeWidth,
        })
      }

      if (currentTool === "eraser") {
        setIsDrawing(true)
        setLastPoint(point)
        eraseAtPoint(point.x, point.y, currentStrokeWidth * 2) // Eraser is larger
      }

      if (currentTool === "rectangle" || currentTool === "ellipse" || currentTool === "line") {
        startShape(point)
      }

      if (currentTool === "text") {
        startTextEdit(point)
      }
    },
    [
      currentTool,
      currentColor,
      currentStrokeWidth,
      screenToCanvas,
      setCurrentStroke,
      eraseAtPoint,
      startShape,
      startTextEdit,
      getStrokeAtPoint,
      getResizeHandle,
      selectedStrokes,
      selectStroke,
      clearSelection,
      startDrag,
      startSelection,
      startResize,
    ],
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      setLastPanPoint(null)
    }

    if (resizeHandle) {
      finishResize()
    }

    if (isDragging) {
      finishDrag()
    }

    if (isSelecting) {
      finishSelection()
    }

    if (isDrawing) {
      if (currentTool === "pen" && currentStroke) {
        finishStroke()
      }
      setIsDrawing(false)
      setLastPoint(null)
    }

    if (isDrawingShape && (currentTool === "rectangle" || currentTool === "ellipse" || currentTool === "line")) {
      finishShape()
    }
  }, [
    isPanning,
    isDrawing,
    isDrawingShape,
    isSelecting,
    isDragging,
    resizeHandle,
    currentTool,
    currentStroke,
    finishStroke,
    finishShape,
    finishSelection,
    finishDrag,
    finishResize,
  ])

  // Wheel event for zooming
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor))

      // Zoom towards mouse position
      const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom)
      const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom)

      setZoom(newZoom)
      setPan(newPanX, newPanY)
    },
    [zoom, panX, panY, setZoom, setPan],
  )

  // Handle text input
  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus()
      textInputRef.current.select()
    }
  }, [editingText])

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      finishTextEdit()
    } else if (e.key === "Escape") {
      setEditingText(null)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when editing text or when focused on input elements
      if (editingText || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Delete selected items
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedStrokes.length > 0) {
          e.preventDefault()
          deleteSelected()
        }
        return
      }

      // Prevent default for our shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault()
            // Quick save
            if (currentDocument) {
              saveDocument()
            } else {
              saveDocument(`Whiteboard ${new Date().toLocaleDateString()}`)
            }
            break
          case "n":
            e.preventDefault()
            // New document
            newDocument()
            break
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              // Redo
              if (canRedo) redo()
            } else {
              // Undo
              if (canUndo) undo()
            }
            break
          case "y":
            e.preventDefault()
            // Redo
            if (canRedo) redo()
            break
          case "a":
            e.preventDefault()
            // Select all
            const allIds = strokes.map((s) => s.id)
            useWhiteboardStore.getState().selectMultiple(allIds)
            setCurrentTool("select")
            break
        }
      }

      // Tool shortcuts
      switch (e.key) {
        case "v":
        case "s":
          setCurrentTool("select")
          break
        case "p":
          setCurrentTool("pen")
          break
        case "e":
          setCurrentTool("eraser")
          break
        case "h":
          setCurrentTool("pan")
          break
        case "r":
          setCurrentTool("rectangle")
          break
        case "o":
          setCurrentTool("ellipse")
          break
        case "l":
          setCurrentTool("line")
          break
        case "t":
          setCurrentTool("text")
          break
        case " ":
          e.preventDefault()
          setCurrentTool("pan")
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setCurrentTool("pen")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [
    editingText,
    selectedStrokes,
    deleteSelected,
    currentDocument,
    saveDocument,
    newDocument,
    canUndo,
    canRedo,
    undo,
    redo,
    strokes,
    setCurrentTool,
  ])

  const getCursorClass = () => {
    if (isPanning) return "panning"
    if (isSelecting) return "selecting"
    if (currentTool === "eraser") return "erasing"
    if (currentTool === "text") return "text-mode"
    if (isDrawing && currentTool === "pen") return "drawing"
    return ""
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <WhiteboardToolbar />
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden canvas-container ${getCursorClass()} no-select`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0} // Make focusable for keyboard events
        role="application"
        aria-label="Whiteboard canvas - use keyboard shortcuts to access tools"
        aria-describedby="whiteboard-instructions"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {currentTool === "pen" && isDrawing && cursorPosition && (
          <div
            className="drawing-cursor"
            style={{
              left: cursorPosition.x,
              top: cursorPosition.y,
              width: `${currentStrokeWidth * zoom}px`,
              height: `${currentStrokeWidth * zoom}px`,
              color: currentColor,
            }}
          />
        )}

        {/* Eraser cursor */}
        {currentTool === "eraser" && cursorPosition && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-destructive bg-destructive/20"
            style={{
              width: `${currentStrokeWidth * 2 * zoom}px`,
              height: `${currentStrokeWidth * 2 * zoom}px`,
              transform: "translate(-50%, -50%)",
              left: cursorPosition.x,
              top: cursorPosition.y,
            }}
          />
        )}

        {/* Text input overlay */}
        {editingText && (
          <textarea
            ref={textInputRef}
            value={editingText.text}
            onChange={(e) => updateText(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={finishTextEdit}
            className="absolute bg-transparent border-2 border-primary rounded-md p-2 resize-none handwriting text-foreground"
            style={{
              left: `${editingText.x * zoom + panX}px`,
              top: `${editingText.y * zoom + panY}px`,
              fontSize: `${Math.max(16, currentStrokeWidth * 4) * zoom}px`,
              color: currentColor,
              minWidth: "100px",
              minHeight: "30px",
            }}
            placeholder="Type your text..."
            autoFocus
            aria-label="Text input for whiteboard"
          />
        )}

        <div id="whiteboard-instructions" className="sr-only">
          Use keyboard shortcuts to access tools: P for pen, E for eraser, V for select, R for rectangle, O for ellipse,
          L for line, T for text. Use Ctrl+Z to undo, Ctrl+Y to redo, Ctrl+S to save. Mouse wheel to zoom, drag to draw
          or pan.
        </div>
      </div>
    </div>
  )
}
