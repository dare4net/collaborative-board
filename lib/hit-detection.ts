import type { Stroke, Point } from './types'

export class HitDetector {
  static getStrokeAtPoint(point: Point, strokes: Stroke[], calculateBounds: (stroke: Stroke) => { minX: number; minY: number; maxX: number; maxY: number }): Stroke | null {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i]
      if (stroke.type === 'text' && stroke.points.length > 0) {
        // Use the bounds calculation for accurate text hit detection
        const bounds = calculateBounds(stroke)
        if (point.x >= bounds.minX && point.x <= bounds.maxX && 
            point.y >= bounds.minY && point.y <= bounds.maxY) {
          return stroke
        }
      } else if (stroke.startPoint && stroke.endPoint) {
        const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x) - 12
        const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x) + 12
        const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y) - 12
        const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y) + 12
        if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) return stroke
      } else if (stroke.points.length > 0) {
        const hit = stroke.points.some((p) => {
          const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2))
          return distance <= Math.max(14, stroke.strokeWidth + 10)
        })
        if (hit) return stroke
      }
    }
    return null
  }

  static getResizeHandle(
    point: Point, 
    selectedStrokes: string[], 
    strokes: Stroke[], 
    zoom: number,
    calculateBounds: (stroke: Stroke) => { minX: number; minY: number; maxX: number; maxY: number }
  ): string | null {
    if (selectedStrokes.length !== 1) return null

    const stroke = strokes.find((s) => s.id === selectedStrokes[0])
    if (!stroke) return null

    // Rotation-aware local-space detection
    const rotation = (stroke as any).rotation || 0
    const pad = 6 / zoom
    let cx = 0, cy = 0, w = 0, h = 0
    if (stroke.type === 'text' && stroke.points.length > 0) {
      // Compute unrotated text box size from font metrics so overlay and hit areas match
      const fontSize = stroke.fontSize || 16
      const text = stroke.text || ''
      const lineHeight = fontSize * 1.2
      const canvas = document.createElement('canvas')
      const c2d = canvas.getContext('2d')
      let w0 = 20
      if (c2d) {
        c2d.font = `${fontSize}px "Kalam", cursive`
        const lines = text.split('\n')
        const widths = lines.map((line) => c2d.measureText(line).width)
        w0 = Math.max(20, ...widths)
      }
      const h0 = Math.max(lineHeight, lineHeight * Math.max(1, (text.split('\n').length)))
      const p0 = stroke.points[0]
      w = w0
      h = h0
      cx = p0.x + w / 2
      cy = p0.y + h / 2
    } else if (stroke.startPoint && stroke.endPoint) {
      const minX0 = Math.min(stroke.startPoint.x, stroke.endPoint.x)
      const minY0 = Math.min(stroke.startPoint.y, stroke.endPoint.y)
      const maxX0 = Math.max(stroke.startPoint.x, stroke.endPoint.x)
      const maxY0 = Math.max(stroke.startPoint.y, stroke.endPoint.y)
      w = (maxX0 - minX0)
      h = (maxY0 - minY0)
      cx = (minX0 + maxX0) / 2
      cy = (minY0 + maxY0) / 2
    } else if (stroke.points.length > 0) {
      let minX0 = Infinity, minY0 = Infinity, maxX0 = -Infinity, maxY0 = -Infinity
      stroke.points.forEach((p) => { minX0 = Math.min(minX0, p.x); minY0 = Math.min(minY0, p.y); maxX0 = Math.max(maxX0, p.x); maxY0 = Math.max(maxY0, p.y) })
      w = (maxX0 - minX0)
      h = (maxY0 - minY0)
      cx = (minX0 + maxX0) / 2
      cy = (minY0 + maxY0) / 2
    }

    // Transform screen point to local object space (translate to center, rotate by -rotation)
    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const dx = point.x - cx
    const dy = point.y - cy
    const lx = dx * cos - dy * sin
    const ly = dx * sin + dy * cos

    const hw = w / 2 + pad
    const hh = h / 2 + pad
    const handleSize = 8 / zoom
    const rotationHandleDistance = 30 / zoom

    // Local-space handles
    const handlesLocal = [
      { name: 'nw', x: -hw, y: -hh },
      { name: 'ne', x: hw, y: -hh },
      { name: 'sw', x: -hw, y: hh },
      { name: 'se', x: hw, y: hh },
      { name: 'n', x: 0, y: -hh },
      { name: 's', x: 0, y: hh },
      { name: 'w', x: -hw, y: 0 },
      { name: 'e', x: hw, y: 0 },
    ]

    for (const hnd of handlesLocal) {
      if (
        lx >= hnd.x - handleSize && lx <= hnd.x + handleSize &&
        ly >= hnd.y - handleSize && ly <= hnd.y + handleSize
      ) {
        return hnd.name
      }
    }

    // Rotation handle (local)
    const rX = 0
    const rY = -hh - rotationHandleDistance
    const dist = Math.hypot(lx - rX, ly - rY)
    if (dist <= handleSize) return 'rotate'

    return null
  }

  static isPointInSelectionBox(point: Point, selectionBox: { startX: number; startY: number; endX: number; endY: number }): boolean {
    const minX = Math.min(selectionBox.startX, selectionBox.endX)
    const maxX = Math.max(selectionBox.startX, selectionBox.endX)
    const minY = Math.min(selectionBox.startY, selectionBox.endY)
    const maxY = Math.max(selectionBox.startY, selectionBox.endY)
    
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  }

  static getStrokesInSelectionBox(
    strokes: Stroke[], 
    selectionBox: { startX: number; startY: number; endX: number; endY: number }
  ): string[] {
    const { startX, startY, endX, endY } = selectionBox
    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)
    const minY = Math.min(startY, endY)
    const maxY = Math.max(startY, endY)

    return strokes
      .filter((stroke) => {
        if (stroke.type === 'text' && stroke.points.length > 0) {
          const point = stroke.points[0]
          return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
        } else if (stroke.startPoint && stroke.endPoint) {
          const strokeMinX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
          const strokeMaxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
          const strokeMinY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
          const strokeMaxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)
          return strokeMinX <= maxX && strokeMaxX >= minX && strokeMinY <= maxY && strokeMaxY >= minY
        } else if (stroke.points.length > 0) {
          return stroke.points.some(
            (point) => point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY,
          )
        }
        return false
      })
      .map((stroke) => stroke.id)
  }
}

