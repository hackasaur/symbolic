import * as vector from "./utils/vector"
import * as gl from "./utils/gl"
// import * as tex from "./tex"
import * as geometry from "./utils/geometry"
import { Vector2D } from "./utils/vector"
import { Easing, Tween } from "@tweenjs/tween.js"

export interface TextCursor {
  props: {
    coords: Vector2D
    color: string
    width: number
    height: number
    textFormat: TextFormat
  }
  draw: (gl: CanvasRenderingContext2D) => void
  update: (coords: Vector2D, textFormat: TextFormat) => void
  move: (deltaX: number, deltaY: number) => void
  path: Path2D
  resetBlinkCycle: () => void
}

export interface TextFormat {
  font: string
  fontSize: number
  fontColor: string
  italic: boolean
  bold: boolean
}

export interface LineNoPosition {
  lineNo: number
  positionInLine: number
}

export interface RichTextInfo {
  lineNoPosition: LineNoPosition
  textFormat: TextFormat
}

export type TextAlignment = "Left" | "Center" | "Right" | "Justify"

export type WrapInfo = boolean[]

const nonCharacterKeys: string[] = [
  "Backspace",
  "Enter",
  "Alt",
  "AltGraph",
  "Control",
  "Shift",
  "Meta",
  "Escape",
  "Delete",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F12",
  "ArrowUp",
  "ArrowDown",
  "ArrowRight",
  "ArrowLeft",
  "Tab",
  "Home",
  "End",
  "PageDown",
  "PageUp",
  "Insert",
]

// #TODO: break text cursor into seperate functions
const createTextCursor = (
  coords: Vector2D,
  width: number,
  textFormat: TextFormat
): TextCursor => {
  const props = {
    coords: vector.create(coords.x, coords.y),
    color: textFormat.fontColor,
    width: width,
    height: textFormat.fontSize, //ctx.measureText('|').fontBoundingBoxAscent ,
    textFormat: textFormat,
  }

  let animProps = { alpha: 1 }
  let blinkTween = new Tween({ alpha: animProps.alpha })
    .to({ alpha: 0 }, 500)
    .easing(Easing.Linear.InOut)
    .yoyo(true)
    .delay(100)
    .repeat(Infinity)
    .onUpdate((object) => {
      animProps.alpha = object.alpha
    })
    .start()

  const resetBlinkCycle = () => {
    blinkTween.stop().start()
  }

  const draw = (ctx: CanvasRenderingContext2D): void => {
    ctx.fillStyle = props.color
    ctx.globalAlpha = animProps.alpha
    ctx.fillRect(
      props.coords.x,
      props.coords.y,
      props.width,
      props.height + props.textFormat.fontSize / 4
    )
    ctx.globalAlpha = 1

    blinkTween.update()
  }

  const update = (coords: Vector2D, textFormat: TextFormat) => {
    props.coords = vector.create(coords.x, coords.y)
    // TODO: fix textCursor height does not match font height
    // let textMetrics = gl.measureText("|", textFormat)
    // if (textMetrics instanceof Error) return vector.create(0, 0)
    // let fontHeight =
    //   textMetrics.fontBoundingBoxAscent === undefined
    //     ? textFormat.fontSize
    //     : textMetrics.fontBoundingBoxAscent
    props.height = textFormat.fontSize
    props.color = textFormat.fontColor
    props.textFormat = textFormat
    textCursor.path = getPath(props)
  }

  const move = (deltaX: number, deltaY: number) => {
    props.coords = vector.add(props.coords, vector.create(deltaX, deltaY))
  }

  const getPath = (props: {
    coords: Vector2D
    width: number
    height: number
    textFormat: TextFormat
  }): Path2D => {
    let path = new Path2D()
    path.rect(
      props.coords.x,
      props.coords.y + props.textFormat.fontSize / 2,
      props.width,
      props.height
    )
    return path
  }

  let textCursor = {
    props,
    draw,
    update,
    move,
    path: getPath(props),
    resetBlinkCycle,
  }

  return textCursor
}

const cloneRichTextInfos = (richTextInfos: RichTextInfo[]): RichTextInfo[] => {
  let copy: RichTextInfo[] = []

  for (let richTextInfo of richTextInfos) {
    const { lineNoPosition, textFormat } = richTextInfo

    copy.push(cloneRichTextInfo(richTextInfo))
  }

  return copy
}

const cloneRichTextInfo = (richTextInfo: RichTextInfo): RichTextInfo => {
  const { lineNoPosition, textFormat } = richTextInfo

  return {
    lineNoPosition: {
      lineNo: lineNoPosition.lineNo,
      positionInLine: lineNoPosition.positionInLine,
    },
    textFormat: {
      font: textFormat.font,
      fontSize: textFormat.fontSize,
      fontColor: textFormat.fontColor,
      italic: textFormat.italic,
      bold: textFormat.bold,
    },
  }
}

const sortLineNoPositions = (
  posA: LineNoPosition,
  posB: LineNoPosition
): { start: LineNoPosition; end: LineNoPosition } => {
  //find which comes first posA or posB
  let start: LineNoPosition
  let end: LineNoPosition
  if (posA.lineNo > posB.lineNo) {
    start = posB
    end = posA
  } else if (posA.lineNo === posB.lineNo) {
    if (posA.positionInLine > posB.positionInLine) {
      start = posB
      end = posA
    } else {
      // does this also when positionInLines are equal
      start = posA
      end = posB
    }
  } else {
    start = posA
    end = posB
  }

  return { start, end }
}

const lastRichTextInfoIndex = (
  lineNoPosition: LineNoPosition,
  richTextInfos: RichTextInfo[]
): number | Error => {
  // get the RichTextInfo that came before the given lineNoPosition
  // NOTE: this function assumes that richTextInfos are in ascending order

  if (lineNoPosition.lineNo < 0 || lineNoPosition.positionInLine < 0) {
    return Error(
      `lastRichTextInfo(): lineNo or positionInLine ${lineNoPosition} cannot be less than 0`
    )
  }

  if (richTextInfos.length === 0) {
    return Error(`lastRichTextInfo(): richTextInfos.length cannot be 0`)
  }

  let lastRichTextInfoIndex: number = 0

  for (let i = 0; i < richTextInfos.length; i++) {
    let richTextInfo = richTextInfos[i]
    let { lineNoPosition: r_lineNoPosition } = richTextInfo
    if (
      r_lineNoPosition.lineNo > lineNoPosition.lineNo ||
      (r_lineNoPosition.lineNo === lineNoPosition.lineNo &&
        r_lineNoPosition.positionInLine > lineNoPosition.positionInLine)
    ) {
      break
    }
    lastRichTextInfoIndex = i
  }

  return lastRichTextInfoIndex
}

const lastRichTextInfo = (
  lineNoPosition: LineNoPosition,
  richTextInfos: RichTextInfo[]
): RichTextInfo | Error => {
  // #NOTE: use lastRichTextInfoIndex() instead of this function
  // #TODO: remove this function
  let index = lastRichTextInfoIndex(lineNoPosition, richTextInfos)
  if (index instanceof Error) return index

  let lastRichTextInfo: RichTextInfo = richTextInfos[index]

  lastRichTextInfo = cloneRichTextInfo(lastRichTextInfo)

  return lastRichTextInfo
}

const calculateLineWidth = (
  lineNo: number,
  line: string,
  richTextInfos: RichTextInfo[]
): number | Error => {
  // @Design calculateLineWidth should not require the `line` argument, it should be `lines` instead.
  // but it is useful to find the length of the partial line and not just the whole.
  // maybe a function like :
  // calculateWidthBetweenPositionsInLine(positionInLineStart, positionInLineEnd, lineNo, lines, richTextInfos)

  let currentTextFormat: TextFormat = richTextInfos[0].textFormat
  let width: number = 0
  let isTextFormatSame: boolean = true
  let lastPosition: number = 0

  for (let richTextInfo of richTextInfos) {
    let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
      richTextInfo.lineNoPosition
    let textFormat = richTextInfo.textFormat

    if (r_lineNo <= lineNo) {
      if (r_lineNo === lineNo) {
        // there are richTextInfos within the line
        isTextFormatSame = false
        // setCtxFont(ctx, currentTextFormat)
        let substring = line.substring(lastPosition, r_positionInLine)
        let metrics = gl.measureText(substring, currentTextFormat)
        if (metrics instanceof Error) return metrics

        width += metrics.width
        lastPosition = r_positionInLine
      }
      currentTextFormat = textFormat
    } else {
      break
    }
  }

  if (isTextFormatSame) {
    // i.e. there are no richTextInfos within the line
    let metrics = gl.measureText(line, currentTextFormat)
    if (metrics instanceof Error) return metrics

    width = metrics.width
  } else {
    // add width of the remaining substring of the line
    let metrics = gl.measureText(
      line.substring(lastPosition),
      currentTextFormat
    )

    if (metrics instanceof Error) return metrics

    width += metrics.width
  }

  return width
}

const calculateLineWidthRltv = (
  line: string,
  richTextInfos: RichTextInfo[],
  prevRichTextInfo: RichTextInfo | undefined
): number | Error => {
  // calculates the lineWidth of a line (/string) given the richTextInfos in that line
  // richTextInfos must be within the same line.
  // this funcition assumes richTextInfos are in ascending order
  if (prevRichTextInfo === undefined) {
    if (richTextInfos.length === 0) {
      return Error(
        `if prevRichTextInfo is undefined then richTextInfos's cannot be empty (${prevRichTextInfo}, ${richTextInfos})`
      )
    } else if (richTextInfos[0].lineNoPosition.positionInLine !== 0) {
      return Error(
        `calculateLineWidthRltv(): if prevRichTextInfo is undefined then richTextInfos[0]'s positionInLine must be 0 (positionInLine=${richTextInfos[0].lineNoPosition.positionInLine})`
      )
    } else {
      prevRichTextInfo = richTextInfos[0]
    }
  }

  let currentTextFormat: TextFormat = prevRichTextInfo.textFormat
  let width: number = 0
  let isTextFormatSame: boolean = richTextInfos.length === 0 ? true : false
  let lastPosition: number = 0
  let lineNoCheck =
    richTextInfos.length > 0 ? richTextInfos[0].lineNoPosition.lineNo : 0

  for (let richTextInfo of richTextInfos) {
    let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
      richTextInfo.lineNoPosition

    if (r_lineNo !== lineNoCheck) {
      return Error(
        `calculateLineWidthRltv(): lineNos do not match with ${richTextInfo} (${lineNoCheck}!=${r_lineNo})`
      )
    }

    let textFormat = richTextInfo.textFormat

    let substring = line.substring(lastPosition, r_positionInLine)
    let metrics = gl.measureText(substring, currentTextFormat)
    if (metrics instanceof Error) return metrics

    width += metrics.width
    lastPosition = r_positionInLine
    currentTextFormat = textFormat
  }

  if (isTextFormatSame) {
    // there are no richTextInfos within the line

    let metrics = gl.measureText(line, currentTextFormat)
    if (metrics instanceof Error) return metrics

    width = metrics.width
  } else {
    // add width of the remaining substring of the line
    let metrics = gl.measureText(
      line.substring(lastPosition),
      currentTextFormat
    )

    if (metrics instanceof Error) {
      if (metrics instanceof Error) return metrics
    }

    width += metrics.width
  }

  return width
}

