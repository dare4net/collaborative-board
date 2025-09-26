import type { Tool, Stroke } from './types'

export interface KeyboardHandlerContext {
  currentTool: Tool
  selectedStrokes: string[]
  strokes: Stroke[]
  editingText: { id: string; x: number; y: number; text: string } | null
  canUndo: boolean
  canRedo: boolean
  currentDocument: any
  onToolChange: (tool: Tool) => void
  onSelectionUpdate: (selectedStrokes: string[]) => void
  onDeleteSelected: () => void
  onUndo: () => void
  onRedo: () => void
  onSaveDocument: (name?: string) => void
  onNewDocument: () => void
  onSelectAll: () => void
}

export class KeyboardHandler {
  private context: KeyboardHandlerContext

  constructor(context: KeyboardHandlerContext) {
    this.context = context
  }

  handleKeyDown(e: KeyboardEvent): void {
    // Don't handle shortcuts when editing text or when focused on input elements
    if (this.context.editingText || 
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement) {
      return
    }

    // Delete selected items
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.context.selectedStrokes.length > 0) {
        e.preventDefault()
        this.context.onDeleteSelected()
      }
      return
    }

    // Prevent default for our shortcuts
    if (e.ctrlKey || e.metaKey) {
      this.handleCtrlShortcuts(e)
      return
    }

    // Tool shortcuts
    this.handleToolShortcuts(e)
  }

  handleKeyUp(e: KeyboardEvent): void {
    if (e.key === ' ') {
      this.context.onToolChange('pen')
    }
  }

  private handleCtrlShortcuts(e: KeyboardEvent): void {
    switch (e.key) {
      case 's':
        e.preventDefault()
        if (this.context.currentDocument) {
          this.context.onSaveDocument()
        } else {
          this.context.onSaveDocument(`Whiteboard ${new Date().toLocaleDateString()}`)
        }
        break
      case 'n':
        e.preventDefault()
        this.context.onNewDocument()
        break
      case 'z':
        e.preventDefault()
        if (e.shiftKey) {
          if (this.context.canRedo) this.context.onRedo()
        } else {
          if (this.context.canUndo) this.context.onUndo()
        }
        break
      case 'y':
        e.preventDefault()
        if (this.context.canRedo) this.context.onRedo()
        break
      case 'a':
        e.preventDefault()
        this.context.onSelectAll()
        this.context.onToolChange('select')
        break
    }
  }

  private handleToolShortcuts(e: KeyboardEvent): void {
    switch (e.key) {
      case 'v':
      case 's':
        this.context.onToolChange('select')
        break
      case 'p':
        this.context.onToolChange('pen')
        break
      case 'e':
        this.context.onToolChange('eraser')
        break
      case 'h':
        this.context.onToolChange('pan')
        break
      case 'r':
        this.context.onToolChange('rectangle')
        break
      case 'o':
        this.context.onToolChange('ellipse')
        break
      case 'l':
        this.context.onToolChange('line')
        break
      case 't':
        this.context.onToolChange('text')
        break
      case ' ':
        e.preventDefault()
        this.context.onToolChange('pan')
        break
    }
  }
}

export class TextKeyboardHandler {
  handleKeyDown(e: React.KeyboardEvent, onFinish: () => void, onCancel: () => void): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onFinish()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }
}

