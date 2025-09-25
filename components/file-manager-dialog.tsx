"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWhiteboardStore } from "@/hooks/use-whiteboard-store"
import { FolderOpen, Save, Trash2, Copy, FileText, Plus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface FileManagerDialogProps {
  mode: "save" | "open"
  children: React.ReactNode
}

export function FileManagerDialog({ mode, children }: FileManagerDialogProps) {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const {
    currentDocument,
    savedDocuments,
    saveDocument,
    loadDocument,
    deleteDocument,
    duplicateDocument,
    newDocument,
    isModified,
  } = useWhiteboardStore()

  const handleSave = () => {
    if (fileName.trim()) {
      saveDocument(fileName.trim())
      setOpen(false)
      setFileName("")
    }
  }

  const handleLoad = (document: any) => {
    loadDocument(document)
    setOpen(false)
  }

  const handleNew = () => {
    newDocument()
    setOpen(false)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument(id)
    }
  }

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateDocument(id)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "save" ? <Save className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
            {mode === "save" ? "Save Document" : "Open Document"}
          </DialogTitle>
          <DialogDescription>
            {mode === "save"
              ? "Save your current whiteboard as a document"
              : "Choose a document to open or create a new one"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {mode === "save" && (
            <div className="space-y-2">
              <Label htmlFor="fileName">Document Name</Label>
              <div className="flex gap-2">
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={currentDocument?.name || `Whiteboard ${new Date().toLocaleDateString()}`}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  autoFocus
                />
                <Button onClick={handleSave} disabled={!fileName.trim()}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {mode === "open" && (
            <div className="flex gap-2">
              <Button onClick={handleNew} variant="outline" className="flex items-center gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                New Document
              </Button>
              {isModified && (
                <Button
                  onClick={() => saveDocument()}
                  variant="outline"
                  className="flex items-center gap-2 text-orange-600"
                >
                  <Save className="h-4 w-4" />
                  Save Current
                </Button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Saved Documents ({savedDocuments.length})</h3>
              {savedDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No saved documents yet</p>
                  <p className="text-sm">Create your first whiteboard and save it!</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {savedDocuments
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((document) => (
                      <div
                        key={document.id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                          currentDocument?.id === document.id ? "border-primary bg-accent" : ""
                        }`}
                        onClick={() => mode === "open" && handleLoad(document)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{document.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{document.strokes.length} elements</span>
                              <span>
                                {document.updatedAt === document.createdAt ? "Created" : "Updated"}{" "}
                                {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDuplicate(document.id, e)}
                              className="h-8 w-8 p-0"
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(document.id, e)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
