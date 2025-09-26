"use client"

import type { StateCreator } from "zustand"
import type { Stroke, Point } from "@/lib/types"

export interface TextSlice {
  editingText: { id: string; x: number; y: number; text: string; mathMode: boolean } | null

  startTextEdit: (point: Point) => void
  updateText: (text: string) => void
  finishTextEdit: () => void
  setEditingText: (editing: { id: string; x: number; y: number; text: string; mathMode: boolean } | null) => void
}

type WithText = TextSlice & {
  strokes: Stroke[]
  currentColor: string
  currentStrokeWidth: number
  addStroke: (stroke: Stroke) => void
}

export const createTextSlice: StateCreator<WithText, [], [], TextSlice> = (set, get) => ({
  editingText: null,

  startTextEdit: (point) => {
    set({
      editingText: {
        id: Date.now().toString(),
        x: point.x,
        y: point.y,
        text: "",
        mathMode: false,
      },
    })
  },

  updateText: (text) => {
    const state = get()
    if (state.editingText) {
      set({
        editingText: {
          ...state.editingText,
          text,
        },
      })
    }
  },

  finishTextEdit: () => {
    const state = get()
    if (state.editingText && state.editingText.text.trim()) {
      const existing = state.strokes.find((s) => s.id === state.editingText!.id)
      if (existing && existing.type === "text") {
        // Update existing text stroke
        const newStrokes = state.strokes.map((stroke) =>
          stroke.id === state.editingText!.id
            ? {
                ...stroke,
                text: state.editingText!.text,
                fontSize: Math.max(16, state.currentStrokeWidth * 4),
                color: state.currentColor,
                mathMode: state.editingText!.mathMode,
              }
            : stroke,
        )
        set({ strokes: newStrokes })
      } else {
        // Create new text stroke via existing helper
        const textStroke: Stroke = {
          id: state.editingText.id,
          type: "text",
          points: [{ x: state.editingText.x, y: state.editingText.y }],
          color: state.currentColor,
          strokeWidth: state.currentStrokeWidth,
          text: state.editingText.text,
          fontSize: Math.max(16, state.currentStrokeWidth * 4),
          mathMode: state.editingText.mathMode,
        }
        state.addStroke(textStroke)
      }
    }
    set({ editingText: null })
  },

  setEditingText: (editing) => set({ editingText: editing }),
})