const longestLineWidth = (
  // ctx: CanvasRenderingContext2D,
  lines: string[],
  richTextInfos: RichTextInfo[]
): number | Error => {
  let width = 0
  for (let i = 0; i < lines.length; i++) {
    let lineWidth = calculateLineWidth(i, lines[i], richTextInfos)
    if (lineWidth instanceof Error) return lineWidth

    if (lineWidth > width) {
      width = lineWidth
    }
  }
  return width
}

const lineHeight = (lineNo: number, richTextInfos: RichTextInfo[]): number => {
  // NOTE: this is NOT the accumalated height of lines.
  // and this height does not include linespace

  let height: number = 0
  let maxHeight: number = 0
  // flag true if there are no richTextInfos within the line
  let beforeLine: boolean = true
  let previousTextFormat: TextFormat = richTextInfos[0].textFormat

  for (let richTextInfo of richTextInfos) {
    let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
      richTextInfo.lineNoPosition

    if (r_lineNo <= lineNo) {
      if (r_lineNo === lineNo) {
        // there are richTextInfos within the line
        //if there is a richTextInfo at the beginning of the line then discard the previous maxHeight
        if (r_positionInLine === 0) {
          maxHeight = richTextInfo.textFormat.fontSize
        } else {
          height = richTextInfo.textFormat.fontSize

          if (maxHeight < height) {
            maxHeight = height
          }
        }
        beforeLine = false
      }

      if (beforeLine) {
        maxHeight = richTextInfo.textFormat.fontSize
      }
    } else {
      break
    }
  }

  return maxHeight
}

const totalHeight = (
  lines: string[],
  richTextInfos: RichTextInfo[],
  linespace: number
): number => {
  // NOTE: not using lineHeight() here as it would loop through all the rtis every time
  // just a slight micro optimization

  let height: number = 0
  let heights: number[] = []
  let maxHeight: number = 0

  // index till richTextInfos have been gone through
  let j = 0

  for (let i = 0; i < lines.length; i++) {
    // flag true if there are no richTextInfos within the line
    let beforeLine = true

    for (j = j; j < richTextInfos.length; j++) {
      let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
        richTextInfos[j].lineNoPosition
      let textFormat = richTextInfos[j].textFormat

      if (r_lineNo <= i) {
        if (r_lineNo === i) {
          if (r_positionInLine === 0) {
            maxHeight = textFormat.fontSize
          } else {
            height = textFormat.fontSize

            if (maxHeight < height) {
              maxHeight = height
            }
          }
          beforeLine = false
        }

        if (beforeLine) {
          maxHeight = textFormat.fontSize
        }
      } else {
        break
      }
    }

    if (beforeLine) {
      // take the previous richTextInfo
      maxHeight = richTextInfos[j - 1].textFormat.fontSize
    }

    heights.push(maxHeight + linespace)
  }

  //minus linespace as last line will not have a linespace
  return heights.reduce((a, b) => a + b, 0) - linespace
}

const textFormatFromLineNoPosition = (
  lineNoPosition: LineNoPosition,
  richTextInfos: RichTextInfo[]
): TextFormat | Error => {
  let textFormat: TextFormat | Error = Error(
    `textFormatFromLineNoPosition(): could not determine textFormat from lineNoPosition: ${lineNoPosition}`
  ) //richTextInfos[0].textFormat
  const { lineNo, positionInLine } = lineNoPosition

  for (let richTextInfo of richTextInfos) {
    if (richTextInfo.lineNoPosition.lineNo < lineNo) {
      textFormat = richTextInfo.textFormat
    } else if (
      richTextInfo.lineNoPosition.lineNo === lineNo &&
      richTextInfo.lineNoPosition.positionInLine <= positionInLine
    ) {
      textFormat = richTextInfo.textFormat
    }
    //if at the beginning of a initial line (wrapInfo = true) then use that rti
    // else if (
    //   positionInLine === 0 &&
    //   richTextInfo.lineNoPosition.lineNo === lineNo &&
    //   richTextInfo.lineNoPosition.positionInLine === positionInLine &&
    //   textbox.wrapInfo[lineNo] === true
    // ) {
    //   textFormat = richTextInfo.textFormat
    //}
    else {
      break
    }
  }

  return textFormat
}

const widthFromLineNoPosition = (
  lineNoPosition: LineNoPosition,
  lines: string[],
  richTextInfos: RichTextInfo[],
  align: TextAlignment,
  maxWidth: number
): number | Error => {
  if (lineNoPosition.lineNo >= lines.length) {
    console.warn(
      `lineNoPosition.lineNo (${lineNoPosition.lineNo}) >= lines.length (${lines.length}`
    )
  }
  if (lineNoPosition.positionInLine > lines[lineNoPosition.lineNo].length) {
    console.warn(
      `lineNoPosition.positionInLine (${lineNoPosition.positionInLine}) > max possible positionInLine (${lines[lineNoPosition.lineNo].length})`
    )
  }

  const { lineNo, positionInLine } = lineNoPosition

  let lineWidth = calculateLineWidth(lineNo, lines[lineNo], richTextInfos)
  if (lineWidth instanceof Error) return lineWidth
  let alignmentOffset = 0

  if (align === "Left") {
  } else if (align === "Right") {
    alignmentOffset = maxWidth - lineWidth
  } else if (align === "Center") {
    alignmentOffset = (maxWidth - lineWidth) / 2
  }

  let width = alignmentOffset
  let positionOfRemainingLine: number = 0 //used for storing the index/position of the remaining part of the line
  let textFormat: TextFormat = richTextInfos[0].textFormat

  for (let richTextInfo of richTextInfos) {
    const { lineNo: r_lineNo, positionInLine: r_positionInLine } =
      richTextInfo.lineNoPosition

    if (r_lineNo === lineNo) {
      if (r_positionInLine <= positionInLine) {
        let metrics = gl.measureText(
          lines[lineNo].substring(positionOfRemainingLine, r_positionInLine),
          textFormat
        )

        if (metrics instanceof Error) return metrics

        width += metrics.width
      } else {
        break
      }

      positionOfRemainingLine = r_positionInLine
    } else if (r_lineNo > lineNo) {
      break
    }

    textFormat = richTextInfo.textFormat
  }

  let metrics = gl.measureText(
    lines[lineNo].substring(positionOfRemainingLine, positionInLine),
    textFormat
  )

  if (metrics instanceof Error) return metrics

  width += metrics.width
  return width
}

const lineNoPositionToCoords = (
  textCoords: Vector2D,
  lineNoPosition: LineNoPosition,
  linespace: number,
  lines: string[],
  richTextInfos: RichTextInfo[],
  align: TextAlignment,
  width: number,
  textFormat?: TextFormat
): Vector2D | Error => {
  if (lineNoPosition.lineNo >= lines.length) {
    console.error(
      `lineNoPosition.lineNo (${lineNoPosition.lineNo}) >= lines.length (${lines.length})`
    )
  }

  if (lineNoPosition.positionInLine > lines[lineNoPosition.lineNo].length) {
    console.error(
      `lineNoPositionToCoords(): lineNoPosition.positionInLine (${lineNoPosition.positionInLine}) > max positionInLine (${lines[lineNoPosition.lineNo].length}) \n ${lineNoPosition.lineNo}`
    )
  }

  const { lineNo, positionInLine } = lineNoPosition

  let vertical = lineHeight(0, richTextInfos) // total of heights of lines till now

  for (let i = 1; i <= lineNo; i++) {
    vertical += lineHeight(i, richTextInfos) + linespace
  }

  if (textFormat === undefined) {
    let res = textFormatFromLineNoPosition(lineNoPosition, richTextInfos)

    if (res instanceof Error) return res
    textFormat = res
  }

  // let textMetrics = gl.measureText("", textFormat)
  // if (textMetrics instanceof Error) return vector.create(0, 0)
  // let fontHeight =
  //   textMetrics.fontBoundingBoxAscent === undefined
  //     ? textFormat.fontSize
  //     : textMetrics.fontBoundingBoxAscent

  vertical -= textFormat.fontSize //ctx.measureText('|').fontBoundingBoxAscent

  let horizontal = widthFromLineNoPosition(
    lineNoPosition,
    lines,
    richTextInfos,
    align,
    width
  )

  if (horizontal instanceof Error) return horizontal

  return vector.create(textCoords.x + horizontal, textCoords.y + vertical)
}

