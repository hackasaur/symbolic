import * as vector from "../utils/vector.ts"
import * as gl from "../utils/gl.ts"
import * as geometry from "../utils/geometry.ts"
import * as pnl from "./panel.ts"
import { pubSub, PubSub } from "../utils/pubsub.ts"
import { Vector2D } from "../utils/vector.ts"
import { updateObject } from "../utils/misc.ts"
import { Easing, Tween } from "@tweenjs/tween.js"
import * as inputs from "../utils/inputs.ts"
import * as anim from "../utils/anim.ts"
import { PointerInput } from "../utils/inputs.ts"
import { TextFormat } from "../utils/gl.ts"
import { Panel } from "./panel.ts"
import tinycolor from "tinycolor2"

// #TODO: toogling should change icon of the button
export interface ButtonProps {
  id: string
  center: Vector2D
  width: number
  height: number
  rotation: number
  font: TextFormat
  label?: string
  icon?: HTMLImageElement
  idleColor?: string | CanvasGradient
  hoverColor?: string | CanvasGradient
  toggledColor?: string | CanvasGradient
  strokeColor?: string | CanvasGradient
  strokeWidth?: number
  opacity: number
  padding: number
  cornerRadii: number
}

export interface Button {
  type: "Button"
  props: ButtonProps
  events: PubSub
  animations: { [key: string]: Tween<Object> }
  toggled: boolean
  hover: boolean
  opacity: number
  hoverOpacity: number
  visible: boolean
  path: Path2D
  children: Panel[]
}

const create = (props: ButtonProps): Button | Error => {
  const props_copy: ButtonProps = {
    id: props.id,
    center: props.center,
    width: props.width,
    height: props.height,
    rotation: props.rotation,
    label: props.label,
    icon: props.icon,
    font: props.font,
    padding: props.padding,
    cornerRadii: props.cornerRadii,
    idleColor: props.idleColor,
    hoverColor: props.hoverColor,
    toggledColor: props.toggledColor,
    strokeColor: props.strokeColor ? props.strokeColor : undefined,
    strokeWidth: props.strokeWidth ? props.strokeWidth : undefined,
    opacity: props.opacity,
  }

  let events = pubSub([
    "move",
    "drag",
    "pressed",
    "hover",
    "clicked",
    "pointerenter",
    "pointerexit",
    "update",
  ])

  let width = 0
  let height = 0
  let path = new Path2D()

  if (props_copy.icon) {
    props_copy.icon.onload = () => {
      // udpate the width and height when image is loaded
      if (props_copy.icon === undefined) {
        return
      }

      width = Math.max(props_copy.icon.width, props_copy.icon.width)

      height = Math.max(props_copy.icon.height, props_copy.icon.height)

      if (width > props_copy.width) {
        props_copy.width = width
      }

      if (height > props_copy.height) {
        props_copy.height = height
      }
    }
  } else if (props_copy.label) {
    let textMetrics = gl.measureText(props_copy.label, props_copy.font)
    if (textMetrics instanceof Error) return textMetrics

    width = textMetrics.width
    height = textMetrics.fontBoundingBoxAscent

    if (width > props_copy.width) {
      props_copy.width = width + props_copy.padding
    }

    if (height > props_copy.height) {
      props_copy.height = height + props_copy.padding
    }
  }

  path = getPath(props_copy)

  let button: Button = {
    type: "Button",
    props: props_copy,
    opacity: props_copy.opacity,
    hoverOpacity: 0,
    events,
    animations: {},
    toggled: false,
    hover: false,
    visible: true,
    path,
    children: [],
  }

  return button
}

const move = (button: Button, coords: Vector2D): void => {
  let delta = vector.subtract(coords, button.props.center)
  update(button, { center: vector.copy(coords) })

  for (let el of button.children) {
    pnl.drag(el, delta)
  }

  button.events.publish("move", { coords })
}

const drag = (button: Button, delta: Vector2D): void => {
  let coords = vector.add(button.props.center, delta)
  update(button, { center: coords })

  for (let child of button.children) {
    pnl.drag(child, delta)
  }

  button.events.publish("drag", { delta })
}

