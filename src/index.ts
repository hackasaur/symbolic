import * as txtbox from "./text/textbox"
import * as gl from "./utils/gl"
import * as renderer from "./renderer"
import * as vector from "./utils/vector"
import * as inputs from "./utils/inputs"
import * as inputHandler from "./inputHandler.ts"
import { SETTINGS } from "./settings"
import { TextAlignment } from "./text/text"

function main() {
  const [result, err] = gl.initializeCanvas("scene", "black")

  if (err != null || result === null) {
    console.error(err)
    return
  }

  let el = document.getElementById("canvas-container")

  if (el === null) {
    return
  }

  const { canvas, ctx } = result

  let t = {
    lines: [
      // text for debugging
      "NOTE abc",
      "The quick brown fox jumped over the lazy dog",
      "",
      "0123456789.<.>,;:/?|()[]{}-+=_*&^@!$%^&*~`",
      "言語",
      " — 2Bros. Inc.© 🚀",
    ],
    richTextInfos: [
      {
        lineNoPosition: { lineNo: 0, positionInLine: 0 },
        textFormat: {
          font: "American Typewriter",
          fontSize: 20,
          fontColor: "PowderBlue",
          italic: false,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 0 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 4 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "green",
          italic: true,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 15 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "skyblue",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 19 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "red",
          italic: true,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 26 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 36 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "yellow",
          italic: true,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 40 },
        textFormat: {
          font: "Arial",
          fontSize: 18,
          fontColor: "skyblue",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: { lineNo: 3, positionInLine: 0 },
        textFormat: {
          font: "Chalkboard",
          fontSize: 12,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 5, positionInLine: 0 },
        textFormat: {
          font: "Noteworthy",
          fontSize: 15,
          fontColor: "silver",
          italic: false,
          bold: false,
        },
      },
    ],
    center: vector.create(400, 200),
    width: 200,
    textCursorPosition: { lineNo: 0, positionInLine: 0 },
    textCursorWidth: SETTINGS.textbox.cursorWidth,
    linespace: SETTINGS.textbox.linespace,
    padding: SETTINGS.textbox.padding,
    rotation: 0,
    align: "Left" as TextAlignment,
    wordWrap: true,
    opacity: 1,
    selectionColor: SETTINGS.textbox.highlightColor,
    selectionRadii: SETTINGS.textbox.highlightRadii,
    boxAlign: "Center" as TextAlignment
  }

  let textbox: txtbox.Textbox　| Error = txtbox.create(t)
  if (textbox instanceof Error) {
    console.error(textbox)
    return
  }

  txtbox.initEventsHandler(textbox)
  let pointerEvents = inputs.createPointerEvents(el)
  let keyboardEvents = inputs.createKeyboardEvents()

  pointerEvents.subscribe("pointer", (pointerInput: inputs.PointerInput) => {
   inputHandler.handlePointerInput(textbox, pointerInput)
  })

  keyboardEvents.subscribe("key-down", (keyboardInput: inputs.KeyboardInput) => {
    let key = keyboardInput.key
    let modifiers = keyboardInput.modifiers
    modifiers["Control"] = keyboardInput.modifiers["Control"]
    modifiers["Shift"] = keyboardInput.modifiers["Shift"]
    modifiers["Alt"] = keyboardInput.modifiers["Alt"]
    modifiers["Meta"] = keyboardInput.modifiers["Meta"]

    if (textbox.typing) {
      textbox.events.publish("type", {
        key,
        modifiers,
        textFormat: undefined,
      })
    }
  })


  // let r = rect.create({
  //   center: vector.create(canvas.clientWidth / 2, canvas.clientHeight / 2),
  //   width: 200,
  //   height: textbox.height,
  //   rotation: 0,
  //   cornerRadii: SETTINGS.cornerRadii,
  //   strokeColor: SETTINGS.strokeColor,
  //   strokeWidth: SETTINGS.strokeWidth,
  //   strokeStyle: "solid",
  //   opacity: 1,
  // })

  // let trArgs: TransformerProps = {
  //   strokeColor: SETTINGS.transformer.strokeColor,
  //   strokeWidth: SETTINGS.transformer.strokeWidth,
  //   strokeStyle: "solid",
  //   arcRadius: SETTINGS.transformer.radius,
  //   squareRadius: SETTINGS.transformer.squareRadii,
  //   squareSize: SETTINGS.transformer.squareSize,
  //   gap: SETTINGS.transformer.gap,
  //   padding: SETTINGS.transformer.padding,
  //   edgeSize: SETTINGS.transformer.edgeSize,
  //   rotationSpeed: SETTINGS.transformer.rotationSpeed,
  // }

  // transformer.attach(r, trArgs, cam)

  // bind.anchorRegion.attach(r, {
  //   fillColor: SETTINGS.anchor.regionColor,
  //   opacity: SETTINGS.anchor.opacity,
  //   cornerRadii: SETTINGS.cornerRadii,
  //   gap: SETTINGS.anchor.regionGap,
  //   stickiness: SETTINGS.anchor.stickiness,
  //   duration: SETTINGS.anchor.duration,
  // })

  let mainLoop = renderer.startRenderLoop(
    ctx,
    canvas,
    el,
    textbox,
    () => {},
    true
  )
}

main()
