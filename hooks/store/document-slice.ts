"use client"

import type { StateCreator } from "zustand"
import type { Stroke, WhiteboardDocument } from "@/lib/types"

export interface DocumentSlice {
  currentDocument: WhiteboardDocument | null
  savedDocuments: WhiteboardDocument[]
  isModified: boolean

  newDocument: () => void
  saveDocument: (name?: string) => void
  loadDocument: (document: WhiteboardDocument) => void
  deleteDocument: (id: string) => void
  duplicateDocument: (id: string) => void
  generateThumbnail: () => string | null
}

type WithDocuments = DocumentSlice & {
  strokes: Stroke[]
}

export const createDocumentSlice: StateCreator<WithDocuments, [], [], DocumentSlice> = (set, get) => ({
  currentDocument: null,
  savedDocuments: [],
  isModified: false,

  newDocument: () => {
    set({
      strokes: [],
      currentStroke: null as any, // maintained by drawing slice
      history: [[]] as any,
      historyIndex: 0 as any,
      editingText: null as any,
      isDrawingShape: false as any,
      shapeStartPoint: null as any,
      selectedStrokes: [] as any,
      selectionBox: null as any,
      isSelecting: false as any,
      isDragging: false as any,
      dragStart: null as any,
      resizeHandle: null as any,
      currentDocument: null,
      isModified: false,
      zoom: 1 as any,
      panX: 0 as any,
      panY: 0 as any,
    } as any)
  },

  saveDocument: (name) => {
    const state = get()
    const now = Date.now()
    const documentName = name || `Whiteboard ${new Date().toLocaleDateString()}`

    if (state.currentDocument) {
      const updatedDocument: WhiteboardDocument = {
        ...state.currentDocument,
        name: documentName,
        strokes: [...state.strokes],
        updatedAt: now,
        thumbnail: (get().generateThumbnail?.() as string | null) || undefined,
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
      const newDocument: WhiteboardDocument = {
        id: Date.now().toString(),
        name: documentName,
        strokes: [...state.strokes],
        createdAt: now,
        updatedAt: now,
        thumbnail: (get().generateThumbnail?.() as string | null) || undefined,
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
      currentStroke: null as any,
      history: [document.strokes] as any,
      historyIndex: 0 as any,
      editingText: null as any,
      isDrawingShape: false as any,
      shapeStartPoint: null as any,
      selectedStrokes: [] as any,
      selectionBox: null as any,
      isSelecting: false as any,
      isDragging: false as any,
      dragStart: null as any,
      resizeHandle: null as any,
      currentDocument: document,
      isModified: false,
      zoom: 1 as any,
      panX: 0 as any,
      panY: 0 as any,
    } as any)
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
    const state = get() as any
    if (state.strokes.length === 0) return null
    try {
      let minX = Number.POSITIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        maxX = Number.NEGATIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY

      state.strokes.forEach((stroke: any) => {
        if (stroke.type === "text" && stroke.points.length > 0) {
          const point = stroke.points[0]
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x + 100)
          maxY = Math.max(maxY, point.y + 20)
        } else if (stroke.startPoint && stroke.endPoint) {
          minX = Math.min(minX, stroke.startPoint.x, stroke.endPoint.x)
          minY = Math.min(minY, stroke.startPoint.y, stroke.endPoint.y)
          maxX = Math.max(maxX, stroke.startPoint.x, stroke.endPoint.x)
          maxY = Math.max(maxY, stroke.startPoint.y, stroke.endPoint.y)
        } else {
          stroke.points.forEach((point: any) => {
            minX = Math.min(minX, point.x)
            minY = Math.min(minY, point.y)
            maxX = Math.max(maxX, point.x)
            maxY = Math.max(maxY, point.y)
          })
        }
      })

      const canvas = document.createElement("canvas")
      const thumbnailSize = 120
      canvas.width = thumbnailSize
      canvas.height = thumbnailSize
      const ctx = canvas.getContext("2d")!

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, thumbnailSize, thumbnailSize)

      const contentWidth = maxX - minX
      const contentHeight = maxY - minY
      const scale = Math.min(thumbnailSize / contentWidth, thumbnailSize / contentHeight) * 0.8
      const offsetX = (thumbnailSize - contentWidth * scale) / 2 - minX * scale
      const offsetY = (thumbnailSize - contentHeight * scale) / 2 - minY * scale

      state.strokes.forEach((stroke: any) => {
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = Math.max(1, stroke.strokeWidth * scale)
        ctx.lineCap = "round"

        if (stroke.type === "pen" && stroke.points.length > 0) {
          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x * scale + offsetX, stroke.points[0].y * scale + offsetY)
          stroke.points.forEach((point: any, i: number) => {
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
})



