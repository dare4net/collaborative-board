import type { Stroke } from './types'

// Rotate a point (x,y) around center (cx,cy) by angle radians
function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number): { x: number; y: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = x - cx
  const dy = y - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

export class StrokeUtils {
  static calculateBounds(stroke: Stroke): { minX: number; minY: number; maxX: number; maxY: number } {
    const rotation = (stroke as any).rotation || 0
    if (stroke.type === 'text' && stroke.points.length > 0) {
      const point = stroke.points[0]
      const fontSize = stroke.fontSize || 16
      const text = stroke.text || ''
      const lineHeight = fontSize * 1.2

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = `${fontSize}px "Kalam", cursive`
        const lines = text.split('\n')
        const widths = lines.map((line) => ctx.measureText(line).width)
        const w = Math.max(20, ...widths)
        const h = Math.max(lineHeight, lineHeight * lines.length)
        const pad = 2
        if (rotation) {
          const cx = point.x + w / 2
          const cy = point.y + h / 2
          const corners = [
            { x: point.x, y: point.y },
            { x: point.x + w, y: point.y },
            { x: point.x + w, y: point.y + h },
            { x: point.x, y: point.y + h },
          ]
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          corners.forEach(({ x, y }) => {
            const p = rotatePoint(x, y, cx, cy, rotation)
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
          })
          return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
        }
        return { minX: point.x - pad, minY: point.y - pad, maxX: point.x + w + pad, maxY: point.y + h + pad }
      }
      // Fallback
      const approxW = Math.max(20, text.length * fontSize * 0.6)
      const approxH = lineHeight
      return { minX: point.x, minY: point.y, maxX: point.x + approxW, maxY: point.y + approxH }
    } else if (stroke.startPoint && stroke.endPoint) {
      const minX0 = Math.min(stroke.startPoint.x, stroke.endPoint.x)
      const minY0 = Math.min(stroke.startPoint.y, stroke.endPoint.y)
      const maxX0 = Math.max(stroke.startPoint.x, stroke.endPoint.x)
      const maxY0 = Math.max(stroke.startPoint.y, stroke.endPoint.y)
      if (rotation) {
        const cx = (minX0 + maxX0) / 2
        const cy = (minY0 + maxY0) / 2
        const corners = [
          { x: minX0, y: minY0 },
          { x: maxX0, y: minY0 },
          { x: maxX0, y: maxY0 },
          { x: minX0, y: maxY0 },
        ]
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        corners.forEach(({ x, y }) => {
          const p = rotatePoint(x, y, cx, cy, rotation)
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
        })
        return { minX, minY, maxX, maxY }
      }
      return { minX: minX0, minY: minY0, maxX: maxX0, maxY: maxY0 }
    } else if (stroke.points.length > 0) {
      if (rotation) {
        // Compute center from unrotated points
        let uxMin = Infinity, uyMin = Infinity, uxMax = -Infinity, uyMax = -Infinity
        stroke.points.forEach((p) => { uxMin = Math.min(uxMin, p.x); uyMin = Math.min(uyMin, p.y); uxMax = Math.max(uxMax, p.x); uyMax = Math.max(uyMax, p.y) })
        const cx = (uxMin + uxMax) / 2
        const cy = (uyMin + uyMax) / 2
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        stroke.points.forEach((p) => {
          const rp = rotatePoint(p.x, p.y, cx, cy, rotation)
          minX = Math.min(minX, rp.x)
          minY = Math.min(minY, rp.y)
          maxX = Math.max(maxX, rp.x)
          maxY = Math.max(maxY, rp.y)
        })
        return { minX, minY, maxX, maxY }
      } else {
        let minX = Number.POSITIVE_INFINITY
        let minY = Number.POSITIVE_INFINITY
        let maxX = Number.NEGATIVE_INFINITY
        let maxY = Number.NEGATIVE_INFINITY
        stroke.points.forEach((point) => {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        })
        return { minX, minY, maxX, maxY }
      }
    }
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  static createPenStroke(id: string, point: { x: number; y: number }, color: string, strokeWidth: number): Stroke {
    return { id, type: 'pen', points: [point], color, strokeWidth }
  }

  static createShapeStroke(
    id: string,
    type: 'rectangle' | 'ellipse' | 'line',
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    color: string,
    strokeWidth: number
  ): Stroke {
    return { id, type, points: [], color, strokeWidth, startPoint, endPoint }
  }

  static createTextStroke(
    id: string,
    point: { x: number; y: number },
    text: string,
    color: string,
    strokeWidth: number,
    fontSize?: number
  ): Stroke {
    return { id, type: 'text', points: [point], color, strokeWidth, text, fontSize: fontSize || Math.max(16, strokeWidth * 4) }
  }

  static updateStrokePoints(stroke: Stroke, newPoints: { x: number; y: number }[]): Stroke {
    return { ...stroke, points: newPoints }
  }

  static updateStrokeShape(stroke: Stroke, startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): Stroke {
    return { ...stroke, startPoint, endPoint }
  }

  static updateStrokeText(stroke: Stroke, text: string, fontSize?: number): Stroke {
    return { ...stroke, text, fontSize: fontSize || stroke.fontSize }
  }

  static applyRotation(stroke: Stroke, rotation: number): Stroke {
    return { ...stroke, rotation: (stroke.rotation || 0) + rotation }
  }

  static applyTranslation(stroke: Stroke, deltaX: number, deltaY: number): Stroke {
    if (stroke.type === 'text' && stroke.points.length > 0) {
      return { ...stroke, points: [{ x: stroke.points[0].x + deltaX, y: stroke.points[0].y + deltaY }] }
    } else if (stroke.startPoint && stroke.endPoint) {
      return {
        ...stroke,
        startPoint: { x: stroke.startPoint.x + deltaX, y: stroke.startPoint.y + deltaY },
        endPoint: { x: stroke.endPoint.x + deltaX, y: stroke.endPoint.y + deltaY },
      }
    } else if (stroke.points.length > 0) {
      return { ...stroke, points: stroke.points.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY })) }
    }
    return stroke
  }

  static applyResize(stroke: Stroke, handle: string, deltaX: number, deltaY: number): Stroke {
    if (stroke.type === 'text') {
      const currentFontSize = stroke.fontSize || 16
      let newFontSize = currentFontSize
      switch (handle) {
        case 'se':
        case 'sw':
        case 's':
          newFontSize = Math.max(12, currentFontSize + deltaY * 0.8)
          break
        case 'ne':
        case 'nw':
        case 'n':
          newFontSize = Math.max(12, currentFontSize - deltaY * 0.8)
          break
      }
      return { ...stroke, fontSize: newFontSize }
    } else if (stroke.startPoint && stroke.endPoint) {
      const newStartPoint = { ...stroke.startPoint }
      const newEndPoint = { ...stroke.endPoint }
      switch (handle) {
        case 'nw':
          newStartPoint.x += deltaX; newStartPoint.y += deltaY; break
        case 'ne':
          newEndPoint.x += deltaX; newStartPoint.y += deltaY; break
        case 'sw':
          newStartPoint.x += deltaX; newEndPoint.y += deltaY; break
        case 'se':
          newEndPoint.x += deltaX; newEndPoint.y += deltaY; break
        case 'n':
          newStartPoint.y += deltaY; break
        case 's':
          newEndPoint.y += deltaY; break
        case 'w':
          newStartPoint.x += deltaX; break
        case 'e':
          newEndPoint.x += deltaX; break
      }
      return { ...stroke, startPoint: newStartPoint, endPoint: newEndPoint }
    }
    return stroke
  }
}

