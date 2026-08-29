/*
 * textbox related stuff...
 */

import * as vector from "../utils/vector.ts"
import * as geometry from "../utils/geometry.ts"
import * as gl from "../utils/gl.ts"
import * as txt from "./text.ts"
import * as inputs from "../utils/inputs.ts"
import { updateObject } from "../utils/misc.ts"
import { Vector2D } from "../utils/vector.ts"
import { PubSub, pubSub } from "../utils/pubsub.ts"
import { ModifierKeys } from "../utils/inputs.ts"
import {
  TextCursor,
  RichTextInfo,
  LineNoPosition,
  TextAlignment,
  TextFormat,
} from "./text.ts"
import { SETTINGS } from "../../settings.js"

export interface TextFieldProps {
  center: Vector2D
  lines: string[]
  richTextInfos: RichTextInfo[]
  linespace: number
  padding: number
  textCursorPosition: LineNoPosition
  textCursorWidth: number
  align: TextAlignment
  width: number
  rotation: number
  opacity: number
  bgColor: string
  borderColor: string
  borderThickness: number
  cornerRadii: number
}

// #NOTE: posA does not necessarily come before posB
// #Suboptimal: store line heights instead of calculating total height again each time
export interface Textfield {
  type: "Textfield"
  selected: boolean
  props: TextFieldProps
  typing: boolean
  selectedTextPos: {
    selected: boolean
    posA: LineNoPosition
    posB: LineNoPosition
  }
  initialLineNoPos: LineNoPosition | undefined // #Q: what is this for?
  height: number
  textCoords: Vector2D
  arrowUpDownWidth: number | undefined // the width from previous line when navigating using up/down arrows
  textHeight: number // total height of the whole text
  textWidth: number // total width of the whole text
  textCursor: TextCursor | undefined
  richTextInfoClipboard: RichTextInfo[]
  events: PubSub
}

const create = (props: TextFieldProps): Textfield | Error => {
  let lines: string[] = [...props.lines]
  let richTextInfos: RichTextInfo[] = txt.cloneRichTextInfos(
    props.richTextInfos
  )

  let height: number = 0

  let textHeight = txt.totalHeight(lines, richTextInfos, props.linespace)
  let textWidth = txt.longestLineWidth(lines, richTextInfos)

  if (textWidth instanceof Error) return textWidth

  // textBox height cannot be less than textHeight
  // TODO: the height of the textbox should be determined solely by the text
  height = textHeight

  let textCoords = vector.create(
    props.center.x - props.width / 2,
    props.center.y - height / 2
  )

  props.textCursorPosition = { lineNo: 0, positionInLine: 0 }

  let textbox: Textfield = {
    type: "Textfield",
    selected: false,
    props: {
      center: vector.copy(props.center),
      lines: [...props.lines],
      richTextInfos: txt.cloneRichTextInfos(props.richTextInfos),
      linespace: props.linespace,
      padding: props.padding,
      textCursorPosition: { ...props.textCursorPosition },
      textCursorWidth: props.textCursorWidth,
      align: props.align,
      width: props.width,
      rotation: props.rotation,
      opacity: props.opacity,
      bgColor: props.bgColor,
      borderColor: props.borderColor,
      borderThickness: props.borderThickness,
      cornerRadii: props.cornerRadii,
    },
    typing: false,
    selectedTextPos: {
      selected: false,
      posA: { lineNo: 0, positionInLine: 0 },
      posB: { lineNo: 0, positionInLine: 0 },
    },
    height: height,
    textCoords: textCoords,
    initialLineNoPos: undefined,
    arrowUpDownWidth: 0,
    textHeight: textHeight,
    textWidth: textWidth,
    textCursor: undefined,
    richTextInfoClipboard: [],
    events: pubSub([]),
  }

  let coords = txt.lineNoPositionToCoords(
    vector.create(textCoords.x, textCoords.y),
    props.textCursorPosition,
    props.linespace,
    textbox.props.lines,
    textbox.props.richTextInfos,
    textbox.props.align,
    textbox.textWidth
  )

  if (coords instanceof Error) return coords

  let textFormat = txt.textFormatFromLineNoPosition(
    props.textCursorPosition,
    props.richTextInfos
  )

  if (textFormat instanceof Error) return textFormat

  let textCursor = txt.createTextCursor(
    coords,
    textbox.props.textCursorWidth,
    textFormat
  )

  textbox.textCursor = textCursor

  textbox.events = pubSub([
    "add",
    "remove",
    "select",
    "select-word",
    "select-line",
    "place-cursor",
    "opEnd",
    "deselect",
    "type",
    "resizeWidth",
    "drag",
    "update",
    "wrapUpdated",
    "changedTextFormat",
  ])

  return textbox
}

