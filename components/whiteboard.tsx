"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { WhiteboardToolbar } from "./whiteboard-toolbar"
import { useWhiteboardStore } from "@/hooks/use-whiteboard-store"
import { StrokeUtils } from "@/lib/stroke-utils"
import { HitDetector } from "@/lib/hit-detection"
import { CoordinateTransformer } from "@/lib/coordinate-utils"
import { CursorManager } from "@/lib/cursor-manager"
import { CanvasRenderer } from "@/lib/canvas-utils"

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Custom text editing (no textarea)
  const hasInitializedTextEdit = useRef(false)
  const caretIndexRef = useRef<number>(0) // caret position within editingText.text
  const desiredColumnRef = useRef<number | null>(null) // for Up/Down to maintain column
  const [isCaretVisible, setIsCaretVisible] = useState(true)
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
    isRotating,
    startRotate,
    updateRotate,
    finishRotate,
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
      const renderer = new CanvasRenderer(canvas)
      renderer.setupCanvas(window.devicePixelRatio)
      redrawCanvas()
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
      return CoordinateTransformer.screenToCanvas(screenX, screenY, canvas, { zoom, panX, panY })
    },
    [panX, panY, zoom],
  )

  // Utilities for text editing
  const getLines = useCallback((text: string) => text.split("\n"), [])
  const indexToLineCol = useCallback((text: string, index: number) => {
    const lines = getLines(text)
    let acc = 0
    for (let li = 0; li < lines.length; li++) {
      const len = lines[li].length
      if (index <= acc + len) {
        return { line: li, col: index - acc }
      }
      acc += len + 1 // plus \n
    }
    return { line: lines.length - 1, col: (lines[lines.length - 1] || "").length }
  }, [getLines])

  const lineColToIndex = useCallback((text: string, line: number, col: number) => {
    const lines = getLines(text)
    let acc = 0
    for (let li = 0; li < Math.min(line, lines.length); li++) acc += lines[li].length + 1
    return Math.min(acc + col, text.length)
  }, [getLines])

  // Derive style for the active text edit to match the existing stroke when applicable
  const activeEditingStroke = useMemo(() => {
    if (!editingText) return null
    return strokes.find((s) => s.id === editingText.id) || null
  }, [editingText, strokes])

  const activeTextFontSize = useMemo(() => {
    if (activeEditingStroke?.type === "text" && activeEditingStroke.fontSize) {
      return activeEditingStroke.fontSize
    }
    return Math.max(16, currentStrokeWidth * 4)
  }, [activeEditingStroke, currentStrokeWidth])

  const activeTextColor = useMemo(() => {
    if (activeEditingStroke?.type === "text" && activeEditingStroke.color) {
      return activeEditingStroke.color
    }
    return currentColor
  }, [activeEditingStroke, currentColor])

  // Check if point is on a stroke
  const getStrokeAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      return HitDetector.getStrokeAtPoint(point, strokes, StrokeUtils.calculateBounds)
    },
    [strokes],
  )

  // Get resize handle at point
  const getResizeHandle = useCallback(
    (point: { x: number; y: number }) => {
      return HitDetector.getResizeHandle(point, selectedStrokes, strokes, zoom, StrokeUtils.calculateBounds)
    },
    [selectedStrokes, strokes, zoom],
  )

  // Redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new CanvasRenderer(canvas)
    renderer.clear()
    renderer.applyTransform({ panX, panY, zoom })

    // Draw all strokes; if editing text of an existing stroke, skip it and draw live text below
    strokes.forEach((stroke) => {
      if (editingText && stroke.id === editingText.id) return
      renderer.drawStroke(stroke, !!stroke.selected)
    })

    // Draw current stroke if drawing
    if (currentStroke) {
      renderer.drawStroke(currentStroke)
    }

    // Draw selection box
    if (selectionBox && isSelecting) {
      renderer.drawSelectionBox(selectionBox)
    }

    // Draw live editing text and caret
    if (editingText) {
      const ctx = canvas.getContext("2d")!
      const fontSize = (activeEditingStroke?.fontSize || Math.max(16, currentStrokeWidth * 4))
      const color = (activeEditingStroke?.color || currentColor)
      ctx.save()
      ctx.translate(panX, panY)
      ctx.scale(zoom, zoom)
      ctx.font = `${fontSize}px Kalam, cursive`
      ctx.fillStyle = color
      ctx.textBaseline = "top"
      const lines = editingText.text.split("\n")
      if (editingText.mathMode) {
        // Simple math renderer: supports ^super, _sub, (a)/(b) stacked fraction, and × for '*'
        const drawMathLine = (line: string, baseX: number, baseY: number) => {
          let x = baseX
          const tokens = line.replace(/\*/g, "×").split(/(\^|_|\s+)/)
          for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i]
            if (t === "^" && i + 1 < tokens.length) {
              const sup = tokens[i + 1]
              // draw superscript smaller and above
              const supSize = Math.max(10, fontSize * 0.65)
              ctx.save()
              ctx.font = `${supSize}px Kalam, cursive`
              ctx.fillText(sup, x, baseY - supSize * 0.4)
              const w = ctx.measureText(sup).width
              ctx.restore()
              x += w
              i++
              continue
            }
            if (t === "_" && i + 1 < tokens.length) {
              const sub = tokens[i + 1]
              const subSize = Math.max(10, fontSize * 0.65)
              ctx.save()
              ctx.font = `${subSize}px Kalam, cursive`
              ctx.fillText(sub, x, baseY + subSize * 0.3)
              const w = ctx.measureText(sub).width
              ctx.restore()
              x += w
              i++
              continue
            }
            // Fraction pattern: (a)/(b)
            const fracMatch = t.match(/^\(([^)]+)\)\/(\(([^)]+)\))$/)
            if (fracMatch) {
              const num = fracMatch[1]
              const den = fracMatch[3]
              const small = Math.max(10, fontSize * 0.85)
              ctx.save()
              ctx.font = `${small}px Kalam, cursive`
              const wNum = ctx.measureText(num).width
              const wDen = ctx.measureText(den).width
              const wBar = Math.max(wNum, wDen) + 6
              // numerator
              ctx.fillText(num, x + (wBar - wNum) / 2, baseY)
              // fraction bar
              ctx.beginPath()
              ctx.moveTo(x, baseY + small + 2)
              ctx.lineTo(x + wBar, baseY + small + 2)
              ctx.lineWidth = Math.max(1 / zoom, 1)
              ctx.strokeStyle = color
              ctx.stroke()
              // denominator
              ctx.fillText(den, x + (wBar - wDen) / 2, baseY + small + 6)
              ctx.restore()
              x += wBar + 4
              continue
            }
            // regular text
            ctx.fillText(t, x, baseY)
            x += ctx.measureText(t).width
          }
        }
        lines.forEach((line, i) => drawMathLine(line, editingText.x, editingText.y + i * fontSize * 1.2))
      } else {
        lines.forEach((line, i) => {
          ctx.fillText(line, editingText.x, editingText.y + i * fontSize * 1.2)
        })
      }
      // Caret
      if (isCaretVisible) {
        const { line, col } = indexToLineCol(editingText.text, caretIndexRef.current)
        const before = lines[line]?.slice(0, col) || ""
        const xOffset = ctx.measureText(before).width
        const cx = editingText.x + xOffset
        const cy = editingText.y + line * fontSize * 1.2
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1 / zoom, 1)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx, cy + fontSize)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Draw selection handles (skip if editing this text, to avoid double visuals)
    const ctx = canvas.getContext("2d")
    if (ctx && selectedStrokes.length === 1 && currentTool === "select") {
      const stroke = strokes.find((s) => s.id === selectedStrokes[0])
      if (stroke) {
        if (editingText && stroke.id === editingText.id) {
          // When editing a text stroke, do not draw handles so the live text fully replaces it
          renderer.restoreTransform()
          return
        }

        // Compute unrotated box w/h and center based on stroke type
        const pad = 6 / zoom
        let cx = 0, cy = 0, w = 0, h = 0
        const rotation = (stroke as any).rotation || 0
        if (stroke.type === "text" && stroke.points.length > 0) {
          const p = stroke.points[0]
          const fontSize = stroke.fontSize || 16
          ctx.font = `${fontSize}px Kalam, cursive`
          const lines = (stroke.text || "").split("\n")
          const widths = lines.map((l) => ctx.measureText(l).width)
          w = Math.max(20, ...widths)
          h = Math.max(fontSize * 1.2, lines.length * fontSize * 1.2)
          cx = p.x + w / 2
          cy = p.y + h / 2
        } else if (stroke.startPoint && stroke.endPoint) {
          const minX0 = Math.min(stroke.startPoint.x, stroke.endPoint.x)
          const minY0 = Math.min(stroke.startPoint.y, stroke.endPoint.y)
          const maxX0 = Math.max(stroke.startPoint.x, stroke.endPoint.x)
          const maxY0 = Math.max(stroke.startPoint.y, stroke.endPoint.y)
          w = maxX0 - minX0
          h = maxY0 - minY0
          cx = (minX0 + maxX0) / 2
          cy = (minY0 + maxY0) / 2
        } else if (stroke.points.length > 0) {
          let minX0 = Infinity, minY0 = Infinity, maxX0 = -Infinity, maxY0 = -Infinity
          stroke.points.forEach((p) => { minX0 = Math.min(minX0, p.x); minY0 = Math.min(minY0, p.y); maxX0 = Math.max(maxX0, p.x); maxY0 = Math.max(maxY0, p.y) })
          w = maxX0 - minX0
          h = maxY0 - minY0
          cx = (minX0 + maxX0) / 2
          cy = (minY0 + maxY0) / 2
        }

        // Draw rotated selection rectangle and handles in local space
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rotation)

        // Outline rectangle
        ctx.strokeStyle = "#2563eb"
        ctx.lineWidth = 1 / zoom
        ctx.setLineDash([])
        ctx.strokeRect(-w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad)

        // Handles positions (local coords)
        const hw = w / 2 + pad
        const hh = h / 2 + pad
        const handleSize = 8 / zoom
        const handlesLocal = [
          { x: -hw, y: -hh }, // nw
          { x: hw, y: -hh },  // ne
          { x: -hw, y: hh },  // sw
          { x: hw, y: hh },   // se
          { x: 0, y: -hh },   // n
          { x: 0, y: hh },    // s
          { x: -hw, y: 0 },   // w
          { x: hw, y: 0 },    // e
        ]

        // Draw filled white squares with blue stroke
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#2563eb"
        handlesLocal.forEach((p) => {
          ctx.fillRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize)
        })

        // Rotation handle above top edge in local space
        const rotationHandleDistance = 30 / zoom
        const rHandleX = 0
        const rHandleY = -hh - rotationHandleDistance
        ctx.beginPath()
        ctx.moveTo(0, -hh)
        ctx.lineTo(rHandleX, rHandleY)
        ctx.stroke()
        const r = Math.max(4 / zoom, 3 / zoom)
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(rHandleX, rHandleY, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        ctx.restore()
      }
    }

    // Restore context
    renderer.restoreTransform()
  }, [strokes, currentStroke, panX, panY, zoom, selectionBox, isSelecting, selectedStrokes, currentTool, editingText, isCaretVisible, activeEditingStroke, currentStrokeWidth, currentColor, indexToLineCol])

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
      const bounds = StrokeUtils.calculateBounds(stroke)
      const { minX, minY, maxX, maxY } = bounds
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      const handleSize = 8 / zoom
      const rotationHandleDistance = 30 / zoom

      // Resize handles
      const resizeHandles = [
        { x: minX, y: minY, type: "nw" },
        { x: maxX, y: minY, type: "ne" },
        { x: minX, y: maxY, type: "sw" },
        { x: maxX, y: maxY, type: "se" },
        { x: centerX, y: minY, type: "n" },
        { x: centerX, y: maxY, type: "s" },
        { x: minX, y: centerY, type: "w" },
        { x: maxX, y: centerY, type: "e" },
      ]

      // Rotation handle
      const rotationHandle = {
        x: centerX,
        y: minY - rotationHandleDistance,
        type: "rotate"
      }

      ctx.fillStyle = "#2563eb"
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2 / zoom

      // Draw resize handles
      resizeHandles.forEach((handle) => {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      })

      // Draw rotation handle
      ctx.fillStyle = "#dc2626" // Red for rotation
      ctx.beginPath()
      ctx.arc(rotationHandle.x, rotationHandle.y, handleSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Draw rotation line
      ctx.strokeStyle = "#dc2626"
      ctx.lineWidth = 1 / zoom
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(centerX, minY)
      ctx.lineTo(rotationHandle.x, rotationHandle.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw center point
      ctx.fillStyle = "#16a34a" // Green for center
      ctx.beginPath()
      ctx.arc(centerX, centerY, 3 / zoom, 0, Math.PI * 2)
      ctx.fill()
    },
    [zoom],
  )

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: any) => {
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.setLineDash([])

    // No shadow highlight on selection; selection visuals handled separately

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
        lines.forEach((line: string, index: number) => {
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

  // Ensure web fonts are loaded before drawing text to get correct metrics
  useEffect(() => {
    // @ts-ignore
    const fonts: any = (document as any).fonts
    if (fonts && typeof fonts.ready?.then === "function") {
      fonts.ready.then(() => {
        redrawCanvas()
      })
    }
  }, [redrawCanvas])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update cursor position for custom cursors
      setCursorPosition({ x: e.clientX, y: e.clientY })

      // Smart cursor in Select mode (hover): arrow by default, resize over handles, move over strokes
      if (!isPanning && !isDragging && !isSelecting) {
        const container = containerRef.current
        if (container && currentTool === "select" && !editingText) {
          // While rotating, show grabbing and update rotation
          if (isRotating) {
            container.style.cursor = "grabbing"
            const point = screenToCanvas(e.clientX, e.clientY)
            updateRotate(point)
            return
          }
          const point = screenToCanvas(e.clientX, e.clientY)
          const handle = getResizeHandle(point)
          if (handle) {
            const map: Record<string, string> = {
              nw: "nwse-resize",
              se: "nwse-resize",
              ne: "nesw-resize",
              sw: "nesw-resize",
              n: "ns-resize",
              s: "ns-resize",
              w: "ew-resize",
              e: "ew-resize",
              rotate: "grab",
            }
            container.style.cursor = map[handle] || "default"
          } else {
            const stroke = getStrokeAtPoint(point)
            container.style.cursor = stroke ? "move" : "default"
          }
        } else if (container) {
          container.style.cursor = "default"
        }
      }

      if (isPanning && lastPanPoint) {
        const deltaX = e.clientX - lastPanPoint.x
        const deltaY = e.clientY - lastPanPoint.y
        setPan(panX + deltaX, panY + deltaY)
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      const point = screenToCanvas(e.clientX, e.clientY)

      if (resizeHandle) {
        if (resizeHandle === "rotate") {
          updateRotate(point)
        } else {
          updateResize(point)
        }
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
      editingText,
      getResizeHandle,
      getStrokeAtPoint,
      isRotating,
      updateRotate,
    ],
  )

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = screenToCanvas(e.clientX, e.clientY)

      

      // If editing text: click inside moves caret; click outside commits edit before proceeding
      if (editingText) {
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext("2d")
          if (ctx) {
            const fontSize = (activeEditingStroke?.fontSize || Math.max(16, currentStrokeWidth * 4))
            ctx.font = `${fontSize}px Kalam, cursive`
            ctx.textBaseline = "top"
            const lines = editingText.text.split("\n")
            const maxWidth = Math.max(20, ...lines.map((ln) => ctx.measureText(ln).width))
            const height = Math.max(fontSize * 1.2, lines.length * fontSize * 1.2)
            const withinX = point.x >= editingText.x && point.x <= editingText.x + maxWidth
            const withinY = point.y >= editingText.y && point.y <= editingText.y + height
            if (withinX && withinY) {
              // Place caret at clicked position
              const relY = point.y - editingText.y
              const line = Math.min(Math.floor(relY / (fontSize * 1.2)), Math.max(0, lines.length - 1))
              const relX = Math.max(0, point.x - editingText.x)
              const targetLine = lines[line] || ""
              // Find closest column by measuring substrings
              let bestCol = 0
              let bestDist = Infinity
              for (let c = 0; c <= targetLine.length; c++) {
                const w = ctx.measureText(targetLine.slice(0, c)).width
                const d = Math.abs(w - relX)
                if (d < bestDist) {
                  bestDist = d
                  bestCol = c
                }
              }
              caretIndexRef.current = lineColToIndex(editingText.text, line, bestCol)
              return
            }
          }
        }
        // Clicked outside -> commit edit
        if (editingText.text.trim()) {
          finishTextEdit()
        } else {
          setEditingText(null)
        }
        // Do not return; let the click proceed to next handlers (e.g., start drawing/selecting)
      }

      if (currentTool === "pan" || e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        setIsPanning(true)
        setLastPanPoint({ x: e.clientX, y: e.clientY })
        return
      }

      if (currentTool === "select") {
        const handle = getResizeHandle(point)
        if (handle) {
          if (handle === "rotate") {
            startRotate(point)
          } else {
            startResize(handle, point)
          }
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
      if (resizeHandle === "rotate") {
        finishRotate()
      } else {
        finishResize()
      }
    }

    // If rotating without resizeHandle flag, finish rotation
    if (isRotating) {
      finishRotate()
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
    isRotating,
    finishRotate,
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

  // Caret blink
  useEffect(() => {
    if (!editingText) return
    setIsCaretVisible(true)
    const i = setInterval(() => setIsCaretVisible((v) => !v), 600)
    return () => clearInterval(i)
  }, [editingText])

  // Initialize caret at end when starting new edit
  useEffect(() => {
    if (editingText && !hasInitializedTextEdit.current) {
      caretIndexRef.current = editingText.text.length
      desiredColumnRef.current = null
      hasInitializedTextEdit.current = true
    }
    if (!editingText) {
      hasInitializedTextEdit.current = false
      desiredColumnRef.current = null
    }
  }, [editingText])

  

  // Keyboard handler for custom text edit
  useEffect(() => {
    if (!editingText) return
    const onKeyDown = (e: KeyboardEvent) => {
      // Let shortcuts be disabled while editing
      // Handle text input here
      const text = editingText.text
      let idx = caretIndexRef.current
      const isCtrl = e.ctrlKey || e.metaKey
      // Escape finishes edit (cancel)
      if (e.key === "Escape") {
        e.preventDefault()
        setEditingText(null)
        return
      }
      // Commit is on click-away; Enter inserts newline
      if (e.key === "Enter") {
        e.preventDefault()
        const newText = text.slice(0, idx) + "\n" + text.slice(idx)
        caretIndexRef.current = idx + 1
        updateText(newText)
        return
      }
      if (e.key === "Backspace") {
        e.preventDefault()
        if (idx > 0) {
          const newText = text.slice(0, idx - 1) + text.slice(idx)
          caretIndexRef.current = idx - 1
          updateText(newText)
        }
        return
      }
      if (e.key === "Delete") {
        e.preventDefault()
        if (idx < text.length) {
          const newText = text.slice(0, idx) + text.slice(idx + 1)
          updateText(newText)
        }
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        caretIndexRef.current = Math.max(0, idx - 1)
        desiredColumnRef.current = null
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        caretIndexRef.current = Math.min(text.length, idx + 1)
        desiredColumnRef.current = null
        return
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault()
        const { line, col } = indexToLineCol(text, idx)
        const targetLine = e.key === "ArrowUp" ? Math.max(0, line - 1) : Math.min(getLines(text).length - 1, line + 1)
        const desiredCol = desiredColumnRef.current ?? col
        desiredColumnRef.current = desiredCol
        const newCol = Math.min(desiredCol, (getLines(text)[targetLine] || "").length)
        caretIndexRef.current = lineColToIndex(text, targetLine, newCol)
        return
      }
      if (e.key.length === 1 && !isCtrl) {
        // Regular character
        e.preventDefault()
        const newText = text.slice(0, idx) + e.key + text.slice(idx)
        caretIndexRef.current = idx + 1
        desiredColumnRef.current = null
        updateText(newText)
        return
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editingText, updateText, indexToLineCol, lineColToIndex, getLines, setEditingText])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (currentTool !== "select") return

      const point = screenToCanvas(e.clientX, e.clientY)
      const clickedStroke = getStrokeAtPoint(point)
      
      if (clickedStroke && clickedStroke.type === "text") {
        // Start editing the text at end
        setEditingText({ id: clickedStroke.id, x: clickedStroke.points[0].x, y: clickedStroke.points[0].y, text: clickedStroke.text || "", mathMode: clickedStroke.mathMode ?? false })
        hasInitializedTextEdit.current = false
        // Select the stroke
        selectStroke(clickedStroke.id)
      }
    },
    [currentTool, screenToCanvas, getStrokeAtPoint, setEditingText, selectStroke],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when editing text or when focused on input elements
      if (editingText || 
          e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return
      }

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
    return CursorManager.getCursorClass(
      currentTool,
      {
        isPanning,
        isSelecting,
        isRotating,
        resizeHandle,
        isDragging,
        // Unused fields can be omitted in runtime usage
      } as any,
      {
        isDrawing,
      } as any,
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <WhiteboardToolbar />
      {editingText && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded border bg-white shadow text-sm flex items-center gap-2">
          <span>Math mode</span>
          <button
            className={`px-2 py-0.5 rounded ${editingText.mathMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => setEditingText({ ...editingText, mathMode: !editingText.mathMode })}
          >
            {editingText.mathMode ? 'On' : 'Off'}
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
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

        {/* No textarea overlay; custom in-canvas text editor handles rendering and input */}

        <div id="whiteboard-instructions" className="sr-only">
          Use keyboard shortcuts to access tools: P for pen, E for eraser, V for select, R for rectangle, O for ellipse,
          L for line, T for text. Use Ctrl+Z to undo, Ctrl+Y to redo, Ctrl+S to save. Mouse wheel to zoom, drag to draw
          or pan.
        </div>
      </div>
    </div>
  )
}
