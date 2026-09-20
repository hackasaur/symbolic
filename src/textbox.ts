/*
 * textbox related stuff...
 */

import * as vector from "./utils/vector"
import * as geometry from "./utils/geometry"
import * as txt from "./text"
import { updateObject } from "./utils/misc"
import { Vector2D } from "./utils/vector"
import { PubSub, pubSub } from "./utils/pubsub"
import { ModifierKeys } from "./utils/inputs"
import * as inputs from "./utils/inputs"
import * as gl from "./utils/gl"
// import { Tex } from "./tex"
import {
  TextCursor,
  RichTextInfo,
  LineNoPosition,
  WrapInfo,
  TextAlignment,
  TextFormat,
} from "./text"

export interface TextboxArgs {
  center: Vector2D
  lines: string[]
  richTextInfos: RichTextInfo[]
  linespace: number
  padding: number
  textCursorPosition: LineNoPosition
  textCursorWidth: number
  align: TextAlignment
  boxAlign: TextAlignment
  width: number
  height: number,
  rotation: number
  opacity: number
  selectionColor: string,
  selectionRadii: number
  wordWrap: boolean
  scrollable: boolean,
  wrapInfo?: WrapInfo // #CAUTION: assumes the wrapInfo being passed is correct
}

export interface TextboxProps extends TextboxArgs {
  wrapInfo: WrapInfo
}

// #NOTE: posA does not necessarily come before posB
// #Suboptimal: store line heights instead of calculating total height again each time
export interface Textbox {
  type: "Textbox"
  selected: boolean
  props: TextboxProps
  typing: boolean
  selectedTextPos: {
    selected: boolean
    posA: LineNoPosition
    posB: LineNoPosition
  }
  initialLineNoPos: LineNoPosition | undefined // #Q: what is this for?
  height: number // this is textHeight + 2*padding
  textCoords: Vector2D
  arrowUpDownWidth: number | undefined // the width from previous line when navigating using up/down arrows
  textHeight: number // total height of the whole text
  textWidth: number // total width of the whole text
  textCursor: TextCursor | undefined
  richTextInfoClipboard: RichTextInfo[]
  events: PubSub
}

