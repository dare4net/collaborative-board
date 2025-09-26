import type { Point, Stroke, Tool, CanvasState, SelectionState, DrawingState } from './types'
import { CoordinateTransformer } from './coordinate-utils'
import { HitDetector } from './hit-detection'
import { StrokeUtils } from './stroke-utils'

export interface EventHandlerContext {
  canvas: HTMLCanvasElement
  strokes: Stroke[]
  selectedStrokes: string[]
  currentTool: Tool
  canvasState: CanvasState
  selectionState: SelectionState
  drawingState: DrawingState
  calculateBounds: (stroke: Stroke) => { minX: number; minY: number; maxX: number; maxY: number }
  onStrokeUpdate: (strokes: Stroke[]) => void
  onSelectionUpdate: (selectedStrokes: string[]) => void
  onCanvasStateUpdate: (state: CanvasState) => void
  onSelectionStateUpdate: (state: SelectionState) => void
  onDrawingStateUpdate: (state: DrawingState) => void
  onTextEditStart: (editingText: { id: string; x: number; y: number; text: string }) => void
}

export class MouseEventHandler {
  private context: EventHandlerContext

  constructor(context: EventHandlerContext) {
    this.context = context
  }

  handleMouseDown(e: MouseEvent): void {
    const point = CoordinateTransformer.getMousePosition(e, this.context.canvas, this.context.canvasState)

    if (this.context.currentTool === 'pan' || e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      this.startPanning(e)
      return
    }

    if (this.context.currentTool === 'select') {
      this.handleSelectMouseDown(point, e)
      return
    }

    if (this.context.currentTool === 'pen') {
      this.startDrawing(point)
      return
    }

    if (this.context.currentTool === 'eraser') {
      this.startErasing(point)
      return
    }

    if (['rectangle', 'ellipse', 'line'].includes(this.context.currentTool)) {
      this.startShapeDrawing(point)
      return
    }

    if (this.context.currentTool === 'text') {
      this.startTextEditing(point)
      return
    }
  }

  handleMouseMove(e: MouseEvent): void {
    const point = CoordinateTransformer.getMousePosition(e, this.context.canvas, this.context.canvasState)

    if (this.context.selectionState.isPanning && this.context.selectionState.lastPanPoint) {
      this.updatePanning(e)
      return
    }

    if (this.context.selectionState.resizeHandle) {
      this.updateResizing(point)
      return
    }

    if (this.context.selectionState.isDragging && this.context.currentTool === 'select') {
      this.updateDragging(point)
      return
    }

    if (this.context.selectionState.isSelecting && this.context.currentTool === 'select') {
      this.updateSelection(point)
      return
    }

    if (this.context.drawingState.isDrawing && this.context.currentTool === 'pen' && this.context.drawingState.lastPoint) {
      this.updateDrawing(point)
      return
    }

    if (this.context.drawingState.isDrawing && this.context.currentTool === 'eraser' && this.context.drawingState.lastPoint) {
      this.updateErasing(point)
      return
    }

    if (this.context.drawingState.isDrawingShape && ['rectangle', 'ellipse', 'line'].includes(this.context.currentTool)) {
      this.updateShapeDrawing(point)
      return
    }
  }

  handleMouseUp(e: MouseEvent): void {
    if (this.context.selectionState.isPanning) {
      this.finishPanning()
    }

    if (this.context.selectionState.resizeHandle) {
      this.finishResizing()
    }

    if (this.context.selectionState.isDragging) {
      this.finishDragging()
    }

    if (this.context.selectionState.isSelecting) {
      this.finishSelection()
    }

    if (this.context.drawingState.isDrawing) {
      this.finishDrawing()
    }

    if (this.context.drawingState.isDrawingShape) {
      this.finishShapeDrawing()
    }
  }

