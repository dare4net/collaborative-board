"use client"

import type { StateCreator } from "zustand"
import type { Stroke, Point } from "@/lib/types"

export interface DrawingSlice {
  strokes: Stroke[]
  currentStroke: Stroke | null
  isDrawingShape: boolean
  shapeStartPoint: Point | null

  addStroke: (stroke: Stroke) => void
  setCurrentStroke: (stroke: Stroke | null) => void
  finishStroke: () => void

  startShape: (point: Point) => void
  updateShape: (point: Point) => void
  finishShape: () => void

  eraseAtPoint: (x: number, y: number, radius: number) => void
}

type WithDrawing = DrawingSlice & {
  currentTool: string
  currentColor: string
  currentStrokeWidth: number
  history: Stroke[][]
  historyIndex: number
  isModified: boolean
}

export const createDrawingSlice: StateCreator<WithDrawing, [], [], DrawingSlice> = (set, get) => ({
  strokes: [],
  currentStroke: null,
  isDrawingShape: false,
  shapeStartPoint: null,

  addStroke: (stroke) => {
    const state = get()
    const newStrokes = [...state.strokes, stroke]
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(newStrokes)

    set({
      strokes: newStrokes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isModified: true,
    })
  },

  setCurrentStroke: (stroke) => set({ currentStroke: stroke }),

  finishStroke: () => {
    const state = get()
    if (state.currentStroke) {
      state.addStroke(state.currentStroke)
      set({ currentStroke: null })
    }
  },

  startShape: (point) => {
    const state = get()
    set({
      isDrawingShape: true,
      shapeStartPoint: point,
      currentStroke: {
        id: Date.now().toString(),
        type: state.currentTool as any,
        points: [],
        color: state.currentColor,
        strokeWidth: state.currentStrokeWidth,
        startPoint: point,
        endPoint: point,
      },
    })
  },

  updateShape: (point) => {
    const state = get()
    if (state.currentStroke && state.isDrawingShape) {
      set({
        currentStroke: {
          ...state.currentStroke,
          endPoint: point,
        },
      })
    }
  },

  finishShape: () => {
    const state = get()
    if (state.currentStroke && state.isDrawingShape) {
      state.addStroke(state.currentStroke)
      set({ currentStroke: null, isDrawingShape: false, shapeStartPoint: null })
    }
  },

  eraseAtPoint: (x, y, radius) => {
    const state = get()
    const newStrokes = state.strokes.filter((stroke) => {
      if (stroke.type === "text") {
        const textPoint = stroke.points[0]
        const distance = Math.sqrt(Math.pow(textPoint.x - x, 2) + Math.pow(textPoint.y - y, 2))
        return distance > radius
      } else if (stroke.type === "rectangle" || stroke.type === "ellipse" || stroke.type === "line") {
        if (!stroke.startPoint || !stroke.endPoint) return true
        const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
        const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
        const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
        const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)
        return !(x >= minX - radius && x <= maxX + radius && y >= minY - radius && y <= maxY + radius)
      } else {
        return !stroke.points.some((point) => {
          const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
          return distance <= radius
        })
      }
    })

    if (newStrokes.length !== state.strokes.length) {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newStrokes)

      set({
        strokes: newStrokes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      })
    }
  },
})



