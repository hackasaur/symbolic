// graphic library related utility functions

import { Rectangle } from "./geometry"
import { Vector2D } from "./vector"
import * as vector from "./vector"
export type strokeStyle = "solid" | "sketch" | "paintish" | "none"

export interface TextFormat {
  font: string
  fontSize: number
  fontColor: string | CanvasGradient
  italic: boolean
  bold: boolean
}

export const DPR = () => {
  return window.devicePixelRatio || 1
}

// #NOTE: strokeStyle here is not the color of the stroke unlike in the canvas API
// (which never made sense to me). StrokeStyle here literally
// means the style of the stroke as in is it a simple line, a sketchy line or a paintish line etc.
// there will be fillStyles also in the future to fill a shape

export const stroke = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  color: string | CanvasGradient,
  strokeWidth: number,
  strokeStyle?: strokeStyle,
  opacity?: number,
  lineDash?: [number, number],
  shadow?: CanvasShadowStyles
): void => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = "round"

  if (shadow !== undefined) {
    ctx.shadowColor = shadow.shadowColor
    ctx.shadowBlur = shadow.shadowBlur
    ctx.shadowOffsetX = shadow.shadowOffsetX
    ctx.shadowOffsetY = shadow.shadowOffsetY
  }

  if (opacity !== undefined) ctx.globalAlpha = opacity
  else ctx.globalAlpha = 1

  if (lineDash) {
    ctx.setLineDash(lineDash)
  }

  ctx.stroke(path)
  ctx.restore()
}

export const fill = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  color: string | CanvasGradient,
  opacity?: number,
  fillRule?: "evenodd" | "nonzero",
  shadow?: CanvasShadowStyles
): void => {
  ctx.fillStyle = color
  if (opacity !== undefined) {
    ctx.save()
    ctx.globalAlpha = opacity
  }

  if (shadow !== undefined) {
    ctx.shadowColor = shadow.shadowColor
    ctx.shadowBlur = shadow.shadowBlur
    ctx.shadowOffsetX = shadow.shadowOffsetX
    ctx.shadowOffsetY = shadow.shadowOffsetY
  }

  ctx.fill(path, fillRule)

  if (opacity !== undefined) {
    ctx.restore()
  }
}

export const fillTranslucent = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  fillColor: string | CanvasGradient,
  opacity: number, // [0,1]
  magnification: number, // [0,1]
  blurRadius: number,
  bounds?: { minX: number; minY: number; maxX: number; maxY: number },
  shadow?: CanvasShadowStyles
): void => {
  // Determine the bounding box of the path
  let boundingBox = bounds
  if (!boundingBox) {
    // If no bounds provided, approximate as the full canvas
    // Note: Path2D does not provide direct access to bounds, so explicit bounds are recommended
    boundingBox = {
      minX: 0,
      minY: 0,
      maxX: ctx.canvas.width,
      maxY: ctx.canvas.height,
    }
  }

  const x = boundingBox.minX
  const y = boundingBox.minY
  const width = boundingBox.maxX - boundingBox.minX
  const height = boundingBox.maxY - boundingBox.minY

  if (width < 1 || height < 1) {
    return
  }

  // Create a temporary canvas for the background area
  // #Sub-optimal shouldn't create canvas each time the function is called
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext("2d")
  if (!tempCtx) {
    console.error("Failed to get 2D context for temporary canvas")
    return
  }

  // canvas -> temp
  // tempCtx.setTransform(
  //   magnification,
  //   0,
  //   0,
  //   magnification,
  //   0,
  //   0
  // (-(magnification - 1) * width) / 2,
  // (-(magnification - 1) * height) / 2
  // )

  // Apply blur to the temporary canvas
  tempCtx.filter = `blur(${blurRadius}px)`

  // Copy the background area to the temporary canvas
  tempCtx.drawImage(
    ctx.canvas,
    DPR() * x,
    DPR() * y,
    DPR() * width,
    DPR() * height,
    0,
    0,
    width,
    height
  )
  tempCtx.resetTransform()

  // temp -> canvas
  // Copy the blurred background back to the main canvas, clipped to the path
  ctx.save()
  ctx.clip(path, "evenodd") // Clip to the Path2D
  ctx.clearRect(x, y, width, height),
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      width,
      height,
      x,
      y,
      width * magnification,
      height * magnification
    )
  // ctx.drawImage(tempCanvas, 0, 0, 4000, 4000, 600, 800, width, height)
  ctx.restore()
  ctx.save()

  // Draw the translucent fill over the blurred background
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity)) // Clamp opacity to [0, 1]
  ctx.fillStyle = fillColor

  if (shadow) {
    ctx.shadowBlur = shadow?.shadowBlur
    ctx.shadowColor = shadow?.shadowColor
    ctx.shadowOffsetX = shadow?.shadowOffsetX
    ctx.shadowOffsetY = shadow?.shadowOffsetY
  }

  ctx.fill(path, "evenodd")

  // // Restore the clipping context
  ctx.restore()
}