const draw = (ctx: CanvasRenderingContext2D, button: Button) => {
  if (button.visible) {
    let path = button.path
    ctx.save()

    // idle
    if (!button.toggled && button.props.idleColor !== undefined) {
      ctx.globalAlpha = button.opacity
      ctx.fillStyle = button.props.idleColor
      ctx.fill(path)
    }

    // toggle
    if (button.toggled && button.props.toggledColor !== undefined) {
      ctx.globalAlpha = button.opacity
      ctx.fillStyle = button.props.toggledColor
      ctx.fill(path)
    }

    // hover
    if (button.hover && button.props.hoverColor !== undefined) {
      ctx.globalAlpha = button.hoverOpacity
      ctx.fillStyle = button.props.hoverColor
      ctx.fill(path)
    }

    if (
      button.props.strokeColor !== undefined &&
      button.props.strokeWidth !== undefined
    ) {
      ctx.globalAlpha = button.opacity
      ctx.strokeStyle = button.props.strokeColor
      ctx.lineWidth = button.props.strokeWidth
      ctx.stroke(path)
    }

    ctx.globalAlpha = button.opacity
    if (button.props.icon) {
      let width = 0
      let height = 0
      let icon = button.props.icon
      width = button.props.icon.width
      height = button.props.icon.height
      ctx.drawImage(
        icon,
        button.props.center.x - width / 2,
        button.props.center.y - height / 2
      )
    } else if (button.props.label) {
      ctx.fillStyle = button.props.font.fontColor
      ctx.font = `${button.props.font.fontSize}px ${button.props.font}`

      let textMetrics = gl.measureText(button.props.label, button.props.font)
      if (textMetrics instanceof Error) {
        return textMetrics
      }

      let width = textMetrics.width
      let height = textMetrics.actualBoundingBoxAscent

      if (width < button.props.width) {
        gl.fillText(
          ctx,
          vector.create(
            button.props.center.x - width / 2,
            button.props.center.y + height / 2
          ),
          button.props.label,
          button.opacity,
          button.props.font
        )
      } else {
        gl.fillText(
          ctx,
          vector.create(
            button.props.center.x - button.props.width / 2,
            button.props.center.y + height / 2
          ),
          button.props.label,
          button.opacity,
          button.props.font
        )
      }
    }

    ctx.restore()
  }

  for (let child of button.children) {
    pnl.draw(ctx, child)
  }

  for (let animation in button.animations) {
    if (!anim.isPlaying(button, animation)) continue
    anim.update(button, animation)
  }
}

const areCoordsInside = (button: Button, coords: Vector2D) => {
  if (!button.visible) return false

  let box = {
    center: button.props.center,
    width: button.props.width, // + 2 * button.props.padding,
    height: button.props.height, // + 2 * button.props.padding,
    rotation: button.props.rotation,
  }

  return geometry.areCoordsInsideBox(coords, box)
}

const toggle = (button: Button) => {
  if (!button.toggled) {
    button.toggled = true
  } else if (button.toggled) {
    button.toggled = false
  }
}

const setVisible = (button: Button, state: boolean, children = false) => {
  button.visible = state
  for (let panel of button.children) {
    pnl.setVisible(panel, state, children)
  }
}

const update = (button: Button, updates: any) => {
  updateObject(button.props, updates)

  if (updates.label && button.props.label) {
    let textMetrics = gl.measureText(button.props.label, button.props.font)
    if (textMetrics instanceof Error) return textMetrics

    let width = textMetrics.width
    let height = textMetrics.fontBoundingBoxAscent

    if (width > button.props.width) {
      button.props.width = width
    }

    if (height > button.props.height) {
      button.props.height = height
    }
  }

  button.path = getPath(button.props)
  button.events.publish("update", updates)
}

const getPath = (props: ButtonProps): Path2D => {
  let path: Path2D = new Path2D()

  path.roundRect(
    props.center.x - props.width / 2, //- props.padding,
    props.center.y - props.height / 2, // - props.padding,
    props.width,
    props.height,
    props.cornerRadii
  )

  return path
}

const addChild = (button: Button, element: Panel): void => {
  button.children.push(element)
}

const switchTo = (buttons: Button[], targetButton: Button): void | Error => {
  let index = buttons.indexOf(targetButton)

  if (index === -1) return Error(`buttons array does not contain the button`)

  for (let button of buttons) {
    if (button == targetButton) {
      if (!targetButton.toggled) {
        toggle(targetButton)
      }
      continue
    }

    if (button.toggled) {
      toggle(button)
    }
  }
}

