/**
if()
Rectangle element
 */

import * as vector from "./utils/vector"
import * as geometry from "./utils/geometry"
import { stroke, strokeStyle, fill } from "./utils/gl"
import { updateObject } from "./utils/misc"
import { RenderableShape, Rectangular } from "./types"
import { AnchorRegion, Binding } from "./bind"
import { RectTransformer } from "./transformers/rectTrf.ts"
import { Vector2D } from "./utils/vector"
import { pubSub, PubSub } from "./utils/pubsub"
import { Tween } from "@tweenjs/tween.js"

export interface RectProps extends Rectangular {
  center: Vector2D
  width: number
  height: number
  cornerRadii: number
  rotation: number
  strokeColor: string | CanvasGradient
  strokeWidth: number
  strokeStyle: strokeStyle
  opacity: number
  fillColor?: string
  fillStyle?: string
  lineDash?: [number, number]
  boundArrowIds?: string[]
  textboxId?: string
  groupId?: string
}

export interface Rectangle extends RenderableShape {
  type: "Rectangle"
  props: RectProps
  anchorRegion?: AnchorRegion
  transformer?: RectTransformer
  animations: { [key: string]: Tween<Partial<RectProps>> }
  events: PubSub
}

const create = (props: RectProps): Rectangle => {
  let clone: RectProps = {
    center: vector.copy(props.center),
    width: props.width,
    height: props.height,
    cornerRadii: props.cornerRadii,
    rotation: props.rotation,
    strokeColor: props.strokeColor,
    strokeWidth: props.strokeWidth,
    strokeStyle: props.strokeStyle,
    fillColor: props.fillColor ? props.fillColor : undefined,
    fillStyle: props.fillStyle ? props.fillStyle : undefined,
    lineDash: props.lineDash
      ? [props.lineDash[0], props.lineDash[1]]
      : undefined,
    opacity: props.opacity !== undefined ? props.opacity : 1,
    boundArrowIds: props.boundArrowIds ? props.boundArrowIds : undefined,
  }

  let path = getPath(clone)
  let events = pubSub(["move", "drag", "resize", "rotate", "scale", "update"])
  let animations = {}

  let rect: Rectangle = {
    type: "Rectangle",
    selected: false,
    typing: false,
    props: clone,
    path,
    animations,
    events,
  }

  return rect
}

const copy = (rect: Rectangle): Rectangle => {
  const copy = create(rect.props)
  return copy
}

const move = (rect: Rectangle, coords: Vector2D): Rectangle => {
  let center = vector.copy(coords)
  update(rect, { center: center })

  rect.events.publish("move", { coords })

  return rect
}

const drag = (rect: Rectangle, delta: Vector2D): void => {
  let center = vector.add(rect.props.center, delta)
  update(rect, { center: center })

  rect.events.publish("drag", { delta })
  return
}

const scale = (
  rect: Rectangle,
  scaleFactor: Vector2D,
  about?: Vector2D
): void => {
  // NOTE: check unMirror() if you're facing issues with this function

  if (about === undefined) {
    about = rect.props.center
  }

  let topLeftCorner = vector.rotate(
    vector.subtract(
      rect.props.center,
      vector.create(rect.props.width / 2, rect.props.height / 2)
    ),
    rect.props.rotation,
    rect.props.center
  )

  let bottomRightCorner = vector.rotate(
    vector.add(
      rect.props.center,
      vector.create(rect.props.width / 2, rect.props.height / 2)
    ),
    rect.props.rotation,
    rect.props.center
  )

  let topLeftCornerNew = vector.scale(topLeftCorner, about, scaleFactor)
  let bottomRightCornerNew = vector.scale(bottomRightCorner, about, scaleFactor)

  let center = vector.add(
    topLeftCornerNew,
    vector.scaleSimple(
      vector.subtract(bottomRightCornerNew, topLeftCornerNew),
      1 / 2
    )
  )

  let topLeftCornerDerotated = vector.rotate(
    topLeftCornerNew,
    -rect.props.rotation,
    center
  )

  let bottomRightCornerDeroated = vector.rotate(
    bottomRightCornerNew,
    -rect.props.rotation,
    center
  )

  update(rect, {
    width: bottomRightCornerDeroated.x - topLeftCornerDerotated.x,
    height: bottomRightCornerDeroated.y - topLeftCornerDerotated.y,
    center,
  })

  rect.events.publish("scale", { scaleFactor, about })
  return
}

const resize = (rect: Rectangle, delta: Vector2D): void => {
  update(rect, {
    width: rect.props.width + delta.x,
    height: rect.props.height + delta.y,
  })

  rect.events.publish("resize", { delta })
}