export const strokePoints = (
  ctx: CanvasRenderingContext2D,
  points: Vector2D[],
  color: string | CanvasGradient,
  thickness: number,
  style?: strokeStyle,
  lineDash?: [number, number]
): void => {
  // #WorkInProgress
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = thickness
  ctx.lineJoin = "round"
  ctx.lineCap = "round"

  if (style === undefined) {
    style = "none"
  }

  switch (style) {
    case "none":
      break
    case "sketch":
      break
    case "paintish":
      let noOfFibres = 50
      let offsets: Vector2D[] = []
      let radius = 10 //2 * thickness
      for (let i = 0; i < noOfFibres; i++) {
        offsets.push(
          vector.create(
            Math.random() * radius * (-1) ** i,
            Math.random() * radius * (-1) ** i
          )
        )
      }

      for (let point of points) {
        offsets.forEach((offset) => {
          ctx.beginPath()
          ctx.ellipse(
            point.x + offset.x,
            point.y + offset.y,
            0.5,
            0.5,
            0,
            0,
            2 * Math.PI
          )

          ctx.fill()
        })
      }

      break
  }

  if (lineDash) {
    ctx.setLineDash(lineDash)
  }
}

// Set canvas size as per device pixel ratio
const setCanvasSize = (canvas: HTMLCanvasElement) => {
  // Set canvas dimensions
  canvas.width = window.innerWidth * DPR()
  canvas.height = window.innerHeight * DPR()
}

// Get device pixel ratio

const setCanvasScaleToDPR = (ctx: CanvasRenderingContext2D) => {
  ctx.scale(DPR(), DPR())
}

// #TODO: initialize canvas should return a pubsub(?) event when window is being scaled, so that elements can be translated accordingly
const initializeCanvas = (
  elementId: string,
  bgColor: string
): [
  { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null,
  Error | null,
] => {
  const canvas = document.getElementById(elementId) as HTMLCanvasElement
  canvas.style.backgroundColor = bgColor

  // Set canvas dimensions
  setCanvasSize(canvas)

  // create 2D context
  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    return [null, new Error("Could not get 2D context from canvas")]
  }

  // #FIX: why is this not working
  // Set canvas scale as per DPR
  setCanvasScaleToDPR(ctx)

  ctx.imageSmoothingEnabled = true

  // #FIX resizing does not work
  setWindowResizingHandler(canvas, ctx)

  return [{ canvas, ctx }, null]
}

const setWindowResizingHandler = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): void => {
  window.onresize = () => {
    setCanvasSize(canvas)
    setCanvasScaleToDPR(ctx)
  }
}

// #TODO: try using clientXY instead of offsetXY. Check why this is buggy in touchscreen displays
function getPointerCoords(event: PointerEvent | WheelEvent): Vector2D {
  return vector.create(event.offsetX , event.offsetY )
  // return vector.create(event.offsetX / DPR(), event.offsetY/ DPR() )
}

// NOTE:
// ctx is needed for ctx.measureText() but,
// I didn't want to pass ctx when creating a text box rather only when drawing
// calling getContext() each time when measuring text
// terribly slowed down the app in tauri but not in Chrome
// now I have removed ctx from the arguments of gl.measureText()
let canvas = document.createElement("canvas")
let ctx_tmp = canvas.getContext("2d")
if (ctx_tmp === null) {
  console.error(`gl: ctx_tmp is null`)
}

function measureText(
  text: string,
  textFormat: TextFormat
  // ctx?: CanvasRenderingContext2D,
): TextMetrics | Error {
  if (ctx_tmp === null) {
    return Error("Could not get 2D context from canvas")
  }

  setCtxFont(ctx_tmp, textFormat)
  let textMetrics = ctx_tmp.measureText(text)
  return textMetrics

  // document.removeChild(canvas)
}

function setCtxFont(
  ctx: CanvasRenderingContext2D,
  textFormat: TextFormat
): void {
  let italic = textFormat.italic ? "italic " : ""
  let bold = textFormat.bold ? "bold " : ""
  ctx.fillStyle = textFormat.fontColor
  ctx.font = `${italic}${bold}${textFormat.fontSize}px ${textFormat.font}`
}

function fillText(
  ctx: CanvasRenderingContext2D,
  coords: Vector2D,
  text: string,
  opacity: number,
  textFormat: TextFormat,
  width?: number
) {
  if (textFormat !== undefined) {
    setCtxFont(ctx, textFormat)
  }

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillText(text, coords.x, coords.y, width)
  ctx.restore()
}

function isPointInPath(
  ctx: CanvasRenderingContext2D,
  coords: Vector2D,
  path: Path2D
): boolean {
  return ctx.isPointInPath(path, coords.x, coords.y, "evenodd")
}

function transform(
  ctx: CanvasRenderingContext2D,
  translate: Vector2D,
  zoom: Vector2D
) {
  ctx.transform(zoom.x, 0, 0, zoom.y, translate.x, translate.y)
}

function resetTransform(ctx: CanvasRenderingContext2D) {
  ctx.resetTransform()
}

function translate(ctx: CanvasRenderingContext2D, translate: Vector2D) {
  ctx.translate(translate.x, translate.y)
}

