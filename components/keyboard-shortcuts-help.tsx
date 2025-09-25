"use client"

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
import { Separator } from "@/components/ui/separator"
import { Keyboard, Command } from "lucide-react"

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Tools",
    shortcuts: [
      { keys: ["V", "S"], description: "Select tool" },
      { keys: ["P"], description: "Pen tool" },
      { keys: ["E"], description: "Eraser tool" },
      { keys: ["H"], description: "Pan tool" },
      { keys: ["R"], description: "Rectangle tool" },
      { keys: ["O"], description: "Ellipse tool" },
      { keys: ["L"], description: "Line tool" },
      { keys: ["T"], description: "Text tool" },
      { keys: ["Space"], description: "Temporary pan (hold)" },
    ],
  },
  {
    title: "File Operations",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Save document" },
      { keys: ["Ctrl", "N"], description: "New document" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Y"], description: "Redo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo (alternative)" },
    ],
  },
  {
    title: "Selection & Editing",
    shortcuts: [
      { keys: ["Ctrl", "A"], description: "Select all" },
      { keys: ["Delete"], description: "Delete selected" },
      { keys: ["Backspace"], description: "Delete selected" },
      { keys: ["Shift", "Click"], description: "Add to selection" },
      { keys: ["Drag"], description: "Move selected items" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Mouse Wheel"], description: "Zoom in/out" },
      { keys: ["Middle Click"], description: "Pan" },
      { keys: ["Ctrl", "Click"], description: "Pan" },
      { keys: ["Space", "Drag"], description: "Pan canvas" },
    ],
  },
  {
    title: "Text Editing",
    shortcuts: [
      { keys: ["Enter"], description: "Finish text editing" },
      { keys: ["Shift", "Enter"], description: "New line in text" },
      { keys: ["Escape"], description: "Cancel text editing" },
    ],
  },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9" title="Keyboard Shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts. Most shortcuts work when the canvas is focused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcutGroups.map((group, groupIndex) => (
            <div key={group.title}>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
                            {key === "Ctrl" && navigator.platform.includes("Mac") ? (
                              <Command className="h-3 w-3" />
                            ) : (
                              key
                            )}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {groupIndex < shortcutGroups.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Click on the canvas to focus it and enable keyboard shortcuts. Most tools can be
            quickly accessed with single letter keys.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
