"use client"

import type { StateCreator } from "zustand"
import type { Point, Stroke } from "@/lib/types"

export interface SelectionSlice {
  // Selection state
  selectedStrokes: string[]
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null
  isSelecting: boolean
  isDragging: boolean
  dragStart: Point | null
  resizeHandle: string | null // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'rotate'
  isRotating: boolean
  rotateStart: Point | null

  // Selection actions
  selectStroke: (id: string, addToSelection?: boolean) => void
  selectMultiple: (ids: string[]) => void
  clearSelection: () => void
  deleteSelected: () => void
  startSelection: (point: Point) => void
  updateSelection: (point: Point) => void
  finishSelection: () => void
  startDrag: (point: Point) => void
  updateDrag: (point: Point) => void
  finishDrag: () => void
  startResize: (handle: string, point: Point) => void
  updateResize: (point: Point) => void
  finishResize: () => void
  startRotate: (point: Point) => void
  updateRotate: (point: Point) => void
  finishRotate: () => void
}

type WithSelection = SelectionSlice & {
  strokes: Stroke[]
  history: Stroke[][]
  historyIndex: number
  isModified: boolean
}

export const createSelectionSlice: StateCreator<WithSelection, [], [], SelectionSlice> = (set, get) => ({
  // Initial state (mirrors existing store defaults)
  selectedStrokes: [],
  selectionBox: null,
  isSelecting: false,
  isDragging: false,
  dragStart: null,
  resizeHandle: null,
  isRotating: false,
  rotateStart: null,

  // Selection actions
  selectStroke: (id, addToSelection = false) => {
    const state = get()
    const newSelected = addToSelection ? [...state.selectedStrokes, id] : [id]
    const newStrokes = state.strokes.map((stroke) => ({
      ...stroke,
      selected: newSelected.includes(stroke.id),
    }))
    set({ selectedStrokes: newSelected, strokes: newStrokes })
  },

  selectMultiple: (ids) => {
    const state = get()
    const newStrokes = state.strokes.map((stroke) => ({
      ...stroke,
      selected: ids.includes(stroke.id),
    }))
    set({ selectedStrokes: ids, strokes: newStrokes })
  },

  clearSelection: () => {
    const state = get()
    const newStrokes = state.strokes.map((stroke) => ({
      ...stroke,
      selected: false,
    }))
    set({ selectedStrokes: [], strokes: newStrokes })
  },

  deleteSelected: () => {
    const state = get()
    const newStrokes = state.strokes.filter((stroke) => !state.selectedStrokes.includes(stroke.id))
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(newStrokes)

    set({
      strokes: newStrokes,
      selectedStrokes: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isModified: true,
    })
  },

  startSelection: (point) => {
    set({
      isSelecting: true,
      selectionBox: {
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      },
    })
  },

  updateSelection: (point) => {
    const state = get()
    if (state.selectionBox) {
      set({
        selectionBox: {
          ...state.selectionBox,
          endX: point.x,
          endY: point.y,
        },
      })
    }
  },

  finishSelection: () => {
    const state = get()
    if (state.selectionBox) {
      const { startX, startY, endX, endY } = state.selectionBox
      const minX = Math.min(startX, endX)
      const maxX = Math.max(startX, endX)
      const minY = Math.min(startY, endY)
      const maxY = Math.max(startY, endY)

      const selectedIds = state.strokes
        .filter((stroke) => {
          if (stroke.type === "text" && stroke.points.length > 0) {
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

      get().selectMultiple(selectedIds)
    }

    set({
      isSelecting: false,
      selectionBox: null,
    })
  },

  startDrag: (point) => {
    set({
      isDragging: true,
      dragStart: point,
    })
  },

  updateDrag: (point) => {
    const state = get()
    if (state.isDragging && state.dragStart) {
      const deltaX = point.x - state.dragStart.x
      const deltaY = point.y - state.dragStart.y

      const newStrokes = state.strokes.map((stroke) => {
        if (state.selectedStrokes.includes(stroke.id)) {
          if (stroke.type === "text" && stroke.points.length > 0) {
            return {
              ...stroke,
              points: [{ x: stroke.points[0].x + deltaX, y: stroke.points[0].y + deltaY }],
            }
          } else if (stroke.startPoint && stroke.endPoint) {
            return {
              ...stroke,
              startPoint: { x: stroke.startPoint.x + deltaX, y: stroke.startPoint.y + deltaY },
              endPoint: { x: stroke.endPoint.x + deltaX, y: stroke.endPoint.y + deltaY },
            }
          } else if (stroke.points.length > 0) {
            return {
              ...stroke,
              points: stroke.points.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY })),
            }
          }
        }
        return stroke
      })

      set({
        strokes: newStrokes,
        dragStart: point,
      })
    }
  },

  finishDrag: () => {
    const state = get()
    if (state.isDragging) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push([...state.strokes])

      set({
        isDragging: false,
        dragStart: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      })
    }
  },

  startResize: (handle, point) => {
    set({
      resizeHandle: handle,
      dragStart: point,
    })
  },

  updateResize: (point) => {
    const state = get()
    if (state.resizeHandle && state.dragStart && state.selectedStrokes.length === 1) {
      const strokeId = state.selectedStrokes[0]
      const stroke = state.strokes.find((s) => s.id === strokeId)
      if (!stroke) return

      const deltaX = point.x - state.dragStart.x
      const deltaY = point.y - state.dragStart.y

      let newStrokes = state.strokes

      if (stroke.type === "text") {
        const currentFontSize = stroke.fontSize || 16
        let newFontSize = currentFontSize

        switch (state.resizeHandle) {
          case "se":
          case "sw":
          case "s":
            newFontSize = Math.max(12, currentFontSize + deltaY * 0.8)
            break
          case "ne":
          case "nw":
          case "n":
            newFontSize = Math.max(12, currentFontSize - deltaY * 0.8)
            break
        }

        newStrokes = state.strokes.map((s) => (s.id === strokeId ? { ...s, fontSize: newFontSize } : s))
      } else if (stroke.startPoint && stroke.endPoint) {
        const newStartPoint = { ...stroke.startPoint }
        const newEndPoint = { ...stroke.endPoint }

        switch (state.resizeHandle) {
          case "nw":
            newStartPoint.x += deltaX
            newStartPoint.y += deltaY
            break
          case "ne":
            newEndPoint.x += deltaX
            newStartPoint.y += deltaY
            break
          case "sw":
            newStartPoint.x += deltaX
            newEndPoint.y += deltaY
            break
          case "se":
            newEndPoint.x += deltaX
            newEndPoint.y += deltaY
            break
          case "n":
            newStartPoint.y += deltaY
            break
          case "s":
            newEndPoint.y += deltaY
            break
          case "w":
            newStartPoint.x += deltaX
            break
          case "e":
            newEndPoint.x += deltaX
            break
        }

        newStrokes = state.strokes.map((s) => (s.id === strokeId ? { ...s, startPoint: newStartPoint, endPoint: newEndPoint } : s))
      }

      set({
        strokes: newStrokes,
        dragStart: point,
      })
    }
  },

  finishResize: () => {
    const state = get()
    if (state.resizeHandle) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push([...state.strokes])

      set({
        resizeHandle: null,
        dragStart: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      })
    }
  },

  startRotate: (point) => {
    set({ isRotating: true, rotateStart: point })
  },

  updateRotate: (point) => {
    const state = get()
    if (state.isRotating && state.rotateStart && state.selectedStrokes.length === 1) {
      const strokeId = state.selectedStrokes[0]
      const stroke = state.strokes.find((s) => s.id === strokeId)
      if (!stroke) return

      // Simple incremental rotation storage on stroke
      const centerX = 0
      const centerY = 0
      const startAngle = Math.atan2(state.rotateStart.y - centerY, state.rotateStart.x - centerX)
      const currentAngle = Math.atan2(point.y - centerY, point.x - centerX)
      const rotation = currentAngle - startAngle

      const newStrokes = state.strokes.map((s) => (s.id === strokeId ? { ...s, rotation: (s.rotation || 0) + rotation } : s))

      set({ strokes: newStrokes, rotateStart: point })
    }
  },

  finishRotate: () => {
    const state = get()
    if (state.isRotating) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push([...state.strokes])

      set({
        isRotating: false,
        rotateStart: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      })
    }
  },
})



