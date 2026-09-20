import * as vector from "../vector"
import * as gl from "../gl"
import * as geometry from "../geometry"
import * as inputs from "../inputs"
import * as anim from "../anim"
import * as btn from "./button"
import { pubSub, PubSub } from "../pubsub"
import { updateObject } from "../misc"
import { Vector2D } from "../vector"
import { PointerInput } from "../inputs"
import { Button } from "./button"
import { Easing, Tween, Group } from "@tweenjs/tween.js"

export interface PanelProps {
  id: string
  center: Vector2D
  width: number
  height: number
  rotation: number
  font: string
  fontSize: number
  fontColor: string | CanvasGradient
  idleColor: string | CanvasGradient
  opacity: number
  strokeWidth: number
  strokeColor: string | CanvasGradient
  hoverColor: string | CanvasGradient
  padding: number
  cornerRadii: number
  label: string
  shadow?: CanvasShadowStyles
}

interface Paths {
  [key: string]: Path2D
}

export interface Panel {
  type: "Panel"
  props: PanelProps
  center: Vector2D
  width: number
  height: number
  paths: Paths
  children: Button[]
  animations: { [key: string]: Tween<Object> }
  visible: boolean
  dragable: boolean
  events: PubSub
}

const create = (props: PanelProps): Panel => {
  let props_copy = {
    id: props.id,
    center: vector.copy(props.center),
    width: props.width,
    height: props.height,
    rotation: props.rotation,
    font: props.font,
    fontSize: props.fontSize,
    fontColor: props.fontColor,
    idleColor: props.idleColor,
    opacity: props.opacity,
    strokeWidth: props.strokeWidth,
    strokeColor: props.strokeColor,
    hoverColor: props.hoverColor,
    padding: props.padding,
    cornerRadii: props.cornerRadii,
    label: props.label,
    shadow: props.shadow ? { ...props.shadow } : undefined,
  }

  let paths = getPaths(props_copy)
  let events = pubSub([
    "move",
    "drag",
    "expand",
    "rotate",
    "update",
    "inflate",
    "deflate",
    "pointerenter",
    "pointerexit",
  ])

  let panel: Panel = {
    type: "Panel",
    props: props_copy,
    center: vector.copy(props_copy.center),
    width: props_copy.width,
    height: props_copy.height,
    children: [],
    paths,
    visible: true,
    dragable: false,
    animations: {},
    events,
  }

  return panel
}

const getPaths = (props: PanelProps): Paths => {
  const panelPath: Path2D = new Path2D()

  panelPath.roundRect(
    props.center.x - props.width / 2,
    props.center.y - props.height / 2,
    props.width,
    props.height,
    props.cornerRadii
  )

  return {
    panel: panelPath,
  }
}

const draw = (ctx: CanvasRenderingContext2D, panel: Panel): void => {
  const { props, paths } = panel

  if (panel.visible) {
    if (props.opacity === 1) {
      gl.fill(
        ctx,
        paths.panel,
        props.idleColor,
        props.opacity,
        "evenodd",
        props.shadow
      )
    } else {
      let gradient = ctx.createLinearGradient(
        props.center.x - props.width / 2,
        props.center.y, // - props.height / 2,
        props.center.x + props.width / 2,
        props.center.y // + props.height / 2
      )

      gradient.addColorStop(0, "rgb(150, 150, 150)")
      gradient.addColorStop(0.45, "rgb(225, 225, 225)")
      gradient.addColorStop(0.55, "rgb(225, 225, 225)")
      gradient.addColorStop(1, "rgb(150, 150, 150)")

      ctx.filter = "blur 3px"
      gl.stroke(
        ctx,
        paths.panel,
        gradient, //props.strokeColor,
        props.strokeWidth,
        "solid",
        1,
        undefined,
        panel.props.shadow
      )

      gl.fillTranslucent(
        ctx,
        paths.panel,
        props.idleColor,
        props.opacity,
        1.2,
        2,
        {
          minX: props.center.x - props.width / 2,
          maxX: props.center.x + props.width / 2,
          minY: props.center.y - props.height / 2,
          maxY: props.center.y + props.height / 2,
        }
        // panel.props.shadow
      )
    }

    for (let element of panel.children) {
      if (element.type === "Button") {
        btn.draw(ctx, element)
      }
    }
  }

  for (let animation in panel.animations) {
    if (!anim.isPlaying(panel, animation)) continue
    anim.update(panel, animation)
  }
}

const update = (panel: Panel, args: any): void => {
  updateObject(panel.props, args)
  panel.paths = getPaths(panel.props)

  panel.events.publish("update", { args })

  return
}