function createLinearGradient(
  topLeftCorner: Vector2D,
  bottomRightCorner: Vector2D
): CanvasGradient | Error {
  if (ctx_tmp === null) return Error(`ctx_tmp is null`)

  let gradient = ctx_tmp.createLinearGradient(
    topLeftCorner.x,
    topLeftCorner.y,
    bottomRightCorner.x,
    bottomRightCorner.y
  )

  return gradient
}

function createRadialGradient(
  centerInner: Vector2D,
  radiusInner: number,
  centerOuter: Vector2D,
  radiusOuter: number
): CanvasGradient | Error {
  if (ctx_tmp === null) return Error(`ctx_tmp is null`)

  let gradient = ctx_tmp.createRadialGradient(
    centerInner.x,
    centerInner.y,
    radiusInner,
    centerOuter.x,
    centerOuter.y,
    radiusOuter
  )

  return gradient
}

const fillRect = (
  ctx: CanvasRenderingContext2D,
  rect: Rectangle,
  fillColor: string,
  opacity: number,
  shadow?: CanvasShadowStyles
): void => {
  let path = new Path2D()
  path.rect(
    rect.center.x - rect.width / 2,
    rect.center.y - rect.height / 2,
    rect.width,
    rect.height
  )

  fill(ctx, path, fillColor, opacity, "evenodd", shadow)
  return
}

const strokeRect = (
  ctx: CanvasRenderingContext2D,
  rect: Rectangle,
  cornerRadii: number,
  color: string | CanvasGradient,
  strokeWidth: number,
  opacity: number,
  lineDash?: [number, number],
  shadow?: CanvasShadowStyles
): void => {
  let path = new Path2D()
  path.roundRect(
    rect.center.x - rect.width / 2,
    rect.center.y - rect.height / 2,
    rect.width,
    rect.height,
    cornerRadii
  )

  stroke(ctx, path, color, strokeWidth, "solid", opacity, lineDash, shadow)

  return
}

const drawImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  center: Vector2D,
  width: number,
  height: number,
  opacity?: number
): void => {
  if (opacity) {
    ctx.save()
    ctx.globalAlpha = opacity
  }

  ctx.drawImage(
    image,
    center.x - width / 2,
    center.y - height / 2,
    width,
    height
  )

  if (opacity) {
    ctx.restore()
  }
}

function drawPencilStroke(
  ctx: CanvasRenderingContext2D,
  points: Vector2D[],
  options: {
    strokeStyle?: string
    lineWidth?: number
    roughness?: number // How "pencil-like" it is (0.5 - 3.0 recommended)
    pressure?: number // Base pressure simulation (0.6 - 1.0)
  } = {}
): void {
  if (points.length < 2) return

  const {
    strokeStyle = "white",
    lineWidth = 1,
    roughness = 2,
    pressure = 0.85,
  } = options

  ctx.save()
  ctx.strokeStyle = strokeStyle
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  let random = [0.9, 0.34, 0.75, 0.48, 0.15, 0.56, 0.82, 0.04]

  // Pencil effect: multiple overlapping slightly offset strokes with varying opacity and width
  for (let i = 0; i < 4; i++) {
    // Multiple passes for pencil texture
    ctx.beginPath()

    const offset = (i - 1.5) * roughness * 0.6 // subtle random-like offset

    // Start with first point
    ctx.moveTo(
      points[0].x + (random[i] - 0.5) * roughness * 0.8,
      points[0].y + (random[i] - 0.5) * roughness * 0.8
    )

    // Draw quadratic curves through the points for smooth natural feel
    for (let j = 1; j < points.length - 1; j++) {
      const xc = (points[j].x + points[j + 1].x) / 2
      const yc = (points[j].y + points[j + 1].y) / 2

      const xOffset = (random[j % 9] - 0.5) * roughness * (0.8 + i * 0.2)
      const yOffset = (random[j % 9] - 0.5) * roughness * (0.8 + i * 0.2)

      ctx.quadraticCurveTo(
        points[j].x + xOffset + offset,
        points[j].y + yOffset + offset,
        xc + xOffset * 0.7,
        yc + yOffset * 0.7
      )
    }

    // Last point
    if (points.length > 1) {
      const last = points[points.length - 1]
      ctx.lineTo(
        last.x + (random[i] - 0.5) * roughness * 0.9,
        last.y + (random[i] - 0.5) * roughness * 0.9
      )
    }

    // Vary line width and opacity for realistic pencil effect
    const currentWidth = lineWidth * (pressure - i * 0.08)
    ctx.lineWidth = Math.max(0.8, currentWidth)

    // Slight opacity variation per pass
    ctx.globalAlpha = 0.75 - i * 0.12

    ctx.stroke()
  }

  ctx.restore()
}

export {
  setCanvasScaleToDPR,
  getPointerCoords,
  initializeCanvas,
  setCanvasSize,
  measureText,
  setCtxFont,
  fillText,
  isPointInPath,
  transform,
  resetTransform,
  translate,
  createLinearGradient,
  createRadialGradient,
  fillRect,
  strokeRect,
  drawImage,
  drawPencilStroke,
}
