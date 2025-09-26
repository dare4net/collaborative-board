import type { Tool, SelectionState, DrawingState } from './types'

export class CursorManager {
  static getCursorClass(
    currentTool: Tool,
    selectionState: SelectionState,
    drawingState: DrawingState
  ): string {
    if (selectionState.isPanning) return 'panning'
    if (selectionState.isSelecting) return 'selecting'
    if (selectionState.isRotating) return 'rotating'
    if (selectionState.resizeHandle) return 'resizing'
    if (selectionState.isDragging) return 'dragging'
    if (currentTool === 'eraser') return 'erasing'
    if (currentTool === 'text') return 'text-mode'
    if (currentTool === 'pen') return 'pen-mode'
    if (currentTool === 'select') return 'select-mode'
    if (currentTool === 'pan') return 'pan-mode'
    if (['rectangle', 'ellipse', 'line'].includes(currentTool)) return 'shape-mode'
    return 'default-mode'
  }

  static getCursorStyle(
    currentTool: Tool,
    selectionState: SelectionState,
    drawingState: DrawingState
  ): React.CSSProperties {
    const cursorClass = this.getCursorClass(currentTool, selectionState, drawingState)
    
    switch (cursorClass) {
      case 'panning':
        return { cursor: 'grabbing' }
      case 'selecting':
        return { cursor: 'crosshair' }
      case 'rotating':
        return { cursor: 'grab' }
      case 'resizing':
        return { cursor: 'crosshair' }
      case 'dragging':
        return { cursor: 'move' }
      case 'erasing':
        return { cursor: 'none' }
      case 'text-mode':
        return { cursor: 'text' }
      case 'pen-mode':
        return { cursor: 'crosshair' }
      case 'select-mode':
        return { cursor: 'pointer' }
      case 'pan-mode':
        return { cursor: 'grab' }
      case 'shape-mode':
        return { cursor: 'crosshair' }
      default:
        return { cursor: 'default' }
    }
  }
}