const coordsToLineNoPosition = (
  coords: Vector2D,
  textCoords: Vector2D,
  lines: string[],
  richTextInfos: RichTextInfo[],
  linespace: number,
  align: TextAlignment,
  maxWidth: number
): LineNoPosition | Error => {
  // #NOTE: returns lineNo = -1 or positionInLine = -1 if coords are outside the text region
  // when textbox has some rotation this function expects coords rotated in the opposite direction
  let lineNo: number = -1
  let positionInLine: number = -1

  // get the first lineNo which is below coords.y
  let height = textCoords.y
  for (let i = 0; i < lines.length; i++) {
    height += lineHeight(i, richTextInfos)
    height += linespace

    if (height >= coords.y) {
      lineNo = i
      break
    }
  }

  if (lineNo < 0) {
    return { lineNo: lineNo, positionInLine: positionInLine }
  }

  // positionInLine
  let width = textCoords.x
  let currentTextFormat: TextFormat = richTextInfos[0].textFormat
  let isTextFormatSame: boolean = true
  let lastPosition: number = 0
  let line = lines[lineNo]
  let found: boolean = false

  let lineWidth = calculateLineWidth(lineNo, lines[lineNo], richTextInfos)
  if (lineWidth instanceof Error) return lineWidth

  let alignmentOffset = 0

  if (align === "Left") {
  } else if (align === "Right") {
    alignmentOffset = maxWidth - lineWidth
  } else if (align === "Center") {
    alignmentOffset = (maxWidth - lineWidth) / 2
  }

  width += alignmentOffset

  for (let richTextInfo of richTextInfos) {
    let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
      richTextInfo.lineNoPosition
    let textFormat = richTextInfo.textFormat

    if (r_lineNo <= lineNo) {
      if (r_lineNo === lineNo) {
        // there are richTextInfos within the line
        isTextFormatSame = false
        for (let i = lastPosition; i < r_positionInLine; i++) {
          // metrics of the i-th character in line
          let metrics = gl.measureText(line[i], currentTextFormat)

          if (metrics instanceof Error) return metrics

          let characterWidth = metrics.width

          // let c = ctx.measureText(line[i]).width
          width += characterWidth

          if (width - characterWidth / 2 >= coords.x) {
            positionInLine = i
            found = true
            break
          } else if (
            width - characterWidth / 2 < coords.x &&
            coords.x <= width
          ) {
            positionInLine = i + 1
            found = true
            break
          }
          lastPosition = r_positionInLine
        }
      }

      if (found) {
        break
      }

      currentTextFormat = textFormat
    } else {
      break
    }
  }

  if (isTextFormatSame && !found) {
    // i.e. there are no richTextInfos within the line
    for (let i = 0; i < line.length; i++) {
      let metrics = gl.measureText(line[i], currentTextFormat)
      if (metrics instanceof Error) return metrics

      let c = metrics.width
      width += c
      if (width - c / 2 >= coords.x) {
        positionInLine = i
        found = true
        break
      } else if (width - c / 2 < coords.x && coords.x <= width) {
        positionInLine = i + 1
        found = true
        break
      }
    }
  } else if (!found) {
    // add width of the remaining substring of the line
    for (let i = lastPosition; i < line.length; i++) {
      // Q: What should be the text formate here, taking currentTextFormat for now
      let metrics = gl.measureText(line[i], currentTextFormat)

      if (metrics instanceof Error) return metrics

      let c = metrics.width

      width += c

      if (width - c / 2 >= coords.x) {
        positionInLine = i
        found = true
        break
      } else if (width - c / 2 < coords.x && coords.x <= width) {
        positionInLine = i + 1
        found = true
        break
      }
    }
  }

  return { lineNo: lineNo, positionInLine: positionInLine }
}

const widthToPositionInLine = (
  width: number,
  lines: string[],
  lineNo: number,
  richTextInfos: RichTextInfo[],
  align: TextAlignment
): number | Error => {
  let positionInLine: number

  //@Suboptimal: don't need to call widthFromLineNoPosition for each consecutive positions
  for (
    positionInLine = 0;
    positionInLine <= lines[lineNo].length - 1;
    positionInLine++
  ) {
    let w = widthFromLineNoPosition(
      { lineNo: lineNo, positionInLine: positionInLine },
      lines,
      richTextInfos,
      align,
      width
    )

    if (w instanceof Error) return w

    if (w >= width) {
      break
    }
  }

  return positionInLine
}

const getTextBetween = (
  lines: string[],
  wrapInfo: WrapInfo,
  posA: LineNoPosition,
  posB: LineNoPosition
): string => {
  let { start, end } = sortLineNoPositions(posA, posB)
  let text = ""

  if (start.lineNo === end.lineNo) {
    text = lines[start.lineNo].slice(start.positionInLine, end.positionInLine)
  } else if (end.lineNo > start.lineNo) {
    text += lines[start.lineNo].slice(
      start.positionInLine,
      lines[start.lineNo].length + 1
    )

    for (let i = start.lineNo + 1; i < end.lineNo; i++) {
      if (wrapInfo[i]) {
        text += "\n"
      }

      text += lines[i]
    }

    text += lines[end.lineNo].slice(0, end.positionInLine)
  }

  return text
}

const getRichTextInfosBetween = (
  richTextInfos: RichTextInfo[],
  posA: LineNoPosition,
  posB: LineNoPosition
) => {
  let { start, end } = sortLineNoPositions(posA, posB)
  let rtisInside: RichTextInfo[] = []

  for (let richTextInfo of richTextInfos) {
    let r_lineNoPosition = richTextInfo.lineNoPosition

    let isRtiInside =
      // case when rti's lineNo is between from and to
      (r_lineNoPosition.lineNo > start.lineNo &&
        r_lineNoPosition.lineNo < end.lineNo) ||
      // case when rti is on the same line as start and, start and end, are on different lines
      (r_lineNoPosition.lineNo === start.lineNo &&
        r_lineNoPosition.positionInLine >= start.positionInLine &&
        start.lineNo !== end.lineNo) ||
      // case when rti is on the same line as to and, from and to are on different lines
      (r_lineNoPosition.lineNo === end.lineNo &&
        r_lineNoPosition.positionInLine <= end.positionInLine &&
        start.lineNo !== end.lineNo) ||
      // case when from and to are on the same line and rti is within from and to
      (r_lineNoPosition.lineNo === start.lineNo &&
        r_lineNoPosition.positionInLine >= start.positionInLine &&
        r_lineNoPosition.positionInLine <= end.positionInLine &&
        start.lineNo === end.lineNo)

    if (isRtiInside) rtisInside.push(richTextInfo)
  }

  return rtisInside
}

const print = (
  ctx: CanvasRenderingContext2D,
  coords: Vector2D,
  lines: string[],
  linespace: number,
  richTextInfos: RichTextInfo[],
  align: "Left" | "Center" | "Right" | "Justify",
  opacity: number,
  maxWidth: number,
  debug?: boolean
): void | Error => {
  /**
   for each line check if there is any RTI for it
   If an RTI exists print the substring up until that point with the currentTextFormat
   and set the new text format as the currentTextFormat and set isTextFormatSame as false
   and then print the rest of the line if isTextFormat is false
   If no RTI exists for that line then simply print the whole line
   with the currentTextFormat.
  */

  // total of line heights till now
  let linesHeight = 0

  let j = 0 // index to start iterating RTIs from
  let textFormat: TextFormat = richTextInfos[0].textFormat

  for (let i = 0; i < lines.length; i++) {
    let lastPosition: number = 0
    let splitWidth: number = 0
    let isTextFormatSame: boolean = true
    let leftOffset: number = 0
    if (align !== "Left") {
      let lineWidth = calculateLineWidth(i, lines[i], richTextInfos)
      if (lineWidth instanceof Error) return lineWidth

      if (align === "Right") {
        leftOffset = maxWidth - lineWidth
      } else if (align === "Center") {
        leftOffset = (maxWidth - lineWidth) / 2
      }
    }

    // to check if richTextInfos are in order
    let l = 0
    let p = 0

    // @Suboptimal: height can be calculated without using calculatetext.lineHeight() here within the loop
    if (i === 0) {
      linesHeight = lineHeight(i, richTextInfos)
    } else {
      linesHeight += lineHeight(i, richTextInfos) + linespace
    }

    for (j = j; j < richTextInfos.length; j++) {
      let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
        richTextInfos[j].lineNoPosition

      if (r_lineNo < l || (r_lineNo === l && r_positionInLine < p)) {
        console.error(
          `print(): richTextInfos are not in order`,
          richTextInfos,
          richTextInfos[j]
        )
      }

      if (r_positionInLine > lines[r_lineNo].length) {
        console.error(
          `print(): richTextInfo's positionInLine (${r_positionInLine}) is greater than the line's' length (${lines[r_lineNo].length})`,
          richTextInfos,
          richTextInfos[j]
        )
      }

      if (r_lineNo <= i) {
        if (r_lineNo === i) {
          // there are richTextInfos within the line
          // print the text remaining up till now with the currentTextFormat
          // set the new textFormat as the currentTextFormat

          isTextFormatSame = false
          let substring = lines[i].substring(lastPosition, r_positionInLine)

          gl.fillText(
            ctx,
            vector.create(
              coords.x + splitWidth + leftOffset,
              coords.y + linesHeight
            ),
            substring,
            opacity,
            textFormat
          )

          if (debug) {
            ctx.fillRect(
              coords.x + splitWidth + leftOffset,
              coords.y + linesHeight,
              3,
              3
            )
          }

          let metrics = gl.measureText(substring, textFormat)

          if (metrics instanceof Error) return metrics

          splitWidth += metrics.width

          lastPosition = r_positionInLine
          textFormat = richTextInfos[j].textFormat
        }
      } else {
        // subtract 1 from index j to continue the loop from j next time
        j--
        break
      }

      l = r_lineNo
      p = r_positionInLine
    }

    if (isTextFormatSame) {
      // i.e. there are no richTextInfos within the line
      gl.fillText(
        ctx,
        vector.create(coords.x + leftOffset, coords.y + linesHeight),
        lines[i],
        opacity,
        textFormat
      )
    } else {
      // print the remaining substring of the line
      gl.fillText(
        ctx,
        vector.create(
          coords.x + splitWidth + leftOffset,
          coords.y + linesHeight
        ),
        lines[i].substring(lastPosition),
        opacity,
        textFormat
      )

      // for debug
      if (debug) {
        ctx.fillRect(coords.x + splitWidth, coords.y + linesHeight, 3, 3)
      }
    }
  }
}