const handleInputs = (button: Button, el: HTMLElement) => {
  let pointerEvents = inputs.createPointerEvents(el)
  let events = button.events
  let pressed = false
  let props = button.props

  let hoverFadeIn = new Tween(button)
    .to({
      hoverOpacity: 1,
    })
    .duration(400)
    .easing(Easing.Sinusoidal.Out)
    .onStart(() => {
      button.hover = true
    })

  let hoverFadeOut = new Tween(button)
    .to({
      hoverOpacity: 0,
    })
    .easing(Easing.Sinusoidal.Out)
    .onComplete(() => {
      button.hover = false
    })

  anim.add(button, "hoverFadeIn", hoverFadeIn)
  anim.add(button, "hoverFadeOut", hoverFadeOut)

  const penmove = (pointerData: PointerInput) => {
    if (!button.visible) return
    let coords = pointerData.coords

    if (areCoordsInside(button, coords)) {
      // pointer is inside but hover is set to false
      if (!anim.isPlaying(button, "hoverFadeIn")) {
        events.publish("pointerenter")
        if (anim.isPlaying(button, "hoverFadeOut")) {
          anim.stop(button, "hoverFadeOut")
        }
        anim.play(button, "hoverFadeIn")
      }
      events.publish("hover")
    }
    // pointer is outside but hover is set to true
    else if (!areCoordsInside(button, coords)) {
      if (!anim.isPlaying(button, "hoverFadeOut")) {
        events.publish("pointerexit")
        if (anim.isPlaying(button, "hoverFadeIn")) {
          anim.stop(button, "hoverFadeIn")
        }
        anim.play(button, "hoverFadeOut")

        if (!button.toggled) {
        } else {
          // button.fillColor = props.toggledColor
        }
      }
    }
  }

  const penup = (pointerData: PointerInput) => {
    if (!button.visible) return
    let coords = pointerData.coords

    if (pressed) {
      if (areCoordsInside(button, coords) && pointerData.pressedTime < 300) {
        events.publish("clicked")
      }
      pressed = false

      if (
        button.props.hoverColor === undefined ||
        button.props.hoverColor instanceof CanvasGradient
      ) {
        return
      }

      let hoverColor = tinycolor(button.props.hoverColor).lighten(10)
      update(button, { hoverColor: hoverColor.toRgbString() })
    }
  }

  const pendown = (pointerData: PointerInput) => {
    if (!button.visible) return

    let coords = pointerData.coords
    if (areCoordsInside(button, coords)) {
      pressed = true
      button.events.publish("pressed")

      if (
        button.props.hoverColor === undefined ||
        button.props.hoverColor instanceof CanvasGradient
      ) {
        return
      }

      let hoverColor = tinycolor(button.props.hoverColor).darken(10)
      update(button, { hoverColor: hoverColor.toRgbString() })
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
}

const handleInputsInflate = (
  button: Button,
  el: HTMLElement,
  inflateDelta: number
) => {
  let pointerEvents = inputs.createPointerEvents(el)
  let events = button.events
  let pressed = false
  let props = {
    width: button.props.width,
    height: button.props.height,
  }

  // TODO: remove magic numbers
  let hoverInflate = new Tween(props)
    .to({
      width: props.width + inflateDelta,
      height: props.height + inflateDelta,
    })
    .duration(400)
    .easing(Easing.Sinusoidal.Out)
    .onStart(() => {
      button.hover = true
    })
    .onUpdate(() => {
      update(button, props)
    })

  let hoverDeflate = new Tween(props)
    .to({
      width: props.width,
      height: props.height,
    })
    .duration(400)
    .easing(Easing.Sinusoidal.Out)
    .onStart(() => {
      button.hover = true
    })
    .onUpdate(() => {
      update(button, props)
    })

  anim.add(button, "hoverInflate", hoverInflate)
  anim.add(button, "hoverDeflate", hoverDeflate)

  const penmove = (pointerData: PointerInput) => {
    if (!button.visible) return
    let coords = pointerData.coords

    if (areCoordsInside(button, coords)) {
      // pointer is inside but hover is set to false
      if (!button.hover) {
        events.publish("pointerenter")
        // button.hover = true
        if (anim.isPlaying(button, "hoverDeflate")) {
          anim.stop(button, "hoverDeflate")
        }
        anim.play(button, "hoverInflate")
      }
      events.publish("hover")
    }
    // pointer is outside but hover is set to true
    else if (!areCoordsInside(button, coords)) {
      if (button.hover) {
        events.publish("pointerexit")
        // button.hover = false
        if (anim.isPlaying(button, "hoverInflate")) {
          anim.stop(button, "hoverInflate")
        }

        anim.play(button, "hoverDeflate")
      }
    }
  }

  // const penup = (pointerData: PointerInfo) => {
  //   if (!button.visible) return
  //   let coords = pointerData.coords

  //   if (pressed) {
  //     if (areCoordsInside(button, coords) && pointerData.pressedTime < 300) {
  //       // events.publish("clicked")
  //     }
  //     pressed = false
  //   }
  // }

  // const pendown = (pointerData: PointerInfo) => {
  //   if (!button.visible) return

  //   let coords = pointerData.coords
  //   if (areCoordsInside(button, coords)) {
  //     pressed = true
  //     button.events.publish("pressed")
  //   }
  // }
  //
  // pointerEvents.subscribe("pointer-down", (pointerData: PointerInfo) => {
  //   pendown(pointerData)
  // })

  pointerEvents.subscribe("pointer-move", (pointerData: PointerInput) => {
    penmove(pointerData)
  })

  // pointerEvents.subscribe("pointer-up", (pointerData: PointerInfo) => {
  //   penup(pointerData)
  // })
}

export {
  create,
  drag,
  move,
  draw,
  areCoordsInside,
  toggle,
  update,
  setVisible,
  addChild,
  switchTo,
  handleInputs,
  handleInputsInflate,
}
