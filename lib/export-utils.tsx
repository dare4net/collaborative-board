import type { Stroke } from "@/hooks/use-whiteboard-store"

// Calculate the bounding box of all strokes
function calculateBounds(strokes: Stroke[]) {
  if (strokes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  strokes.forEach((stroke) => {
    if (stroke.type === "text" && stroke.points.length > 0) {
      const point = stroke.points[0]
      const fontSize = stroke.fontSize || 16
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y - fontSize)
      maxX = Math.max(maxX, point.x + (stroke.text?.length || 0) * fontSize * 0.6)
      maxY = Math.max(maxY, point.y)
    } else if (stroke.startPoint && stroke.endPoint) {
      // Shapes
      minX = Math.min(minX, stroke.startPoint.x, stroke.endPoint.x)
      minY = Math.min(minY, stroke.startPoint.y, stroke.endPoint.y)
      maxX = Math.max(maxX, stroke.startPoint.x, stroke.endPoint.x)
      maxY = Math.max(maxY, stroke.startPoint.y, stroke.endPoint.y)
    } else {
      // Pen strokes
      stroke.points.forEach((point) => {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })
    }
  })

  // Add padding
  const padding = 20
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
}

// Render strokes to a canvas
function renderToCanvas(
  strokes: Stroke[],
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  scale = 1,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext("2d")!

  // Scale the context for high-DPI rendering
  ctx.scale(scale, scale)

  // Set white background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  strokes.forEach((stroke) => {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.strokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (stroke.type === "pen") {
      if (stroke.points.length > 0) {
        ctx.beginPath()
        const firstPoint = stroke.points[0]
        ctx.moveTo(firstPoint.x - offsetX, firstPoint.y - offsetY)

        if (stroke.points.length === 1) {
          // Single dot
          ctx.arc(firstPoint.x - offsetX, firstPoint.y - offsetY, stroke.strokeWidth / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Smooth curve through points
          for (let i = 1; i < stroke.points.length; i++) {
            const currentPoint = stroke.points[i]
            const prevPoint = stroke.points[i - 1]
            const midX = (prevPoint.x + currentPoint.x) / 2
            const midY = (prevPoint.y + currentPoint.y) / 2
            ctx.quadraticCurveTo(prevPoint.x - offsetX, prevPoint.y - offsetY, midX - offsetX, midY - offsetY)
          }
          ctx.stroke()
        }
      }
    } else if (stroke.type === "rectangle" && stroke.startPoint && stroke.endPoint) {
      const x = Math.min(stroke.startPoint.x, stroke.endPoint.x) - offsetX
      const y = Math.min(stroke.startPoint.y, stroke.endPoint.y) - offsetY
      const width = Math.abs(stroke.endPoint.x - stroke.startPoint.x)
      const height = Math.abs(stroke.endPoint.y - stroke.startPoint.y)
      ctx.strokeRect(x, y, width, height)
    } else if (stroke.type === "ellipse" && stroke.startPoint && stroke.endPoint) {
      const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2 - offsetX
      const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2 - offsetY
      const radiusX = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2
      const radiusY = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (stroke.type === "line" && stroke.startPoint && stroke.endPoint) {
      ctx.beginPath()
      ctx.moveTo(stroke.startPoint.x - offsetX, stroke.startPoint.y - offsetY)
      ctx.lineTo(stroke.endPoint.x - offsetX, stroke.endPoint.y - offsetY)
      ctx.stroke()
    } else if (stroke.type === "text" && stroke.points.length > 0 && stroke.text) {
      const point = stroke.points[0]
      const fontSize = stroke.fontSize || 16
      ctx.fillStyle = stroke.color
      ctx.font = `${fontSize}px "Kalam", cursive`
      ctx.textBaseline = "top"
      ctx.fillText(stroke.text, point.x - offsetX, point.y - offsetY)
    }
  })

  return canvas
}

// Export to PNG
export async function exportToPNG(strokes: Stroke[], filename: string, scale = 2) {
  const bounds = calculateBounds(strokes)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  const canvas = renderToCanvas(strokes, width, height, bounds.minX, bounds.minY, scale)

  // Convert to blob and download
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${filename}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }, "image/png")
}

// Export to SVG
export async function exportToSVG(strokes: Stroke[], filename: string) {
  const bounds = calculateBounds(strokes)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
`

  strokes.forEach((stroke) => {
    if (stroke.type === "pen") {
      if (stroke.points.length > 0) {
        if (stroke.points.length === 1) {
          // Single dot as circle
          const point = stroke.points[0]
          svgContent += `  <circle cx="${point.x - bounds.minX}" cy="${point.y - bounds.minY}" r="${stroke.strokeWidth / 2}" fill="${stroke.color}"/>\n`
        } else {
          // Path for pen strokes
          let pathData = `M ${stroke.points[0].x - bounds.minX} ${stroke.points[0].y - bounds.minY}`

          for (let i = 1; i < stroke.points.length; i++) {
            const currentPoint = stroke.points[i]
            const prevPoint = stroke.points[i - 1]
            const midX = (prevPoint.x + currentPoint.x) / 2
            const midY = (prevPoint.y + currentPoint.y) / 2
            pathData += ` Q ${prevPoint.x - bounds.minX} ${prevPoint.y - bounds.minY} ${midX - bounds.minX} ${midY - bounds.minY}`
          }

          svgContent += `  <path d="${pathData}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n`
        }
      }
    } else if (stroke.type === "rectangle" && stroke.startPoint && stroke.endPoint) {
      const x = Math.min(stroke.startPoint.x, stroke.endPoint.x) - bounds.minX
      const y = Math.min(stroke.startPoint.y, stroke.endPoint.y) - bounds.minY
      const rectWidth = Math.abs(stroke.endPoint.x - stroke.startPoint.x)
      const rectHeight = Math.abs(stroke.endPoint.y - stroke.startPoint.y)
      svgContent += `  <rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" fill="none"/>\n`
    } else if (stroke.type === "ellipse" && stroke.startPoint && stroke.endPoint) {
      const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2 - bounds.minX
      const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2 - bounds.minY
      const radiusX = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2
      const radiusY = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2
      svgContent += `  <ellipse cx="${centerX}" cy="${centerY}" rx="${radiusX}" ry="${radiusY}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" fill="none"/>\n`
    } else if (stroke.type === "line" && stroke.startPoint && stroke.endPoint) {
      svgContent += `  <line x1="${stroke.startPoint.x - bounds.minX}" y1="${stroke.startPoint.y - bounds.minY}" x2="${stroke.endPoint.x - bounds.minX}" y2="${stroke.endPoint.y - bounds.minY}" stroke="${stroke.color}" stroke-width="${stroke.strokeWidth}" stroke-linecap="round"/>\n`
    } else if (stroke.type === "text" && stroke.points.length > 0 && stroke.text) {
      const point = stroke.points[0]
      const fontSize = stroke.fontSize || 16
      svgContent += `  <text x="${point.x - bounds.minX}" y="${point.y - bounds.minY}" font-family="Kalam, cursive" font-size="${fontSize}" fill="${stroke.color}" dominant-baseline="hanging">${stroke.text}</text>\n`
    }
  })

  svgContent += "</svg>"

  // Create and download the SVG file
  const blob = new Blob([svgContent], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
