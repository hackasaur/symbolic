import * as vector from "./utils/vector.ts"
import * as txtbox from "./text/textbox.ts"
import * as gl from "./utils/gl.ts"
import { pointerDebugger, createMonitor, debugCtx2D } from "./utils/debug.ts"

export interface RenderLoop {
  play: boolean
  timestamp: number
  frametime: number
  debug: boolean
}

const startRenderLoop = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  el: HTMLElement,
  textbox: txtbox.Textbox,
  callback?: (timestamp: number) => void,
  debug?: boolean
): RenderLoop => {
  let loop: RenderLoop = {
    play: true,
    timestamp: 0,
    frametime: 16,
    debug: debug ? true : false,
  }

  let pointer_debug = pointerDebugger(ctx, el, 3, "yellow")

  let frameRateMonitor = createMonitor(
    ctx,
    vector.create(canvas.width - 200, 100),
    100, // width
    1, // scale
    200, // shiftTime
    (1 / 60) * 10 ** 3, // baseline (~16 ms for 60Hz)
    50 // bufferLength
  )

  // variables needed for frame time
  // https://www.mvps.org/directx/articles/fps_versus_frame_time.htm
  let oldTimeStamp = 0
  let pointerCoords = vector.create(0,0)

  window.addEventListener("pointermove", (event) => {
    pointerCoords = gl.getPointerCoords(event)
  })

  const renderloop = (timestamp: number) => {
    if (!loop.play) {
      return loop
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    txtbox.draw(ctx, textbox)

    if (callback) {
      callback(timestamp)
    }

    if (loop.debug) {
      //Frame time
      // Calculate the number of milliseconds passed since the last frame
      let milliSecondsPassed = timestamp - oldTimeStamp
      oldTimeStamp = timestamp
      let frameTime = Math.round(milliSecondsPassed * 10) / 10
      loop.frametime = frameTime
      loop.timestamp = timestamp

      // frame time monitor
      frameRateMonitor.stream(frameTime)
      frameRateMonitor.coords.x = canvas.width/2 - 200
      frameRateMonitor.coords.y = 100
      frameRateMonitor.update()

      frameRateMonitor.draw()

      pointer_debug.draw()
    }


    gl.fillText(
      ctx,
      vector.create(0, 40),
      `x: ${Math.round(pointerCoords.x)}`,
      1,
      {
        font: "Arial",
        fontSize: 20,
        fontColor: "white",
        italic: false,
        bold: false,
      }
    )

    gl.fillText(
      ctx,
      vector.create(0, 65),
      `y: ${Math.round(pointerCoords.y)}`,
      1,
      {
        font: "Arial",
        fontSize: 20,
        fontColor: "white",
        italic: false,
        bold: false,
      }
    )

    requestAnimationFrame(renderloop)
  }

  renderloop(0)
  return loop
}

export { startRenderLoop }
