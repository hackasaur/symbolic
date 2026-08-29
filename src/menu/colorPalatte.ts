import tinycolor from "tinycolor2"
import * as pnl from "./panel.ts"
import * as btn from "./button.ts"
import * as vector from "../utils/vector.ts"
import * as arrange from "./arrange.ts"
import { Vector2D } from "../utils/vector.ts"
import { Panel } from "./panel.ts"
import { Rectangle } from "../utils/geometry.ts"
import { Button } from "./button.ts"
import { debugCtx2D, showPoint } from "../utils/debug.ts"

export interface ColorRgba {
  r: number
  g: number
  b: number
  a: number
}

// #NOTE2Self: Palatte should have its own interface instead of using Button/Panel
// The palatteButton and palatte should be a part of the interface
// TODO: palatte should show the last colors used

const create = (
  id: string,
  center: Vector2D,
  gap: number,
  hues: number,
  shades: number,
  padding: number,
  strokeColor: string | CanvasGradient,
  strokeWidth: number,
  bgColor: string | CanvasGradient,
  bgOpacity: number,
  palatteButtonDims: Vector2D,
  colorBtnDims: Vector2D,
  el: HTMLElement
): Button | Error => {
  let buttonWidth = colorBtnDims.x
  let buttonHeight = colorBtnDims.y
  let panelWidth = (buttonWidth + padding) * shades + padding
  let panelHeight = (buttonHeight + padding) * hues + padding
  let fontSize = 15

  let palatte = pnl.create({
    id: id,
    center: vector.copy(center),
    width: panelWidth,
    height: panelHeight,
    rotation: 0,
    font: "chalkboard",
    fontSize: fontSize,
    fontColor: "green",
    idleColor: bgColor,
    hoverColor: "white",
    opacity: bgOpacity,
    strokeWidth: 1,
    strokeColor: strokeColor,
    padding: 10,
    cornerRadii: 8,
    label: "main",
    shadow: undefined,
  })

  let color_hsl = { h: 0, s: 0, l: 0 }
  let colorPaletteColors: tinycolor.Instance[][] = []

  // create colors for the palatte and store them in colorPaletteColors matrix (shades x hues)
  for (let i = 0; i < hues; i++) {
    if (i > 0) {
      color_hsl.s = 1
    }

    let colors: tinycolor.Instance[] = []
    for (let j = 0; j < shades; j++) {
      if (i > 0) {
        color_hsl.l += 1 / (shades + 1)
      }

      let c = tinycolor(color_hsl)
      colors.push(c)

      if (i === 0) {
        color_hsl.l += 1 / shades
        if (j === shades - 2) {
          color_hsl.l = 1
        }
      }
    }

    colorPaletteColors.push(colors)
    color_hsl.h += 360 / (hues - 1)
    color_hsl.l = 0
  }

  let colorButtons: Button[] = []

  // create buttons for each color in the palatte (shades x hues)
  // these are arranged in a grid later
  for (let i = 0; i < hues; i++) {
    for (let j = 0; j < shades; j++) {
      let colorBtn = btn.create({
        id: colorPaletteColors[i][j].toRgbString(),
        center: vector.create(0, 0),
        width: buttonWidth,
        height: buttonHeight,
        rotation: 0,
        label: undefined,
        font: {
          font: "Arial",
          fontColor: "white",
          fontSize: fontSize,
          italic: false,
          bold: false,
        },
        icon: undefined,
        idleColor: colorPaletteColors[i][j].toRgbString(),
        hoverColor: colorPaletteColors[i][j].toRgbString(),
        toggledColor: colorPaletteColors[i][j].toRgbString(),
        opacity: 1,
        padding: 5,
        cornerRadii: 8,
      })

      if (colorBtn instanceof Error) return colorBtn

      colorButtons.push(colorBtn)
    }
  }

  // NOTE: an offset is added to the box's center so that the buttons aligns with the open animation
  // FIX: there should be a better way to do this. I wasted a day aligning the palatte
  let box: Rectangle = {
    center: vector.add(
      palatte.props.center,
      vector.create(palatte.props.width / 2, palatte.props.height / 2)
    ),
    width: palatte.props.width,
    height: palatte.props.height,
    rotation: 0,
  }

  arrange.inGrid(colorButtons, padding, box)

  pnl.addChildren(palatte, colorButtons)
  pnl.setDragable(palatte, false)

  let palatteButton = btn.create({
    id: "palatteButton",
    center: vector.copy(center),
    width: palatteButtonDims.x,
    height: palatteButtonDims.y,
    rotation: 0,
    label: undefined,
    font: {
      font: "Noteworthy",
      fontColor: "white",
      fontSize: fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: colorPaletteColors[0][0].toRgbString(),
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: colorPaletteColors[0][0].toRgbString(),
    strokeColor,
    strokeWidth,
    opacity: 1,
    padding: 5,
    cornerRadii: palatteButtonDims.x / 2,
  })

  if (palatteButton instanceof Error) return palatteButton

  palatteButton.events.register("colorChange")

  pnl.move(palatte, vector.add(center, vector.create(0, buttonHeight + gap)))

  btn.addChild(palatteButton, palatte)

  for (let colorButton of palatte.children) {
    colorButton.events.subscribe("clicked", () => {
      let color = colorButton.props.idleColor
      if (color === undefined) {
        color = "rgba(0,0,0,0)"
      }

      setColor(palatteButton, color)
      // btn.update(palatteButton, { idleColor: colorButton.props.idleColor })
      // btn.update(palatteButton, { toggledColor: colorButton.props.idleColor })
      // btn.toggle(palatteButton)
      // palatte.events.publish("close")
      // #FIX: colorChange is getting called twice here for some reason
      palatteButton.events.publish("colorChange")
      // console.trace(colorButton.props.id)
    })

    btn.handleInputsInflate(colorButton, el, 5)
  }

  return palatteButton
}

const setColor = (
  palatteButton: Button,
  color: string | CanvasGradient
): void => {
  btn.update(palatteButton, { idleColor: color })
  btn.update(palatteButton, { toggledColor: color })
}

export { create, setColor }
