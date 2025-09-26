"use client"

import type { StateCreator } from "zustand"
import type { Stroke } from "@/lib/types"

export interface HistorySliceActions {
  undo: () => void
  redo: () => void
}

type WithHistory = HistorySliceActions & {
  history: Stroke[][]
  historyIndex: number
  strokes: Stroke[]
  isModified: boolean
}

export const createHistorySlice: StateCreator<WithHistory, [], [], HistorySliceActions> = (set, get) => ({
  undo: () => {
    const state = get()
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1
      set({
        strokes: state.history[newIndex],
        historyIndex: newIndex,
        isModified: true,
      })
    }
  },

  redo: () => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1
      set({
        strokes: state.history[newIndex],
        historyIndex: newIndex,
        isModified: true,
      })
    }
  },
})



