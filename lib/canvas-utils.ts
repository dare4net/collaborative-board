import type { Stroke, Point, CanvasState } from './types'

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Failed to get 2D context')
    this.ctx = context
  }

  setupCanvas(devicePixelRatio: number) {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * devicePixelRatio
    this.canvas.height = rect.height * devicePixelRatio
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    this.ctx.scale(devicePixelRatio, devicePixelRatio)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio)
  }

  applyTransform(state: CanvasState) {
    this.ctx.save()
    this.ctx.translate(state.panX, state.panY)
    this.ctx.scale(state.zoom, state.zoom)
  }

  restoreTransform() {
    this.ctx.restore()
  }

  drawStroke(stroke: Stroke, isSelected = false) {
    this.ctx.strokeStyle = stroke.color
    this.ctx.fillStyle = stroke.color
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.setLineDash([])

    // No shadow highlight on selection; selection visuals handled separately

    // Apply rotation around stroke center if present
    const rotation = (stroke as any).rotation || 0
    if (rotation) {
      const { cx, cy } = this.getStrokeCenter(stroke)
      this.ctx.save()
      this.ctx.translate(cx, cy)
      this.ctx.rotate(rotation)
      // Draw with coordinates relative to center
      switch (stroke.type) {
        case 'pen':
          this.drawPenStrokeRelative(stroke, cx, cy)
          break
        case 'rectangle':
          this.drawRectangleRelative(stroke, cx, cy)
          break
        case 'ellipse':
          this.drawEllipseRelative(stroke, cx, cy)
          break
        case 'line':
          this.drawLineRelative(stroke, cx, cy)
          break
        case 'text':
          this.drawTextRelative(stroke, cx, cy)
          break
      }
      this.ctx.restore()
    } else {
      // No rotation
      switch (stroke.type) {
        case 'pen':
          this.drawPenStroke(stroke)
          break
        case 'rectangle':
          this.drawRectangle(stroke)
          break
        case 'ellipse':
          this.drawEllipse(stroke)
          break
        case 'line':
          this.drawLine(stroke)
          break
        case 'text':
          this.drawText(stroke)
          break
      }
    }

    // Ensure no lingering shadow
    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
  }

  // Compute center (axis-aligned) for rotation pivot
  private getStrokeCenter(stroke: Stroke): { cx: number; cy: number } {
    if (stroke.type === 'text' && stroke.points.length > 0) {
      const p = stroke.points[0]
      const fontSize = stroke.fontSize || 16
      this.ctx.font = `${fontSize}px Kalam, cursive`
      const lines = (stroke.text || '').split('\n')
      const widths = lines.map((l) => this.ctx.measureText(l).width)
      const w = Math.max(20, ...widths)
      const h = Math.max(fontSize * 1.2, lines.length * fontSize * 1.2)
      return { cx: p.x + w / 2, cy: p.y + h / 2 }
    }
    if (stroke.startPoint && stroke.endPoint) {
      const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
      const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
      const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
      const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
    }
    if (stroke.points.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      stroke.points.forEach((pt) => { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y) })
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
    }
    return { cx: 0, cy: 0 }
  }

  private drawPenStroke(stroke: Stroke) {
    if (stroke.points.length < 1) return

    if (stroke.points.length === 1) {
      // Draw a single dot
      this.ctx.beginPath()
      this.ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.strokeWidth / 2, 0, Math.PI * 2)
      this.ctx.fill()
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

      this.ctx.lineWidth = lineWidth
      this.ctx.beginPath()
      this.ctx.moveTo(current.x, current.y)

      if (i < stroke.points.length - 2) {
        // Use quadratic curves for smoothness
        const nextNext = stroke.points[i + 2]
        const midX = (next.x + nextNext.x) / 2
        const midY = (next.y + nextNext.y) / 2
        this.ctx.quadraticCurveTo(next.x, next.y, midX, midY)
      } else {
        this.ctx.lineTo(next.x, next.y)
      }

      this.ctx.stroke()
    }
  }

  private drawRectangle(stroke: Stroke) {
    if (!stroke.startPoint || !stroke.endPoint) return
    this.ctx.lineWidth = stroke.strokeWidth
    const rectWidth = stroke.endPoint.x - stroke.startPoint.x
    const rectHeight = stroke.endPoint.y - stroke.startPoint.y
    this.ctx.strokeRect(stroke.startPoint.x, stroke.startPoint.y, rectWidth, rectHeight)
  }

  private drawEllipse(stroke: Stroke) {
    if (!stroke.startPoint || !stroke.endPoint) return
    this.ctx.lineWidth = stroke.strokeWidth
    const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2
    const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2
    const radiusX = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2
    const radiusY = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2

    this.ctx.beginPath()
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    this.ctx.stroke()
  }

  private drawLine(stroke: Stroke) {
    if (!stroke.startPoint || !stroke.endPoint) return
    this.ctx.lineWidth = stroke.strokeWidth
    this.ctx.beginPath()
    this.ctx.moveTo(stroke.startPoint.x, stroke.startPoint.y)
    this.ctx.lineTo(stroke.endPoint.x, stroke.endPoint.y)
    this.ctx.stroke()
  }

  private drawText(stroke: Stroke) {
    if (!stroke.text || stroke.points.length === 0) return
    const textPoint = stroke.points[0]
    const fontSize = stroke.fontSize || 16
    this.ctx.font = `${fontSize}px Kalam, cursive`
    this.ctx.fillStyle = stroke.color
    // Use top baseline so (x,y) is the top-left of the first line, matching textarea
    this.ctx.textBaseline = 'top'

    // Handle multi-line text
    const lines = stroke.text.split('\n')
    if (stroke.mathMode) {
      lines.forEach((line: string, index: number) => {
        this.drawMathLine(line, textPoint.x, textPoint.y + index * fontSize * 1.2, fontSize, stroke.color)
      })
    } else {
      lines.forEach((line: string, index: number) => {
        this.ctx.fillText(line, textPoint.x, textPoint.y + index * fontSize * 1.2)
      })
    }
  }

  // Relative variants used while a rotation transform is active around (cx, cy)
  private drawPenStrokeRelative(stroke: Stroke, cx: number, cy: number) {
    if (stroke.points.length < 1) return
    if (stroke.points.length === 1) {
      this.ctx.beginPath()
      this.ctx.arc(stroke.points[0].x - cx, stroke.points[0].y - cy, stroke.strokeWidth / 2, 0, Math.PI * 2)
      this.ctx.fill()
      return
    }
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const current = stroke.points[i]
      const next = stroke.points[i + 1]
      const distance = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2))
      const speed = Math.min(distance, 20)
      const pressureFactor = Math.max(0.3, 1 - speed / 20)
      const lineWidth = stroke.strokeWidth * pressureFactor
      this.ctx.lineWidth = lineWidth
      this.ctx.beginPath()
      this.ctx.moveTo(current.x - cx, current.y - cy)
      if (i < stroke.points.length - 2) {
        const nextNext = stroke.points[i + 2]
        const midX = (next.x + nextNext.x) / 2
        const midY = (next.y + nextNext.y) / 2
        this.ctx.quadraticCurveTo(next.x - cx, next.y - cy, midX - cx, midY - cy)
      } else {
        this.ctx.lineTo(next.x - cx, next.y - cy)
      }
      this.ctx.stroke()
    }
  }

  private drawRectangleRelative(stroke: Stroke, cx: number, cy: number) {
    if (!stroke.startPoint || !stroke.endPoint) return
    this.ctx.lineWidth = stroke.strokeWidth
    const x = Math.min(stroke.startPoint.x, stroke.endPoint.x) - cx
    const y = Math.min(stroke.startPoint.y, stroke.endPoint.y) - cy
    const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x)
    const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y)
    this.ctx.strokeRect(x, y, w, h)
  }

  private drawEllipseRelative(stroke: Stroke, cx: number, cy: number) {
    if (!stroke.startPoint || !stroke.endPoint) return
    this.ctx.lineWidth = stroke.strokeWidth
    const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2 - cx
    const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2 - cy
    const radiusX = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2
    const radiusY = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2
    this.ctx.beginPath()
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    this.ctx.stroke()
  }

  private drawLineRelative(stroke: Stroke, cx: number, cy: number) {
    if (!stroke.startPoint || !stroke.endPoint) return
    this.ctx.lineWidth = stroke.strokeWidth
    this.ctx.beginPath()
    this.ctx.moveTo(stroke.startPoint.x - cx, stroke.startPoint.y - cy)
    this.ctx.lineTo(stroke.endPoint.x - cx, stroke.endPoint.y - cy)
    this.ctx.stroke()
  }

  private drawTextRelative(stroke: Stroke, cx: number, cy: number) {
    if (!stroke.text || stroke.points.length === 0) return
    const textPoint = stroke.points[0]
    const fontSize = stroke.fontSize || 16
    this.ctx.font = `${fontSize}px Kalam, cursive`
    this.ctx.fillStyle = stroke.color
    this.ctx.textBaseline = 'top'
    const lines = (stroke.text || '').split('\n')
    if ((stroke as any).mathMode) {
      lines.forEach((line: string, index: number) => {
        this.drawMathLine(line, textPoint.x - cx, textPoint.y - cy + index * fontSize * 1.2, fontSize, stroke.color)
      })
    } else {
      lines.forEach((line: string, index: number) => {
        this.ctx.fillText(line, textPoint.x - cx, textPoint.y - cy + index * fontSize * 1.2)
      })
    }
  }

  // Simple inline math drawer: supports ^ (superscript), _ (subscript), fractions like (a)/(b), and × for '*'
  private drawMathLine(line: string, baseX: number, baseY: number, fontSize: number, color: string) {
    let x = baseX
    const tokens = line.replace(/\*/g, '×').split(/(\^|_|\s+)/)
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t === '^' && i + 1 < tokens.length) {
        const sup = tokens[i + 1]
        const supSize = Math.max(10, fontSize * 0.65)
        this.ctx.save()
        this.ctx.font = `${supSize}px Kalam, cursive`
        this.ctx.fillText(sup, x, baseY - supSize * 0.4)
        const w = this.ctx.measureText(sup).width
        this.ctx.restore()
        x += w
        i++
        continue
      }
      if (t === '_' && i + 1 < tokens.length) {
        const sub = tokens[i + 1]
        const subSize = Math.max(10, fontSize * 0.65)
        this.ctx.save()
        this.ctx.font = `${subSize}px Kalam, cursive`
        this.ctx.fillText(sub, x, baseY + subSize * 0.3)
        const w = this.ctx.measureText(sub).width
        this.ctx.restore()
        x += w
        i++
        continue
      }
      const fracMatch = t.match(/^\(([^)]+)\)\/(\(([^)]+)\))$/)
      if (fracMatch) {
        const num = fracMatch[1]
        const den = fracMatch[3]
        const small = Math.max(10, fontSize * 0.85)
        this.ctx.save()
        this.ctx.font = `${small}px Kalam, cursive`
        const wNum = this.ctx.measureText(num).width
        const wDen = this.ctx.measureText(den).width
        const wBar = Math.max(wNum, wDen) + 6
        // numerator
        this.ctx.fillText(num, x + (wBar - wNum) / 2, baseY)
        // fraction bar
        this.ctx.beginPath()
        this.ctx.moveTo(x, baseY + small + 2)
        this.ctx.lineTo(x + wBar, baseY + small + 2)
        this.ctx.lineWidth = 1
        this.ctx.strokeStyle = color
        this.ctx.stroke()
        // denominator
        this.ctx.fillText(den, x + (wBar - wDen) / 2, baseY + small + 6)
        this.ctx.restore()
        x += wBar + 4
        continue
      }
      this.ctx.fillText(t, x, baseY)
      x += this.ctx.measureText(t).width
    }
  }

  drawSelectionBox(selectionBox: { startX: number; startY: number; endX: number; endY: number }) {
    this.ctx.strokeStyle = '#2563eb'
    this.ctx.setLineDash([5, 5])
    const width = selectionBox.endX - selectionBox.startX
    const height = selectionBox.endY - selectionBox.startY
    this.ctx.strokeRect(selectionBox.startX, selectionBox.startY, width, height)
    this.ctx.setLineDash([])
  }
}