  handleDoubleClick(e: MouseEvent): void {
    if (this.context.currentTool !== 'select') return

    const point = CoordinateTransformer.getMousePosition(e, this.context.canvas, this.context.canvasState)
    const clickedStroke = HitDetector.getStrokeAtPoint(point, this.context.strokes, this.context.calculateBounds)
    
    if (clickedStroke && clickedStroke.type === 'text') {
      this.context.onTextEditStart({
        id: clickedStroke.id,
        x: clickedStroke.points[0].x,
        y: clickedStroke.points[0].y,
        text: clickedStroke.text || '',
      })
      this.context.onSelectionUpdate([clickedStroke.id])
    }
  }

  handleWheel(e: WheelEvent): void {
    e.preventDefault()

    const mousePos = CoordinateTransformer.getWheelPosition(e, this.context.canvas)
    const zoomFactor = CoordinateTransformer.calculateZoomFactor(e.deltaY)
    const newZoom = CoordinateTransformer.applyZoomConstraints(
      this.context.canvasState.zoom * zoomFactor
    )

    const { panX, panY } = CoordinateTransformer.calculateZoomedPan(
      mousePos.x,
      mousePos.y,
      this.context.canvasState.panX,
      this.context.canvasState.panY,
      this.context.canvasState.zoom,
      newZoom
    )

    this.context.onCanvasStateUpdate({
      ...this.context.canvasState,
      zoom: newZoom,
      panX,
      panY,
    })
  }