const expand = (panel: Panel, delta: Vector2D): void => {
  update(panel, {
    width: panel.props.width + delta.x,
    height: panel.props.height + delta.y,
  })

  panel.events.publish("expand", { delta })
}

const rotate = (panel: Panel, angle: number): void => {
  let theta = panel.props.rotation + angle

  update(panel, {
    rotation: geometry.normalizeAngle(theta),
  })

  panel.events.publish("rotate", { angle })
}

const move = (panel: Panel, coords: Vector2D): void => {
  let delta = vector.subtract(coords, panel.props.center)
  update(panel, { center: vector.copy(coords) })

  for (let el of panel.children) {
    btn.drag(el, delta)
  }

  panel.events.publish("move", { coords })
}

const drag = (panel: Panel, delta: Vector2D): void => {
  let coords = vector.add(panel.props.center, delta)
  update(panel, { center: coords })

  for (let el of panel.children) {
    btn.drag(el, delta)
  }

  panel.events.publish("drag", { delta })

  return
}

const areCoordsInside = (panel: Panel, coords: Vector2D): boolean => {
  return geometry.areCoordsInsideBox(coords, panel.props)
}

const addChildren = (panel: Panel, elements: Button[], fit?: boolean) => {
  panel.children.push(...elements)

  if (fit) {
    let points: Vector2D[] = []
    for (let el of panel.children) {
      points.push(
        vector.subtract(
          el.props.center,
          vector.create(el.props.width / 2, el.props.height / 2)
        )
      )
      points.push(
        vector.add(
          el.props.center,
          vector.create(el.props.width / 2, el.props.height / 2)
        )
      )
    }

    let box = geometry.getBoundingBox(points)

    update(panel, {
      width: box.width + 2 * panel.props.padding,
      height: box.height + panel.props.padding,
    })
  }
}

const setVisible = (panel: Panel, state: boolean, children = false) => {
  panel.visible = state

  if (children) {
    for (let button of panel.children) {
      btn.setVisible(button, state, children)
    }
  }
}

const setDragable = (panel: Panel, state: boolean) => {
  panel.dragable = state
}

const handleInputs = (panel: Panel, el: HTMLElement): void => {
  let pointerEvents = inputs.createPointerEvents(el)
  let inside = false
  let dragging = false

  // FIX: panel doesn't inflate when it opens and the coords come inside the panel

  panel.events.subscribe("pointerenter", () => {
    if (anim.isPlaying(panel, "open") || anim.isPlaying(panel, "close")) {
      inside = true
      return
    }

    anim.stop(panel, "deflate")
    anim.play(panel, "inflate")
    inside = true
  })

  panel.events.subscribe("pointerexit", () => {
    if (anim.isPlaying(panel, "open") || anim.isPlaying(panel, "close")) {
      inside = false
      return
    }

    anim.stop(panel, "inflate")
    anim.play(panel, "deflate")
    inside = false
  })

  const penmove = (pointerData: PointerInput) => {
    if (!panel.visible) return

    let delta = pointerData.delta
    if (dragging && panel.dragable) {
      drag(panel, delta)
    }

    coords = pointerData.coords
    let coordsInside = areCoordsInside(panel, coords)
    if (coordsInside && !inside) {
      panel.events.publish("pointerenter")
    } else if (!coordsInside && inside) {
      panel.events.publish("pointerexit")
    }
  }

  const penup = (pointerData: PointerInput) => {
    dragging = false
  }

  const pendown = (pointerData: PointerInput) => {
    let delta = pointerData.delta
    if (areCoordsInside(panel, pointerData.coords)) {
      dragging = true
    }
  }

  pointerEvents.subscribe("pointer-down", (pointerData: PointerInput) => {
    pendown(pointerData)
  })

  pointerEvents.subscribe("pointer-move", (pointerData: PointerInput) => {
    penmove(pointerData)
  })

  pointerEvents.subscribe("pointer-up", (pointerData: PointerInput) => {
    penup(pointerData)
  })

  let coords = vector.create(0, 0)

  panel.events.subscribe("update", () => {
    let coordsInside = areCoordsInside(panel, coords)
    if (coordsInside && !inside) {
      panel.events.publish("pointerenter")
      inside = true
    } else if (!coordsInside && inside) {
      panel.events.publish("pointerexit")
      inside = false
    }
  })
}

export {
  create,
  draw,
  expand,
  drag,
  move,
  rotate,
  update,
  areCoordsInside,
  handleInputs,
  addChildren,
  setVisible,
  setDragable,
}