export class SelectionRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  drawSelectionHandles(stroke: Stroke, zoom: number, calculateBounds: (stroke: Stroke) => { minX: number; minY: number; maxX: number; maxY: number }) {
    const bounds = calculateBounds(stroke)
    const { minX, minY, maxX, maxY } = bounds
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const handleSize = 8 / zoom
    const rotationHandleDistance = 30 / zoom

    // Resize handles
    const resizeHandles = [
      { x: minX, y: minY, type: 'nw' },
      { x: maxX, y: minY, type: 'ne' },
      { x: minX, y: maxY, type: 'sw' },
      { x: maxX, y: maxY, type: 'se' },
      { x: centerX, y: minY, type: 'n' },
      { x: centerX, y: maxY, type: 's' },
      { x: minX, y: centerY, type: 'w' },
      { x: maxX, y: centerY, type: 'e' },
    ]

    // Rotation handle
    const rotationHandle = {
      x: centerX,
      y: minY - rotationHandleDistance,
      type: 'rotate'
    }

    this.ctx.fillStyle = '#2563eb'
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 2 / zoom

    // Draw resize handles
    resizeHandles.forEach((handle) => {
      this.ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      this.ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
    })

    // Draw rotation handle
    this.ctx.fillStyle = '#dc2626' // Red for rotation
    this.ctx.beginPath()
    this.ctx.arc(rotationHandle.x, rotationHandle.y, handleSize / 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()

    // Draw rotation line
    this.ctx.strokeStyle = '#dc2626'
    this.ctx.lineWidth = 1 / zoom
    this.ctx.setLineDash([3, 3])
    this.ctx.beginPath()
    this.ctx.moveTo(centerX, minY)
    this.ctx.lineTo(rotationHandle.x, rotationHandle.y)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    // Draw center point
    this.ctx.fillStyle = '#16a34a' // Green for center
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 3 / zoom, 0, Math.PI * 2)
    this.ctx.fill()
  }
}