  private startPanning(e: MouseEvent): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      isPanning: true,
      lastPanPoint: { x: e.clientX, y: e.clientY },
    })
  }

  private updatePanning(e: MouseEvent): void {
    if (!this.context.selectionState.lastPanPoint) return

    const deltaX = e.clientX - this.context.selectionState.lastPanPoint.x
    const deltaY = e.clientY - this.context.selectionState.lastPanPoint.y

    this.context.onCanvasStateUpdate({
      ...this.context.canvasState,
      panX: this.context.canvasState.panX + deltaX,
      panY: this.context.canvasState.panY + deltaY,
    })

    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      lastPanPoint: { x: e.clientX, y: e.clientY },
    })
  }

  private finishPanning(): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      isPanning: false,
      lastPanPoint: null,
    })
  }

  private handleSelectMouseDown(point: Point, e: MouseEvent): void {
    const handle = HitDetector.getResizeHandle(
      point,
      this.context.selectedStrokes,
      this.context.strokes,
      this.context.canvasState.zoom,
      this.context.calculateBounds
    )

    if (handle) {
      this.startResizing(handle, point)
      return
    }

    const clickedStroke = HitDetector.getStrokeAtPoint(point, this.context.strokes, this.context.calculateBounds)
    if (clickedStroke) {
      if (!this.context.selectedStrokes.includes(clickedStroke.id)) {
        this.context.onSelectionUpdate(
          e.shiftKey 
            ? [...this.context.selectedStrokes, clickedStroke.id]
            : [clickedStroke.id]
        )
      }
      this.startDragging(point)
    } else {
      if (!e.shiftKey) {
        this.context.onSelectionUpdate([])
      }
      this.startSelection(point)
    }
  }

  private startSelection(point: Point): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      isSelecting: true,
      selectionBox: {
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      },
    })
  }

  private updateSelection(point: Point): void {
    if (!this.context.selectionState.selectionBox) return

    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      selectionBox: {
        ...this.context.selectionState.selectionBox,
        endX: point.x,
        endY: point.y,
      },
    })
  }

  private finishSelection(): void {
    if (!this.context.selectionState.selectionBox) return

    const selectedIds = HitDetector.getStrokesInSelectionBox(
      this.context.strokes,
      this.context.selectionState.selectionBox
    )

    this.context.onSelectionUpdate(selectedIds)
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      isSelecting: false,
      selectionBox: null,
    })
  }

  private startDragging(point: Point): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      isDragging: true,
      dragStart: point,
    })
  }

  private updateDragging(point: Point): void {
    if (!this.context.selectionState.dragStart) return

    const deltaX = point.x - this.context.selectionState.dragStart.x
    const deltaY = point.y - this.context.selectionState.dragStart.y

    const newStrokes = this.context.strokes.map((stroke) => {
      if (this.context.selectedStrokes.includes(stroke.id)) {
        return StrokeUtils.applyTranslation(stroke, deltaX, deltaY)
      }
      return stroke
    })

    this.context.onStrokeUpdate(newStrokes)
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      dragStart: point,
    })
  }

  private finishDragging(): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      isDragging: false,
      dragStart: null,
    })
  }

  private startResizing(handle: string, point: Point): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      resizeHandle: handle,
      dragStart: point,
    })
  }

  private updateResizing(point: Point): void {
    if (!this.context.selectionState.resizeHandle || !this.context.selectionState.dragStart || this.context.selectedStrokes.length !== 1) return

    const strokeId = this.context.selectedStrokes[0]
    const stroke = this.context.strokes.find((s) => s.id === strokeId)
    if (!stroke) return

    const deltaX = point.x - this.context.selectionState.dragStart.x
    const deltaY = point.y - this.context.selectionState.dragStart.y

    const newStrokes = this.context.strokes.map((s) =>
      s.id === strokeId ? StrokeUtils.applyResize(s, this.context.selectionState.resizeHandle!, deltaX, deltaY) : s
    )

    this.context.onStrokeUpdate(newStrokes)
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      dragStart: point,
    })
  }

  private finishResizing(): void {
    this.context.onSelectionStateUpdate({
      ...this.context.selectionState,
      resizeHandle: null,
      dragStart: null,
    })
  }

  private startDrawing(point: Point): void {
    this.context.onDrawingStateUpdate({
      ...this.context.drawingState,
      isDrawing: true,
      lastPoint: point,
      lastDrawTime: Date.now(),
    })
  }

  private updateDrawing(point: Point): void {
    if (!this.context.drawingState.lastPoint) return

    const distance = Math.sqrt(
      Math.pow(point.x - this.context.drawingState.lastPoint.x, 2) + 
      Math.pow(point.y - this.context.drawingState.lastPoint.y, 2)
    )
    const currentTime = Date.now()
    const timeDelta = currentTime - this.context.drawingState.lastDrawTime

    if (distance > 1 && timeDelta > 10) {
      // This would need to be handled by the parent component
      // as it involves creating new strokes
    }
  }

  private finishDrawing(): void {
    this.context.onDrawingStateUpdate({
      ...this.context.drawingState,
      isDrawing: false,
      lastPoint: null,
    })
  }

  private startErasing(point: Point): void {
    this.context.onDrawingStateUpdate({
      ...this.context.drawingState,
      isDrawing: true,
      lastPoint: point,
    })
  }

  private updateErasing(point: Point): void {
    if (!this.context.drawingState.lastPoint) return

    const distance = Math.sqrt(
      Math.pow(point.x - this.context.drawingState.lastPoint.x, 2) + 
      Math.pow(point.y - this.context.drawingState.lastPoint.y, 2)
    )

    if (distance > 5) {
      // This would need to be handled by the parent component
      // as it involves removing strokes
    }
  }

  private startShapeDrawing(point: Point): void {
    this.context.onDrawingStateUpdate({
      ...this.context.drawingState,
      isDrawingShape: true,
      shapeStartPoint: point,
    })
  }

  private updateShapeDrawing(point: Point): void {
    // This would need to be handled by the parent component
    // as it involves updating shape strokes
  }

  private finishShapeDrawing(): void {
    this.context.onDrawingStateUpdate({
      ...this.context.drawingState,
      isDrawingShape: false,
      shapeStartPoint: null,
    })
  }

  private startTextEditing(point: Point): void {
    this.context.onTextEditStart({
      id: Date.now().toString(),
      x: point.x,
      y: point.y,
      text: '',
    })
  }
}

