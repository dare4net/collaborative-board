"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { 
  Tool, 
  Point, 
  Stroke, 
  WhiteboardDocument, 
  SelectionBox, 
  EditingText, 
  CanvasState, 
  SelectionState, 
  HistoryState, 
  DocumentState 
} from "@/lib/types"
import { StrokeUtils } from "@/lib/stroke-utils"
import type { SelectionSlice } from "@/hooks/store/selection-slice"
import { createSelectionSlice } from "@/hooks/store/selection-slice"
import { createHistorySlice } from "@/hooks/store/history-slice"
import { createTextSlice } from "@/hooks/store/text-slice"
import { createDrawingSlice } from "@/hooks/store/drawing-slice"
import { createDocumentSlice } from "@/hooks/store/document-slice"
import { createCoreSlice } from "@/hooks/store/core-slice"

interface WhiteboardState {
  // Current tool and settings
  currentTool: Tool
  currentColor: string
  currentStrokeWidth: number

  // Canvas state (flat for compatibility)
  zoom: number
  panX: number
  panY: number

  // Drawing state
  strokes: Stroke[]
  currentStroke: Stroke | null
  isDrawingShape: boolean
  shapeStartPoint: Point | null

  // Selection state (flat for compatibility)
  selectedStrokes: string[]
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null
  isSelecting: boolean
  isDragging: boolean
  dragStart: Point | null
  resizeHandle: string | null // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'rotate'
  isRotating: boolean
  rotateStart: Point | null

  // Text editing
  editingText: EditingText | null

  // History
  history: Stroke[][]
  historyIndex: number

  // File management
  currentDocument: WhiteboardDocument | null
  savedDocuments: WhiteboardDocument[]
  isModified: boolean

  // Actions
  setCurrentTool: (tool: Tool) => void
  setCurrentColor: (color: string) => void
  setCurrentStrokeWidth: (width: number) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  resetView: () => void

  // Drawing actions
  addStroke: (stroke: Stroke) => void
  setCurrentStroke: (stroke: Stroke | null) => void
  finishStroke: () => void

  // Shape actions
  startShape: (point: Point) => void
  updateShape: (point: Point) => void
  finishShape: () => void

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

  // Text actions
  startTextEdit: (point: Point) => void
  updateText: (text: string) => void
  finishTextEdit: () => void
  setEditingText: (editing: { id: string; x: number; y: number; text: string; mathMode: boolean } | null) => void

  eraseAtPoint: (x: number, y: number, radius: number) => void

  // History actions
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // File management actions
  newDocument: () => void
  saveDocument: (name?: string) => void
  loadDocument: (document: WhiteboardDocument) => void
  deleteDocument: (id: string) => void
  duplicateDocument: (id: string) => void
  generateThumbnail: () => string | null

  // Clear
  clear: () => void

  // Helper functions
}

