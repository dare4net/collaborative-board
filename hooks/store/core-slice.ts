"use client"

import type { StateCreator } from "zustand"
import type { Tool } from "@/lib/types"

export interface CoreSlice {
  currentTool: Tool
  currentColor: string
  currentStrokeWidth: number

  zoom: number
  panX: number
  panY: number

  setCurrentTool: (tool: Tool) => void
  setCurrentColor: (color: string) => void
  setCurrentStrokeWidth: (width: number) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  resetView: () => void
}

type WithCore = CoreSlice & {
  clearSelection?: () => void
}

export const createCoreSlice: StateCreator<WithCore, [], [], CoreSlice> = (set, get) => ({
  // Initial state
  currentTool: "pen",
  currentColor: "#2563eb",
  currentStrokeWidth: 4,

  zoom: 1,
  panX: 0,
  panY: 0,

  setCurrentTool: (tool) => {
    set({ currentTool: tool })
    if (tool !== "select") {
      get().clearSelection?.()
    }
  },
  setCurrentColor: (color) => set({ currentColor: color }),
  setCurrentStrokeWidth: (width) => set({ currentStrokeWidth: width }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
})