const create = (props: TextboxArgs): Textbox | Error => {
  let lines: string[] = [...props.lines]
  let richTextInfos: RichTextInfo[] = txt.cloneRichTextInfos(
    props.richTextInfos
  )

  if (props.wrapInfo === undefined) {
    if (props.wordWrap === true) {
      let wrap = txt.wrapLines(
        props.lines,
        props.richTextInfos,
        props.width - 2 * props.padding
      )

      if (wrap instanceof Error) return wrap

      lines = wrap.lines
      richTextInfos = wrap.richTextInfos
      props.lines = wrap.lines
      props.richTextInfos = wrap.richTextInfos

      props.wrapInfo = wrap.wrapInfo
    } else {
      props.wrapInfo = []
      for (let i = 0; i < lines.length; i++) {
        props.wrapInfo.push(true)
      }
    }
  }

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

  // props.textCursorPosition = { lineNo: 0, positionInLine: 0 }

  let textbox: Textbox = {
    type: "Textbox",
    selected: false,
    props: {
      center: vector.copy(props.center),
      lines: [...props.lines],
      richTextInfos: txt.cloneRichTextInfos(props.richTextInfos),
      linespace: props.linespace,
      padding: props.padding,
      textCursorPosition: { ...props.textCursorPosition },
      textCursorWidth: props.textCursorWidth,
      align: props.align ? props.align : "Left",
      boxAlign: props.boxAlign ? props.boxAlign : "Center",
      width: props.width,
      height: props.height,
      rotation: props.rotation,
      wordWrap: props.wordWrap,
      opacity: props.opacity,
      wrapInfo: props.wrapInfo,
      scrollable: props.scrollable,
      selectionColor: props.selectionColor,
      selectionRadii: props.selectionRadii,
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

const initEventsHandler = (textbox: Textbox, debug?: boolean) => {
  let eventHandler = textbox.events

  eventHandler.subscribe("select", (pointerCoords: Vector2D) => {
    if (!textbox.typing) {
      return
    }

    let textCursor = textbox.textCursor
    if (textCursor === undefined) return
    let wrapInfo = textbox.props.wrapInfo
    let textHeight = textbox.textHeight

    if (textbox.initialLineNoPos === undefined) {
      //for initializing selection, the pointer coords have to be inside
      if (!areCoordsInside(pointerCoords, textbox)) {
        return
      }

      textbox.initialLineNoPos = { ...textbox.props.textCursorPosition } //lineNoPos
      textbox.selectedTextPos.posA = textbox.initialLineNoPos
      textbox.selectedTextPos.selected = true
    }

    let lineNoPos: LineNoPosition | Error
    let textCoords = textbox.textCoords

    if (textbox.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
      )

      if (lineNoPos instanceof Error) {
        console.error(lineNoPos)
        return lineNoPos
      }
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textbox.props.rotation,
        textbox.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
      )
    }

    if (lineNoPos instanceof Error) {
      console.error(lineNoPos)
      return lineNoPos
    }

    if (lineNoPos.lineNo === -1) {
      //if outside and above textBox select till the beginning of text
      return
    }

    // when pointer is within the height of the textbox but not within the width
    else if (lineNoPos.positionInLine === -1) {
      lineNoPos.positionInLine = textbox.props.lines[lineNoPos.lineNo].length
    }

    textbox.selectedTextPos.posB = { ...lineNoPos }
    textbox.props.textCursorPosition = { ...lineNoPos }
    updateTextCursor(textbox)
  })

  eventHandler.subscribe("place-cursor", (pointerCoords: Vector2D) => {
    if (!textbox.typing) {
      return
    }

    let textCursor = textbox.textCursor
    if (textCursor === undefined) return

    if (!areCoordsInside(pointerCoords, textbox)) {
      return
    }

    // if pointerdown move textCursor to the position of the Pointer
    let lineNoPos: LineNoPosition | Error
    let textCoords = textbox.textCoords

    if (textbox.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
      )
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textbox.props.rotation,
        textbox.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
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
      lineNoPos.positionInLine = textbox.props.lines[lineNoPos.lineNo].length
    }

    textbox.props.textCursorPosition = lineNoPos

    updateTextCursor(textbox)
    textCursor.resetBlinkCycle()

    eventHandler.publish("deselect")
  })

  eventHandler.subscribe("select-word", (pointerCoords: Vector2D) => {
    if (!textbox.typing) {
      return
    }

    let textCursor = textbox.textCursor
    if (textCursor === undefined) return

    if (!areCoordsInside(pointerCoords, textbox)) {
      return
    }

    // if pointerdown move textCursor to the position of the Pointer
    let lineNoPos: LineNoPosition | Error
    let textCoords = textbox.textCoords

    if (textbox.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
      )

      if (lineNoPos instanceof Error) return lineNoPos
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textbox.props.rotation,
        textbox.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
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
      lineNoPos.positionInLine = textbox.props.lines[lineNoPos.lineNo].length
    }

    let lengthOfLine = textbox.props.lines[lineNoPos.lineNo].length

    let start = textbox.props.lines[lineNoPos.lineNo]
      .slice(0, lineNoPos.positionInLine)
      .search(/[\s](?=[^\s]*$)/u)

    let end = textbox.props.lines[lineNoPos.lineNo]
      .slice(lineNoPos.positionInLine)
      .search(/[\s]/gu)

    // if there is no whitespace i.e this is the last word or the only word in the line
    if (end === -1) {
      end = lengthOfLine - lineNoPos.positionInLine
    }

    start += 1
    end = lineNoPos.positionInLine + end

    textbox.selectedTextPos.selected = true
    textbox.selectedTextPos.posA = {
      lineNo: lineNoPos.lineNo,
      positionInLine: start,
    }
    textbox.selectedTextPos.posB = {
      lineNo: lineNoPos.lineNo,
      positionInLine: end,
    }

    textbox.props.textCursorPosition.lineNo = lineNoPos.lineNo
    textbox.props.textCursorPosition.positionInLine = end

    updateTextCursor(textbox)
    textCursor.resetBlinkCycle()
  })

  eventHandler.subscribe("select-line", (pointerCoords: Vector2D) => {
    if (!textbox.typing) {
      return
    }

    let textCursor = textbox.textCursor
    if (textCursor === undefined) return

    if (!areCoordsInside(pointerCoords, textbox)) {
      return
    }

    // if pointerdown move textCursor to the position of the Pointer
    let lineNoPos: LineNoPosition | Error
    let textCoords = textbox.textCoords

    if (textbox.props.rotation === 0) {
      lineNoPos = txt.coordsToLineNoPosition(
        pointerCoords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
      )

      if (lineNoPos instanceof Error) return lineNoPos
    } else {
      let coords = vector.rotate(
        pointerCoords,
        -textbox.props.rotation,
        textbox.props.center
      )

      lineNoPos = txt.coordsToLineNoPosition(
        coords,
        textCoords,
        textbox.props.lines,
        textbox.props.richTextInfos,
        textbox.props.linespace,
        textbox.props.align,
        textbox.textWidth
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
      lineNoPos.positionInLine = textbox.props.lines[lineNoPos.lineNo].length
    }

    let lengthOfLine = textbox.props.lines[lineNoPos.lineNo].length

    textbox.selectedTextPos.selected = true
    textbox.selectedTextPos.posA = {
      lineNo: lineNoPos.lineNo,
      positionInLine: 0,
    }

    textbox.selectedTextPos.posB = {
      lineNo: lineNoPos.lineNo,
      positionInLine: lengthOfLine,
    }

    textbox.props.textCursorPosition.lineNo = lineNoPos.lineNo
    textbox.props.textCursorPosition.positionInLine = lengthOfLine

    updateTextCursor(textbox)
    textCursor.resetBlinkCycle()
  })

  eventHandler.subscribe("deselect", () => {
    textbox.selectedTextPos.selected = false
    textbox.initialLineNoPos = undefined
  })

  eventHandler.subscribe(
    "type",
    (signal: {
      key: string
      modifiers: ModifierKeys
      textFormat: TextFormat | undefined
    }) => {
      if (!textbox.typing) {
        return
      }

      if (debug) {
        console.log("-----event: type-----")
        console.log(
          "textCursor:",
          textbox.props.textCursorPosition.lineNo,
          textbox.props.textCursorPosition.positionInLine
        )

        console.log("textbox.props.richTextInfos=")

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
        console.log("textbox.props.wrapInfo=")
        console.log(...textbox.props.wrapInfo)

        console.log("-----")

        console.log("textbox.props.lines=")
        i = 0
        for (let line of textbox.props.lines) {
          console.log(i, line, line.length)
          i++
        }
      }

      let textCursor = textbox.textCursor
      if (textCursor === undefined) return
      let wrapInfo = textbox.props.wrapInfo

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

      const textIsSelected: boolean = textbox.selectedTextPos.selected

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
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB
          )
          textbox.props.textCursorPosition = { ...start }
          remove(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB,
            textbox
          )
          textbox.selectedTextPos.selected = false
        }

        let pos =
          txt.lineNoPositionToPosition(
            textbox.props.textCursorPosition,
            textbox.props.lines,
            textbox.props.wrapInfo
          ) + 1

        let lineNoPosition = { ...textbox.props.textCursorPosition }

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
            textbox,
            debug
          )
        } else {
          add(key, lineNoPosition, [], textbox, debug)
        }

        let textCursorPosition = txt.positionToLineNoPosition(
          pos,
          textbox.props.lines,
          textbox.props.wrapInfo
        )

        if (textCursorPosition instanceof Error) {
          console.error(textCursorPosition)
          return textCursorPosition
        }

        // NOTE: textCursorPosition cannot be updated before add()
        // as the lineoNoPosition is different after adding
        textbox.props.textCursorPosition = textCursorPosition

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      }

      // ctrl + a
      if (key === "a" && (onlyCtrl || onlyMeta)) {
        textbox.selectedTextPos.selected = true
        textbox.selectedTextPos.posA.lineNo = 0
        textbox.selectedTextPos.posA.positionInLine = 0
        textbox.selectedTextPos.posB.lineNo = textbox.props.lines.length - 1
        textbox.selectedTextPos.posB.positionInLine =
          textbox.props.lines[textbox.props.lines.length - 1].length
        textbox.props.textCursorPosition = { ...textbox.selectedTextPos.posB }
        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
        return
      }

      // ctrl + c
      if (key === "c" && (onlyCtrl || onlyMeta)) {
        if (textbox.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textbox.selectedTextPos.posA,
          textbox.selectedTextPos.posB
        )

        copy(start, end, textbox)
      }

      // ctrl + v
      if (key === "v" && (onlyCtrl || onlyMeta)) {
        if (textbox.selectedTextPos.selected) {
          let { start } = txt.sortLineNoPositions(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB
          )
          textbox.props.textCursorPosition = { ...start }
          remove(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB,
            textbox,
            debug
          )
          textbox.selectedTextPos.selected = false
          updateTextCursor(textbox)
        }

        paste(textbox)
      }

      // ctrl + x
      if (key === "x" && (onlyCtrl || onlyMeta)) {
        if (textbox.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textbox.selectedTextPos.posA,
          textbox.selectedTextPos.posB
        )
        // copy the text first
        copy(start, end, textbox)

        //remove the text and move the textCursor
        remove(
          textbox.selectedTextPos.posA,
          textbox.selectedTextPos.posB,
          textbox
        )
        textbox.props.textCursorPosition = { ...start }
        updateTextCursor(textbox)
        textbox.selectedTextPos.selected = false
        textbox.selectedTextPos.posA = { lineNo: -1, positionInLine: -1 }
        textbox.selectedTextPos.posB = { lineNo: -1, positionInLine: -1 }
      }

      if (key === "b" && (onlyCtrl || onlyMeta)) {
        if (textbox.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textbox.selectedTextPos.posA,
          textbox.selectedTextPos.posB
        )

        const prevRti = txt.lastRichTextInfo(start, textbox.props.richTextInfos)

        if (prevRti instanceof Error) {
          console.error(prevRti)
          return prevRti
        }

        if (prevRti?.textFormat.bold === false) {
          changeTextformat(textbox, { bold: true }, start, end)
        } else {
          changeTextformat(textbox, { bold: false }, start, end)
        }
      }

      if (key === "i" && (onlyCtrl || onlyMeta)) {
        if (textbox.selectedTextPos.selected === false) {
          return
        }

        let { start, end } = txt.sortLineNoPositions(
          textbox.selectedTextPos.posA,
          textbox.selectedTextPos.posB
        )

        const prevRti = txt.lastRichTextInfo(start, textbox.props.richTextInfos)

        if (prevRti instanceof Error) {
          console.error(prevRti)
          return prevRti
        }

        if (prevRti?.textFormat.italic === false) {
          changeTextformat(textbox, { italic: true }, start, end)
        } else {
          changeTextformat(textbox, { italic: false }, start, end)
        }
      }

      // arrows/navigation
      else if (key === "ArrowRight") {
        textbox.arrowUpDownWidth = undefined

        const isInsideLine =
          textbox.props.textCursorPosition.positionInLine + 1 <=
          textbox.props.lines[textbox.props.textCursorPosition.lineNo].length

        let prevLineNoPosition = { ...textbox.props.textCursorPosition }
        let lineNo = textbox.props.textCursorPosition.lineNo
        let positionInLine = textbox.props.textCursorPosition.positionInLine
        let lengthOfLine =
          textbox.props.lines[textbox.props.textCursorPosition.lineNo].length

        //if not inside line at the last line do nothing
        if (
          !isInsideLine &&
          textbox.props.textCursorPosition.lineNo ===
            textbox.props.lines.length - 1
        ) {
          return
        }

        // only ctrl is pressed
        if (onlyCtrl || onlyOption) {
          textbox.selectedTextPos.selected = false
          // wrap to next line if at the end of current line
          if (positionInLine === lengthOfLine) {
            positionInLine = 0
            lineNo++
            lengthOfLine = textbox.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textbox.props.lines[lineNo]
              .slice(positionInLine)
              .search(/[\s]/gu)

            //if there is no whitespace i.e this is the last word or the only word in the line
            if (i === -1) {
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = lengthOfLine
              break
            }
            //the first character is a whitespace
            else if (i === 0) {
              positionInLine++
            } else {
              //if there is whitespace ahead move cursor to that location
              positionInLine += i
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }
        }

        // ctrl + shift
        else if (bothCtrlShift) {
          // first move the cursor the same as onlyCtrl
          let lineNo = textbox.props.textCursorPosition.lineNo
          let positionInLine = textbox.props.textCursorPosition.positionInLine
          let lengthOfLine =
            textbox.props.lines[textbox.props.textCursorPosition.lineNo].length

          //wrap to next line if at the end of current line
          if (positionInLine === lengthOfLine) {
            positionInLine = 0
            lineNo++
            lengthOfLine = textbox.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textbox.props.lines[lineNo]
              .slice(positionInLine)
              .search(/[\s]/gu)

            //if there is no whitespace i.e this is the last word or the only word in the line
            if (i === -1) {
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = lengthOfLine
              break
            }
            //the first character is a whitespace
            else if (i === 0) {
              positionInLine++
            } else {
              //if there is whitespace ahead move cursor to that location
              positionInLine += i
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }

          //if already selected then only set posB
          if (textIsSelected) {
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
          // set both posA and posB
          else {
            textbox.selectedTextPos.selected = true
            textbox.selectedTextPos.posA = prevLineNoPosition
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
        }
        //shift key is pressed
        else if (onlyShift) {
          // cursor is at the end of the current line and is not at the last line
          // move the cursor right by 1 character
          if (
            !isInsideLine &&
            textbox.props.textCursorPosition.lineNo <
              textbox.props.lines.length - 1
          ) {
            textbox.props.textCursorPosition.lineNo++
            textbox.props.textCursorPosition.positionInLine = 0
          } else if (isInsideLine) {
            textbox.props.textCursorPosition.positionInLine++
          }

          // if some text is already selected
          if (textIsSelected) {
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          } else {
            textbox.selectedTextPos.selected = true
            textbox.selectedTextPos.posA = { ...prevLineNoPosition }
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
            // textbox.selectedTextPos.posB.positionInLine++
          }
        }
        // no modifier pressed
        else {
          textbox.selectedTextPos.selected = false
          //cursor is at the end of the current line and is not at the last line
          if (
            !isInsideLine &&
            textbox.props.textCursorPosition.lineNo <
              textbox.props.lines.length - 1
          ) {
            textbox.props.textCursorPosition.lineNo++
            textbox.props.textCursorPosition.positionInLine = 0
          } else if (isInsideLine) {
            textbox.props.textCursorPosition.positionInLine++
          }
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "ArrowLeft") {
        textbox.arrowUpDownWidth = undefined

        const isInsideLine =
          textbox.props.textCursorPosition.positionInLine - 1 >= 0

        // if cursor is at the beginning of the text do nothing
        if (!isInsideLine && textbox.props.textCursorPosition.lineNo === 0) {
          return
        }

        let lineNo = textbox.props.textCursorPosition.lineNo
        let positionInLine = textbox.props.textCursorPosition.positionInLine
        let lengthOfLine =
          textbox.props.lines[textbox.props.textCursorPosition.lineNo].length
        let prevLineNoPosition = { ...textbox.props.textCursorPosition }

        //ctrl is pressed
        if (onlyCtrl || onlyOption) {
          textbox.selectedTextPos.selected = false
          //wrap to prev line if at the beginning of current line
          if (positionInLine === 0) {
            lineNo--
            positionInLine = textbox.props.lines[lineNo].length
            lengthOfLine = textbox.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textbox.props.lines[lineNo]
              .slice(0, positionInLine)
              .search(/[\s](?=[^\s]*$)/u)
            //if there is no whitespace i.e this is the first word or the only word in the line
            if (i === -1) {
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = 0
              break
            }
            //the first character behind is a whitespace
            else if (i === positionInLine - 1) {
              positionInLine--
            } else {
              //if there is whitespace behind move cursor to that location
              positionInLine = i + 1
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }
        }
        // ctrl + shift
        else if (bothCtrlShift) {
          if (positionInLine === 0) {
            lineNo--
            positionInLine = textbox.props.lines[lineNo].length
            lengthOfLine = textbox.props.lines[lineNo].length
          }

          while (positionInLine <= lengthOfLine) {
            let i = textbox.props.lines[lineNo]
              .slice(0, positionInLine)
              .search(/[\s](?=[^\s]*$)/u)
            // if there is no whitespace i.e this is the first word or the only word in the line
            if (i === -1) {
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = 0
              break
            }
            // the first character behind is a whitespace
            else if (i === positionInLine - 1) {
              positionInLine--
            } else {
              // if there is whitespace behind move cursor to that location
              positionInLine = i + 1
              textbox.props.textCursorPosition.lineNo = lineNo
              textbox.props.textCursorPosition.positionInLine = positionInLine
              break
            }
          }

          // if already selected then only set posB
          if (textbox.selectedTextPos.selected) {
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
          // set both posA and posB
          else {
            textbox.selectedTextPos.selected = true
            textbox.selectedTextPos.posA = prevLineNoPosition
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
        } else if (onlyShift) {
          if (!isInsideLine && textbox.props.textCursorPosition.lineNo > 0) {
            textbox.props.textCursorPosition.lineNo--
            textbox.props.textCursorPosition.positionInLine =
              textbox.props.lines[
                textbox.props.textCursorPosition.lineNo
              ].length
          } else if (isInsideLine) {
            textbox.props.textCursorPosition.positionInLine--
          }

          //shift is pressed and some text is already selected
          if (textbox.selectedTextPos.selected) {
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
          //shift is pressed but no text is selected yet
          else {
            textbox.selectedTextPos.selected = true
            textbox.selectedTextPos.posA = {
              ...prevLineNoPosition,
            }
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
        } else {
          textbox.selectedTextPos.selected = false

          //cursor is at the end of the current line and is not at the last line
          // move the cursor to the left by 1 char
          if (!isInsideLine && textbox.props.textCursorPosition.lineNo > 0) {
            textbox.props.textCursorPosition.lineNo--
            textbox.props.textCursorPosition.positionInLine =
              textbox.props.lines[
                textbox.props.textCursorPosition.lineNo
              ].length
          } else if (isInsideLine) {
            textbox.props.textCursorPosition.positionInLine--
          }
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "ArrowUp") {
        let textCursorPosition_prev = { ...textbox.props.textCursorPosition }

        if (textbox.props.textCursorPosition.lineNo - 1 >= 0) {
          if (textbox.arrowUpDownWidth === undefined) {
            let textCursorCoords = txt.lineNoPositionToCoords(
              textbox.props.center,
              textbox.props.textCursorPosition,
              textbox.props.linespace,
              textbox.props.lines,
              textbox.props.richTextInfos,
              textbox.props.align,
              textbox.textWidth
            )

            if (textCursorCoords instanceof Error) {
              console.error(textCursorCoords)
              return textCursorCoords
            }

            textbox.arrowUpDownWidth =
              textCursorCoords.x - textbox.props.center.x
          }

          textbox.props.textCursorPosition.lineNo--

          let positionInLine = txt.widthToPositionInLine(
            textbox.arrowUpDownWidth,
            textbox.props.lines,
            textbox.props.textCursorPosition.lineNo,
            textbox.props.richTextInfos,
            textbox.props.align
          )

          if (positionInLine instanceof Error) {
            console.error(positionInLine)
            return positionInLine
          }

          textbox.props.textCursorPosition.positionInLine = positionInLine
        } else {
          textbox.props.textCursorPosition.positionInLine = 0
        }

        //shift is pressed and some text is already selected
        if (signal.modifiers["Shift"] && textbox.selectedTextPos.selected) {
          if (
            textbox.selectedTextPos.posA.lineNo ===
              textCursorPosition_prev.lineNo &&
            textbox.selectedTextPos.posA.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textbox.selectedTextPos.posA = {
              ...textbox.props.textCursorPosition,
            }
          } else if (
            textbox.selectedTextPos.posB.lineNo ===
              textCursorPosition_prev.lineNo &&
            textbox.selectedTextPos.posB.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
        }
        //shift is pressed but no text is selected yet
        else if (signal.modifiers["Shift"]) {
          textbox.selectedTextPos.selected = true
          textbox.selectedTextPos.posA = { ...textCursorPosition_prev }
          textbox.selectedTextPos.posB = { ...textbox.props.textCursorPosition }
        }
        //some text is selected but shift is not pressed
        else if (textbox.selectedTextPos.selected) {
          textbox.selectedTextPos.selected = false
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "ArrowDown") {
        let textCursorPosition_prev = { ...textbox.props.textCursorPosition }

        if (
          textbox.props.textCursorPosition.lineNo + 1 <
          textbox.props.lines.length
        ) {
          if (textbox.arrowUpDownWidth === undefined) {
            let textCursorCoords = txt.lineNoPositionToCoords(
              textbox.props.center,
              textbox.props.textCursorPosition,
              textbox.props.linespace,
              textbox.props.lines,
              textbox.props.richTextInfos,
              textbox.props.align,
              textbox.textWidth
            )

            if (textCursorCoords instanceof Error) {
              console.error(textCursorCoords)
              return textCursorCoords
            }

            textbox.arrowUpDownWidth =
              textCursorCoords.x - textbox.props.center.x
          }

          textbox.props.textCursorPosition.lineNo++

          let positionInLine = txt.widthToPositionInLine(
            textbox.arrowUpDownWidth,
            textbox.props.lines,
            textbox.props.textCursorPosition.lineNo,
            textbox.props.richTextInfos,
            textbox.props.align
          )

          if (positionInLine instanceof Error) {
            console.error(positionInLine)
            return positionInLine
          }

          textbox.props.textCursorPosition.positionInLine = positionInLine
        } else {
          textbox.props.textCursorPosition.positionInLine =
            textbox.props.lines[textbox.props.lines.length - 1].length
        }

        // shift is pressed and some text is already selected
        if (signal.modifiers["Shift"] && textIsSelected) {
          if (
            textbox.selectedTextPos.posA.lineNo ===
              textCursorPosition_prev.lineNo &&
            textbox.selectedTextPos.posA.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textbox.selectedTextPos.posA = {
              ...textbox.props.textCursorPosition,
            }
          } else if (
            textbox.selectedTextPos.posB.lineNo ===
              textCursorPosition_prev.lineNo &&
            textbox.selectedTextPos.posB.positionInLine ===
              textCursorPosition_prev.positionInLine
          ) {
            textbox.selectedTextPos.posB = {
              ...textbox.props.textCursorPosition,
            }
          }
        }
        //shift is pressed but no text is selected yet
        else if (signal.modifiers["Shift"]) {
          textbox.selectedTextPos.selected = true
          textbox.selectedTextPos.posA = { ...textCursorPosition_prev }
          textbox.selectedTextPos.posB = { ...textbox.props.textCursorPosition }
        }
        //some text is selected but shift is not pressed
        else if (textIsSelected) {
          textbox.selectedTextPos.selected = false
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "Backspace") {
        const { lineNo, positionInLine } = textbox.props.textCursorPosition

        //backspace when text is selected
        if (textIsSelected) {
          let { start } = txt.sortLineNoPositions(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB
          )
          let pos_new = txt.lineNoPositionToPosition(
            start,
            textbox.props.lines,
            textbox.props.wrapInfo
          )

          remove(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB,
            textbox
          )

          let positionNew = txt.positionToLineNoPosition(
            pos_new,
            textbox.props.lines,
            textbox.props.wrapInfo
          )

          if (positionNew instanceof Error) {
            console.error(positionNew)
            return positionNew
          }

          textbox.props.textCursorPosition = positionNew

          textbox.selectedTextPos.selected = false
          textbox.selectedTextPos.posA = { lineNo: -1, positionInLine: -1 }
          textbox.selectedTextPos.posB = { lineNo: -1, positionInLine: -1 }

          updateTextCursor(textbox)
          textbox.events.publish("deselect")
          return
        }

        let lineNoPosition_new: LineNoPosition = { lineNo, positionInLine }

        let pos_new = txt.lineNoPositionToPosition(
          lineNoPosition_new,
          textbox.props.lines,
          textbox.props.wrapInfo
        )

        if (positionInLine === 0) {
          // backspace from start of line
          // if at the start of document do nothing
          if (lineNo === 0) {
            return
          }

          lineNoPosition_new.lineNo--

          if (wrapInfo[lineNo]) {
            lineNoPosition_new.positionInLine =
              textbox.props.lines[lineNo - 1].length
          } else {
            lineNoPosition_new.positionInLine =
              textbox.props.lines[lineNo - 1].length - 1
          }
        } else {
          // if not at the start of a line
          lineNoPosition_new.positionInLine--
        }

        pos_new = txt.lineNoPositionToPosition(
          lineNoPosition_new,
          textbox.props.lines,
          textbox.props.wrapInfo
        )

        remove(
          lineNoPosition_new,
          textbox.props.textCursorPosition,
          textbox,
          debug
        )

        let positionNew = txt.positionToLineNoPosition(
          pos_new,
          textbox.props.lines,
          textbox.props.wrapInfo
        )

        if (positionNew instanceof Error) {
          console.error(positionNew)
          return positionNew
        }

        // Q: should the textCursorPosition be updated before or after remove is called?
        textbox.props.textCursorPosition = positionNew

        if (debug) {
          console.log("old textCursorPosition=", lineNo, positionInLine)

          console.log(
            "new textCursorPosition=",
            textbox.props.textCursorPosition.lineNo,
            textbox.props.textCursorPosition.positionInLine
          )
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "Enter") {
        if (textIsSelected) {
          let { start } = txt.sortLineNoPositions(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB
          )

          remove(
            textbox.selectedTextPos.posA,
            textbox.selectedTextPos.posB,
            textbox,
            debug
          )

          textbox.events.publish("deselect")

          add("\n", start, [], textbox, debug)
        } else {
          add("\n", textbox.props.textCursorPosition, [], textbox, debug)
        }

        textbox.props.textCursorPosition.lineNo++
        textbox.props.textCursorPosition.positionInLine = 0
        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "PageUp") {
        textbox.props.textCursorPosition.lineNo = 0
        textbox.props.textCursorPosition.positionInLine = 0
        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "PageDown") {
        textbox.props.textCursorPosition.lineNo = textbox.props.lines.length - 1
        textbox.props.textCursorPosition.positionInLine =
          textbox.props.lines[textbox.props.lines.length - 1].length
        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "Home") {
        let prevLineNoPosition = { ...textbox.props.textCursorPosition }
        textbox.props.textCursorPosition.positionInLine = 0

        if (textIsSelected && onlyShift) {
          textbox.selectedTextPos.posB = {
            ...textbox.props.textCursorPosition,
          }
        } else if (onlyShift) {
          textbox.selectedTextPos.selected = true
          textbox.selectedTextPos.posA = { ...prevLineNoPosition }
          textbox.selectedTextPos.posB = {
            ...textbox.props.textCursorPosition,
          }
        } else if (textIsSelected && !onlyShift) {
          textbox.selectedTextPos.selected = false
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "End") {
        let prevLineNoPosition = { ...textbox.props.textCursorPosition }
        textbox.props.textCursorPosition.positionInLine =
          textbox.props.lines[textbox.props.textCursorPosition.lineNo].length

        if (textIsSelected && onlyShift) {
          textbox.selectedTextPos.posB = {
            ...textbox.props.textCursorPosition,
          }
        } else if (onlyShift) {
          textbox.selectedTextPos.selected = true
          textbox.selectedTextPos.posA = { ...prevLineNoPosition }
          textbox.selectedTextPos.posB = {
            ...textbox.props.textCursorPosition,
          }
        } else if (textIsSelected && !onlyShift) {
          textbox.selectedTextPos.selected = false
        }

        updateTextCursor(textbox)
        textCursor.resetBlinkCycle()
      } else if (key === "Escape") {
        // textbox.selected = false
        textbox.typing = false
        textbox.selectedTextPos.selected = false
      }
    }
  )

  eventHandler.subscribe("opEnd", () => {
    textbox.initialLineNoPos = undefined
  })
}

const draw = (
  ctx: CanvasRenderingContext2D,
  textbox: Textbox,
  debug?: boolean
) => {
  if (textbox.selectedTextPos.selected === true) {
    highlightText(
      ctx,
      textbox,
      textbox.selectedTextPos.posA,
      textbox.selectedTextPos.posB,
      textbox.props.selectionColor,
      textbox.props.selectionRadii,
      undefined,
      debug
    )
  }

  if (textbox.props.rotation !== 0) {
    ctx.save()
    ctx.translate(textbox.props.center.x, textbox.props.center.y)
    ctx.rotate(textbox.props.rotation)
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
    }
  } else {
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
    }
  }

  if (textbox.props.rotation !== 0) {
    ctx.restore()
  }

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

const resizeWidth = (textbox: Textbox, delta: number): void => {
  textbox.props.width += delta

  if (textbox.props.width < 0) {
    textbox.props.width = 0
  }

  updateWrap(textbox)
  textbox.events.publish("resizeWidth")

  return
}

const highlightText = (
  ctx: CanvasRenderingContext2D,
  textbox: Textbox,
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
      textbox.props.selectionRadii
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
  textbox: Textbox,
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

const updateTextboxShape = (textbox: Textbox) => {
  // calculates the textHeight using text.totalHeight()
  // updates textbox's height to be the textHeight + 2*padding
  // and the textbox's center to be halfway between the textCoords and the textHeight
  // NOTE: it does not change the textCoords only shifts the center and height of the textbox
  // keeping the textCoords the same. Basically the texbox grows from the bottom
  // which is needed when typing
  textbox.textHeight = txt.totalHeight(
    textbox.props.lines,
    textbox.props.richTextInfos,
    textbox.props.linespace
  )

  // move the center (textbox.props.coords) to the center of the text vertically, make the height same as textHeight
  textbox.height = textbox.textHeight + 2 * textbox.props.padding

  let textWidth = txt.longestLineWidth(
    textbox.props.lines,
    textbox.props.richTextInfos
  )

  if (textWidth instanceof Error) {
    console.error(textWidth)
    return textWidth
  }

  textbox.textWidth = textWidth

  // NOTE: update() also calls updateTextCoords()
  update(textbox, {
    center: vector.create(
      textbox.props.center.x,
      textbox.textCoords.y + textbox.textHeight / 2
    ),
  })

  if (textbox.props.wordWrap === false) {
    update(textbox, { width: textbox.textWidth + 2 * textbox.props.padding })
  }
}

const updateTextCoords = (textbox: Textbox): void | Error => {
  // updates the textCoords using the center and height of the textbox
  // #TODO: the center and textCoords should always be linked
  let textWidth = txt.longestLineWidth(
    textbox.props.lines,
    textbox.props.richTextInfos
  )

  if (textWidth instanceof Error) {
    console.error(textWidth)
    return textWidth
  }

  let metrics = gl.measureText("|", textbox.props.richTextInfos[0].textFormat)
  if (metrics instanceof Error) {
    console.error(metrics)
    return metrics
  }

  textbox.textWidth = textWidth

  // if (textbox.props.boxAlign === "Center")
  //   textbox.textCoords = vector.create(
  //     center.x - textWidth / 2,
  //     center.y -
  //       textbox.height / 2 +
  //       padding -
  //       2 * (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent)
  //   )
  // } else if (textbox.props.boxAlign === "Right") {
  //   textbox.textCoords = vector.create(
  //     center.x + (textbox.props.width / 2 - textWidth) - padding,
  //     center.y - textbox.height / 2 + padding
  //   )
  // } else if (textbox.props.boxAlign === "Left") {
  //   textbox.textCoords = vector.create(
  //     center.x - textbox.props.width / 2 + padding,
  //     center.y - textbox.height / 2 + padding
  //   )
  // }

}

const updateWrap = (textbox: Textbox): void | Error => {
  // @subOptimal: can cache the unwrapped lines
  // #Q: width has no meaning if wordwrap is false?
  if (!textbox.props.wordWrap) {
    return
  }

  let positionInText = txt.lineNoPositionToPosition(
    textbox.props.textCursorPosition,
    textbox.props.lines,
    textbox.props.wrapInfo
  )

  let posA = txt.lineNoPositionToPosition(
    textbox.selectedTextPos.posA,
    textbox.props.lines,
    textbox.props.wrapInfo
  )
  let posB = txt.lineNoPositionToPosition(
    textbox.selectedTextPos.posB,
    textbox.props.lines,
    textbox.props.wrapInfo
  )

  let unwrap = txt.unwrapLines(
    textbox.props.lines,
    textbox.props.wrapInfo,
    textbox.props.richTextInfos
  )

  if (unwrap instanceof Error) {
    console.error(unwrap)
    return unwrap
  }

  const wrap = txt.wrapLines(
    unwrap.lines,
    unwrap.richTextInfos,
    textbox.props.width - 2 * textbox.props.padding
  )

  if (wrap instanceof Error) {
    console.error(wrap)
    return wrap
  }

  textbox.props.lines = wrap.lines
  textbox.props.richTextInfos = wrap.richTextInfos
  textbox.props.wrapInfo = wrap.wrapInfo

  let lineNoPosA = txt.positionToLineNoPosition(
    posA,
    textbox.props.lines,
    textbox.props.wrapInfo
  )

  if (lineNoPosA instanceof Error) {
    console.error(lineNoPosA)
    return lineNoPosA
  }

  textbox.selectedTextPos.posA = lineNoPosA

  let lineNoPosB = txt.positionToLineNoPosition(
    posB,
    textbox.props.lines,
    textbox.props.wrapInfo
  )

  if (lineNoPosB instanceof Error) {
    console.error(lineNoPosB)
    return lineNoPosB
  }

  textbox.selectedTextPos.posB = lineNoPosB

  updateTextboxShape(textbox)

  let textCursorPosition = txt.positionToLineNoPosition(
    positionInText,
    textbox.props.lines,
    textbox.props.wrapInfo
  )

  if (textCursorPosition instanceof Error) {
    console.error(textCursorPosition)
    return textCursorPosition
  }

  textbox.props.textCursorPosition = textCursorPosition

  updateTextCursor(textbox)
  textbox.events.publish("wrapUpdated")
}

const add = (
  text: string,
  lineNoPosition: LineNoPosition,
  richTextInfos: RichTextInfo[],
  textbox: Textbox,
  debug?: boolean
) => {
  txt.add(
    lineNoPosition,
    text,
    richTextInfos,
    textbox.props.lines,
    textbox.props.richTextInfos,
    textbox.props.wrapInfo,
    textbox.props.width - 2 * textbox.props.padding,
    textbox.props.wordWrap,
    debug
  )

  // #subOptimal: this recalculates the height of the entire textbox instead of
  // just calculating the difference between the height of the affected lines
  updateTextboxShape(textbox)

  textbox.events.publish("add", {
    text,
    lineNoPosition,
    richTextInfos: richTextInfos,
  })
}

const remove = (
  posA: LineNoPosition,
  posB: LineNoPosition,
  textbox: Textbox,
  debug?: boolean
) => {
  txt.remove(
    posA,
    posB,
    textbox.props.lines,
    textbox.props.richTextInfos,
    textbox.props.wrapInfo,
    textbox.props.width - 2 * textbox.props.padding,
    textbox.props.wordWrap,
    debug
  )

  // #subOptimal: this recalculates the height of the entire textbox instead of
  // just calculating the difference between the height of the affected lines
  updateTextboxShape(textbox)
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
  textbox: Textbox,
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
      if (textbox.props.wrapInfo[i] === true) {
        if (i === end.lineNo) {
          linesToCopy.push(
            textbox.props.lines[i].substring(0, end.positionInLine)
          )
          lineNoUnwrap += 1
        } else if (i === start.lineNo) {
          linesToCopy.push(
            textbox.props.lines[i].substring(start.positionInLine)
          )
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
      } else {
        // shift up below rtis into the same line (push them to textbox.richTextInfoClipboard)
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

          textbox.richTextInfoClipboard.push({
            lineNoPosition: {
              lineNo: lineNoUnwrap,
              positionInLine:
                rti.lineNoPosition.positionInLine +
                (i === start.lineNo
                  ? -start.positionInLine
                  : linesToCopy[lineNoUnwrap].length),
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

        if (i === end.lineNo) {
          linesToCopy[lineNoUnwrap] += textbox.props.lines[i].substring(
            0,
            end.positionInLine
          )
        } else if (i === start.lineNo) {
          linesToCopy.push(
            textbox.props.lines[i].substring(start.positionInLine)
          )
        } else {
          linesToCopy[lineNoUnwrap] += textbox.props.lines[i]
        }
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

const paste = (textbox: Textbox, debug?: boolean): void => {
  if (debug) {
    console.log("----paste()----")
  }

  let cursorPos = txt.lineNoPositionToPosition(
    textbox.props.textCursorPosition,
    textbox.props.lines,
    textbox.props.wrapInfo
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
      textbox.props.wrapInfo
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
  textbox: Textbox,
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
    let text = txt.getTextBetween(
      textbox.props.lines,
      textbox.props.wrapInfo,
      posA,
      posB
    )

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

  updateWrap(textbox)
  if (textbox.props.wordWrap === false) {
    updateTextboxShape(textbox)
  }
  updateTextCursor(textbox)
  textbox.events.publish("changedTextFormat", { textFormat })

  return
}

const move = (textbox: Textbox, coords: Vector2D) => {
  let delta = vector.subtract(coords, textbox.props.center)
  drag(textbox, delta)
}

const drag = (textbox: Textbox, delta: Vector2D) => {
  textbox.props.center.x += delta.x
  textbox.props.center.y += delta.y
  textbox.textCoords.x += delta.x
  textbox.textCoords.y += delta.y
  if (textbox.textCursor === undefined) return
  textbox.textCursor.move(delta.x, delta.y)

  textbox.events.publish("drag", { delta })
}

const rotate = (textbox: Textbox, angle: number, about?: Vector2D) => {
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

const scale = (textbox: Textbox, delta: number) => {
  for (let richTextInfo of textbox.props.richTextInfos) {
    richTextInfo.textFormat.fontSize += delta
  }
}

const unMirror = (textbox: Textbox) => {
  textbox.props.width = Math.abs(textbox.props.width)
  textbox.height = Math.abs(textbox.height)
}

const update = (textbox: Textbox, args: any): Textbox => {
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
  textbox: Textbox
): boolean => {
  return geometry.areCoordsInsideBox(coords, {
    center: textbox.props.center,
    width: textbox.props.width,
    height: textbox.height,
    rotation: textbox.props.rotation,
  })
}

const isEmpty = (textbox: Textbox): boolean => {
  let lines = textbox.props.lines
  for (let line of lines) {
    if (line.length > 0) return false
  }

  return true
}

const setTyping = (textfield: Textbox, state: boolean) => {
  textfield.typing = state
  return
}

const handlePointerEvents = (textfield: Textbox, pointerEvents: PubSub) => {
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

const handleKeyboardEvents = (textfield: Textbox, keyboardEvents: PubSub) => {
  keyboardEvents.subscribe("key-down", (keyboardInfo: inputs.KeyboardInput) => {
    textfield.events.publish("type", {
      key: keyboardInfo.key,
      modifiers: keyboardInfo.modifiers,
      textFormat: undefined,
    })
  })
}

// create a hidden input html element
// when a textbox is click

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
  updateWrap,
  updateTextCursor,
  initEventsHandler,
  handleKeyboardEvents,
  handlePointerEvents,
  add,
  remove,
  areCoordsInside
}
