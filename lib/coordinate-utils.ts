import type { Point, CanvasState } from './types'

export class CoordinateTransformer {
  static screenToCanvas(screenX: number, screenY: number, canvas: HTMLCanvasElement, state: CanvasState): Point {
    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - state.panX) / state.zoom
    const y = (screenY - rect.top - state.panY) / state.zoom
    return { x, y }
  }

  static canvasToScreen(canvasX: number, canvasY: number, canvas: HTMLCanvasElement, state: CanvasState): Point {
    const rect = canvas.getBoundingClientRect()
    const x = canvasX * state.zoom + state.panX + rect.left
    const y = canvasY * state.zoom + state.panY + rect.top
    return { x, y }
  }

  static getMousePosition(e: MouseEvent, canvas: HTMLCanvasElement, state: CanvasState): Point {
    return this.screenToCanvas(e.clientX, e.clientY, canvas, state)
  }

  static getWheelPosition(e: WheelEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  static calculateZoomFactor(deltaY: number, zoomFactor: number = 0.1): number {
    return deltaY > 0 ? 1 - zoomFactor : 1 + zoomFactor
  }

  static applyZoomConstraints(newZoom: number, minZoom: number = 0.1, maxZoom: number = 5): number {
    return Math.max(minZoom, Math.min(maxZoom, newZoom))
  }

  static calculateZoomedPan(
    mouseX: number, 
    mouseY: number, 
    currentPanX: number, 
    currentPanY: number, 
    currentZoom: number, 
    newZoom: number
  ): { panX: number; panY: number } {
    const newPanX = mouseX - (mouseX - currentPanX) * (newZoom / currentZoom)
    const newPanY = mouseY - (mouseY - currentPanY) * (newZoom / currentZoom)
    return { panX: newPanX, panY: newPanY }
  }
}

