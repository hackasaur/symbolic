import * as vector from "./utils/vector.ts"
import * as txtbox from "./textbox.ts"
import * as txtMenu from "./textMenu.ts"
import * as menu from "./utils/menu/menu.ts"
import { Menu } from "./utils/menu/menu.ts"
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
  el: HTMLElement,
  textbox: txtbox.Textbox,
  textMenu?: Menu,
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
    vector.create(ctx.canvas.width/gl.DPR() - 200, 100),
    150, // width
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

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    txtbox.draw(ctx, textbox)
    if (textMenu !== undefined) {
      menu.draw(ctx, textMenu)
    }

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
      // frameRateMonitor.coords.x = ctx.canvas.width/2 - 200
      // frameRateMonitor.coords.y = 100
      frameRateMonitor.update()
      frameRateMonitor.draw()
      pointer_debug.draw()
    }

    requestAnimationFrame(renderloop)
  }

  renderloop(0)
  return loop
}

export { startRenderLoop }
