"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Tool = "pen" | "eraser" | "pan" | "rectangle" | "ellipse" | "line" | "text" | "select"

export interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  type: Tool
  points: Point[]
  color: string
  strokeWidth: number
  // Shape-specific properties
  startPoint?: Point
  endPoint?: Point
  text?: string
  fontSize?: number
  // Selection and transformation
  selected?: boolean
  rotation?: number
}

export interface WhiteboardDocument {
  id: string
  name: string
  strokes: Stroke[]
  createdAt: number
  updatedAt: number
  thumbnail?: string
}

interface WhiteboardState {
  // Current tool and settings
  currentTool: Tool
  currentColor: string
  currentStrokeWidth: number

  // Canvas state
  zoom: number
  panX: number
  panY: number

  // Drawing state
  strokes: Stroke[]
  currentStroke: Stroke | null

  // Shape drawing state
  isDrawingShape: boolean
  shapeStartPoint: Point | null

  // Selection state
  selectedStrokes: string[]
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null
  isSelecting: boolean
  isDragging: boolean
  dragStart: Point | null
  resizeHandle: string | null // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'rotate'

  // Text editing
  editingText: { id: string; x: number; y: number; text: string } | null

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

  // Text actions
  startTextEdit: (point: Point) => void
  updateText: (text: string) => void
  finishTextEdit: () => void
  setEditingText: (editing: { id: string; x: number; y: number; text: string } | null) => void

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
}

export const useWhiteboardStore = create<WhiteboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTool: "pen",
      currentColor: "#2563eb",
      currentStrokeWidth: 4,
      zoom: 1,
      panX: 0,
      panY: 0,
      strokes: [],
      currentStroke: null,
      isDrawingShape: false,
      shapeStartPoint: null,
      selectedStrokes: [],
      selectionBox: null,
      isSelecting: false,
      isDragging: false,
      dragStart: null,
      resizeHandle: null,
      editingText: null,
      history: [[]],
      historyIndex: 0,
      currentDocument: null,
      savedDocuments: [],
      isModified: false,

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
      setCurrentColor: (color) => set({ currentColor: color }),
      setCurrentStrokeWidth: (width) => set({ currentStrokeWidth: width }),
      setZoom: (zoom) => set({ zoom }),
      setPan: (x, y) => set({ panX: x, panY: y }),
      resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

      // Drawing actions
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
          if (!stroke || !stroke.startPoint || !stroke.endPoint) return

          const deltaX = point.x - state.dragStart.x
          const deltaY = point.y - state.dragStart.y

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

          const newStrokes = state.strokes.map((s) =>
            s.id === strokeId ? { ...s, startPoint: newStartPoint, endPoint: newEndPoint } : s,
          )

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

      // Text actions
      startTextEdit: (point) => {
        set({
          editingText: {
            id: Date.now().toString(),
            x: point.x,
            y: point.y,
            text: "",
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
          const textStroke: Stroke = {
            id: state.editingText.id,
            type: "text",
            points: [{ x: state.editingText.x, y: state.editingText.y }],
            color: state.currentColor,
            strokeWidth: state.currentStrokeWidth,
            text: state.editingText.text,
            fontSize: Math.max(16, state.currentStrokeWidth * 4),
          }
          state.addStroke(textStroke)
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

      // History actions
      undo: () => {
        const state = get()
        if (state.canUndo) {
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
        if (state.canRedo) {
          const newIndex = state.historyIndex + 1
          set({
            strokes: state.history[newIndex],
            historyIndex: newIndex,
            isModified: true,
          })
        }
      },

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
            thumbnail: state.generateThumbnail(),
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
            thumbnail: state.generateThumbnail(),
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
          isModified: true,
        })
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