const wrapLine = (
  line: string,
  richTextInfos: RichTextInfo[],
  maxWidth: number,
  prevRichTextInfo?: RichTextInfo,
  debug?: boolean
):
  | {
      lines: string[]
      wrapInfo: boolean[]
      richTextInfos: RichTextInfo[]
    }
  | Error => {
  // NOTE: only the positionInLine of the rtis matter here
  // this assumes that all the richTextInfos provided have the same lineNo
  // rtis returned have the same lineNo as before
  const findIndexOfLastWord = (str: string): number => {
    let flag: boolean = true
    let index: number = 0

    while (flag) {
      index = str.lastIndexOf(" ")

      if (index === -1) {
        return -1
      }

      let isAtTheEndOfLine = index === str.length - 1

      if (isAtTheEndOfLine) {
        if (str[index - 1] === " ") {
          return index
        } else {
          let str1 = str

          str = str.substring(0, index)
        }
      } else {
        flag = false
      }
    }

    return index + 1
  }

  const wrappedLines: string[] = []
  const wrapInfo: boolean[] = []
  let wrapRichTextInfos: RichTextInfo[] = []
  const lineNo =
    richTextInfos.length > 0 ? richTextInfos[0].lineNoPosition.lineNo : 0

  wrapRichTextInfos = cloneRichTextInfos(richTextInfos)

  let noOfWrappedLines = 0
  let isOverflowing = true
  let wrap = true // true for the initial line which may wrap into multiple lines
  let isLastWord = false
  let nextLineWrap: string = ""

  if (prevRichTextInfo === undefined) {
    if (
      wrapRichTextInfos[0].lineNoPosition.lineNo !== 0 ||
      wrapRichTextInfos[0].lineNoPosition.positionInLine !== 0
    ) {
      return Error(
        `wrapLine(): if prevRichTextInfo is undefined then the beginning richTextInfos must start from lineNo=0 and positionInLine=0. ${JSON.stringify(richTextInfos)}`
      )
    }

    prevRichTextInfo = wrapRichTextInfos[0]
  }

  if (debug) {
    console.log("---wrapLine(): BEGIN---")
    console.log("line=", line)
    console.log("maxWidth=", maxWidth)
    console.log("richTextInfos=", richTextInfos)
    console.log("prevRichTextInfos=", prevRichTextInfo)
    console.log("-----")
    console.log("loop start")
  }

  // break line into multiple lines until there is no overflow
  while (isOverflowing) {
    nextLineWrap = ""
    // part of line that will be wrapped in the next line

    // get the index of the last word in the line
    // concat the last word into nextLineWrap
    // chop off the last word from the line
    // #subOptimal: the width of each word can be calculated just once
    // and wrapped accordingly in 1 go

    let lineWidth = calculateLineWidthRltv(
      line,
      richTextInfos,
      prevRichTextInfo
    )
    if (lineWidth instanceof Error) return lineWidth

    // while line width is greater than max width
    while (lineWidth > maxWidth && line.length > 1) {
      if (debug) {
        console.log("line=", line)
        console.log("lineWidth=", lineWidth)
        console.log("isOverflowing=", isOverflowing)
        console.log("-----")
      }

      lineWidth = calculateLineWidthRltv(line, richTextInfos, prevRichTextInfo)
      if (lineWidth instanceof Error) return lineWidth

      let lastWordIndex: number = findIndexOfLastWord(line)

      if (isLastWord) {
        if (line.length <= 1) {
          break
        }

        nextLineWrap = line[line.length - 1] + nextLineWrap
        line = line.substring(0, line.length - 1)
      } else if (lastWordIndex === -1) {
        isLastWord = true

        // start wrapping characters at the last word
        if (line[line.length - 1] === " ") {
          // character at the end of the last word should wrap with the space
          if (line.length === 2) break
          nextLineWrap = line.slice(line.length - 2, line.length) + nextLineWrap
          line = line.substring(0, line.length - 2)
        } else {
          nextLineWrap = line[line.length - 1] + nextLineWrap
          line = line.substring(0, line.length - 1)
        }
      } else {
        // add the word at the start of the nextLineWrap
        nextLineWrap = line.substring(lastWordIndex) + nextLineWrap
        line = line.substring(0, lastWordIndex)
      }

      if (debug) {
        console.log("lastWordIndex=", lastWordIndex)
        console.log("isLastWord=", isLastWord)
        console.log("nextLineWrap=", nextLineWrap)
        console.log("line=", line)
        console.log("-----")
      }
    }

    // add line to the wrappedLines
    if (nextLineWrap !== "") {
      wrappedLines.push(line)
      wrapInfo.push(wrap)
      wrap = false
      isLastWord = false
      richTextInfos = []

      // shift the richTextInfos that are beyond the line after wrapping
      // to the next line
      for (let richTextInfo of wrapRichTextInfos) {
        const { lineNoPosition: r_lineNoPosition } = richTextInfo

        // if richTextInfo is in the current line, and positionInLine is after split
        // shift it to the next line and shift it to the left by the length of remaining line
        if (
          r_lineNoPosition.lineNo === noOfWrappedLines + lineNo &&
          r_lineNoPosition.positionInLine > line.length
        ) {
          richTextInfo.lineNoPosition.lineNo++
          // adding 1 here because the whitespace between the line and the next wrap line
          // becomes a newline character when folding
          richTextInfo.lineNoPosition.positionInLine -= line.length
          richTextInfos.push(richTextInfo)
        } else {
          prevRichTextInfo = richTextInfo
        }
      }

      noOfWrappedLines++
      line = nextLineWrap
    } else {
      wrappedLines.push(line)
      wrapInfo.push(wrap)
      isOverflowing = false
    }

    if (debug) {
      console.log("wrappedLines=", wrappedLines)
      console.log("wrapInfo=", wrapInfo)
      console.log("wrapRichTextInfos=", wrapRichTextInfos)
      console.log("line=", line)
      console.log("-----")
    }
  }

  if (debug) {
    console.log("loop end")
    console.log("lines=", wrappedLines)
    console.log("wrapInfo=", wrapInfo)
    console.log("richTextInfos=", wrapRichTextInfos)
    console.log("----wrapLine(): END----")
  }

  return {
    lines: wrappedLines,
    wrapInfo: wrapInfo,
    richTextInfos: wrapRichTextInfos,
  }
}

const wrapLines = (
  lines: string[],
  richTextInfos: RichTextInfo[],
  maxWidth: number,
  prevRichTextInfo?: RichTextInfo
):
  | {
      lines: string[]
      wrapInfo: WrapInfo
      richTextInfos: RichTextInfo[]
    }
  | Error => {
  const wrappedLines: string[] = []
  const wrapInfo: boolean[] = [] // is line at index the intial line?
  const wrapRichTextInfos: RichTextInfo[] = []
  const richTextInfosByLineNo: RichTextInfo[][] = []

  for (let line of lines) {
    richTextInfosByLineNo.push([])
  }
  for (let i = 0; i <= lines.length; i++) {
    richTextInfosByLineNo.push([])
  }

  for (let richTextInfo of richTextInfos) {
    richTextInfosByLineNo[richTextInfo.lineNoPosition.lineNo].push(richTextInfo)
  }

  // let prevRichTextInfo: RichTextInfo | undefined = undefined

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      // set the prevRichTextInfo for the start of the current line
      // if no richTextInfo in richTextInfos don't update
      if (richTextInfos.length > 0) {
        let richTextInfo = lastRichTextInfo(
          { lineNo: i, positionInLine: 0 },
          richTextInfos
        )

        if (richTextInfo instanceof Error) return richTextInfo
        prevRichTextInfo = richTextInfo
      }
    }

    let wrap = wrapLine(
      lines[i],
      richTextInfosByLineNo[i],
      maxWidth,
      prevRichTextInfo
      // true
    )

    if (wrap instanceof Error) return wrap

    for (let richTextInfo of wrap.richTextInfos) {
      richTextInfo.lineNoPosition.lineNo += wrappedLines.length - i
    }

    wrappedLines.push(...wrap.lines)
    wrapInfo.push(...wrap.wrapInfo)
    wrapRichTextInfos.push(...wrap.richTextInfos)
  }

  return {
    lines: wrappedLines,
    wrapInfo: wrapInfo,
    richTextInfos: wrapRichTextInfos,
  }
}

const unwrapLines = (
  lines: string[],
  wrapInfo: boolean[],
  richTextInfos: RichTextInfo[]
):
  | {
      lines: string[]
      richTextInfos: RichTextInfo[]
    }
  | Error => {
  if (lines.length !== wrapInfo.length) {
    return Error(
      `lines.length must be equal to wrapInfo.length (${lines.length} != ${wrapInfo.length})`
    )
  }

  const unwrappedLines: string[] = []
  const unwrappedRichTextInfos: RichTextInfo[] =
    cloneRichTextInfos(richTextInfos)
  let unwrapLine: string = ""
  let currentLineNo = 0

  for (let i = 0; i < wrapInfo.length; i++) {
    if (wrapInfo[i]) {
      if (i >= lines.length) {
        return Error(
          `unwrapLines(): length of wrapInfo (${wrapInfo.length}) cannot be greater than length of lines (${lines.length})`
        )
      }
      if (i !== 0) {
        currentLineNo++
        for (let richTextInfo of unwrappedRichTextInfos) {
          if (richTextInfo.lineNoPosition.lineNo === i) {
            richTextInfo.lineNoPosition.lineNo = currentLineNo
            // richTextInfo.lineNoPosition.positionInLine = richTextInfo.lineNoPosition.positionInLine
          }
        }
        unwrappedLines.push(unwrapLine)
      }
      unwrapLine = lines[i]
    } else {
      for (let richTextInfo of unwrappedRichTextInfos) {
        if (richTextInfo.lineNoPosition.lineNo === i) {
          richTextInfo.lineNoPosition.lineNo = currentLineNo
          // adding by 1 for the whitespace that was replaced by a newline while folding
          // richTextInfo.lineNoPosition.positionInLine =
          //   unwrapLine.length + 1 + richTextInfo.lineNoPosition.positionInLine
          richTextInfo.lineNoPosition.positionInLine =
            unwrapLine.length + richTextInfo.lineNoPosition.positionInLine
        }
      }
      unwrapLine = unwrapLine + lines[i]
    }
  }

  unwrappedLines.push(unwrapLine)

  return {
    lines: unwrappedLines,
    richTextInfos: unwrappedRichTextInfos,
  }
}

const unwrapLineNoPosition = (
  // translates the positionInLine in wrapped lines to the positionInLine in the unwrapped (/original) lines
  lineNoPosition: LineNoPosition,
  lines: string[],
  wrapInfo: boolean[]
): LineNoPosition => {
  const unwrappedLines: string[] = []
  let currentLineNo = 0
  let unwrapLine: string = ""
  let unwrapLineNoPosition: LineNoPosition = {
    lineNo: -1,
    positionInLine: -1,
  }

  for (let i = 0; i <= lineNoPosition.lineNo; i++) {
    if (wrapInfo[i]) {
      if (lineNoPosition.lineNo === i) {
        unwrapLineNoPosition = {
          lineNo: currentLineNo + 1,
          positionInLine: lineNoPosition.positionInLine,
        }
        break
      }
      if (i !== 0) {
        currentLineNo++
        unwrappedLines.push(unwrapLine)
      }
      unwrapLine = lines[i]
    } else {
      if (lineNoPosition.lineNo === i) {
        unwrapLineNoPosition = {
          lineNo: currentLineNo,
          positionInLine: unwrapLine.length + lineNoPosition.positionInLine,
        }
        break
      }
      unwrapLine = unwrapLine + " " + lines[i]
    }
  }

  return unwrapLineNoPosition
}

const lineNoPositionToPosition = (
  lineNoPosition: LineNoPosition,
  lines: string[],
  wrapInfo: boolean[]
): number => {
  // NOTE: position here is different from the position in LineNoPosition it is like the position in the whole text
  // where text is an single array of characters and a new line is treated as a single character
  let position: number = 0

  for (let i = 0; i <= lineNoPosition.lineNo; i++) {
    if (i < lineNoPosition.lineNo) {
      // adding 1 for new line
      if (wrapInfo[i + 1]) {
        position += lines[i].length + 1 //-1?
      } else {
        position += lines[i].length //-1?
      }
    } else if (i === lineNoPosition.lineNo) {
      position += lineNoPosition.positionInLine
    }
  }

  return position
}

