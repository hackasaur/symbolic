/*
  stuff for debugging the app
*/

import * as gl from "./gl"
import { Vector2D } from "./vector"
import * as vector from "./vector"
import { SETTINGS } from "../settings"

const DPR = () => {
  return window.devicePixelRatio || 1
}

export const debugCtx2D = (
  el: HTMLElement
): CanvasRenderingContext2D | Error => {
  let canvas: HTMLElement | null = document.getElementById("debug")

  if (canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")
    if (ctx === null) return Error(`ctx is null`)
    return ctx
  } else {
    canvas = document.createElement("canvas")
    canvas.id = "debug"
    el.appendChild(canvas)
    const [res, error] = gl.initializeCanvas("debug", "rgba(0,0,0,0)")
    if (error != null || res === null) {
      console.error(error)
      return Error(`${error}`)
    }
    return res.ctx
  }
}

export const pointerDebugger = (
  // draws a circle around the pointer when pointer is pressed
  ctx: CanvasRenderingContext2D,
  el: HTMLElement,
  strokeWidth: number,
  strokeColor: string
) => {
  let halo: Path2D | null = new Path2D()
  let center: Path2D | null = new Path2D()
  let pressed: boolean = false
  let coords: Vector2D

  window.addEventListener("pointerdown", (event) => {
    pressed = true
    coords = gl.getPointerCoords(event)
    halo = new Path2D()
    halo?.arc(
      coords.x,
      coords.y,
      SETTINGS.debug.pointerHaloRadius,
      0,
      2 * Math.PI
    )
    center = new Path2D()
    center?.ellipse(coords.x, coords.y, 1, 1, 0, 0, 2 * Math.PI)
  })

  window.addEventListener("pointermove", (event) => {
    coords = gl.getPointerCoords(event)

    halo = new Path2D()
    halo?.arc(
      coords.x,
      coords.y,
      SETTINGS.debug.pointerHaloRadius,
      0,
      2 * Math.PI
    )
    center = new Path2D()
    center?.ellipse(coords.x, coords.y, 1, 1, 0, 0, 2 * Math.PI)
  })

  window.addEventListener("pointerup", () => {
    pressed = false
    halo = null
    center = null
  })

  const draw = () => {
    if (pressed && halo && center) {
      ctx.fillStyle = strokeColor
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.stroke(halo)
      ctx.fill(center)
    }
  }

  return {
    draw,
  }
}

export const createMonitor = (
  ctx: CanvasRenderingContext2D,
  coords: Vector2D,
  width: number,
  scale: number,
  shiftTime: number,
  baseline: number,
  bufferLength: number
) => {
  let path = new Path2D()
  let points: Vector2D[] = []
  let time: number = 0
  let oldTime: number = 0
  let ft = 18

  setInterval(() => {
    time += shiftTime
  }, shiftTime)

  let baseLinePath: Path2D = new Path2D()
  baseLinePath.moveTo(coords.x, coords.y - scale * baseline)
  baseLinePath.lineTo(coords.x + width, coords.y - scale * baseline)
  baseLinePath.closePath()

  let zero: Path2D = new Path2D()
  zero.moveTo(coords.x, coords.y)
  zero.lineTo(coords.x + width, coords.y)
  zero.closePath()

  const makePathFromPoints = (coords: Vector2D, array: Vector2D[]) => {
    let path = new Path2D()
    if (array.length === 0) {
      return path
    }
    path.moveTo(coords.x + array[0].x, coords.y - array[0].y)
    for (let i = 1; i < array.length; i++) {
      path.lineTo(coords.x + array[i].x, coords.y - array[i].y)
    }
    return path
  }

  const stream = (frameTime: number) => {
    ft = frameTime

    if (time !== oldTime) {
      let l = points.length

      // if buffer is overflowing shift the array and push the point at the end
      if (l > bufferLength) {
        points.shift()
        for (let point of points) {
          point.x -= width / bufferLength
        }
        points.push(vector.create(width, scale * frameTime))
      } else {
        points.push(
          vector.create((l * width) / bufferLength, scale * frameTime)
        )
      }
      oldTime = time
      update()
    }
  }

  const update = () => {
    baseLinePath = new Path2D()
    baseLinePath.moveTo(coords.x, coords.y - scale * baseline)
    baseLinePath.lineTo(coords.x + width, coords.y - scale * baseline)
    baseLinePath.closePath()

    zero = new Path2D()
    zero.moveTo(coords.x, coords.y)
    zero.lineTo(coords.x + width, coords.y)
    zero.closePath()

    path = new Path2D()
    path = makePathFromPoints(coords, points)
  }

  const draw = () => {
    ctx.lineWidth = 3
    ctx.strokeStyle = "red"
    ctx.stroke(baseLinePath)
    ctx.strokeStyle = "green"
    ctx.stroke(zero)
    ctx.lineWidth = 1
    ctx.strokeStyle = "white"
    ctx.stroke(path)

    //print frame time
    ctx.fillStyle = "white"
    ctx.font = `20px Gill Sans`
    ctx.fillText(`frame time:  ${ft}ms`, coords.x, coords.y - scale * 60)
  }

  return {
    coords,
    update,
    draw,
    stream,
  }
}

export const showPoint = (
  ctx: CanvasRenderingContext2D,
  coords: Vector2D,
  label?: string,
  pointSize: number = 3,
  pointColor: string = "yellow",
  fontSize: number = 10,
  fontColor: string = "white"
): void => {
  let rect = new Path2D()
  rect.rect(coords.x, coords.y, pointSize, pointSize)
  gl.fill(ctx, rect, pointColor, 1, "evenodd")
  let l = label ? label : ""
  gl.fillText(
    ctx,
    vector.add(coords, vector.create(pointSize, -pointSize)),
    `${l} (${coords.x}, ${coords.y})`,
    1,
    {
      font: "Arial",
      fontColor: fontColor,
      fontSize: fontSize,
      italic: false,
      bold: false,
    }
  )
}