const rotate = (rect: Rectangle, angle: number, about?: Vector2D) => {
  if (about) {
    let r = vector.subtract(rect.props.center, about)

    update(rect, {
      center: vector.create(
        about.x + Math.cos(angle) * r.x - Math.sin(angle) * r.y,
        about.y + Math.cos(angle) * r.y + Math.sin(angle) * r.x
      ),
    })
  }

  let theta = rect.props.rotation + angle

  update(rect, {
    rotation: geometry.normalizeAngle(theta),
  })

  rect.events.publish("rotate", { angle, about })
}

const unMirror = (rect: Rectangle) => {
  update(rect, {
    width: Math.abs(rect.props.width),
    height: Math.abs(rect.props.height),
  })
}

const update = (rect: Rectangle, udpates: Partial<RectProps>): void => {
  updateObject(rect.props, udpates)
  rect.path = getPath(rect.props)

  rect.events.publish("update", { udpates })

  return
}

const draw = (ctx: CanvasRenderingContext2D, rect: Rectangle) => {
  ctx.save()
  if (rect.props.rotation > 0) {
    ctx.translate(rect.props.center.x, rect.props.center.y)
    ctx.rotate(rect.props.rotation)
  }

  if (rect.props.fillColor !== undefined) {
    fill(ctx, rect.path, rect.props.fillColor, rect.props.opacity)
  }

  // let gradient = createRadialGradient(
  //   rect.props.center,
  //   Math.sqrt((rect.props.width / 2) ** 2 + (rect.props.height / 2) ** 2),
  //   rect.props.center,
  //   rect.props.width / 2 + rect.props.height / 2
  // )

  // let nearbyShade = tinycolor(rect.props.strokeColor as string)
  //   .spin(30)
  //   // .brighten(10)
  //   .toRgbString()

  // let gradient = createLinearGradient(
  //   vector.subtract(
  //     rect.props.center,
  //     vector.create(rect.props.width / 2, rect.props.height / 2)
  //   ),
  //   vector.add(
  //     rect.props.center,
  //     vector.create(rect.props.width / 2, rect.props.height / 2)
  //   )
  // )

  // if (gradient instanceof Error) return

  // gradient.addColorStop(0, rect.props.strokeColor as string)
  // gradient.addColorStop(0.7, nearbyShade) //"rgba(0, 0, 0, 1)")
  // gradient.addColorStop(1, rect.props.strokeColor as string)

  // ctx.fillStyle = gradient

  stroke(
    ctx,
    rect.path,
    // gradient,
    rect.props.strokeColor,
    rect.props.strokeWidth,
    rect.props.strokeStyle,
    rect.props.opacity,
    rect.props.lineDash
    // {
    //   shadowBlur: 15,
    //   shadowColor: "rgba(0,0,0,1)",
    //   shadowOffsetX: 5,
    //   shadowOffsetY: 5,
    // }
  )

  // let path = new Path2D(rect.path)
  // path.roundRect(
  //   rect.props.center.x - rect.props.width / 2 - 6,
  //   rect.props.center.y - rect.props.height / 2 - 6,
  //   rect.props.width + 12,
  //   rect.props.height + 12,
  //   rect.props.radii
  // )

  // fillTranslucent(
  //   ctx,
  //   path,
  //   rect.props.strokeColor,
  //   rect.props.opacity / 3,
  //   1,
  //   1.5
  // )

  if (rect.props.rotation > 0) {
  }

  ctx.restore()
}

const getPath = (rect: RectProps) => {
  let path = new Path2D()

  let radii =
    Math.log(Math.abs(rect.width) + Math.abs(rect.height) + 1) *
    rect.cornerRadii

  if (rect.rotation > 0) {
    path.roundRect(
      -rect.width / 2,
      -rect.height / 2,
      rect.width,
      rect.height,
      radii
    )
  } else {
    path.roundRect(
      rect.center.x - rect.width / 2,
      rect.center.y - rect.height / 2,
      rect.width,
      rect.height,
      radii
    )
  }

  return path
}

const isTypeOfRectProps = (props: any) => {
  return (
    Number.isFinite(props.center.x) &&
    Number.isFinite(props.center.y) &&
    Number.isFinite(props.width) &&
    Number.isFinite(props.height) &&
    Number.isFinite(props.rotation) &&
    Number.isFinite(props.cornerRadii) &&
    Number.isFinite(props.opacity) &&
    Number.isFinite(props.strokeWidth)
  )
}

export {
  create,
  copy,
  update,
  move,
  drag,
  scale,
  resize,
  rotate,
  unMirror,
  draw,
  getPath,
  isTypeOfRectProps,
}
