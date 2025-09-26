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
  // Text-specific features
  mathMode?: boolean
  // Selection and transformation
  selected?: boolean
  rotation?: number
  // Bounding box for selection
  bounds?: { minX: number; minY: number; maxX: number; maxY: number }
}

export interface WhiteboardDocument {
  id: string
  name: string
  strokes: Stroke[]
  createdAt: number
  updatedAt: number
  thumbnail?: string
}

export interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

export interface EditingText {
  id: string
  x: number
  y: number
  text: string
  mathMode: boolean
}

export interface CanvasState {
  zoom: number
  panX: number
  panY: number
}

export interface DrawingState {
  isDrawing: boolean
  isDrawingShape: boolean
  isPanning: boolean
  lastPoint: Point | null
  lastPanPoint: Point | null
  lastDrawTime: number
}

export interface SelectionState {
  selectedStrokes: string[]
  selectionBox: SelectionBox | null
  isSelecting: boolean
  isDragging: boolean
  dragStart: Point | null
  resizeHandle: string | null
  isRotating: boolean
  rotateStart: Point | null
}

export interface HistoryState {
  history: Stroke[][]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
}

export interface DocumentState {
  currentDocument: WhiteboardDocument | null
  savedDocuments: WhiteboardDocument[]
  isModified: boolean
}