const initEventHandler = (textfield: Textfield, debug?: boolean) => {
  let textfieldEvents = textfield.events

  textfieldEvents.subscribe("select", (pointerCoords: Vector2D) => {
    if (!textfield.typing) {
      return
    }

    let textCursor = textfield.textCursor
    if (textCursor === undefined) return
    // let textHeight = textfield.textHeight

    if (textfield.initialLineNoPos === undefined) {
      //for initializing selection, the pointer coords have to be inside
      if (!areCoordsInside(pointerCoords, textfield)) {
        return
      }

      textfield.initialLineNoPos = { ...textfield.props.textCursorPosition } //lineNoPos
      textfield.selectedTextPos.posA = textfield.initialLineNoPos
      textfield.selectedTextPos.selected = true
    }

    let lineNoPos: LineNoPosition | Error
    let textCoords = textfield.textCoords

    if (textfield.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )

      if (lineNoPos instanceof Error) {
        console.error(lineNoPos)
        return lineNoPos
      }
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textfield.props.rotation,
        textfield.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )
    }

    if (lineNoPos instanceof Error) {
      console.error(lineNoPos)
      return lineNoPos
    }

    if (lineNoPos.lineNo === -1) {
      //if outside and above textBox select till the beginning of text
      // if (pointerCoords.y < textCoords.y) {
      //   lineNoPos.lineNo = 0
      //   lineNoPos.positionInLine = 0
      // }
      // //outside and below textBox
      // else {
      //   lineNoPos.lineNo = textbox.props.lines.length - 1
      //   lineNoPos.positionInLine =
      //     textbox.props.lines[textbox.props.lines.length - 1].length
      // }
      //
      return
    }

    // when pointer is within the height of the textbox but not within the width
    else if (lineNoPos.positionInLine === -1) {
      lineNoPos.positionInLine = textfield.props.lines[lineNoPos.lineNo].length
    }

    textfield.selectedTextPos.posB = { ...lineNoPos }
    textfield.props.textCursorPosition = { ...lineNoPos }
    updateTextCursor(textfield)
  })

  textfieldEvents.subscribe("place-cursor", (pointerCoords: Vector2D) => {
    if (!textfield.typing) {
      return
    }

    let textCursor = textfield.textCursor
    if (textCursor === undefined) return

    if (!areCoordsInside(pointerCoords, textfield)) {
      return
    }

    // if pointerdown move textCursor to the position of the Pointer
    let lineNoPos: LineNoPosition | Error
    let textCoords = textfield.textCoords

    if (textfield.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textfield.props.rotation,
        textfield.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )
    }

    if (lineNoPos instanceof Error) {
      console.error(lineNoPos)
      return lineNoPos
    }

    if (lineNoPos.lineNo === -1) {
      return
    }
    if (lineNoPos.positionInLine === -1) {
      lineNoPos.positionInLine = textfield.props.lines[lineNoPos.lineNo].length
    }

    textfield.props.textCursorPosition = lineNoPos

    updateTextCursor(textfield)
    textCursor.resetBlinkCycle()

    textfieldEvents.publish("deselect")
  })

  textfieldEvents.subscribe("select-word", (pointerCoords: Vector2D) => {
    if (!textfield.typing) {
      return
    }

    let textCursor = textfield.textCursor
    if (textCursor === undefined) return

    if (!areCoordsInside(pointerCoords, textfield)) {
      return
    }

    // if pointerdown move textCursor to the position of the Pointer
    let lineNoPos: LineNoPosition | Error
    let textCoords = textfield.textCoords

    if (textfield.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )

      if (lineNoPos instanceof Error) return lineNoPos
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textfield.props.rotation,
        textfield.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )

      if (lineNoPos instanceof Error) {
        console.error(lineNoPos)
        return lineNoPos
      }
    }

    if (lineNoPos.lineNo === -1) {
      return
    }
    if (lineNoPos.positionInLine === -1) {
      lineNoPos.positionInLine = textfield.props.lines[lineNoPos.lineNo].length
    }

    let lengthOfLine = textfield.props.lines[lineNoPos.lineNo].length

    let start = textfield.props.lines[lineNoPos.lineNo]
      .slice(0, lineNoPos.positionInLine)
      .search(/[\s](?=[^\s]*$)/u)

    let end = textfield.props.lines[lineNoPos.lineNo]
      .slice(lineNoPos.positionInLine)
      .search(/[\s]/gu)

    // if there is no whitespace i.e this is the last word or the only word in the line
    if (end === -1) {
      end = lengthOfLine - lineNoPos.positionInLine
    }

    start += 1
    end = lineNoPos.positionInLine + end

    textfield.selectedTextPos.selected = true
    textfield.selectedTextPos.posA = {
      lineNo: lineNoPos.lineNo,
      positionInLine: start,
    }
    textfield.selectedTextPos.posB = {
      lineNo: lineNoPos.lineNo,
      positionInLine: end,
    }

    textfield.props.textCursorPosition.lineNo = lineNoPos.lineNo
    textfield.props.textCursorPosition.positionInLine = end

    updateTextCursor(textfield)
    textCursor.resetBlinkCycle()
  })

  textfieldEvents.subscribe("select-line", (pointerCoords: Vector2D) => {
    if (!textfield.typing) {
      return
    }

    let textCursor = textfield.textCursor
    if (textCursor === undefined) return

    if (!areCoordsInside(pointerCoords, textfield)) {
      return
    }

    // if pointerdown move textCursor to the position of the Pointer
    let lineNoPos: LineNoPosition | Error
    let textCoords = textfield.textCoords

    if (textfield.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )

      if (lineNoPos instanceof Error) return lineNoPos
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textfield.props.rotation,
        textfield.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textfield.props.lines,
        textfield.props.richTextInfos,
        textfield.props.linespace,
        textfield.props.align,
        textfield.textWidth
      )

      if (lineNoPos instanceof Error) {
        console.error(lineNoPos)
        return lineNoPos
      }
    }

    if (lineNoPos.lineNo === -1) {
      return
    }
    if (lineNoPos.positionInLine === -1) {
      lineNoPos.positionInLine = textfield.props.lines[lineNoPos.lineNo].length
    }

    let lengthOfLine = textfield.props.lines[lineNoPos.lineNo].length

    textfield.selectedTextPos.selected = true
    textfield.selectedTextPos.posA = {
      lineNo: lineNoPos.lineNo,
      positionInLine: 0,
    }

    textfield.selectedTextPos.posB = {
      lineNo: lineNoPos.lineNo,
      positionInLine: lengthOfLine,
    }

    textfield.props.textCursorPosition.lineNo = lineNoPos.lineNo
    textfield.props.textCursorPosition.positionInLine = lengthOfLine

    updateTextCursor(textfield)
    textCursor.resetBlinkCycle()
  })

  textfieldEvents.subscribe("deselect", () => {
    textfield.selectedTextPos.selected = false
    textfield.initialLineNoPos = undefined
  })

  textfieldEvents.subscribe(
    "type",
    (signal: {
      key: string
      modifiers: ModifierKeys
      textFormat: TextFormat | undefined
    }) => {
      if (!textfield.typing) {
        return
      }

      if (debug) {
        console.log("-----event: type-----")
        console.log(
          "textCursor:",
          textfield.props.textCursorPosition.lineNo,
          textfield.props.textCursorPosition.positionInLine
        )

        console.log("textbox.props.richTextInfos=")

        let i = 0
        for (let rti of textfield.props.richTextInfos) {
          console.log(
            i,
            rti.lineNoPosition.lineNo,
            rti.lineNoPosition.positionInLine,
            rti.textFormat
          )
          i++
        }

        console.log("-----")

        console.log("textbox.props.lines=")
        i = 0
        for (let line of textfield.props.lines) {
          console.log(i, line, line.length)
          i++
        }
      }

      let textCursor = textfield.textCursor
      if (textCursor === undefined) return

      const modifierPressed: boolean =
        signal.modifiers["Control"] ||
        signal.modifiers["Alt"] ||
        signal.modifiers["Shift"] ||
        signal.modifiers["Meta"]

      const onlyShift: boolean =
        !signal.modifiers["Control"] &&
        !signal.modifiers["Alt"] &&
        !signal.modifiers["Meta"] &&
        signal.modifiers["Shift"]

      const onlyCtrl: boolean =
        signal.modifiers["Control"] &&
        !signal.modifiers["Alt"] &&
        !signal.modifiers["Shift"]

      const bothCtrlShift: boolean =
        (signal.modifiers["Alt"] && signal.modifiers["Shift"]) || // for mac: option + shift
        (signal.modifiers["Control"] && signal.modifiers["Shift"])

      const textIsSelected: boolean = textfield.selectedTextPos.selected

      // mac modifer keys
      const onlyOption: boolean =
        signal.modifiers["Alt"] &&
        !signal.modifiers["Control"] &&
        !signal.modifiers["Shift"] &&
        !signal.modifiers["Meta"]

      const onlyMeta: boolean =
        signal.modifiers["Meta"] &&
        !signal.modifiers["Control"] &&
        !signal.modifiers["Alt"] &&
        !signal.modifiers["Shift"]

      let key = signal.key
      if (debug) {
        console.log("key pressed=", key)
      }

      // typing characters
      if (
        !txt.nonCharacterKeys.includes(key) &&
        (!modifierPressed || onlyShift)
      ) {
        // remove text that is already selected
        if (textIsSelected) {
          let { start } = txt.sortLineNoPositions(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB
          )
          textfield.props.textCursorPosition = { ...start }
          remove(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB,
            textfield
          )
          textfield.selectedTextPos.selected = false
        }

        let pos =
          txt.lineNoPositionToPosition(
            textfield.props.textCursorPosition,
            textfield.props.lines,
            [true]
          ) + 1

        let lineNoPosition = { ...textfield.props.textCursorPosition }

        if (signal.textFormat) {
          add(
            key,
            lineNoPosition,
            [
              {
                lineNoPosition: { lineNo: 0, positionInLine: 0 },
                textFormat: signal.textFormat,
              },
            ],
            textfield,
            debug
          )
        } else {
          add(key, lineNoPosition, [], textfield, debug)
        }

        let textCursorPosition = txt.positionToLineNoPosition(
          pos,
          textfield.props.lines,
          [true]
        )

        if (textCursorPosition instanceof Error) {
          console.error(textCursorPosition)
          return textCursorPosition
        }

        // NOTE: textCursorPosition cannot be updated before add()
        // as the lineoNoPosition is different after adding
        textfield.props.textCursorPosition = textCursorPosition

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      }

      // ctrl + a
      if (key === "a" && (onlyCtrl || onlyMeta)) {
        textfield.selectedTextPos.selected = true
        textfield.selectedTextPos.posA.lineNo = 0
        textfield.selectedTextPos.posA.positionInLine = 0
        textfield.selectedTextPos.posB.lineNo = textfield.props.lines.length - 1
        textfield.selectedTextPos.posB.positionInLine =
          textfield.props.lines[textfield.props.lines.length - 1].length
        textfield.props.textCursorPosition = {
          ...textfield.selectedTextPos.posB,
        }
        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
        return
      }

      // ctrl + c
      if (key === "c" && (onlyCtrl || onlyMeta)) {
        if (textfield.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textfield.selectedTextPos.posA,
          textfield.selectedTextPos.posB
        )

        copy(start, end, textfield)
      }

      // ctrl + v
      if (key === "v" && (onlyCtrl || onlyMeta)) {
        if (textfield.selectedTextPos.selected) {
          let { start } = txt.sortLineNoPositions(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB
          )
          textfield.props.textCursorPosition = { ...start }
          remove(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB,
            textfield,
            debug
          )
          textfield.selectedTextPos.selected = false
          updateTextCursor(textfield)
        }

        paste(textfield)
      }

      // ctrl + x
      if (key === "x" && (onlyCtrl || onlyMeta)) {
        if (textfield.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textfield.selectedTextPos.posA,
          textfield.selectedTextPos.posB
        )
        // copy the text first
        copy(start, end, textfield)

        //remove the text and move the textCursor
        remove(
          textfield.selectedTextPos.posA,
          textfield.selectedTextPos.posB,
          textfield
        )
        textfield.props.textCursorPosition = { ...start }
        updateTextCursor(textfield)
        textfield.selectedTextPos.selected = false
        textfield.selectedTextPos.posA = { lineNo: -1, positionInLine: -1 }
        textfield.selectedTextPos.posB = { lineNo: -1, positionInLine: -1 }
      }

      if (key === "b" && (onlyCtrl || onlyMeta)) {
        if (textfield.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textfield.selectedTextPos.posA,
          textfield.selectedTextPos.posB
        )

        const prevRti = txt.lastRichTextInfo(
          start,
          textfield.props.richTextInfos
        )

        if (prevRti instanceof Error) {
          console.error(prevRti)
          return prevRti
        }

        if (prevRti?.textFormat.bold === false) {
          changeTextformat(textfield, { bold: true }, start, end)
        } else {
          changeTextformat(textfield, { bold: false }, start, end)
        }
      }

      if (key === "i" && (onlyCtrl || onlyMeta)) {
        if (textfield.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textfield.selectedTextPos.posA,
          textfield.selectedTextPos.posB
        )

        const prevRti = txt.lastRichTextInfo(
          start,
          textfield.props.richTextInfos
        )

        if (prevRti instanceof Error) {
          console.error(prevRti)
          return prevRti
        }

        if (prevRti?.textFormat.italic === false) {
          changeTextformat(textfield, { italic: true }, start, end)
        } else {
          changeTextformat(textfield, { italic: false }, start, end)
        }
      }

      // arrows/navigation
      else if (key === "ArrowRight") {
        textfield.arrowUpDownWidth = undefined

        const isInsideLine =
          textfield.props.textCursorPosition.positionInLine + 1 <=
          textfield.props.lines[textfield.props.textCursorPosition.lineNo]
            .length

        let prevLineNoPosition = { ...textfield.props.textCursorPosition }
        let lineNo = textfield.props.textCursorPosition.lineNo
        let positionInLine = textfield.props.textCursorPosition.positionInLine
        let lengthOfLine =
          textfield.props.lines[textfield.props.textCursorPosition.lineNo]
            .length

        //if not inside line at the last line do nothing
        if (
          !isInsideLine &&
          textfield.props.textCursorPosition.lineNo ===
            textfield.props.lines.length - 1
        ) {
          return
        }

        // only ctrl is pressed
        if (onlyCtrl || onlyOption) {
          textfield.selectedTextPos.selected = false
          // wrap to next line if at the end of current line
          if (positionInLine === lengthOfLine) {
            positionInLine = 0
            lineNo++
            lengthOfLine = textfield.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textfield.props.lines[lineNo]
              .slice(positionInLine)
              .search(/[\s]/gu)

            //if there is no whitespace i.e this is the last word or the only word in the line
            if (i === -1) {
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = lengthOfLine
              break
            }
            //the first character is a whitespace
            else if (i === 0) {
              positionInLine++
            } else {
              //if there is whitespace ahead move cursor to that location
              positionInLine += i
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }
        }

        // ctrl + shift
        else if (bothCtrlShift) {
          // first move the cursor the same as onlyCtrl
          let lineNo = textfield.props.textCursorPosition.lineNo
          let positionInLine = textfield.props.textCursorPosition.positionInLine
          let lengthOfLine =
            textfield.props.lines[textfield.props.textCursorPosition.lineNo]
              .length

          //wrap to next line if at the end of current line
          if (positionInLine === lengthOfLine) {
            positionInLine = 0
            lineNo++
            lengthOfLine = textfield.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textfield.props.lines[lineNo]
              .slice(positionInLine)
              .search(/[\s]/gu)

            //if there is no whitespace i.e this is the last word or the only word in the line
            if (i === -1) {
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = lengthOfLine
              break
            }
            //the first character is a whitespace
            else if (i === 0) {
              positionInLine++
            } else {
              //if there is whitespace ahead move cursor to that location
              positionInLine += i
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }

          //if already selected then only set posB
          if (textIsSelected) {
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
          // set both posA and posB
          else {
            textfield.selectedTextPos.selected = true
            textfield.selectedTextPos.posA = prevLineNoPosition
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
        }
        //shift key is pressed
        else if (onlyShift) {
          // cursor is at the end of the current line and is not at the last line
          // move the cursor right by 1 character
          if (
            !isInsideLine &&
            textfield.props.textCursorPosition.lineNo <
              textfield.props.lines.length - 1
          ) {
            textfield.props.textCursorPosition.lineNo++
            textfield.props.textCursorPosition.positionInLine = 0
          } else if (isInsideLine) {
            textfield.props.textCursorPosition.positionInLine++
          }

          // if some text is already selected
          if (textIsSelected) {
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          } else {
            textfield.selectedTextPos.selected = true
            textfield.selectedTextPos.posA = { ...prevLineNoPosition }
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
            // textbox.selectedTextPos.posB.positionInLine++
          }
        }
        // no modifier pressed
        else {
          textfield.selectedTextPos.selected = false
          //cursor is at the end of the current line and is not at the last line
          if (
            !isInsideLine &&
            textfield.props.textCursorPosition.lineNo <
              textfield.props.lines.length - 1
          ) {
            textfield.props.textCursorPosition.lineNo++
            textfield.props.textCursorPosition.positionInLine = 0
          } else if (isInsideLine) {
            textfield.props.textCursorPosition.positionInLine++
          }
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "ArrowLeft") {
        textfield.arrowUpDownWidth = undefined

        const isInsideLine =
          textfield.props.textCursorPosition.positionInLine - 1 >= 0

        // if cursor is at the beginning of the text do nothing
        if (!isInsideLine && textfield.props.textCursorPosition.lineNo === 0) {
          return
        }

        let lineNo = textfield.props.textCursorPosition.lineNo
        let positionInLine = textfield.props.textCursorPosition.positionInLine
        let lengthOfLine =
          textfield.props.lines[textfield.props.textCursorPosition.lineNo]
            .length
        let prevLineNoPosition = { ...textfield.props.textCursorPosition }

        //ctrl is pressed
        if (onlyCtrl || onlyOption) {
          textfield.selectedTextPos.selected = false
          //wrap to prev line if at the beginning of current line
          if (positionInLine === 0) {
            lineNo--
            positionInLine = textfield.props.lines[lineNo].length
            lengthOfLine = textfield.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textfield.props.lines[lineNo]
              .slice(0, positionInLine)
              .search(/[\s](?=[^\s]*$)/u)
            //if there is no whitespace i.e this is the first word or the only word in the line
            if (i === -1) {
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = 0
              break
            }
            //the first character behind is a whitespace
            else if (i === positionInLine - 1) {
              positionInLine--
            } else {
              //if there is whitespace behind move cursor to that location
              positionInLine = i + 1
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }
        }
        // ctrl + shift
        else if (bothCtrlShift) {
          if (positionInLine === 0) {
            lineNo--
            positionInLine = textfield.props.lines[lineNo].length
            lengthOfLine = textfield.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textfield.props.lines[lineNo]
              .slice(0, positionInLine)
              .search(/[\s](?=[^\s]*$)/u)
            // if there is no whitespace i.e this is the first word or the only word in the line
            if (i === -1) {
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = 0
              break
            }
            // the first character behind is a whitespace
            else if (i === positionInLine - 1) {
              positionInLine--
            } else {
              // if there is whitespace behind move cursor to that location
              positionInLine = i + 1
              textfield.props.textCursorPosition.lineNo = lineNo
              textfield.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }

          // if already selected then only set posB
          if (textfield.selectedTextPos.selected) {
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
          // set both posA and posB
          else {
            textfield.selectedTextPos.selected = true
            textfield.selectedTextPos.posA = prevLineNoPosition
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
        } else if (onlyShift) {
          if (!isInsideLine && textfield.props.textCursorPosition.lineNo > 0) {
            textfield.props.textCursorPosition.lineNo--
            textfield.props.textCursorPosition.positionInLine =
              textfield.props.lines[
                textfield.props.textCursorPosition.lineNo
              ].length
          } else if (isInsideLine) {
            textfield.props.textCursorPosition.positionInLine--
          }

          //shift is pressed and some text is already selected
          if (textfield.selectedTextPos.selected) {
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
          //shift is pressed but no text is selected yet
          else {
            textfield.selectedTextPos.selected = true
            textfield.selectedTextPos.posA = {
              ...prevLineNoPosition,
            }
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
        } else {
          textfield.selectedTextPos.selected = false

          //cursor is at the end of the current line and is not at the last line
          // move the cursor to the left by 1 char
          if (!isInsideLine && textfield.props.textCursorPosition.lineNo > 0) {
            textfield.props.textCursorPosition.lineNo--
            textfield.props.textCursorPosition.positionInLine =
              textfield.props.lines[
                textfield.props.textCursorPosition.lineNo
              ].length
          } else if (isInsideLine) {
            textfield.props.textCursorPosition.positionInLine--
          }
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "ArrowUp") {
        let textCursorPosition_prev = { ...textfield.props.textCursorPosition }

        if (textfield.props.textCursorPosition.lineNo - 1 >= 0) {
          if (textfield.arrowUpDownWidth === undefined) {
            let textCursorCoords = txt.lineNoPositionToCoords(
              textfield.props.center,
              textfield.props.textCursorPosition,
              textfield.props.linespace,
              textfield.props.lines,
              textfield.props.richTextInfos,
              textfield.props.align,
              textfield.textWidth
            )

            if (textCursorCoords instanceof Error) {
              console.error(textCursorCoords)
              return textCursorCoords
            }

            textfield.arrowUpDownWidth =
              textCursorCoords.x - textfield.props.center.x
          }

          textfield.props.textCursorPosition.lineNo--

          let positionInLine = txt.widthToPositionInLine(
            textfield.arrowUpDownWidth,
            textfield.props.lines,
            textfield.props.textCursorPosition.lineNo,
            textfield.props.richTextInfos,
            textfield.props.align
          )

          if (positionInLine instanceof Error) {
            console.error(positionInLine)
            return positionInLine
          }

          textfield.props.textCursorPosition.positionInLine = positionInLine
        } else {
          textfield.props.textCursorPosition.positionInLine = 0
        }

        //shift is pressed and some text is already selected
        if (signal.modifiers["Shift"] && textfield.selectedTextPos.selected) {
          if (
            textfield.selectedTextPos.posA.lineNo ===
              textCursorPosition_prev.lineNo &&
            textfield.selectedTextPos.posA.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textfield.selectedTextPos.posA = {
              ...textfield.props.textCursorPosition,
            }
          } else if (
            textfield.selectedTextPos.posB.lineNo ===
              textCursorPosition_prev.lineNo &&
            textfield.selectedTextPos.posB.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
        }
        //shift is pressed but no text is selected yet
        else if (signal.modifiers["Shift"]) {
          textfield.selectedTextPos.selected = true
          textfield.selectedTextPos.posA = { ...textCursorPosition_prev }
          textfield.selectedTextPos.posB = {
            ...textfield.props.textCursorPosition,
          }
        }
        //some text is selected but shift is not pressed
        else if (textfield.selectedTextPos.selected) {
          textfield.selectedTextPos.selected = false
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "ArrowDown") {
        let textCursorPosition_prev = { ...textfield.props.textCursorPosition }

        if (
          textfield.props.textCursorPosition.lineNo + 1 <
          textfield.props.lines.length
        ) {
          if (textfield.arrowUpDownWidth === undefined) {
            let textCursorCoords = txt.lineNoPositionToCoords(
              textfield.props.center,
              textfield.props.textCursorPosition,
              textfield.props.linespace,
              textfield.props.lines,
              textfield.props.richTextInfos,
              textfield.props.align,
              textfield.textWidth
            )

            if (textCursorCoords instanceof Error) {
              console.error(textCursorCoords)
              return textCursorCoords
            }

            textfield.arrowUpDownWidth =
              textCursorCoords.x - textfield.props.center.x
          }

          textfield.props.textCursorPosition.lineNo++

          let positionInLine = txt.widthToPositionInLine(
            textfield.arrowUpDownWidth,
            textfield.props.lines,
            textfield.props.textCursorPosition.lineNo,
            textfield.props.richTextInfos,
            textfield.props.align
          )

          if (positionInLine instanceof Error) {
            console.error(positionInLine)
            return positionInLine
          }

          textfield.props.textCursorPosition.positionInLine = positionInLine
        } else {
          textfield.props.textCursorPosition.positionInLine =
            textfield.props.lines[textfield.props.lines.length - 1].length
        }

        // shift is pressed and some text is already selected
        if (signal.modifiers["Shift"] && textIsSelected) {
          if (
            textfield.selectedTextPos.posA.lineNo ===
              textCursorPosition_prev.lineNo &&
            textfield.selectedTextPos.posA.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textfield.selectedTextPos.posA = {
              ...textfield.props.textCursorPosition,
            }
          } else if (
            textfield.selectedTextPos.posB.lineNo ===
              textCursorPosition_prev.lineNo &&
            textfield.selectedTextPos.posB.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textfield.selectedTextPos.posB = {
              ...textfield.props.textCursorPosition,
            }
          }
        }
        //shift is pressed but no text is selected yet
        else if (signal.modifiers["Shift"]) {
          textfield.selectedTextPos.selected = true
          textfield.selectedTextPos.posA = { ...textCursorPosition_prev }
          textfield.selectedTextPos.posB = {
            ...textfield.props.textCursorPosition,
          }
        }
        //some text is selected but shift is not pressed
        else if (textIsSelected) {
          textfield.selectedTextPos.selected = false
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "Backspace") {
        const { lineNo, positionInLine } = textfield.props.textCursorPosition

        //backspace when text is selected
        if (textIsSelected) {
          let { start } = txt.sortLineNoPositions(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB
          )
          let pos_new = txt.lineNoPositionToPosition(
            start,
            textfield.props.lines,
            [true]
          )

          remove(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB,
            textfield
          )

          let positionNew = txt.positionToLineNoPosition(
            pos_new,
            textfield.props.lines,
            [true]
          )

          if (positionNew instanceof Error) {
            console.error(positionNew)
            return positionNew
          }

          textfield.props.textCursorPosition = positionNew

          textfield.selectedTextPos.selected = false
          textfield.selectedTextPos.posA = { lineNo: -1, positionInLine: -1 }
          textfield.selectedTextPos.posB = { lineNo: -1, positionInLine: -1 }

          updateTextCursor(textfield)
          textfield.events.publish("deselect")
          return
        }

        let lineNoPosition_new: LineNoPosition = { lineNo, positionInLine }

        let pos_new = txt.lineNoPositionToPosition(
          lineNoPosition_new,
          textfield.props.lines,
          [true]
        )

        if (positionInLine === 0) {
          // backspace from start of line
          // if at the start of document do nothing
          if (lineNo === 0) {
            return
          }

          lineNoPosition_new.lineNo--

          lineNoPosition_new.positionInLine =
            textfield.props.lines[lineNo - 1].length
        } else {
          // if not at the start of a line
          lineNoPosition_new.positionInLine--
        }

        pos_new = txt.lineNoPositionToPosition(
          lineNoPosition_new,
          textfield.props.lines,
          [true]
        )

        remove(
          lineNoPosition_new,
          textfield.props.textCursorPosition,
          textfield,
          debug
        )

        let positionNew = txt.positionToLineNoPosition(
          pos_new,
          textfield.props.lines,
          [true]
        )

        if (positionNew instanceof Error) {
          console.error(positionNew)
          return positionNew
        }

        // Q: should the textCursorPosition be updated before or after remove is called?
        textfield.props.textCursorPosition = positionNew

        if (debug) {
          console.log("old textCursorPosition=", lineNo, positionInLine)

          console.log(
            "new textCursorPosition=",
            textfield.props.textCursorPosition.lineNo,
            textfield.props.textCursorPosition.positionInLine
          )
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "Enter") {
        if (textIsSelected) {
          // let { start } = txt.sortLineNoPositions(
          //   textbox.selectedTextPos.posA,
          //   textbox.selectedTextPos.posB
          // )

          remove(
            textfield.selectedTextPos.posA,
            textfield.selectedTextPos.posB,
            textfield,
            debug
          )

          textfield.events.publish("deselect")
          // add("\n", start, [], textbox, debug)
        } else {
          let prevRichTextInfo = txt.lastRichTextInfo(
            textfield.props.textCursorPosition,
            textfield.props.richTextInfos
          )

          if (prevRichTextInfo === undefined) {
            console.error(
              `initInputHandler() pressed Enter: prevRichTextInfo cannot be undefined`
            )
            return
          }

          // add("\n", textbox.props.textCursorPosition, [], textbox, debug)
        }

        // textbox.props.textCursorPosition.lineNo++
        textfield.props.textCursorPosition.positionInLine = 0
        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "PageUp") {
        textfield.props.textCursorPosition.lineNo = 0
        textfield.props.textCursorPosition.positionInLine = 0
        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "PageDown") {
        textfield.props.textCursorPosition.lineNo =
          textfield.props.lines.length - 1
        textfield.props.textCursorPosition.positionInLine =
          textfield.props.lines[textfield.props.lines.length - 1].length
        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "Home") {
        let prevLineNoPosition = { ...textfield.props.textCursorPosition }
        textfield.props.textCursorPosition.positionInLine = 0

        if (textIsSelected && onlyShift) {
          textfield.selectedTextPos.posB = {
            ...textfield.props.textCursorPosition,
          }
        } else if (onlyShift) {
          textfield.selectedTextPos.selected = true
          textfield.selectedTextPos.posA = { ...prevLineNoPosition }
          textfield.selectedTextPos.posB = {
            ...textfield.props.textCursorPosition,
          }
        } else if (textIsSelected && !onlyShift) {
          textfield.selectedTextPos.selected = false
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "End") {
        let prevLineNoPosition = { ...textfield.props.textCursorPosition }
        textfield.props.textCursorPosition.positionInLine =
          textfield.props.lines[
            textfield.props.textCursorPosition.lineNo
          ].length

        if (textIsSelected && onlyShift) {
          textfield.selectedTextPos.posB = {
            ...textfield.props.textCursorPosition,
          }
        } else if (onlyShift) {
          textfield.selectedTextPos.selected = true
          textfield.selectedTextPos.posA = { ...prevLineNoPosition }
          textfield.selectedTextPos.posB = {
            ...textfield.props.textCursorPosition,
          }
        } else if (textIsSelected && !onlyShift) {
          textfield.selectedTextPos.selected = false
        }

        updateTextCursor(textfield)
        textCursor.resetBlinkCycle()
      } else if (key === "Escape") {
        // textbox.selected = false
        textfield.typing = false
        textfield.selectedTextPos.selected = false
      }
    }
  )

  textfieldEvents.subscribe("opEnd", () => {
    textfield.initialLineNoPos = undefined
  })
}

const draw = (
  ctx: CanvasRenderingContext2D,
  textbox: Textfield,
  debug?: boolean
) => {
  if (textbox.props.rotation !== 0) {
    ctx.save()
    ctx.globalAlpha = textbox.props.opacity

    ctx.translate(textbox.props.center.x, textbox.props.center.y)
    ctx.rotate(textbox.props.rotation)

    let border = new Path2D()

    border.roundRect(
      textbox.props.width / 2,
      textbox.height / 2,
      textbox.props.width + 2 * textbox.props.padding,
      textbox.height + 2 * textbox.props.padding,
      textbox.props.cornerRadii
    )

    ctx.fillStyle = textbox.props.bgColor
    ctx.fill(border)
    ctx.strokeStyle = textbox.props.borderColor
    ctx.lineWidth = textbox.props.borderThickness
    ctx.stroke(border)

    txt.print(
      ctx,
      vector.subtract(textbox.textCoords, textbox.props.center),
      textbox.props.lines,
      textbox.props.linespace,
      textbox.props.richTextInfos,
      textbox.props.align,
      textbox.props.opacity,
      textbox.textWidth,
      debug
    )

    if (textbox.typing && textbox.textCursor !== undefined) {
      let coords = vector.copy(textbox.textCursor.props.coords)

      // subtract the textCursor coords by textbox.props.center
      // as ctx is translated to the center when rotated
      textbox.textCursor.props.coords = vector.subtract(
        coords,
        textbox.props.center
      )

      textbox.textCursor.draw(ctx)

      // set the textCursor coords back to original
      textbox.textCursor.props.coords = coords

      let activeBox = new Path2D()
      activeBox.roundRect(
        -textbox.props.width / 2 - textbox.props.padding + 4,
        -textbox.height / 2 - textbox.props.padding + 4,
        textbox.props.width + 2 * textbox.props.padding - 8,
        textbox.height + 2 * textbox.props.padding - 8,
        4
      )

      gl.stroke(ctx, activeBox, "white", 1, "solid", undefined, [2, 4])
    }
  } else {
    ctx.globalAlpha = textbox.props.opacity
    let border = new Path2D()

    border.roundRect(
      textbox.props.center.x - textbox.props.width / 2 - textbox.props.padding,
      textbox.props.center.y - textbox.height / 2 - textbox.props.padding,
      textbox.props.width + 2 * textbox.props.padding,
      textbox.height + 2 * textbox.props.padding,
      textbox.props.cornerRadii
    )

    ctx.fillStyle = textbox.props.bgColor
    ctx.fill(border)
    ctx.strokeStyle = textbox.props.borderColor
    ctx.lineWidth = textbox.props.borderThickness
    ctx.stroke(border)

    ctx.save()
    ctx.clip(border)
    txt.print(
      ctx,
      textbox.textCoords,
      textbox.props.lines,
      textbox.props.linespace,
      textbox.props.richTextInfos,
      textbox.props.align,
      textbox.props.opacity,
      textbox.textWidth,
      debug
    )
    if (textbox.typing && textbox.textCursor !== undefined) {
      textbox.textCursor.draw(ctx)

      // show a dotted border when typing is true
      let activeBox = new Path2D()
      activeBox.roundRect(
        textbox.props.center.x -
          textbox.props.width / 2 -
          textbox.props.padding +
          4,
        textbox.props.center.y - textbox.height / 2 - textbox.props.padding + 4,
        textbox.props.width + 2 * textbox.props.padding - 8,
        textbox.height + 2 * textbox.props.padding - 8,
        4
      )

      gl.stroke(ctx, activeBox, "white", 1, "solid", undefined, [2, 2])
    }
  }

  if (textbox.props.rotation !== 0) {
    ctx.restore()
  }

  if (textbox.selectedTextPos.selected === true) {
    highlightText(
      ctx,
      textbox,
      textbox.selectedTextPos.posA,
      textbox.selectedTextPos.posB,
      SETTINGS.textbox.highlightColor,
      SETTINGS.textbox.highlightRadii,
      undefined,
      debug
    )
  }

  ctx.restore()

  // debug
  if (debug) {
    let textBoundary = new Path2D()
    let lineNoPosition: LineNoPosition = { lineNo: 0, positionInLine: 0 }
    let coords: Vector2D | Error

    for (let i = 0; i < textbox.props.lines.length; i++) {
      lineNoPosition.lineNo = i
      for (let j = 0; j < textbox.props.lines[i].length + 1; j++) {
        lineNoPosition.positionInLine = j
        coords = txt.lineNoPositionToCoords(
          textbox.textCoords,
          lineNoPosition,
          textbox.props.linespace,
          textbox.props.lines,
          textbox.props.richTextInfos,
          textbox.props.align,
          textbox.textWidth
        )

        if (coords instanceof Error) {
          console.error(coords)
          return coords
        }

        textBoundary.rect(coords.x, coords.y, 1, 1)
      }
    }

    ctx.fillStyle = "yellow"
    ctx.fill(textBoundary)

    // draw border
    let border = new Path2D()
    ctx.strokeStyle = "blue"
    ctx.lineWidth = 2

    border.roundRect(
      textbox.props.center.x - textbox.props.width / 2,
      textbox.props.center.y - textbox.height / 2,
      textbox.props.width,
      textbox.height,
      5
    )

    ctx.stroke(border)

    ctx.fillStyle = "white"

    // center
    ctx.fillRect(textbox.props.center.x, textbox.props.center.y, 5, 5)
    // textCoords
    ctx.fillRect(textbox.textCoords.x, textbox.textCoords.y, 5, 5)
  }

  return
}

const resizeWidth = (textbox: Textfield, delta: number): void => {
  textbox.props.width += delta

  if (textbox.props.width < 0) {
    textbox.props.width = 0
  }

  textbox.events.publish("resizeWidth")

  return
}

const highlightText = (
  ctx: CanvasRenderingContext2D,
  textbox: Textfield,
  posA: LineNoPosition,
  posB: LineNoPosition,
  color: string | CanvasGradient,
  radii: number,
  emptyWidth?: number,
  debug?: boolean
): void | Error => {
  // check which one comes first posA, posB
  const { start, end } = txt.sortLineNoPositions(posA, posB)
  const lineNoDiff = end.lineNo - start.lineNo
  let height = 0
  let vertical = 0 // total of heights of lines till now
  let width = 0
  let topLeftCoords: Vector2D | Error
  let textCoords = textbox.textCoords
  let lines = textbox.props.lines
  let richTextInfos = textbox.props.richTextInfos
  let linespace = textbox.props.linespace

  if (textbox.props.rotation !== 0) {
    ctx.save()
    ctx.translate(textbox.props.center.x, textbox.props.center.y)

    ctx.rotate(textbox.props.rotation)

    textCoords = vector.subtract(textbox.textCoords, textbox.props.center)
    lines = textbox.props.lines
    richTextInfos = textbox.props.richTextInfos
    linespace = textbox.props.linespace
  }

  if (lineNoDiff === 0) {
    height = txt.lineHeight(start.lineNo, richTextInfos) + linespace / 2

    for (let i = 0; i < start.lineNo; i++) {
      vertical += txt.lineHeight(i, richTextInfos) + linespace
    }

    let widthStart = txt.widthFromLineNoPosition(
      start,
      lines,
      richTextInfos,
      textbox.props.align,
      textbox.textWidth
    )

    let widthEnd = txt.widthFromLineNoPosition(
      end,
      lines,
      richTextInfos,
      textbox.props.align,
      textbox.textWidth
    )

    if (widthStart instanceof Error) return widthStart
    if (widthEnd instanceof Error) return widthEnd

    width = widthEnd - widthStart

    topLeftCoords = txt.lineNoPositionToCoords(
      textCoords,
      start,
      linespace,
      lines,
      richTextInfos,
      textbox.props.align,
      textbox.textWidth
    )

    if (topLeftCoords instanceof Error) {
      console.error(topLeftCoords)
      return topLeftCoords
    }

    let path = new Path2D()
    ctx.fillStyle = color
    path.roundRect(topLeftCoords.x, topLeftCoords.y, width, 1.1 * height, radii)

    ctx.fill(path)

    if (debug) {
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.strokeRect(topLeftCoords.x, topLeftCoords.y, width, height)
    }

    if (textbox.props.rotation !== 0) {
      ctx.restore()
    }
    return
  }

  for (let i = 0; i <= lineNoDiff; i++) {
    // NOTE: ideally linespace should be added to `height` and subtracted from `vertical`
    // but because it does not leave any gaps between the highlighted lines I kept it like this
    height = txt.lineHeight(start.lineNo + i, richTextInfos) + linespace / 2

    if (i === 0) {
      for (let j = 0; j < start.lineNo; j++) {
        vertical += txt.lineHeight(j, richTextInfos) + linespace
      }

      let widthStart = txt.widthFromLineNoPosition(
        start,
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )

      let widthStartLast = txt.widthFromLineNoPosition(
        {
          lineNo: start.lineNo,
          positionInLine: lines[start.lineNo].length,
        },
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )

      if (widthStart instanceof Error) return widthStart
      if (widthStartLast instanceof Error) return widthStartLast

      width = widthStartLast - widthStart

      topLeftCoords = txt.lineNoPositionToCoords(
        textCoords,
        start,
        linespace,
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )
    } else if (start.lineNo + i === end.lineNo) {
      vertical +=
        txt.lineHeight(start.lineNo + i - 1, richTextInfos) + linespace

      let widthEnd = txt.widthFromLineNoPosition(
        end,
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )

      let widthEndFirst = txt.widthFromLineNoPosition(
        {
          lineNo: end.lineNo,
          positionInLine: 0,
        },
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )

      if (widthEnd instanceof Error) return widthEnd
      if (widthEndFirst instanceof Error) return widthEndFirst

      width = widthEnd - widthEndFirst

      topLeftCoords = txt.lineNoPositionToCoords(
        textCoords,
        { lineNo: start.lineNo + i, positionInLine: 0 },
        linespace,
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )
    } else {
      vertical +=
        txt.lineHeight(start.lineNo + i - 1, richTextInfos) + linespace
      let res = txt.calculateLineWidth(
        start.lineNo + i,
        lines[start.lineNo + i],
        richTextInfos
      )

      if (res instanceof Error) return res

      width = res

      topLeftCoords = txt.lineNoPositionToCoords(
        textCoords,
        { lineNo: start.lineNo + i, positionInLine: 0 },
        linespace,
        lines,
        richTextInfos,
        textbox.props.align,
        textbox.textWidth
      )
    }

    // slightly highlight the empty lines to indicate that they are selected
    if (lines[start.lineNo + i].length === 0) {
      width = emptyWidth ? emptyWidth : 4
    }

    if (topLeftCoords instanceof Error) return topLeftCoords

    let path = new Path2D()
    ctx.fillStyle = color
    path.roundRect(
      topLeftCoords.x,
      topLeftCoords.y,
      width,
      height,
      SETTINGS.textbox.highlightRadii
    )
    ctx.fill(path)

    if (debug) {
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.strokeRect(topLeftCoords.x, topLeftCoords.y, width, height)
    }
  }

  if (textbox.props.rotation !== 0) {
    ctx.restore()
  }

  return
}

// below functions are not standalone
const updateTextCursor = (
  textbox: Textfield,
  textFormat?: TextFormat
): void | Error => {
  let textCursor = textbox.textCursor
  let textCoords = textbox.textCoords

  if (textCursor === undefined) return

  if (textFormat === undefined) {
    let coords = txt.lineNoPositionToCoords(
      vector.copy(textCoords),
      textbox.props.textCursorPosition,
      textbox.props.linespace,
      textbox.props.lines,
      textbox.props.richTextInfos,
      textbox.props.align,
      textbox.textWidth
    )

    if (coords instanceof Error) return coords

    let tf = txt.textFormatFromLineNoPosition(
      textbox.props.textCursorPosition,
      textbox.props.richTextInfos
    )

    if (tf instanceof Error) return tf
    textFormat = tf

    textCursor.update(
      // @Suboptimal: txt.lineNoPositionToCoords() can also provide the textFormat doing the same operation twice
      coords,
      textFormat
    )
  } else {
    let coords = txt.lineNoPositionToCoords(
      vector.create(textCoords.x, textCoords.y),
      textbox.props.textCursorPosition,
      textbox.props.linespace,
      textbox.props.lines,
      textbox.props.richTextInfos,
      textbox.props.align,
      textbox.textWidth,
      textFormat
    )

    if (coords instanceof Error) return coords

    textCursor.update(coords, textFormat)
  }
}

// const updateTextboxShape = (textfield: Textfield) => {
//   // calculates the textHeight using text.totalHeight()
//   // updates textbox's height to be the textHeight + 2*padding
//   // and the textbox's center to be halfway between the textCoords and the textHeight
//   // NOTE: it does not change the textCoords only shifts the center and height of the textbox
//   // keeping the textCoords the same. Basically the texbox grows from the bottom
//   // which is needed when typing
//   // textfield.textHeight = txt.totalHeight(
//   //   textfield.props.lines,
//   //   textfield.props.richTextInfos,
//   //   textfield.props.linespace
//   // )
//   //
//   // move the center (textbox.props.coords) to the center of the text vertically, make the height same as textHeight
//   // textfield.height = textfield.textHeight + 2 * textfield.props.padding
//   // let textWidth = txt.longestLineWidth(
//   //   textfield.props.lines,
//   //   textfield.props.richTextInfos
//   // )
//   // if (textWidth instanceof Error) {
//   //   console.error(textWidth)
//   //   return textWidth
//   // }
//   // let prevTextWidth = textfield.textWidth
//   // let delta = prevTextWidth - textWidth
//   // textfield.textWidth = textWidth
//   // // NOTE: update() also calls updateTextCoords()
//   // update(textfield, {
//   //   center: vector.create(
//   //     textfield.props.center.x - delta / 2,
//   //     textfield.textCoords.y + textfield.textHeight / 2
//   //   ),
//   //   height: textfield.textHeight + 2 * textfield.props.padding,
//   // })
//   // update(textfield, {
//   //   width: textfield.textWidth + 2 * textfield.props.padding,
//   // })
// }

const updateTextCoords = (textbox: Textfield): void | Error => {
  // updates the textCoords using the center and height of the textbox
  // #TODO: the center and textCoords should always be linked
  let coords = textbox.props.center
  // let width = textbox.props.width
  // let height = textbox.height
  let padding = textbox.props.padding

  let textWidth = txt.longestLineWidth(
    textbox.props.lines,
    textbox.props.richTextInfos
  )

  if (textWidth instanceof Error) {
    console.error(textWidth)
    return textWidth
  }

  textbox.textCoords = vector.create(
    coords.x - textWidth / 2,
    coords.y - textbox.height / 2 + padding
  )

  textbox.textWidth = textWidth
}

const add = (
  text: string,
  lineNoPosition: LineNoPosition,
  richTextInfos: RichTextInfo[],
  textbox: Textfield,
  debug?: boolean
) => {
  // if there are multiple in the text string to add, replace the new lines by spaces
  // in the case of textfields
  text = text.replace(/\n/g, " ")

  txt.add(
    lineNoPosition,
    text,
    richTextInfos,
    textbox.props.lines,
    textbox.props.richTextInfos,
    [true],
    textbox.props.width - 2 * textbox.props.padding,
    false,
    debug
  )

  textbox.events.publish("add", {
    text,
    lineNoPosition,
    richTextInfos: richTextInfos,
  })
}

const remove = (
  posA: LineNoPosition,
  posB: LineNoPosition,
  textbox: Textfield,
  debug?: boolean
) => {
  txt.remove(
    posA,
    posB,
    textbox.props.lines,
    textbox.props.richTextInfos,
    [true],
    textbox.props.width - 2 * textbox.props.padding,
    false,
    debug
  )

  // #subOptimal: this recalculates the height of the entire textbox instead of
  // just calculating the difference between the height of the affected lines
  // updateTextboxShape(textbox)
  textbox.events.publish("remove", { posA, posB })

  if (debug) {
    console.log("------")
    let i = 0
    for (let rti of textbox.props.richTextInfos) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    i = 0
    for (let line of textbox.props.lines) {
      console.log(i, line, line.length)
      i++
    }
  }
}

const copy = (
  start: LineNoPosition,
  end: LineNoPosition,
  textbox: Textfield,
  debug?: boolean
): void => {
  // copy text between start and end into the system clipboard
  // wrapped lines should not be copied as seperate lines. They should be unwrapped
  // also copy the richTextInfos into textbox.richTextInfoClipboard array

  // #TODO: cleanup, this function looks like a total mess

  if (debug) {
    console.log("----copy()----")
  }

  let rtisSelfByLineNo: RichTextInfo[][] = []
  let linesToCopy: string[] = []
  let lineNoUnwrap = 0
  let text = ""
  let prevRti: RichTextInfo | undefined | Error = txt.lastRichTextInfo(
    start,
    textbox.props.richTextInfos
  )
  let rtisToCopy: RichTextInfo[] = []

  if (prevRti instanceof Error) {
    console.error(prevRti)
    return
  }

  // remove anything already in the richTextInfo clipboard
  textbox.richTextInfoClipboard = []

  for (let line of textbox.props.lines) {
    rtisSelfByLineNo.push([])
  }

  for (let rti of textbox.props.richTextInfos) {
    rtisSelfByLineNo[rti.lineNoPosition.lineNo].push(rti)

    let withinStartAndEnd =
      (rti.lineNoPosition.lineNo > start.lineNo &&
        rti.lineNoPosition.lineNo < end.lineNo) ||
      (rti.lineNoPosition.lineNo === start.lineNo &&
        rti.lineNoPosition.positionInLine >= start.positionInLine) ||
      (rti.lineNoPosition.lineNo === end.lineNo &&
        rti.lineNoPosition.positionInLine < end.positionInLine)

    if (withinStartAndEnd) {
      rtisToCopy.push(rti)
    }
  }

  if (start.lineNo === end.lineNo) {
    linesToCopy.push(
      textbox.props.lines[start.lineNo].substring(
        start.positionInLine,
        end.positionInLine
      )
    )

    if (
      (prevRti?.lineNoPosition.lineNo === start.lineNo &&
        prevRti?.lineNoPosition.positionInLine === start.positionInLine) ||
      prevRti === undefined
    ) {
    } else {
      prevRti.lineNoPosition = { lineNo: 0, positionInLine: 0 }
      textbox.richTextInfoClipboard.push(txt.cloneRichTextInfo(prevRti))
    }

    for (let rti of rtisSelfByLineNo[start.lineNo]) {
      if (
        rti.lineNoPosition.positionInLine >= start.positionInLine &&
        rti.lineNoPosition.positionInLine <= end.positionInLine
      ) {
        textbox.richTextInfoClipboard.push({
          lineNoPosition: {
            lineNo: linesToCopy.length - 1,
            positionInLine:
              rti.lineNoPosition.positionInLine - start.positionInLine,
          },
          textFormat: {
            font: rti.textFormat.font,
            fontSize: rti.textFormat.fontSize,
            fontColor: rti.textFormat.fontColor,
            italic: rti.textFormat.italic,
            bold: rti.textFormat.bold,
          },
        })
      }
    }
  } else {
    // start and end are not on the same line
    // wrapped lines should not be copied as seperate lines

    // add a prevRTI as the begining RTI for the copied lines
    // if there is an RTI at the beginning do nothing
    if (
      (prevRti?.lineNoPosition.lineNo === start.lineNo &&
        prevRti?.lineNoPosition.positionInLine === start.positionInLine) ||
      prevRti === undefined
    ) {
    } else {
      prevRti.lineNoPosition = { lineNo: 0, positionInLine: 0 }
      textbox.richTextInfoClipboard.push(txt.cloneRichTextInfo(prevRti))
    }

    for (let i = start.lineNo; i <= end.lineNo; i++) {
      // unwrap the lines into one line (lines below the LineNoPosition)
      if (i === end.lineNo) {
        linesToCopy.push(
          textbox.props.lines[i].substring(0, end.positionInLine)
        )
        lineNoUnwrap += 1
      } else if (i === start.lineNo) {
        linesToCopy.push(textbox.props.lines[i].substring(start.positionInLine))
      } else {
        linesToCopy.push(textbox.props.lines[i])
        lineNoUnwrap += 1
      }

      for (let rti of rtisSelfByLineNo[i]) {
        if (
          i === end.lineNo &&
          rti.lineNoPosition.positionInLine > end.positionInLine
        ) {
          break
        }

        if (
          i === start.lineNo &&
          rti.lineNoPosition.positionInLine < start.positionInLine
        ) {
          continue
        }

        if (rti.lineNoPosition)
          textbox.richTextInfoClipboard.push({
            lineNoPosition: {
              lineNo: lineNoUnwrap,
              positionInLine:
                rti.lineNoPosition.positionInLine -
                (i === start.lineNo ? start.positionInLine : 0),
            },
            textFormat: {
              font: rti.textFormat.font,
              fontSize: rti.textFormat.fontSize,
              fontColor: rti.textFormat.fontColor,
              italic: rti.textFormat.italic,
              bold: rti.textFormat.bold,
            },
          })
      }
    }
  }

  if (debug) {
    console.log("linesCopy=", linesToCopy)
    console.log("richTextInfoClipboard=", textbox.richTextInfoClipboard)
  }

  for (let i = 0; i < linesToCopy.length; i++) {
    if (i === linesToCopy.length - 1) {
      text += linesToCopy[i]
      break
    }

    text += linesToCopy[i] + "\n"
  }

  navigator.clipboard
    .writeText(text)
    .then()
    .catch((err) => {
      console.error("Failed to copy: ", err)
    })

  navigator.clipboard.readText()

  if (debug) {
    console.log("text=")
    console.log(text)
    console.log("textbox.richTextInfoClipboard=")

    for (let i = 0; i < textbox.richTextInfoClipboard.length; i++) {
      const { lineNo, positionInLine } =
        textbox.richTextInfoClipboard[i].lineNoPosition
      console.log(
        `${i}: (${lineNo}, ${positionInLine})`,
        textbox.richTextInfoClipboard[i].textFormat
      )
    }
  }
}

const paste = (textbox: Textfield, debug?: boolean): void => {
  if (debug) {
    console.log("----paste()----")
  }

  let cursorPos = txt.lineNoPositionToPosition(
    textbox.props.textCursorPosition,
    textbox.props.lines,
    [true]
  )

  navigator.clipboard.readText().then((clipText) => {
    if (debug) {
      console.log("text=")
      console.log(clipText)
      console.log("textbox.richTextInfoClipboard=")

      for (let i = 0; i < textbox.richTextInfoClipboard.length; i++) {
        const { lineNo, positionInLine } =
          textbox.richTextInfoClipboard[i].lineNoPosition
        console.log(
          `${i}: (${lineNo}, ${positionInLine})`,
          textbox.richTextInfoClipboard[i].textFormat
        )
      }
    }

    add(
      clipText,
      textbox.props.textCursorPosition,
      textbox.richTextInfoClipboard,
      textbox,
      debug
    )

    // move cursor to end of added text
    // @Learn I don't understand how new lines in strings magically work in javascript
    cursorPos += clipText.length

    let textCursorPosition = txt.positionToLineNoPosition(
      cursorPos,
      textbox.props.lines,
      [true]
    )

    if (textCursorPosition instanceof Error) {
      console.error(textCursorPosition)
      return
    }

    textbox.props.textCursorPosition = textCursorPosition
    updateTextCursor(textbox)
  })
}

const changeTextformat = (
  textbox: Textfield,
  textFormat: {
    font?: string
    fontSize?: number
    fontColor?: string
    italic?: boolean
    bold?: boolean
    align?: string
  },
  posA: LineNoPosition,
  posB: LineNoPosition,
  debug?: boolean
): void | Error => {
  const isUndefined =
    textFormat.font === undefined &&
    textFormat.fontSize === undefined &&
    textFormat.fontColor === undefined &&
    textFormat.bold === undefined &&
    textFormat.italic === undefined

  const alignExists = textFormat.align

  let { start, end } = txt.sortLineNoPositions(posA, posB)

  if (debug) {
    console.log("----text.changeTextformat()----")
  }

  if (
    textFormat.font &&
    textFormat.fontSize &&
    textFormat.fontColor &&
    textFormat.bold &&
    textFormat.italic
  ) {
    let text = txt.getTextBetween(textbox.props.lines, [true], posA, posB)

    let prevRti = txt.lastRichTextInfo(start, textbox.props.richTextInfos)

    if (prevRti instanceof Error) {
      console.error(prevRti)
      return
    }

    let isPrevTextFormatSame =
      prevRti &&
      prevRti.textFormat.font === textFormat.font &&
      prevRti.textFormat.fontSize === textFormat.fontSize &&
      prevRti.textFormat.fontColor === textFormat.fontColor &&
      prevRti.textFormat.bold === textFormat.bold &&
      prevRti.textFormat.italic === textFormat.italic

    if (debug) {
      console.log(`text.changeTextformat(): text to change: ${text}`)
    }

    remove(start, end, textbox)

    if (isPrevTextFormatSame) {
      add(text, start, [], textbox)
    } else if (!isPrevTextFormatSame) {
      let rti: RichTextInfo = {
        lineNoPosition: { lineNo: 0, positionInLine: 0 },
        textFormat: {
          font: textFormat.font,
          fontSize: textFormat.fontSize,
          fontColor: textFormat.fontColor,
          italic: textFormat.italic,
          bold: textFormat.bold,
        },
      }

      add(text, start, [rti], textbox)
    }
  } else if (isUndefined && !alignExists) {
    console.error(`all values in textFormat are undefined`, textFormat)
    return
  } else if (!isUndefined) {
    // if only a few properties of text format need to be changed:

    let rtisInside = txt.getRichTextInfosBetween(
      textbox.props.richTextInfos,
      start,
      end
    )

    let indexBegin: number | undefined | Error = undefined
    let indexEnd: number | undefined | Error = undefined

    if (debug) {
      console.log(
        "richTextInfos=",
        txt.cloneRichTextInfos(textbox.props.richTextInfos)
      )
      console.log(`text.changeTextformat(): rtisInside=`)
      for (let rti of rtisInside) {
        console.log(txt.cloneRichTextInfo(rti))
      }
    }

    if (rtisInside.length > 0) {
      const firstRti = rtisInside[0]
      const lastRti = rtisInside[rtisInside.length - 1]
      indexBegin = txt.lastRichTextInfoIndex(start, textbox.props.richTextInfos)

      if (indexBegin instanceof Error) {
        console.error(indexBegin)
        return indexBegin
      }

      indexEnd = (indexBegin ? indexBegin : 0) + rtisInside.length
      if (indexEnd > textbox.props.richTextInfos.length - 1)
        indexEnd = textbox.props.richTextInfos.length - 1

      const isFirstRtiAtStart =
        firstRti.lineNoPosition.lineNo === start.lineNo &&
        firstRti.lineNoPosition.positionInLine === start.positionInLine

      const isLastRtiAtEnd =
        lastRti.lineNoPosition.lineNo === end.lineNo &&
        lastRti.lineNoPosition.positionInLine === end.positionInLine

      if (debug) {
        console.log(
          `isFirstRtiAtStart=`,
          isFirstRtiAtStart,
          `isLastRtiAtEnd=`,
          isLastRtiAtEnd,
          `indexBegin=`,
          indexBegin,
          `indexEnd=`,
          indexEnd
        )
      }

      if (!isFirstRtiAtStart) {
        // copy the prev rti to the start and push it to the rtisInside for update
        if (indexBegin !== undefined) {
          const prevRti = textbox.props.richTextInfos[indexBegin]
          const prevRtiCopy = txt.cloneRichTextInfo(prevRti)
          updateObject(prevRtiCopy.textFormat, textFormat)

          let isTextFormatSame =
            (textFormat.font === undefined ||
              textFormat.font === prevRti.textFormat.font) &&
            (textFormat.fontSize === undefined ||
              textFormat.fontSize === prevRti.textFormat.fontSize) &&
            (textFormat.fontColor === undefined ||
              textFormat.fontColor === prevRti.textFormat.fontColor) &&
            (textFormat.bold === undefined ||
              textFormat.bold === prevRti.textFormat.bold) &&
            (textFormat.italic === undefined ||
              textFormat.italic === prevRti.textFormat.italic)
          // (textFormat.underline === undefined ||
          // textFormat.underline === prevRti.textFormat.underline)

          if (!isTextFormatSame) {
            prevRtiCopy.lineNoPosition = { ...start }
            textbox.props.richTextInfos.splice(indexBegin + 1, 0, prevRtiCopy)
            indexEnd += 1
          }

          if (debug) {
            console.log(
              `text.changeTextformat(): copy prevRti to start; prevRti=`,
              prevRti
            )
          }
        }
      }

      if (!isLastRtiAtEnd) {
        // copy the last rti that is between start and end to the end
        // so that text after end is not affected by the update
        const lastRtiCopy = txt.cloneRichTextInfo(lastRti)
        lastRtiCopy.lineNoPosition = { ...end }
        textbox.props.richTextInfos.splice(
          textbox.props.richTextInfos.indexOf(lastRti) + 1,
          0,
          lastRtiCopy
        )

        indexEnd += 1

        if (debug) {
          console.log(
            `text.changeTextformat(): copy last Rti to start; lastRti=`,
            lastRti
          )
        }
      } else if (isLastRtiAtEnd) {
        rtisInside.pop()
      }

      for (let rti of rtisInside) {
        updateObject(rti.textFormat, textFormat)
      }

      if (isFirstRtiAtStart && indexBegin !== undefined && indexBegin > 0) {
        indexBegin--
      }
    } else if (rtisInside.length === 0) {
      // if there are no rtis inside then copy the prevRti to the start, update it
      // and then again copy the prevRti to the end

      indexBegin = txt.lastRichTextInfoIndex(start, textbox.props.richTextInfos)

      if (indexBegin instanceof Error) {
        console.error(indexBegin)
        return indexBegin
      }

      if (indexBegin !== undefined) {
        const prevRti = textbox.props.richTextInfos[indexBegin]
        const prevRtiCopy = txt.cloneRichTextInfo(prevRti)
        updateObject(prevRtiCopy.textFormat, textFormat)

        let isTextFormatSame =
          (textFormat.font === undefined ||
            textFormat.font === prevRti.textFormat.font) &&
          (textFormat.fontSize === undefined ||
            textFormat.fontSize === prevRti.textFormat.fontSize) &&
          (textFormat.fontColor === undefined ||
            textFormat.fontColor === prevRti.textFormat.fontColor) &&
          (textFormat.bold === undefined ||
            textFormat.bold === prevRti.textFormat.bold) &&
          (textFormat.italic === undefined ||
            textFormat.italic === prevRti.textFormat.italic)
        // (textFormat.underline === undefined ||
        // textFormat.underline === prevRti.textFormat.underline)

        if (!isTextFormatSame) {
          // insert the rti if textFormat of prevRti and copy after is not the same
          prevRtiCopy.lineNoPosition = { ...start }
          textbox.props.richTextInfos.splice(indexBegin + 1, 0, prevRtiCopy)
          indexEnd = indexBegin + 1
          if (debug) {
            console.log(
              `text.changeTextformat(): copy prevRti to start; prevRti=`,
              prevRti
            )
          }
        }

        const lastRtiCopy = txt.cloneRichTextInfo(prevRti)
        lastRtiCopy.lineNoPosition = { ...end }
        textbox.props.richTextInfos.splice(indexBegin + 2, 0, lastRtiCopy)
        indexEnd = indexBegin + 1

        if (debug) {
          console.log(
            `text.changeTextformat(): copy last Rti to end; lastRti=`,
            lastRtiCopy
          )
        }
      }
    }

    if (indexBegin !== undefined && indexEnd !== undefined) {
      let rtisToClean = textbox.props.richTextInfos.splice(
        indexBegin,
        indexEnd - indexBegin + 1
      )

      let rtisCleaned = txt.cleanRichTextInfos(rtisToClean)

      if (debug) {
        console.log("indexBegin=", indexBegin)
        console.log("indexEnd=", indexEnd)
        console.log("rtisToClean=", rtisToClean)
        console.log("rtisCleaned=", rtisCleaned)
      }

      textbox.props.richTextInfos.splice(indexBegin, 0, ...rtisCleaned)
    }

    if (debug) {
      console.log(`text.changeTextformat(): rtis in between:`, rtisInside)
      console.log(
        `text.changeTextformat(): textbox.richTextInfos=`,
        textbox.props.richTextInfos.length,
        ...textbox.props.richTextInfos
      )
      console.log("----end----")
    }
  }

  if (alignExists) {
    update(textbox, { align: textFormat.align })
  }

  // updateTextboxShape(textbox)
  updateTextCursor(textbox)
  textbox.events.publish("changedTextFormat", { textFormat })

  return
}

const move = (textbox: Textfield, coords: Vector2D) => {
  let delta = vector.subtract(coords, textbox.props.center)
  drag(textbox, delta)
}

const drag = (textbox: Textfield, delta: Vector2D) => {
  textbox.props.center.x += delta.x
  textbox.props.center.y += delta.y
  textbox.textCoords.x += delta.x
  textbox.textCoords.y += delta.y
  if (textbox.textCursor === undefined) return
  textbox.textCursor.move(delta.x, delta.y)

  textbox.events.publish("drag", { delta })
}

const rotate = (textbox: Textfield, angle: number, about?: Vector2D) => {
  if (about) {
    let r = vector.subtract(textbox.props.center, about)

    move(
      textbox,
      vector.create(
        about.x + Math.cos(angle) * r.x - Math.sin(angle) * r.y,
        about.y + Math.cos(angle) * r.y + Math.sin(angle) * r.x
      )
    )
  }

  let theta = textbox.props.rotation + angle
  theta = geometry.normalizeAngle(theta)

  update(textbox, {
    rotation: theta,
  })
}

const scale = (textbox: Textfield, delta: number) => {
  for (let richTextInfo of textbox.props.richTextInfos) {
    richTextInfo.textFormat.fontSize += delta
  }
}

const update = (textbox: Textfield, args: any): Textfield => {
  updateObject(textbox.props, args)

  if (args.center || args.width || args.height) {
    // Q: if textCoords can be derived from other props why store them?
    // Q: when updateTextboxShape is called, center is updated using textCoords
    // but the textCoords then are again updated here using the center.
    // should the textCoords be updated inside update()?
    updateTextCoords(textbox)
  }

  // NOTE: do not update text cursor here

  textbox.events.publish("update")

  return textbox
}

const areCoordsInside = (
  // ctx: CanvasRenderingContext2D,
  coords: Vector2D,
  textbox: Textfield
): boolean => {
  return geometry.areCoordsInsideBox(coords, {
    center: textbox.props.center,
    width: textbox.props.width + 2 * textbox.props.padding,
    height: textbox.height + 2 * textbox.props.padding,
    rotation: textbox.props.rotation,
  })
}

const isEmpty = (textbox: Textfield): boolean => {
  let lines = textbox.props.lines
  for (let line of lines) {
    if (line.length > 0) return false
  }

  return true
}

const setTyping = (textfield: Textfield, state: boolean) => {
  textfield.typing = state
  return
}

const handlePointerEvents = (textfield: Textfield, pointerEvents: PubSub) => {
  pointerEvents.subscribe("pointer", (pointerInput: inputs.PointerInput) => {
    if (pointerInput === undefined) {
      console.error(`Pointer input is undefined`)
      return
    }

    let clicks = pointerInput.clicks

    // #NOTE: pointerInfo here are transformed to on-board pointerInfo
    switch (pointerInput.inputType) {
      case "down": {
        // pointerInput.coords = vector.scaleSimple(pointerInput.coords, gl.DPR())
        if (!areCoordsInside(pointerInput.coords, textfield)) {
          setTyping(textfield, false)
          textfield.events.publish("deselect")
        } else {
          textfield.typing = true
          setTyping(textfield, true)
        }

        if (clicks === 1) {
          textfield.events.publish("place-cursor", pointerInput.coords)
        } else if (clicks === 2) {
          textfield.events.publish("select-word", pointerInput.coords)
        } else if (clicks === 3) {
          textfield.events.publish("select-line", pointerInput.coords)
        }
        break
      }
    }
  })
}

const handleKeyboardEvents = (textfield: Textfield, keyboardEvents: PubSub) => {
  keyboardEvents.subscribe("key-down", (keyboardInfo: inputs.KeyboardInput) => {
    textfield.events.publish("type", {
      key: keyboardInfo.key,
      modifiers: keyboardInfo.modifiers,
      textFormat: undefined,
    })
  })
}

// const embedTextbox = (
//   scene: Scene,
//   shapeId: string,
//   textboxId: string
// ): void | Error => {
//   scn.repositionShapeId(scene, textboxId, shapeId)

//   let shape = scn.getShapeById(shapeId, scene)
//   if (shape instanceof Error) {
//     return shape
//   }

//   // shape should fit the text when this flag is true
//   let fitTextFlag: boolean = false

//   switch (shape.type) {
//     case "Rectangle": {
//       let textbox = scn.getShapeById(textboxId, scene)

//       if (textbox instanceof Error) {
//         return textbox
//       }

//       if (textbox.type !== "Textbox")
//         return Error(`element at id ${textboxId} is not of type 'Textbox'`)

//       scn.update(scene, shapeId, { textboxId: textboxId })

//       // taking absolute of the width here as it can be negative for rect while resizeing
//       // though it should never be negative initially, as we are using unMirror() but still on the safer side
//       scn.update(scene, textboxId, {
//         width: Math.abs(shape.props.width),
//       })

//       // Q: should updateTextCoords be a part of update()
//       // when wrapping we never change the textCoords only the center based on
//       // the textCoords

//       if (textbox.props.wordWrap === false) {
//         updateTextboxShape(textbox)
//       }

//       // if textbox's height is larger than rect's, textbox will take precedence
//       // increase the rect's height to match the textbox's
//       if (shape.props.height < textbox.height) {
//         scn.update(scene, shapeId, {
//           height: textbox.height,
//         })
//       }

//       scn.update(scene, textboxId, {
//         center: vector.copy(shape.props.center),
//         rotation: shape.props.rotation,
//       })

//       updateTextCursor(textbox)

//       initEventHandler(textbox)

//       textbox.events.subscribe("changedTextFormat", () => {
//         // need to increase the height of the shape after typing
//         // if height is less than needed for the textbox
//         if (shape.props.height < textbox.height) {
//           let delta = textbox.height - shape.props.height

//           scn.update(scene, shapeId, {
//             height: textbox.height,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })

//         if (
//           textbox.props.wordWrap === false &&
//           textbox.props.width > shape.props.width
//         ) {
//           let delta = textbox.props.width - shape.props.width

//           scn.update(scene, shapeId, {
//             width: textbox.props.width,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x + delta / 2,
//               shape.props.center.y
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       textbox.events.subscribe("add", () => {
//         // need to increase the height of the shape after typing
//         // if height is less than needed for the textbox
//         if (shape.props.height < textbox.height) {
//           let delta = textbox.height - shape.props.height

//           scn.update(scene, shapeId, {
//             height: textbox.height,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })

//           fitTextFlag = true
//         }

//         if (
//           textbox.props.wordWrap === false &&
//           textbox.props.width > shape.props.width
//         ) {
//           let delta = textbox.props.width - shape.props.width

//           scn.update(scene, shapeId, {
//             width: textbox.props.width,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x + delta / 2,
//               shape.props.center.y
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       textbox.events.subscribe("remove", () => {
//         // need to increase the height of the shape after typing
//         // if height is less than needed for the textbox
//         // if (shape.props.height < textbox.height) {
//         if (fitTextFlag) {
//           let delta = textbox.height - shape.props.height

//           scn.update(scene, shapeId, {
//             height: textbox.height,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.create(shape.props.center.x, shape.props.center.y),
//         })

//         if (
//           textbox.props.wordWrap === false &&
//           textbox.props.width < shape.props.width
//         ) {
//           let delta = shape.props.width - textbox.props.width

//           scn.update(scene, shapeId, {
//             width: textbox.props.width,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x - delta / 2,
//               shape.props.center.y
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       shape.events.subscribe("resize", (signal: { delta: Vector2D }) => {
//         scn.update(scene, textboxId, {
//           width: Math.abs(shape.props.width),
//         })

//         // if (textbox.props.wordWrap === false) {
//         //   update(textbox, {
//         //     wordWrap: true,
//         //   })
//         // }

//         //FIX: event wrapUpdated is published when updateWrap() is called
//         // so we are performing the same operations twice here

//         // need to increase the height of the shape after typing
//         // if height is less than needed for the textbox
//         if (shape.props.height < textbox.height) {
//           let delta = textbox.height - shape.props.height

//           scn.update(scene, shapeId, {
//             height: textbox.height,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })

//         fitTextFlag = false
//       })

//       shape.events.subscribe(
//         "rotate",
//         (signal: { angle: number; about: Vector2D }) => {
//           // Q: should rotation also be handled through the scene?
//           rotate(textbox, signal.angle, signal.about)
//         }
//       )

//       shape.events.subscribe("scale", (signal: { delta: Vector2D }) => {
//         scn.update(scene, textboxId, {
//           width: Math.abs(shape.props.width),
//         })
//         // if shape's height is less than needed for the textbox
//         // increase the height of the shape
//         if (shape.props.height < textbox.height) {
//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y - shape.props.height / 2 + textbox.height / 2
//             ),
//           })

//           scn.update(scene, shapeId, {
//             height: textbox.height,
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       shape.events.subscribe("drag", (signal: { delta: Vector2D }) => {
//         // Q: should drag also be handled through the scene?
//         // updating the center also updates the textCoords
//         // #TODO: when resizing there is no need to update the center here
//         // as it is updated when the resize event is fired

//         drag(textbox, signal.delta)
//       })

//       break
//     }

//     case "Ellipse": {
//       let textbox = scn.getShapeById(textboxId, scene)

//       if (textbox instanceof Error) {
//         return textbox
//       }

//       let fitTextFlag: boolean = false

//       if (textbox.type !== "Textbox")
//         return Error(`element at id ${textboxId} is not of type 'Textbox'`)

//       scn.update(scene, shapeId, { textboxId: textboxId })

//       // update the wrap width of the textbox to match the ellipse's width
//       scn.update(scene, textboxId, {
//         width: 2 * shape.props.radiusX * Math.cos(Math.PI / 4),
//       })

//       if (textbox.props.wordWrap === false) {
//         updateTextboxShape(textbox)
//       }

//       // if textbox's height is larger than ellipse's, textbox will take precedence
//       // increase the ellipse's height to match the textbox's
//       // #Q: can't we use textbox.height instead of textHeight + padding?
//       if (2 * shape.props.radiusY < textbox.height / Math.sin(Math.PI / 4)) {
//         scn.update(scene, shapeId, {
//           radiusY: textbox.height / Math.sin(Math.PI / 4) / 2,
//         })
//       }

//       scn.update(scene, textboxId, {
//         center: vector.copy(shape.props.center),
//         rotation: shape.props.rotation,
//       })

//       updateTextCursor(textbox)
//       initEventHandler(textbox)

//       textbox.events.subscribe("wrapUpdated", () => {
//         // need to increase the height of the shape after typing
//         // if height is less than needed for the textbox
//         if (shape.props.radiusY < textbox.height / Math.sin(Math.PI / 4) / 2) {
//           let delta =
//             textbox.height / Math.sin(Math.PI / 4) - 2 * shape.props.radiusY

//           scn.update(scene, shapeId, {
//             radiusY: textbox.height / Math.sin(Math.PI / 4) / 2,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       textbox.events.subscribe("add", () => {
//         // type event calls updateWrap() which calls updateTextBoxShape()
//         // it shifts the center of the textbox downwards
//         // now the shape's center needs to be shifted downwards too

//         // need to increase the height of the ellipse after typing
//         // if height is less than needed for the textbox
//         // if (shape.props.radiusY < textbox.height / Math.sin(Math.PI / 4) / 2) {
//         if (shape.props.radiusY < textbox.height / Math.sin(Math.PI / 4) / 2) {
//           let delta =
//             textbox.height / Math.sin(Math.PI / 4) - 2 * shape.props.radiusY

//           scn.update(scene, shapeId, {
//             radiusY: textbox.height / Math.sin(Math.PI / 4) / 2,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })

//           fitTextFlag = true
//         }

//         if (
//           textbox.props.wordWrap === false &&
//           textbox.props.width >
//             2 * (shape.props.radiusX * Math.cos(Math.PI / 4))
//         ) {
//           let delta =
//             textbox.props.width -
//             2 * (shape.props.radiusX * Math.cos(Math.PI / 4))

//           scn.update(scene, shapeId, {
//             width: textbox.props.width,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x + delta / 2,
//               shape.props.center.y
//             ),
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       textbox.events.subscribe("remove", () => {
//         // need to increase the height of the ellipse after typing
//         // if height is less than needed for the textbox
//         // if (shape.props.radiusY < textbox.height / Math.sin(Math.PI / 4) / 2) {
//         if (fitTextFlag) {
//           let delta =
//             textbox.height / Math.sin(Math.PI / 4) - 2 * shape.props.radiusY

//           scn.update(scene, shapeId, {
//             radiusY: textbox.height / Math.sin(Math.PI / 4) / 2,
//           })

//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y + delta / 2
//             ),
//           })

//           if (
//             textbox.props.wordWrap === false &&
//             textbox.props.width <
//               2 * (shape.props.radiusX * Math.cos(Math.PI / 4))
//           ) {
//             let delta =
//               2 * (shape.props.radiusX * Math.cos(Math.PI / 4)) -
//               textbox.props.width

//             scn.update(scene, shapeId, {
//               width: textbox.props.width,
//             })

//             scn.update(scene, shapeId, {
//               center: vector.create(
//                 shape.props.center.x - delta / 2,
//                 shape.props.center.y
//               ),
//             })
//           }
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       shape.events.subscribe("resize", () => {
//         // update the wrap width of the textbox after ellipse is resizeed
//         scn.update(scene, textboxId, {
//           width: 2 * shape.props.radiusX * Math.cos(Math.PI / 4),
//         })

//         //FIX: event wrapUpdated is published whenever updateWrap() is called
//         // so we are performing the same operations twice here
//         // updateWrap(textbox)

//         // if ellipse's height is less than needed for the textbox
//         // increase the height of the ellipse
//         // if (
//         //   2 * (shape.props.radiusY * Math.sin(Math.PI / 4)) <
//         //   textbox.height
//         // ) {
//         //   let delta =
//         //     textbox.height / Math.sin(Math.PI / 4) - 2 * shape.props.radiusY

//         //   scn.update(scene, shapeId, {
//         //     radiusY: textbox.height / Math.sin(Math.PI / 4) / 2,
//         //   })

//         //   scn.update(scene, shapeId, {
//         //     center: vector.create(
//         //       shape.props.center.x,
//         //       shape.props.center.y + delta / 2
//         //       // shape.props.radiusY +
//         //       // textbox.height / Math.sin(Math.PI / 4) / 2
//         //     ),
//         //   })
//         // }

//         // scn.update(scene, textboxId, {
//         //   center: vector.copy(shape.props.center),
//         // })

//         fitTextFlag = false
//       })

//       shape.events.subscribe("scale", () => {
//         // update the wrap width of the textbox after ellipse is resizeed
//         scn.update(scene, textboxId, {
//           width: 2 * shape.props.radiusX * Math.cos(Math.PI / 4),
//         })

//         // updateWrap(textbox)

//         // if ellipse's height is less than needed for the textbox
//         // increase the height of the ellipse
//         if (
//           2 * (shape.props.radiusY * Math.sin(Math.PI / 4)) <
//           textbox.height
//         ) {
//           scn.update(scene, shapeId, {
//             center: vector.create(
//               shape.props.center.x,
//               shape.props.center.y -
//                 shape.props.radiusY +
//                 textbox.height / Math.sin(Math.PI / 4) / 2
//             ),
//           })

//           scn.update(scene, shapeId, {
//             radiusY: textbox.height / Math.sin(Math.PI / 4) / 2,
//           })
//         }

//         scn.update(scene, textboxId, {
//           center: vector.copy(shape.props.center),
//         })
//       })

//       shape.events.subscribe("rotate", (signal: { angle: number }) => {
//         rotate(textbox, signal.angle)
//       })

//       shape.events.subscribe("drag", (signal: { delta: Vector2D }) => {
//         drag(textbox, signal.delta)
//       })
//       break
//     }

//     default: {
//       return Error(
//         `embedTextbox(): type of shape ${shape.type} is not supported`
//       )
//     }
//   }
// }

export {
  draw,
  copy,
  paste,
  changeTextformat,
  create,
  resizeWidth,
  move,
  drag,
  rotate,
  scale,
  update,
  isEmpty,
  updateTextCursor,
  initEventHandler,
  // embedTextbox,
  areCoordsInside,
  setTyping,
  handlePointerEvents,
  handleKeyboardEvents,
}