const positionToLineNoPosition = (
  position: number,
  lines: string[],
  wrapInfo: WrapInfo
): LineNoPosition | Error => {
  // NOTE position here is different from position in LineNoPosition
  // it is the position in the whole text where text is an single array of characters

  let lineNoPosition: LineNoPosition = { lineNo: -1, positionInLine: -1 }
  let pos_tmp: number = 0

  for (let i = 0; i < lines.length; i++) {
    if (pos_tmp + lines[i].length < position) {
      if (wrapInfo[i + 1]) {
        pos_tmp += lines[i].length + 1
      } else {
        pos_tmp += lines[i].length
      }
    } else {
      lineNoPosition.lineNo = i
      lineNoPosition.positionInLine = position - pos_tmp
      break
    }
  }

  if (lineNoPosition.lineNo === -1 || lineNoPosition.positionInLine === -1) {
    return Error(
      `positionToLineNoPosition(): could not determine a lineNoPosition for position=${position}, lines=${lines}, wrapInfo=${wrapInfo}`
    )
  }

  return lineNoPosition
}

const cleanRichTextInfos = (richTextInfos: RichTextInfo[]) => {
  // removes any repeating richTextInfos
  const rtis = cloneRichTextInfos(richTextInfos)

  for (let i = 0; i < rtis.length - 1; i++) {
    let rti = rtis[i]
    let nextRti = rtis[i + 1]
    let textFormat = rti.textFormat
    let nextTextFormat = nextRti.textFormat
    // console.log(textFormat, nextTextFormat)

    const isNextTextFormatSame =
      textFormat.font === nextTextFormat.font &&
      textFormat.fontSize === nextTextFormat.fontSize &&
      textFormat.fontColor === nextTextFormat.fontColor &&
      textFormat.bold === nextTextFormat.bold &&
      textFormat.italic === nextTextFormat.italic

    if (isNextTextFormatSame) {
      rtis.splice(i + 1, 1)
      i--
    }
    // console.log(i, isNextTextFormatSame, ...rtis)
  }

  return rtis
}