export const useWhiteboardStore = create<WhiteboardState & SelectionSlice>()(
  persist(
    (set, get) => ({
      // Initial state
      ...createCoreSlice(set as any, get as any, {} as any),
      ...createDrawingSlice(set as any, get as any, {} as any),
      ...createSelectionSlice(set as any, get as any, {} as any),
      ...createTextSlice(set as any, get as any, {} as any),
      history: [[]],
      historyIndex: 0,
      ...createDocumentSlice(set as any, get as any, {} as any),

      // Computed properties
      get canUndo() {
        return get().historyIndex > 0
      },

      get canRedo() {
        const state = get()
        return state.historyIndex < state.history.length - 1
      },

      // Actions
      setCurrentTool: (tool) => {
        set({ currentTool: tool })
        if (tool !== "select") {
          get().clearSelection()
        }
      },
      setCurrentColor: (color) => {
        const state = get()
        // If in select mode and there are selected strokes, apply color to them and update history
        if (state.currentTool === "select" && state.selectedStrokes.length > 0) {
          const newStrokes = state.strokes.map((s) =>
            state.selectedStrokes.includes(s.id) ? { ...s, color } : s,
          )
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push(newStrokes)

          set({
            currentColor: color,
            strokes: newStrokes,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isModified: true,
          })
        } else {
          // Otherwise just set the current color for future strokes
          set({ currentColor: color })
        }
      },
      setCurrentStrokeWidth: (width) => set({ currentStrokeWidth: width }),
      setZoom: (zoom) => set({ zoom }),
      setPan: (x, y) => set({ panX: x, panY: y }),
      resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
      finishStroke: () => {
        const state = get()
        if (state.currentStroke) {
          state.addStroke(state.currentStroke)
          set({ currentStroke: null, currentTool: 'select' })
        }
      },

      // Shape actions
      startShape: (point) => {
        const state = get()
        set({
          isDrawingShape: true,
          shapeStartPoint: point,
          currentStroke: {
            id: Date.now().toString(),
            type: state.currentTool,
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
          set({
            currentStroke: null,
            isDrawingShape: false,
            shapeStartPoint: null,
            currentTool: 'select',
          })
        }
      },

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
                // Use calculated bounds for accurate selection overlap
                const b = (StrokeUtils as any).calculateBounds(stroke)
                return b.minX <= maxX && b.maxX >= minX && b.minY <= maxY && b.maxY >= minY
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

          // Get current bounds
          const bounds = (StrokeUtils as any).calculateBounds(stroke)
          const { minX, minY, maxX, maxY } = bounds

          let newStrokes = state.strokes

          if (stroke.type === "text") {
            // For text, we can only resize by changing fontSize
            const currentFontSize = stroke.fontSize || 16
            let newFontSize = currentFontSize

            switch (state.resizeHandle) {
              case "se":
                newFontSize = Math.max(12, currentFontSize + deltaY * 0.8)
                break
              case "sw":
                newFontSize = Math.max(12, currentFontSize + deltaY * 0.8)
                break
              case "ne":
                newFontSize = Math.max(12, currentFontSize - deltaY * 0.8)
                break
              case "nw":
                newFontSize = Math.max(12, currentFontSize - deltaY * 0.8)
                break
              case "s":
                newFontSize = Math.max(12, currentFontSize + deltaY * 0.8)
                break
              case "n":
                newFontSize = Math.max(12, currentFontSize - deltaY * 0.8)
                break
            }

            newStrokes = state.strokes.map((s) =>
              s.id === strokeId ? { ...s, fontSize: newFontSize } : s,
            )
          } else if (stroke.startPoint && stroke.endPoint) {
            // For shapes, resize by adjusting start/end points
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

            newStrokes = state.strokes.map((s) =>
              s.id === strokeId ? { ...s, startPoint: newStartPoint, endPoint: newEndPoint } : s,
            )
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
        set({
          isRotating: true,
          rotateStart: point,
        })
      },

      updateRotate: (point) => {
        const state = get()
        if (state.isRotating && state.rotateStart && state.selectedStrokes.length === 1) {
          const strokeId = state.selectedStrokes[0]
          const stroke = state.strokes.find((s) => s.id === strokeId)
          if (!stroke) return

          // Calculate bounds and center
          const bounds = (StrokeUtils as any).calculateBounds(stroke)
          const centerX = (bounds.minX + bounds.maxX) / 2
          const centerY = (bounds.minY + bounds.maxY) / 2
          
          const startAngle = Math.atan2(state.rotateStart.y - centerY, state.rotateStart.x - centerX)
          const currentAngle = Math.atan2(point.y - centerY, point.x - centerX)
          const rotation = currentAngle - startAngle

          const newStrokes = state.strokes.map((s) =>
            s.id === strokeId ? { ...s, rotation: (s.rotation || 0) + rotation } : s,
          )

          set({
            strokes: newStrokes,
            rotateStart: point,
          })
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

      // Text actions
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
          // Update editingText buffer
          set({ editingText: { ...state.editingText, text } })

          // Live-commit the text to the underlying stroke on each keystroke
          const existing = state.strokes.find((s) => s.id === state.editingText!.id)
          if (existing && existing.type === "text") {
            // Update existing text stroke without altering preserved styles
            const newStrokes = state.strokes.map((s) =>
              s.id === existing.id ? { ...s, text } : s,
            )
            set({ strokes: newStrokes, isModified: true })
          } else {
            // If new text and we have non-empty content, create the stroke immediately
            if (text.length > 0) {
              const textStroke: Stroke = {
                id: state.editingText.id,
                type: "text",
                points: [{ x: state.editingText.x, y: state.editingText.y }],
                color: state.currentColor,
                strokeWidth: state.currentStrokeWidth,
                text,
                fontSize: Math.max(16, state.currentStrokeWidth * 4),
                mathMode: state.editingText.mathMode,
              }
              set({ strokes: [...state.strokes, textStroke], isModified: true })
            }
          }
        }
      },

      finishTextEdit: () => {
        const state = get()
        if (state.editingText && state.editingText.text.trim()) {
          // Check if we're editing an existing text stroke
          const existingStroke = state.strokes.find(s => s.id === state.editingText!.id)
          
          if (existingStroke && existingStroke.type === "text") {
            // Update existing text stroke, preserving original fontSize and color to prevent visual jump
            const preservedFontSize = existingStroke.fontSize ?? Math.max(16, state.currentStrokeWidth * 4)
            const preservedColor = existingStroke.color ?? state.currentColor
            const newStrokes = state.strokes.map(stroke =>
              stroke.id === state.editingText!.id
                ? {
                    ...stroke,
                    text: state.editingText!.text,
                    fontSize: preservedFontSize,
                    color: preservedColor,
                    mathMode: state.editingText!.mathMode,
                  }
                : stroke
            )
            
            const newHistory = state.history.slice(0, state.historyIndex + 1)
            newHistory.push(newStrokes)
            
            set({
              strokes: newStrokes,
              history: newHistory,
              historyIndex: newHistory.length - 1,
              isModified: true,
              currentTool: 'select',
            })
          } else {
            // Create new text stroke
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
            set({ currentTool: 'select' })
          }
        }
        set({ editingText: null })
      },

      setEditingText: (editing) => set({ editingText: editing }),

      eraseAtPoint: (x, y, radius) => {
        const state = get()
        const newStrokes = state.strokes.filter((stroke) => {
          if (stroke.type === "text") {
            // For text, check if click is within text bounds (approximate)
            const textPoint = stroke.points[0]
            const distance = Math.sqrt(Math.pow(textPoint.x - x, 2) + Math.pow(textPoint.y - y, 2))
            return distance > radius
          } else if (stroke.type === "rectangle" || stroke.type === "ellipse" || stroke.type === "line") {
            // For shapes, check if click is within shape bounds
            if (!stroke.startPoint || !stroke.endPoint) return true
            const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
            const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
            const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
            const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)
            return !(x >= minX - radius && x <= maxX + radius && y >= minY - radius && y <= maxY + radius)
          } else {
            // For pen strokes, check if any point is within the eraser radius
            return !stroke.points.some((point) => {
              const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
              return distance <= radius
            })
          }
        })

        if (newStrokes.length !== state.strokes.length) {
          // Something was erased, update history
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

      ...createHistorySlice(set as any, get as any, {} as any),

      // File management actions
      newDocument: () => {
        set({
          strokes: [],
          currentStroke: null,
          history: [[]],
          historyIndex: 0,
          editingText: null,
          isDrawingShape: false,
          shapeStartPoint: null,
          selectedStrokes: [],
          selectionBox: null,
          isSelecting: false,
          isDragging: false,
          dragStart: null,
          resizeHandle: null,
          currentDocument: null,
          isModified: false,
          zoom: 1,
          panX: 0,
          panY: 0,
        })
      },

      saveDocument: (name) => {
        const state = get()
        const now = Date.now()
        const documentName = name || `Whiteboard ${new Date().toLocaleDateString()}`

        if (state.currentDocument) {
          // Update existing document
          const updatedDocument: WhiteboardDocument = {
            ...state.currentDocument,
            name: documentName,
            strokes: [...state.strokes],
            updatedAt: now,
            thumbnail: state.generateThumbnail() || undefined,
          }

          const updatedDocuments = state.savedDocuments.map((doc) =>
            doc.id === state.currentDocument!.id ? updatedDocument : doc,
          )

          set({
            currentDocument: updatedDocument,
            savedDocuments: updatedDocuments,
            isModified: false,
          })
        } else {
          // Create new document
          const newDocument: WhiteboardDocument = {
            id: Date.now().toString(),
            name: documentName,
            strokes: [...state.strokes],
            createdAt: now,
            updatedAt: now,
            thumbnail: state.generateThumbnail() || undefined,
          }

          set({
            currentDocument: newDocument,
            savedDocuments: [...state.savedDocuments, newDocument],
            isModified: false,
          })
        }
      },

      loadDocument: (document) => {
        set({
          strokes: [...document.strokes],
          currentStroke: null,
          history: [document.strokes],
          historyIndex: 0,
          editingText: null,
          isDrawingShape: false,
          shapeStartPoint: null,
          selectedStrokes: [],
          selectionBox: null,
          isSelecting: false,
          isDragging: false,
          dragStart: null,
          resizeHandle: null,
          currentDocument: document,
          isModified: false,
          zoom: 1,
          panX: 0,
          panY: 0,
        })
      },

      deleteDocument: (id) => {
        const state = get()
        const updatedDocuments = state.savedDocuments.filter((doc) => doc.id !== id)
        const newCurrentDocument = state.currentDocument?.id === id ? null : state.currentDocument

        set({
          savedDocuments: updatedDocuments,
          currentDocument: newCurrentDocument,
        })

        if (newCurrentDocument === null) {
          get().newDocument()
        }
      },

      duplicateDocument: (id) => {
        const state = get()
        const originalDoc = state.savedDocuments.find((doc) => doc.id === id)
        if (!originalDoc) return

        const now = Date.now()
        const duplicatedDocument: WhiteboardDocument = {
          id: now.toString(),
          name: `${originalDoc.name} (Copy)`,
          strokes: [...originalDoc.strokes],
          createdAt: now,
          updatedAt: now,
          thumbnail: originalDoc.thumbnail,
        }

        set({
          savedDocuments: [...state.savedDocuments, duplicatedDocument],
        })
      },

      generateThumbnail: () => {
        const state = get()
        if (state.strokes.length === 0) return null

        try {
          // Calculate bounds for thumbnail
          let minX = Number.POSITIVE_INFINITY,
            minY = Number.POSITIVE_INFINITY,
            maxX = Number.NEGATIVE_INFINITY,
            maxY = Number.NEGATIVE_INFINITY

          state.strokes.forEach((stroke) => {
            if (stroke.type === "text" && stroke.points.length > 0) {
              const point = stroke.points[0]
              minX = Math.min(minX, point.x)
              minY = Math.min(minY, point.y)
              maxX = Math.max(maxX, point.x + 100) // Approximate text width
              maxY = Math.max(maxY, point.y + 20) // Approximate text height
            } else if (stroke.startPoint && stroke.endPoint) {
              minX = Math.min(minX, stroke.startPoint.x, stroke.endPoint.x)
              minY = Math.min(minY, stroke.startPoint.y, stroke.endPoint.y)
              maxX = Math.max(maxX, stroke.startPoint.x, stroke.endPoint.x)
              maxY = Math.max(maxY, stroke.startPoint.y, stroke.endPoint.y)
            } else {
              stroke.points.forEach((point) => {
                minX = Math.min(minX, point.x)
                minY = Math.min(minY, point.y)
                maxX = Math.max(maxX, point.x)
                maxY = Math.max(maxY, point.y)
              })
            }
          })

          // Create small thumbnail canvas
          const canvas = document.createElement("canvas")
          const thumbnailSize = 120
          canvas.width = thumbnailSize
          canvas.height = thumbnailSize
          const ctx = canvas.getContext("2d")!

          // White background
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, thumbnailSize, thumbnailSize)

          // Calculate scale to fit content
          const contentWidth = maxX - minX
          const contentHeight = maxY - minY
          const scale = Math.min(thumbnailSize / contentWidth, thumbnailSize / contentHeight) * 0.8
          const offsetX = (thumbnailSize - contentWidth * scale) / 2 - minX * scale
          const offsetY = (thumbnailSize - contentHeight * scale) / 2 - minY * scale

          // Render simplified strokes
          state.strokes.forEach((stroke) => {
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = Math.max(1, stroke.strokeWidth * scale)
            ctx.lineCap = "round"

            if (stroke.type === "pen" && stroke.points.length > 0) {
              ctx.beginPath()
              ctx.moveTo(stroke.points[0].x * scale + offsetX, stroke.points[0].y * scale + offsetY)
              stroke.points.forEach((point, i) => {
                if (i > 0) {
                  ctx.lineTo(point.x * scale + offsetX, point.y * scale + offsetY)
                }
              })
              ctx.stroke()
            } else if (stroke.startPoint && stroke.endPoint) {
              if (stroke.type === "rectangle") {
                const x = Math.min(stroke.startPoint.x, stroke.endPoint.x) * scale + offsetX
                const y = Math.min(stroke.startPoint.y, stroke.endPoint.y) * scale + offsetY
                const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x) * scale
                const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y) * scale
                ctx.strokeRect(x, y, w, h)
              } else if (stroke.type === "line") {
                ctx.beginPath()
                ctx.moveTo(stroke.startPoint.x * scale + offsetX, stroke.startPoint.y * scale + offsetY)
                ctx.lineTo(stroke.endPoint.x * scale + offsetX, stroke.endPoint.y * scale + offsetY)
                ctx.stroke()
              }
            }
          })

          return canvas.toDataURL("image/png")
        } catch (error) {
          console.error("Failed to generate thumbnail:", error)
          return null
        }
      },

      // Clear
      clear: () => {
        const state = get()
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        newHistory.push([])

        set({
          strokes: [],
          currentStroke: null,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          editingText: null,
          isDrawingShape: false,
          shapeStartPoint: null,
          selectedStrokes: [],
          selectionBox: null,
          isSelecting: false,
          isDragging: false,
          dragStart: null,
          resizeHandle: null,
          isRotating: false,
          rotateStart: null,
          isModified: true,
        })
      },

      // Helper function to calculate bounds for a stroke
      calculateStrokeBounds: (stroke: Stroke) => {
        if (stroke.type === "text" && stroke.points.length > 0) {
          const point = stroke.points[0]
          const fontSize = stroke.fontSize || 16
          const text = stroke.text || ""
          
          // Create a temporary canvas to measure text accurately
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.font = `${fontSize}px "Kalam", cursive`
            const metrics = ctx.measureText(text)
            const textWidth = metrics.width
            const textHeight = fontSize * 1.2 // Approximate line height
            
            return {
              minX: point.x - 5, // Add small padding
              minY: point.y - textHeight + 5,
              maxX: point.x + Math.max(textWidth, 20) + 5, // Ensure minimum width
              maxY: point.y + 5,
            }
          }
          
          // Fallback calculation
          return {
            minX: point.x - 5,
            minY: point.y - fontSize + 5,
            maxX: point.x + Math.max(text.length * fontSize * 0.6, 20) + 5,
            maxY: point.y + 5,
          }
        } else if (stroke.startPoint && stroke.endPoint) {
          return {
            minX: Math.min(stroke.startPoint.x, stroke.endPoint.x),
            minY: Math.min(stroke.startPoint.y, stroke.endPoint.y),
            maxX: Math.max(stroke.startPoint.x, stroke.endPoint.x),
            maxY: Math.max(stroke.startPoint.y, stroke.endPoint.y),
          }
        } else if (stroke.points.length > 0) {
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
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      },
    }),
    {
      name: "whiteboard-storage",
      partialize: (state) => ({
        savedDocuments: state.savedDocuments,
        currentDocument: state.currentDocument,
        currentTool: state.currentTool,
        currentColor: state.currentColor,
        currentStrokeWidth: state.currentStrokeWidth,
      }),
    },
  ),
)