const add = (
  lineNoPosition: LineNoPosition,
  text: string,
  richTextInfosToAdd: RichTextInfo[],
  lines: string[],
  richTextInfos: RichTextInfo[],
  wrapInfo: WrapInfo,
  wrapWidth: number,
  textWrap: boolean = true,
  debug?: boolean
): void | Error => {
  // NOTE: richTextInfos must be relative to lines of the text
  // that has to be added not relative to the lines
  // lines, richTextInfos, wrapInfo are updated in place so that no copies are created
  // HOW?:
  // - get the line where new text is being added and also the lines part of the same line but wrapped above/below
  // - append the new text after the first line
  // - unwrap all the lines into a single or multiple lines if there are multiple lines being added
  // - similarly unwrap all the richTextInfos on the line and the below wrapped lines
  // - concatenate the new richTextInfos to be added with the previous rtis
  // - remove the lines and richTextInfos from the lines and richTextInfos
  // - rewrap the unwrapped lines and richTextInfos using txt.wrapLines()
  // - shift the rtis below by the no of of unwrapped lines that are to be added
  // - insert back the lines/richTextInfos that were rewrapped previously

  if (text.length <= 0) {
    console.warn(`add(): length of text to be added must be greater than 0`)
    return
  }

  // if (
  //   richTextInfos.length <= 0 ||
  //   (richTextInfos[0].lineNoPosition.lineNo !== 0 &&
  //     richTextInfos[0].lineNoPosition.positionInLine !== 0)
  // ) {
  //   console.warn(
  //     `add(): there must be a richTextInfo at the start position of the text to be added`
  //   )
  //   return
  // }

  // TODO: check if there is a richTextInfo at end position of the text to be added
  // if yes, return error

  // UNWRAP
  // get lastLineNo to include lines that are the
  // part of the same line but wrapped into multiple lines.
  // this will be till the line which has the next wrapInfo true
  // all the lines are required because after adding new text the wrapping might change
  // #TODO: use unwrapLines() instead
  let lastLineNo: number = lineNoPosition.lineNo
  let firstLineNo: number = lineNoPosition.lineNo
  let linesToAdd = text.split("\n")
  richTextInfosToAdd = cloneRichTextInfos(richTextInfosToAdd)

  if (debug) {
    console.log("\n")
    console.log("-----add()-----")
    console.log("text to add=", text)
    console.log("lineNoPosition to add at=", lineNoPosition)
    console.log("richTextInfos to add=", richTextInfosToAdd)
    console.log("richTextInfos=")
    let i = 0
    for (let rti of richTextInfos) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    console.log("lines=")
    i = 0
    for (let line of lines) {
      console.log(i, line, line.length)
      i++
    }

    console.log("linesToAdd=", linesToAdd)
    console.log("lineNoPosition=", lineNoPosition)
  }

  if (lineNoPosition.lineNo > 0 && !wrapInfo[lineNoPosition.lineNo]) {
    for (
      firstLineNo = lineNoPosition.lineNo - 1;
      firstLineNo >= 0;
      firstLineNo--
    ) {
      if (wrapInfo[firstLineNo] === true) {
        break
      }
    }
  }

  if (lineNoPosition.lineNo < lines.length - 1) {
    for (
      let lineNo = lineNoPosition.lineNo + 1;
      lineNo < lines.length;
      lineNo++
    ) {
      if (wrapInfo[lineNo] === true) {
        break
      }

      lastLineNo = lineNo
    }
  }

  // join the lines into a single unwrapped line
  let substringBefore = lines[lineNoPosition.lineNo].substring(
    0,
    lineNoPosition.positionInLine
  )

  let substringAfter = lines[lineNoPosition.lineNo].substring(
    lineNoPosition.positionInLine
  )

  // concat the wrapped lines till the lastLineNo
  for (let i = lineNoPosition.lineNo + 1; i <= lastLineNo; i++) {
    substringAfter += lines[i]
  }

  let firstLine = ""

  // join the lines into 1 line
  for (let i = firstLineNo; i < lineNoPosition.lineNo; i++) {
    firstLine += lines[i]
  }

  firstLine += substringBefore + linesToAdd[0]
  let middleLines: string[] = []
  let lastLine = substringAfter
  let linesToWrap: string[] = []

  if (linesToAdd.length > 1) {
    lastLine = linesToAdd[linesToAdd.length - 1] + substringAfter

    for (let i = 1; i < linesToAdd.length - 1; i++) {
      middleLines.push(linesToAdd[i])
    }

    linesToWrap = [firstLine, ...middleLines, lastLine]
  } else {
    linesToWrap = [firstLine + lastLine]
  }

  // COPY/DELETE RTIs based on rtis that need to be added
  // the prev RTI should be copied over to the end of what is to be added (not if at end of document)
  // consecutive rtis with the same text formats should be deleted keeping just one
  let prevRichTextInfo: RichTextInfo | undefined | Error = lastRichTextInfo(
    lineNoPosition,
    richTextInfos
  )

  if (prevRichTextInfo instanceof Error) {
    console.error(prevRichTextInfo)
    return prevRichTextInfo
  }

  if (richTextInfosToAdd.length > 0) {
    let isPrevTextFormatSame =
      prevRichTextInfo !== undefined &&
      prevRichTextInfo?.textFormat.font ===
        richTextInfosToAdd[0]?.textFormat.font &&
      prevRichTextInfo?.textFormat.fontColor ===
        richTextInfosToAdd[0]?.textFormat.fontColor &&
      prevRichTextInfo?.textFormat.fontSize ===
        richTextInfosToAdd[0]?.textFormat.fontSize &&
      prevRichTextInfo?.textFormat.bold ===
        richTextInfosToAdd[0]?.textFormat.bold &&
      prevRichTextInfo?.textFormat.italic ===
        richTextInfosToAdd[0]?.textFormat.italic

    // is the previous rti at the same position as where text had to be added
    let isPrevRtiAtStartPos =
      prevRichTextInfo?.lineNoPosition.lineNo === lineNoPosition.lineNo &&
      prevRichTextInfo?.lineNoPosition.positionInLine ===
        lineNoPosition.positionInLine

    // adding at end of document
    let isLineNoPosToAddAtEoD =
      lineNoPosition.lineNo === lines.length - 1 &&
      lineNoPosition.positionInLine === lines[lines.length - 1].length

    // adding at beginning of document
    let isLineNoPosToAddAtBoD =
      lineNoPosition.lineNo === 0 && lineNoPosition.positionInLine === 0

    let isRtiToAddAtStartPos =
      richTextInfosToAdd[0]?.lineNoPosition.lineNo === 0 &&
      richTextInfosToAdd[0]?.lineNoPosition.positionInLine === 0

    if (debug) {
      console.log(`-----`)
      console.log(
        `isPrevPrevTextFormatSame= ${isPrevTextFormatSame}`,
        `isPrevRtiAtStartPos= ${isPrevRtiAtStartPos}`
      )
    }

    if (
      !isPrevRtiAtStartPos &&
      prevRichTextInfo !== undefined &&
      richTextInfosToAdd.length > 0
    ) {
      if (isPrevTextFormatSame) {
        // copy the prevRti to the end of the text to be added
        // if length of richTextInfos to be added greater than 1
        if (richTextInfosToAdd.length > 1) {
          console.log("copy prev rti")
          let prevRtiCopy = cloneRichTextInfo(prevRichTextInfo)
          prevRtiCopy.lineNoPosition = {
            lineNo: linesToAdd.length - 1,
            positionInLine: linesToAdd[linesToAdd.length - 1].length,
          }
          richTextInfosToAdd.push(prevRtiCopy)
        }

        // delete the first rti to be added as it is the same as previous
        if (debug) {
          console.log(
            `add(): delete first rti to be added =`,
            richTextInfosToAdd[0]
          )
        }
        richTextInfosToAdd.splice(0, 1)
      } else if (!isPrevTextFormatSame && !isLineNoPosToAddAtEoD) {
        // copy the prevRti to the end of the text to be added
        // if length of richTextInfos to be added greater than 1
        if (debug) {
          console.log(`add(): copy previous rti =`, prevRichTextInfo)
        }

        let prevRtiCopy = cloneRichTextInfo(prevRichTextInfo)
        prevRtiCopy.lineNoPosition = {
          lineNo: linesToAdd.length - 1,
          positionInLine: linesToAdd[linesToAdd.length - 1].length,
        }
        richTextInfosToAdd.push(prevRtiCopy)
      }
    } else if (
      isPrevRtiAtStartPos &&
      prevRichTextInfo !== undefined &&
      richTextInfosToAdd.length > 0
    ) {
      if (isPrevTextFormatSame && !isLineNoPosToAddAtBoD) {
        if (richTextInfosToAdd.length > 1) {
          if (debug) {
            console.log(`add(): copy previous rti =`, prevRichTextInfo)
          }

          let prevRtiCopy = cloneRichTextInfo(prevRichTextInfo)
          prevRtiCopy.lineNoPosition = {
            lineNo: linesToAdd.length - 1,
            positionInLine: linesToAdd[linesToAdd.length - 1].length,
          }
          richTextInfosToAdd.push(prevRtiCopy)
        }
        // delete the first rti to be added as it is the same as previous
        if (debug) {
          console.log(
            `add(): delete first rti to be added =`,
            richTextInfosToAdd[0]
          )
        }
        richTextInfosToAdd.splice(0, 1)
      } else if (!isPrevTextFormatSame && !isLineNoPosToAddAtBoD) {
        let prevRtiIndex = lastRichTextInfoIndex(lineNoPosition, richTextInfos)

        if (prevRtiIndex instanceof Error) {
          console.error(prevRtiIndex)
          return prevRtiIndex
        }

        if (prevRtiIndex && prevRtiIndex > 0) {
          let prevPrevRti = richTextInfos[prevRtiIndex - 1]
          let isPrevPrevTextFormatSame =
            prevPrevRti?.textFormat.font ===
              richTextInfosToAdd[0]?.textFormat.font &&
            prevPrevRti?.textFormat.fontColor ===
              richTextInfosToAdd[0]?.textFormat.fontColor &&
            prevPrevRti?.textFormat.fontSize ===
              richTextInfosToAdd[0]?.textFormat.fontSize &&
            prevPrevRti?.textFormat.bold ===
              richTextInfosToAdd[0]?.textFormat.bold &&
            prevPrevRti?.textFormat.italic ===
              richTextInfosToAdd[0]?.textFormat.italic

          if (isPrevPrevTextFormatSame) {
            if (debug) {
              console.log(
                `add(): delete first rti to be added =`,
                richTextInfosToAdd[0]
              )
            }
            richTextInfosToAdd.splice(0, 1)
          }
        }

        if (debug) {
          console.log(`add(): copy previous rti =`, prevRichTextInfo)
        }

        let prevRtiCopy = cloneRichTextInfo(prevRichTextInfo)
        prevRtiCopy.lineNoPosition = {
          lineNo: linesToAdd.length - 1,
          positionInLine: linesToAdd[linesToAdd.length - 1].length,
        }

        richTextInfosToAdd.push(prevRtiCopy)

        if (prevRtiIndex) {
          if (debug) {
            console.log(
              `add(): delete first rti to be added =`,
              richTextInfosToAdd[0]
            )
          }

          // delete the prev rti as it is at the start pos
          richTextInfos.splice(prevRtiIndex, 1)
        }
      } else if (isLineNoPosToAddAtBoD) {
        // let prevRtiIndex = richTextInfos.indexOf(prevRichTextInfo)

        if (richTextInfos.length > 0) {
          if (debug) {
            console.log(`add(): delete prev rti =`, richTextInfos[0])
          }

          richTextInfos.splice(0, 1)
        }
      }
    }

    if (debug) {
      console.log("after copying/deleting RTIs")
      let i = 0
      console.log("richTextInfos=")
      for (let rti of richTextInfosToAdd) {
        console.log(
          i,
          rti.lineNoPosition.lineNo,
          rti.lineNoPosition.positionInLine,
          rti.textFormat
        )
        i++
      }
      console.log("textbox.richTextInfos=")
      for (let rti of richTextInfos) {
        console.log(
          i,
          rti.lineNoPosition.lineNo,
          rti.lineNoPosition.positionInLine,
          rti.textFormat
        )
        i++
      }
    }
  }

  // get rtis that are before and after the lineNoPosition where we're adding the text
  // this includes rtis below the line but only the wrapped lines part of the line

  let rtisBefore: RichTextInfo[] = []
  let rtisAfter: RichTextInfo[] = []

  // collect rtis after lineNoPosition but only the wrapped line
  for (let richTextInfo of richTextInfos) {
    let r_lineNoPosition = richTextInfo.lineNoPosition

    let isRtiBefore =
      (r_lineNoPosition.lineNo === lineNoPosition.lineNo &&
        r_lineNoPosition.positionInLine <= lineNoPosition.positionInLine) ||
      (r_lineNoPosition.lineNo < lineNoPosition.lineNo &&
        r_lineNoPosition.lineNo >= firstLineNo &&
        firstLineNo < lastLineNo)

    let isRtiAfter =
      (r_lineNoPosition.lineNo === lineNoPosition.lineNo &&
        r_lineNoPosition.positionInLine > lineNoPosition.positionInLine) ||
      (r_lineNoPosition.lineNo > lineNoPosition.lineNo &&
        r_lineNoPosition.lineNo <= lastLineNo &&
        firstLineNo < lastLineNo)

    if (isRtiBefore) {
      rtisBefore.push(richTextInfo)
    } else if (isRtiAfter) {
      rtisAfter.push(richTextInfo)
    } else if (r_lineNoPosition.lineNo > lastLineNo) {
      break
    }
  }

  let startIndexForRemovalRti = 0
  if (rtisBefore.length > 0) {
    startIndexForRemovalRti = richTextInfos.indexOf(rtisBefore[0])
  } else {
    startIndexForRemovalRti = richTextInfos.indexOf(rtisAfter[0])
  }

  if (debug) {
    console.log("-----")
    console.log("firstLineNo=", firstLineNo)
    console.log("lastLineNo=", lastLineNo)
    console.log("previous richTextInfo =", prevRichTextInfo)
    console.log("startIndex=", startIndexForRemovalRti)

    console.log("rtis_before=")
    for (let rti of rtisBefore) {
      console.log(
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
    }

    console.log("rtis_after=")
    for (let rti of rtisAfter) {
      console.log(
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
    }
  }

  // SHIFT RTIs UP

  // shift up the rtis_after into the same line as the last line in linesToAdd
  // (assuming the text is added)
  // cloning these as they will be shifted
  // #Q: is cloning really required here
  rtisBefore = cloneRichTextInfos(rtisBefore)
  rtisAfter = cloneRichTextInfos(rtisAfter)

  // rtis_before will be relatively at lineNo 0 for txt.wrapLines()
  for (let rti of rtisBefore) {
    // add length of wrapped lines between `first` line and the rti's line
    for (let i = firstLineNo; i < rti.lineNoPosition.lineNo; i++) {
      rti.lineNoPosition.positionInLine += lines[i].length
    }

    rti.lineNoPosition.lineNo = 0
  }

  let lengthOfLinesBefore = 0
  for (let i = firstLineNo; i < lineNoPosition.lineNo; i++) {
    lengthOfLinesBefore += lines[i].length
  }

  for (let rti of rtisAfter) {
    if (rti.lineNoPosition.lineNo === lineNoPosition.lineNo) {
      // shift rti left by the positionInLine where the addition is being made
      if (linesToAdd.length <= 1) {
        rti.lineNoPosition.positionInLine +=
          lengthOfLinesBefore + linesToAdd[linesToAdd.length - 1].length
      } else {
        rti.lineNoPosition.positionInLine -= lineNoPosition.positionInLine
        rti.lineNoPosition.positionInLine +=
          linesToAdd[linesToAdd.length - 1].length
      }
    } else if (rti.lineNoPosition.lineNo > lineNoPosition.lineNo) {
      // if text will be added within the same line without adding any extra lines
      if (linesToAdd.length <= 1) {
        // rti.lineNoPosition.positionInLine +=
        //   lines[lineNoPosition.lineNo].length + 1
        rti.lineNoPosition.positionInLine += lengthOfLinesBefore
        rti.lineNoPosition.positionInLine += lines[lineNoPosition.lineNo].length
        rti.lineNoPosition.positionInLine +=
          linesToAdd[linesToAdd.length - 1].length

        // add length of wrapped lines between line where addition is being made
        // and the rti_after's lineNo
        for (
          let i = lineNoPosition.lineNo + 1;
          i < rti.lineNoPosition.lineNo;
          i++
        ) {
          // NOTE: add a 1 because there will be an extra space when lines are unwrapped
          // rti.lineNoPosition.positionInLine += lines[i].length + 1
          rti.lineNoPosition.positionInLine += lines[i].length
        }
      } else {
        // else if there are multiple lines to be added
        // rti.lineNoPosition.positionInLine +=
        //   lines[lineNoPosition.lineNo].length +
        //   1 -
        //   lineNoPosition.positionInLine

        rti.lineNoPosition.positionInLine +=
          linesToAdd[linesToAdd.length - 1].length
        // add the right part of the line where the addition is being made
        rti.lineNoPosition.positionInLine +=
          lines[lineNoPosition.lineNo].length - lineNoPosition.positionInLine

        // shift rti right by the length of the last line to be added
        rti.lineNoPosition.positionInLine +=
          linesToAdd[linesToAdd.length - 1].length

        // add length of wrapped lines between line where addition is being made
        // and the rti's line
        for (
          let i = lineNoPosition.lineNo + 1;
          i < rti.lineNoPosition.lineNo;
          i++
        ) {
          // NOTE: add a 1 because there will be an extra space when lines are unwrapped
          // rti.lineNoPosition.positionInLine += lines[i].length + 1
          rti.lineNoPosition.positionInLine += lines[i].length
        }
      }
    }

    // make the rtis relative to the current line for txt.wrapLines()
    rti.lineNoPosition.lineNo = linesToAdd.length - 1
  }

  // shift the richTextInfos that will be newly added towards the right
  // by the length of the part of the line to the left of the position
  // which is nothing but the lineNoPosition.positionInLine
  for (let rti of richTextInfosToAdd) {
    if (rti.lineNoPosition.lineNo === 0) {
      rti.lineNoPosition.positionInLine += lengthOfLinesBefore
      rti.lineNoPosition.positionInLine += lineNoPosition.positionInLine
    }
  }

  if (debug) {
    console.log("----")
    console.log("after shifting rtis")
    let i = 0
    console.log("richTextInfos=")
    for (let rti of richTextInfosToAdd) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    console.log("rtis_before=")
    for (let rti of rtisBefore) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    console.log("rtis_after=")
    for (let rti of rtisAfter) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    console.log("linesToWrap=", linesToWrap)
    console.log("rtisToWrap=", [
      ...rtisBefore,
      ...richTextInfosToAdd,
      ...rtisAfter,
    ])
  }

  let wrap = undefined

  // WRAP
  if (textWrap) {
    // wrap the lines that are to be added and other affected lines (linesToWrap)
    wrap = wrapLines(
      linesToWrap,
      [...rtisBefore, ...richTextInfosToAdd, ...rtisAfter],
      wrapWidth,
      prevRichTextInfo === undefined ? undefined : prevRichTextInfo
    )

    if (wrap instanceof Error) {
      console.error(wrap)
      return wrap
    }

    if (debug) {
      console.log("------")
      console.log("after rewrapping")
      console.log("wrap.richTextInfos=")
      let i = 0
      for (let rti of wrap.richTextInfos) {
        console.log(
          i,
          rti.lineNoPosition.lineNo,
          rti.lineNoPosition.positionInLine,
          rti.textFormat
        )
        i++
      }

      console.log("wrap.lines=")
      i = 0
      for (let line of wrap.lines) {
        console.log(i, line)
        i++
      }
    }

    // make wrap.richTextInfos relative to the textbox
    for (let rti of wrap.richTextInfos) {
      rti.lineNoPosition.lineNo += firstLineNo
    }
  }

  // move the richTextInfos below the affected lines
  // downwards by the no of lines that were not there before
  for (let richTextInfo of richTextInfos) {
    if (richTextInfo.lineNoPosition.lineNo > lastLineNo) {
      richTextInfo.lineNoPosition.lineNo += wrap
        ? wrap.lines.length - (lastLineNo - firstLineNo) - 1
        : linesToWrap.length - (lastLineNo - firstLineNo) - 1
    }
  }

  // REMOVE

  // remove the richTextInfos that are now in the rtis_after from textbox.richTextInfos.
  // since they are contiguous they can be removed using the start index
  // They are added back later after wrapping the line again
  if (startIndexForRemovalRti !== -1) {
    richTextInfos.splice(
      startIndexForRemovalRti,
      rtisBefore.length + rtisAfter.length
    )
  }

  // remove wrapped lines that are part of the lineNo where text has to be added
  // these lines will be added back after wrapping the lines
  lines.splice(firstLineNo, lastLineNo - firstLineNo + 1)

  if (lastLineNo > firstLineNo) {
    wrapInfo.splice(firstLineNo + 1, lastLineNo - firstLineNo)
  }

  if (debug) {
    console.log("------")
    console.log("after removal")
    console.log("richTextInfos=")
    let i = 0
    for (let rti of richTextInfos) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }
    console.log("lines=")
    i = 0
    for (let line of lines) {
      console.log(i, line, line.length)
      i++
    }
  }

  // INSERT
  // insert lines back
  if (wrap) {
    lines.splice(firstLineNo, 0, ...wrap.lines)
  } else {
    lines.splice(firstLineNo, 0, ...linesToWrap)
  }

  // insert richTextInfos back
  if (startIndexForRemovalRti === -1) {
    let index = 0
    for (let i = 0; i < richTextInfos.length; i++) {
      let rti = richTextInfos[i]
      let { lineNo: rti_lineNo, positionInLine: rti_positionInLine } =
        rti.lineNoPosition
      if (
        rti_lineNo > lineNoPosition.lineNo ||
        (rti_lineNo === lineNoPosition.lineNo &&
          rti_positionInLine > lineNoPosition.positionInLine)
      ) {
        index = i
        break
      } else {
        index = i + 1
      }
    }

    if (wrap) {
      richTextInfos.splice(index, 0, ...wrap.richTextInfos)
    } else {
      richTextInfos.splice(
        index,
        0,
        ...rtisBefore,
        ...richTextInfosToAdd,
        ...rtisAfter
      )
    }
  } else {
    if (wrap) {
      richTextInfos.splice(startIndexForRemovalRti, 0, ...wrap.richTextInfos)
    } else {
      richTextInfos.splice(
        startIndexForRemovalRti,
        0,
        ...rtisBefore,
        ...richTextInfosToAdd,
        ...rtisAfter
      )
    }
  }

  if (wrap) {
    wrap.wrapInfo.shift()
    wrapInfo.splice(firstLineNo + 1, 0, ...wrap.wrapInfo)
  } else {
    let wi: boolean[] = []

    for (let i = 1; i < linesToWrap.length; i++) {
      wi.push(true)
    }

    wrapInfo.splice(firstLineNo + 1, 0, ...wi)
  }

  // let textWidth = longestLineWidth(lines, richTextInfos)

  // if (textWidth instanceof Error) {
  //   console.error(textWidth)
  //   return textWidth
  // }

  // textbox.textWidth = textWidth

  // #subOptimal: this recalculates the height of the entire textbox instead of
  // just calculating the difference between the height of the affected lines
  // updateTextboxShape(textbox)
  // textbox.events.publish("add", {
  //   text,
  //   lineNoPosition,
  //   richTextInfos: richTextInfosToAdd,
  // })

  if (debug) {
    console.log("------")
    console.log("richTextInfos=")
    let i = 0
    for (let rti of richTextInfos) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }
    console.log("lines=")
    i = 0
    for (let line of lines) {
      console.log(i, line, line.length)
      i++
    }
  }
}

const remove = (
  posA: LineNoPosition,
  posB: LineNoPosition,
  lines: string[],
  richTextInfos: RichTextInfo[],
  wrapInfo: WrapInfo,
  wrapWidth: number,
  textWrap: boolean = true,
  debug?: boolean
) => {
  // removes the text and rtis between posA and posB
  // HOW?:
  // join the part of line before start with the part of line after end
  // and also any wrapped lines that are after end but are part of the same line into a single line
  // shift the rtis accordingly
  // wrap the joined line with its richTextInfos using txt.wrapLines()
  // insert the wrapped lines and their richTextInfos back into self
  // this is done so that a whole rewrap of the text is not required
  // find which comes first posA or posB
  let { start, end } = sortLineNoPositions(posA, posB)

  if (debug) {
    console.log("----remove()----")
    console.log("start=", start.lineNo, start.positionInLine)
    console.log("end=", end.lineNo, end.positionInLine)

    let i = 0
    for (let rti of richTextInfos) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    i = 0
    for (let line of lines) {
      console.log(i, line, line.length)
      i++
    }
  }

  let firstLineNo: number = start.lineNo

  if (start.lineNo > 0 && !wrapInfo[start.lineNo]) {
    for (firstLineNo = start.lineNo - 1; firstLineNo >= 0; firstLineNo--) {
      if (wrapInfo[firstLineNo] === true) {
        break
      }
    }
  }

  // get lastLineNo to include wrapped lines after end line
  // after removal the wrapping might change
  let lastLineNo: number = end.lineNo

  if (end.lineNo < lines.length - 1) {
    for (let lineNo = end.lineNo + 1; lineNo < lines.length; lineNo++) {
      if (wrapInfo[lineNo] === true) {
        break
      }

      lastLineNo = lineNo
    }
  }

  let joinedLine = ""

  // join the lines into 1 line
  for (let i = firstLineNo; i < start.lineNo; i++) {
    joinedLine += lines[i]
  }

  joinedLine +=
    lines[start.lineNo].substring(0, start.positionInLine) +
    lines[end.lineNo].substring(end.positionInLine)

  // if lastLineNo is equal to endOfLine this will be skipped
  for (let i = end.lineNo + 1; i <= lastLineNo; i++) {
    joinedLine += lines[i]
  }

  // get rtis that are before and after the lineNoPosition where we're removing the text
  // this includes rtis below the line but only the wrapped lines part of the line
  let prevRichTextInfo: RichTextInfo | undefined | Error = lastRichTextInfo(
    { lineNo: start.lineNo, positionInLine: 0 },
    richTextInfos
  )

  if (prevRichTextInfo instanceof Error) {
    console.error(prevRichTextInfo)
    return
  }

  let rtis_before: RichTextInfo[] = []
  let rtis_inside: RichTextInfo[] = []
  let rtis_after: RichTextInfo[] = []

  // collect the rtis before, inside, after
  for (let richTextInfo of richTextInfos) {
    let r_lineNoPosition = richTextInfo.lineNoPosition

    let isRtiInside =
      // case when rti's lineNo is between from and to
      (r_lineNoPosition.lineNo > start.lineNo &&
        r_lineNoPosition.lineNo < end.lineNo) ||
      // case when rti is on the same line as start and, start and end, are on different lines
      (r_lineNoPosition.lineNo === start.lineNo &&
        r_lineNoPosition.positionInLine >= start.positionInLine &&
        start.lineNo !== end.lineNo) ||
      // case when rti is on the same line as to and, from and to are on different lines
      (r_lineNoPosition.lineNo === end.lineNo &&
        r_lineNoPosition.positionInLine <= end.positionInLine &&
        start.lineNo !== end.lineNo) ||
      // case when from and to are on the same line and rti is within from and to
      (r_lineNoPosition.lineNo === start.lineNo &&
        r_lineNoPosition.positionInLine >= start.positionInLine &&
        r_lineNoPosition.positionInLine <= end.positionInLine &&
        start.lineNo === end.lineNo)

    let isRtiBefore =
      (r_lineNoPosition.lineNo === start.lineNo &&
        r_lineNoPosition.positionInLine < start.positionInLine) ||
      (r_lineNoPosition.lineNo < start.lineNo &&
        r_lineNoPosition.lineNo >= firstLineNo)

    let isRtiAfter =
      (r_lineNoPosition.lineNo === end.lineNo &&
        r_lineNoPosition.positionInLine > end.positionInLine) ||
      (r_lineNoPosition.lineNo > end.lineNo &&
        r_lineNoPosition.lineNo <= lastLineNo)

    if (isRtiInside) {
      rtis_inside.push(richTextInfo)
    } else if (isRtiBefore) {
      rtis_before.push(richTextInfo)
    } else if (isRtiAfter) {
      rtis_after.push(richTextInfo)
    } else if (r_lineNoPosition.lineNo > lastLineNo) {
      break
    }
  }

  let startIndexForRemovalRti = 0

  if (rtis_before.length > 0) {
    startIndexForRemovalRti = richTextInfos.indexOf(rtis_before[0])
  } else if (rtis_inside.length > 0) {
    startIndexForRemovalRti = richTextInfos.indexOf(rtis_inside[0])
  } else {
    startIndexForRemovalRti = richTextInfos.indexOf(rtis_after[0])
  }

  // the lastRti should always be kept
  // so that this works like HTML tags
  // the last rti inside will only be removed if it's the last rti of the text
  // it should not be removed if there will be no rtis left after its removal
  // and the end of removal is at the end of doc
  // #Q: not sure if 2 rtis can be at the same lineNo and positionInLine
  let keepLastRti = true

  if (rtis_inside.length > 0) {
    let lastRti = rtis_inside[rtis_inside.length - 1]
    let allRtisInside = richTextInfos.length === rtis_inside.length
    let index = richTextInfos.indexOf(lastRti)
    let isEndAtEndOfText =
      end.lineNo === lines.length - 1 &&
      end.positionInLine === lines[lines.length - 1].length

    if (isEndAtEndOfText && !allRtisInside) {
      keepLastRti = false
    } else {
      lastRti.lineNoPosition.positionInLine = start.positionInLine
    }
  } else if (rtis_inside.length === 0) {
    keepLastRti = false
  }

  if (debug) {
    console.log("-----")
    console.log("firstLineNo=", firstLineNo)
    console.log("lastLineNo=", lastLineNo)
    console.log("previous richTextInfo =", prevRichTextInfo)
    console.log("startIndex=", startIndexForRemovalRti)
    console.log("joinedLine=", joinedLine)

    console.log("rtis_before=")
    for (let rti of rtis_before) {
      console.log(
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
    }

    console.log("rtis_inside =")
    for (let rti of rtis_inside) {
      console.log(
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
    }

    console.log("rtis_after=")
    for (let rti of rtis_after) {
      console.log(
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
    }
  }

  // cloning these as they will be shifted
  // #Q: is cloning really required here
  rtis_before = cloneRichTextInfos(rtis_before)
  rtis_after = cloneRichTextInfos(rtis_after)

  // SHIFT LINES/RTIs UP

  // rtis positionInLine will be shifted by the lines above
  // which are part of the wrapped line
  // rtis will be relatively at lineNo 0
  for (let rti of rtis_before) {
    // add length of wrapped lines between `first` line and the rti's line
    for (let i = firstLineNo; i < rti.lineNoPosition.lineNo; i++) {
      rti.lineNoPosition.positionInLine += lines[i].length
    }

    rti.lineNoPosition.lineNo = 0
  }

  let lengthOfLinesBefore = 0
  for (let i = firstLineNo; i < start.lineNo; i++) {
    lengthOfLinesBefore += lines[i].length
  }

  for (let rti of rtis_inside) {
    // add length of wrapped lines between `first` line and the rti's line
    rti.lineNoPosition.positionInLine += lengthOfLinesBefore

    rti.lineNoPosition.lineNo = 0
  }

  // shift up the rtis_after into a single joined line (assuming the text is removed)
  for (let rti of rtis_after) {
    if (rti.lineNoPosition.lineNo === end.lineNo) {
      rti.lineNoPosition.positionInLine += lengthOfLinesBefore
      if (start.lineNo === end.lineNo) {
        rti.lineNoPosition.positionInLine -=
          end.positionInLine - start.positionInLine
      } else if (end.lineNo > start.lineNo) {
        rti.lineNoPosition.positionInLine -= end.positionInLine
        rti.lineNoPosition.positionInLine += start.positionInLine
      }
    }
    // if rti is below the end.lineNo (in a wrapped line)
    else if (rti.lineNoPosition.lineNo > end.lineNo) {
      rti.lineNoPosition.positionInLine += lengthOfLinesBefore

      let endLineRemainingPart = lines[end.lineNo].length - end.positionInLine

      rti.lineNoPosition.positionInLine +=
        start.positionInLine + endLineRemainingPart

      // add length of wrapped lines between `end` line and the rti's line
      for (let i = end.lineNo + 1; i < rti.lineNoPosition.lineNo; i++) {
        rti.lineNoPosition.positionInLine += lines[i].length
      }
    }

    rti.lineNoPosition.lineNo = 0
  }

  if (debug) {
    console.log("----")
    console.log("after shifting rtis")

    console.log("rtis_before=")
    let i = 0
    for (let rti of rtis_before) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    i = 0
    console.log("rtis_inside =")
    for (let rti of rtis_inside) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    console.log("rtis_after=")
    for (let rti of rtis_after) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    console.log("linesToWrap=", joinedLine)
    console.log("rtisToWrap=")

    if (keepLastRti) {
      console.log([
        ...rtis_before,
        rtis_inside[rtis_inside.length - 1],
        ...rtis_after,
      ])
    } else {
      console.log([...rtis_before, ...rtis_after])
    }
  }

  // REMOVAL
  // remove richTextInfos
  if (startIndexForRemovalRti !== -1) {
    richTextInfos.splice(
      startIndexForRemovalRti,
      rtis_before.length + rtis_inside.length + rtis_after.length
    )
  }

  // remove lines between start and lastLineNo (including the start line)
  // to be added after wrapping the joinedLine again
  lines.splice(firstLineNo, lastLineNo - firstLineNo + 1)

  // remove the wrapInfos (not including the firstLine)
  if (lastLineNo > firstLineNo) {
    wrapInfo.splice(firstLineNo + 1, lastLineNo - firstLineNo)
  }

  let wrap = undefined
  let rtisToWrap = keepLastRti
    ? [...rtis_before, rtis_inside[rtis_inside.length - 1], ...rtis_after]
    : [...rtis_before, ...rtis_after]

  // WRAP
  // wrap the joinedLine
  if (textWrap) {
    // let wrap:
    //   | {
    //       lines: string[]
    //       wrapInfo: boolean[]
    //       richTextInfos: RichTextInfo[]
    //     }
    //   | Error

    wrap = wrapLine(
      joinedLine,
      rtisToWrap,
      wrapWidth,
      prevRichTextInfo ? prevRichTextInfo : undefined
    )

    if (wrap instanceof Error) {
      console.error(wrap)
      return wrap
    }
  }

  if (wrap) {
    // make wrap.richTextInfos relative to the textbox
    for (let rti of wrap.richTextInfos) {
      // rti.lineNoPosition.lineNo += start.lineNo
      rti.lineNoPosition.lineNo += firstLineNo
    }
  } else if (wrap === undefined) {
    // make richTextInfos relative to the textbox
    // #Suboptimal: if wraping is turned off this step is not needed

    for (let rti of rtisToWrap) {
      rti.lineNoPosition.lineNo += firstLineNo
    }
  }

  if (debug) {
    console.log("------")
    console.log("after rewrapping")
    if (wrap) {
      let i = 0
      console.log("wrap.richTextInfos=")
      for (let rti of wrap.richTextInfos) {
        console.log(
          i,
          rti.lineNoPosition.lineNo,
          rti.lineNoPosition.positionInLine,
          rti.textFormat
        )
        i++
      }

      console.log("wrap.lines=:")
      i = 0
      for (let line of wrap.lines) {
        console.log(i, line)
        i++
      }
    }
  }

  // INSERTION
  if (wrap) {
    // insert lines back
    lines.splice(firstLineNo, 0, ...wrap.lines)
    // move the richTextInfos after 'end' upwards by the no of lines removed
    for (let richTextInfo of richTextInfos) {
      if (richTextInfo.lineNoPosition.lineNo > lastLineNo) {
        richTextInfo.lineNoPosition.lineNo -=
          lastLineNo - firstLineNo + 1 - wrap.lines.length
      }
    }

    // insert richTextInfos back
    if (startIndexForRemovalRti !== -1) {
      richTextInfos.splice(startIndexForRemovalRti, 0, ...wrap.richTextInfos)
    }

    // insert wrapInfo
    wrap.wrapInfo.shift()
    wrapInfo.splice(firstLineNo + 1, 0, ...wrap.wrapInfo)
  } else if (wrap === undefined) {
    // insert lines back
    lines.splice(firstLineNo, 0, joinedLine)
    // move the richTextInfos after 'end' upwards by the no of lines removed
    for (let richTextInfo of rtisToWrap) {
      if (richTextInfo.lineNoPosition.lineNo > lastLineNo) {
        richTextInfo.lineNoPosition.lineNo -= lastLineNo - firstLineNo
      }
    }

    // insert richTextInfos back
    if (startIndexForRemovalRti !== -1) {
      richTextInfos.splice(startIndexForRemovalRti, 0, ...rtisToWrap)
    }
  }

  // #subOptimal: this recalculates the height of the entire textbox instead of
  // just calculating the difference between the height of the affected lines
  // updateTextboxShape(textbox)
  // textbox.events.publish("remove", { posA, posB })

  if (debug) {
    console.log("------")
    let i = 0
    for (let rti of richTextInfos) {
      console.log(
        i,
        rti.lineNoPosition.lineNo,
        rti.lineNoPosition.positionInLine,
        rti.textFormat
      )
      i++
    }

    i = 0
    for (let line of lines) {
      console.log(i, line, line.length)
      i++
    }
  }
}

export {
  createTextCursor,
  widthFromLineNoPosition,
  widthToPositionInLine,
  lineNoPositionToCoords,
  totalHeight,
  lineHeight,
  longestLineWidth,
  calculateLineWidth,
  calculateLineWidthRltv,
  lastRichTextInfo,
  lastRichTextInfoIndex,
  sortLineNoPositions,
  cloneRichTextInfo,
  cloneRichTextInfos,
  textFormatFromLineNoPosition,
  coordsToLineNoPosition,
  lineNoPositionToPosition,
  positionToLineNoPosition,
  unwrapLineNoPosition,
  unwrapLines,
  wrapLine,
  wrapLines,
  getTextBetween,
  getRichTextInfosBetween,
  print,
  cleanRichTextInfos,
  add,
  remove,
  nonCharacterKeys,
}

// const lengthBetweenPositionsInLine = (
//   start: number,
//   end: number,
//   line: Line,
//   richTextInfos: RichTextInfo[],
//   prevRichTextInfo: RichTextInfo | undefined
// ): number | Error => {
//   // this assumes that all the richTextInfos provided have the same lineNo

//   if (prevRichTextInfo === undefined) {
//     if (richTextInfos.length === 0) {
//       return Error(
//         `if prevRichTextInfo is undefined then richTextInfos's cannot be empty (${prevRichTextInfo}, ${richTextInfos})`
//       )
//     } else if (richTextInfos[0].lineNoPosition.positionInLine !== 0) {
//       return Error(
//         `calculateLineWidthRltv(): if prevRichTextInfo is undefined then richTextInfos[0]'s positionInLine must be 0 (positionInLine=${richTextInfos[0].lineNoPosition.positionInLine})`
//       )
//     } else {
//       prevRichTextInfo = richTextInfos[0]
//     }
//   }

//   let textFormat: TextFormat = prevRichTextInfo.textFormat
//   let length: number = 0
//   let isTextFormatSame: boolean = richTextInfos.length === 0 ? true : false
//   let lastPosition: number = 0
//   let lineNoCheck =
//     richTextInfos.length > 0 ? richTextInfos[0].lineNoPosition.lineNo : 0
//   let

//   for (let richTextInfo of richTextInfos) {
//     let { lineNo: r_lineNo, positionInLine: r_positionInLine } =
//       richTextInfo.lineNoPosition

//     if (r_lineNo !== lineNoCheck) {
//       return Error(
//         `calculateLineWidthRltv(): lineNos do not match with ${richTextInfo} (${lineNoCheck}!=${r_lineNo})`
//       )
//     }

//     for (let x of line) {
//       if (typeof x === "string") {
//         if(x.length)
//         let metrics = gl.measureText(x, textFormat)
//         if (metrics instanceof Error) return metrics
//         length += metrics.width
//       } else if (x.type === "Tex") {
//         let l = tex.getWidth(x)
//         if (l instanceof Error) return l
//         length += l
//       }
//     }

//     lastPosition = r_positionInLine
//     textFormat = richTextInfo.textFormat
//   }
// }
