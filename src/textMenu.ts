import * as vector from "./utils/vector.ts"
import * as pnl from "./menu/panel.ts"
import * as btn from "./menu/button.ts"
import * as menu from "./menu/menu.ts"
import * as arrange from "./menu/arrange.ts"
import * as colorPalatte from "./menu/colorPalatte.ts"
import { Menu } from "./menu/menu.ts"
import { Vector2D } from "./utils/vector.ts"
import { SETTINGS } from "./settings.ts"

interface textMenuProps {
  font?: string
  fontSize?: number
  fontColor?: string | CanvasGradient
  italic?: boolean
  bold?: boolean
  align?: string
}

// TODO: replace magic numbers with config from settings
const create = (center: Vector2D, el: HTMLElement): Menu | Error => {
  // NOTE: spacing of buttons are not the same everywhere.
  // The font button is bigger than other buttons
  // Bold, Italic, Underline buttons don't have padding in between
  let padding = SETTINGS.ui.contextMenu.textMenu.padding
  let buttonWidth = 30
  let buttonHeight = 30
  let panelWidth =
    7 * (buttonWidth + SETTINGS.ui.contextMenu.textMenu.padding) - padding
  let panelHeight = buttonHeight + +SETTINGS.ui.contextMenu.rectMenu.padding
  let fontSize = SETTINGS.ui.contextMenu.textFormat.fontSize

  let base = pnl.create({
    id: "base",
    center: center,
    width: panelWidth,
    height: panelHeight,
    rotation: 0,
    font: SETTINGS.ui.contextMenu.textFormat.font,
    fontSize: fontSize,
    fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
    idleColor: SETTINGS.ui.contextMenu.panel.idleColor,
    opacity: SETTINGS.ui.contextMenu.panel.opacity,
    hoverColor: "white",
    strokeWidth: 1,
    strokeColor: "black",
    padding: 10,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
    label: "main",
    shadow: undefined,
  })

  if (base instanceof Error) {
    return base
  }

  // font
  let fontBtn = btn.create({
    id: "font",
    center: vector.create(0, 0),
    width: 1.5 * buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "Sans",
    font: {
      font: SETTINGS.ui.contextMenu.textMenu.fonts.sans,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: padding,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (fontBtn instanceof Error) {
    return fontBtn
  }

  let fontPanel = pnl.create({
    id: "fontPanel",
    center: vector.create(0, 0),
    width: 2 * buttonWidth,
    height: 4 * (buttonHeight + padding / 2),
    rotation: 0,
    font: SETTINGS.ui.contextMenu.textFormat.font,
    fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
    fontColor: "white",
    idleColor: SETTINGS.ui.contextMenu.panel.idleColor,
    opacity: SETTINGS.ui.contextMenu.panel.opacity,
    hoverColor: "white",
    strokeWidth: SETTINGS.ui.contextMenu.panel.strokeWidth,
    strokeColor: "black",
    padding: SETTINGS.ui.contextMenu.textMenu.padding,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
    label: "fontPanel",
    shadow: undefined,
  })

  if (fontPanel instanceof Error) {
    return fontPanel
  }

  let sansFont = btn.create({
    id: "sansFont",
    center: vector.create(0, 0),
    width: 2 * buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "Sans",
    font: {
      font: SETTINGS.ui.contextMenu.textMenu.fonts.sans,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.normal,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (sansFont instanceof Error) {
    return sansFont
  }

  let serifFont = btn.create({
    id: "serifFont",
    center: vector.create(0, 0),
    width: 2 * buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "Serif",
    font: {
      font: SETTINGS.ui.contextMenu.textMenu.fonts.serif,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.normal,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (serifFont instanceof Error) {
    return serifFont
  }

  let codeFont = btn.create({
    id: "codeFont",
    center: vector.create(0, 0),
    width: 2 * buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "Code",
    font: {
      font: SETTINGS.ui.contextMenu.textMenu.fonts.code,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.normal,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (codeFont instanceof Error) {
    return codeFont
  }

  let handFont = btn.create({
    id: "handFont",
    center: vector.create(0, 0),
    width: 2 * buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "Hand",
    font: {
      font: SETTINGS.ui.contextMenu.textMenu.fonts.hand,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.normal,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (handFont instanceof Error) {
    return handFont
  }

  btn.update(fontBtn, {
    center: vector.add(
      base.props.center,
      vector.create(
        fontBtn.props.width / 2 + padding / 2,
        base.props.height / 2
      )
    ),
  })

  // #TODO: should not have to subtract width/2 from center.x to align the panel after open animation is played (confusing!)
  pnl.update(fontPanel, {
    center: vector.create(
      fontBtn.props.center.x - fontBtn.props.width / 2,
      fontBtn.props.center.y + buttonHeight
    ),
  })

  let box = {
    center: vector.add(
      fontPanel.props.center,
      vector.create(fontPanel.props.width / 2, fontPanel.props.height / 2)
    ),
    width: fontPanel.props.width,
    height: fontPanel.props.height,
    rotation: fontPanel.props.rotation,
  }

  arrange.inGrid(
    [sansFont, serifFont, codeFont, handFont],
    padding / 4,
    // (fontPanel.props.width - buttonWidth) / 2,
    box
  )

  btn.addChild(fontBtn, fontPanel)
  pnl.addChildren(fontPanel, [sansFont, serifFont, codeFont, handFont])

  // font-size
  let fontSizeBtn = btn.create({
    id: "fontSize",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "N",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (fontSizeBtn instanceof Error) {
    return fontSizeBtn
  }

  let fontSizePanel = pnl.create({
    id: "fontSizePanel",
    center: vector.create(0, 0),
    width: buttonWidth + 2 * padding,
    height: 4 * (buttonHeight + padding),
    rotation: 0,
    font: SETTINGS.ui.contextMenu.textFormat.font,
    fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
    fontColor: "white",
    idleColor: SETTINGS.ui.contextMenu.panel.idleColor,
    opacity: SETTINGS.ui.contextMenu.panel.opacity,
    hoverColor: "white",
    strokeWidth: SETTINGS.ui.contextMenu.panel.strokeWidth,
    strokeColor: "black",
    padding: 10,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
    label: "fontSizePanel",
    shadow: undefined,
  })

  if (fontSizePanel instanceof Error) {
    return fontSizePanel
  }

  let normalText = btn.create({
    id: "normalText",
    center: vector.create(340, 223),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "N",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.normal,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (normalText instanceof Error) {
    return normalText
  }

  let heading1 = btn.create({
    id: "heading1",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "H1",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.heading1,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (heading1 instanceof Error) {
    return heading1
  }

  let heading2 = btn.create({
    id: "heading2",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "H2",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.heading2,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (heading2 instanceof Error) {
    return heading2
  }

  let heading3 = btn.create({
    id: "heading3",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: "H3",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.heading3,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (heading3 instanceof Error) {
    return heading3
  }

  btn.update(fontSizeBtn, {
    center: vector.add(
      base.props.center,
      vector.create(
        fontBtn.props.width + buttonWidth / 2 + padding,
        base.props.height / 2
      )
    ),
  })

  // #TODO: should not have to subtract width/2 from center.x to align the panel after open animation is played (confusing!)
  pnl.update(fontSizePanel, {
    center: vector.create(
      fontSizeBtn.props.center.x - fontSizeBtn.props.width / 2,
      fontSizeBtn.props.center.y + buttonHeight
    ),
  })

  btn.addChild(fontSizeBtn, fontSizePanel)
  pnl.addChildren(fontSizePanel, [normalText, heading3, heading2, heading1])

  box = {
    center: vector.add(
      fontSizePanel.props.center,
      vector.create(
        fontSizePanel.props.width / 2,
        fontSizePanel.props.height / 2
      )
    ),
    width: fontSizePanel.props.width,
    height: fontSizePanel.props.height,
    rotation: fontSizePanel.props.rotation,
  }

  arrange.inGrid([normalText, heading3, heading2, heading1], padding / 2, box)

  //bold/italics/underline
  let bold = btn.create({
    id: "bold",
    center: vector.create(0, 0),
    width: buttonWidth - 3,
    height: buttonHeight,
    rotation: 0,
    label: "B",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: true,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (bold instanceof Error) {
    return bold
  }

  let italic = btn.create({
    id: "italic",
    center: vector.create(0, 0),
    width: buttonWidth - 3,
    height: buttonHeight,
    rotation: 0,
    label: "I",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: true,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (italic instanceof Error) {
    return italic
  }

  let underline = btn.create({
    id: "underline",
    center: vector.create(0, 0),
    width: buttonWidth - 3,
    height: buttonHeight,
    rotation: 0,
    label: "U",
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (underline instanceof Error) {
    return underline
  }

  btn.update(bold, {
    center: vector.add(
      base.props.center,
      vector.create(
        fontBtn.props.width + 2 * (buttonWidth + 5) + buttonWidth / 2,
        base.props.height / 2
      )
    ),
  })

  btn.update(italic, {
    center: vector.add(
      base.props.center,
      vector.create(
        fontBtn.props.width + 3 * buttonWidth + 2 * 5 + buttonWidth / 2 - 2,
        base.props.height / 2
      )
    ),
  })

  btn.update(underline, {
    center: vector.add(
      base.props.center,
      vector.create(
        fontBtn.props.width +
          4 * buttonWidth +
          2 * padding +
          buttonWidth / 2 -
          4,
        base.props.height / 2
      )
    ),
  })

  // palatte
  let palatteButton = colorPalatte.create(
    "palatte",
    vector.create(0, 0),
    SETTINGS.ui.contextMenu.menuGap,
    SETTINGS.ui.contextMenu.palatte.hues,
    SETTINGS.ui.contextMenu.palatte.shades,
    SETTINGS.ui.contextMenu.palatte.padding,
    SETTINGS.ui.contextMenu.palatte.strokeColor,
    SETTINGS.ui.contextMenu.palatte.strokeWidth,
    SETTINGS.ui.contextMenu.panel.idleColor,
    SETTINGS.ui.contextMenu.panel.opacity,
    SETTINGS.ui.contextMenu.palatte.palatteBtnDims,
    SETTINGS.ui.contextMenu.palatte.colorButtonDims,
    el
  )

  if (palatteButton instanceof Error) return palatteButton

  btn.move(
    palatteButton,
    vector.add(
      base.props.center,
      vector.create(
        fontBtn.props.width + buttonWidth + (buttonWidth / 2 + padding),
        base.props.height / 2
      )
    )
  )

  // text-align
  let textAlignBtn = btn.create({
    id: "textAlignBtn",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: SETTINGS.ui.contextMenu.textMenu.alignment.left,
    font: {
      font: SETTINGS.ui.contextMenu.textFormat.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii, //SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (textAlignBtn instanceof Error) {
    return textAlignBtn
  }

  let textAlignPanel = pnl.create({
    id: "textAlignPanel",
    center: vector.create(0, 0),
    width: buttonWidth + padding,
    height: 3 * (buttonHeight + padding),
    rotation: 0,
    font: SETTINGS.ui.contextMenu.textFormat.font,
    fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
    fontColor: "white",
    idleColor: SETTINGS.ui.contextMenu.panel.idleColor,
    opacity: SETTINGS.ui.contextMenu.panel.opacity,
    hoverColor: "white",
    strokeWidth: SETTINGS.ui.contextMenu.panel.strokeWidth,
    strokeColor: "black",
    padding: 10,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
    label: "fontSizePanel",
    shadow: undefined,
  })

  if (textAlignPanel instanceof Error) {
    return textAlignPanel
  }

  let leftAlign = btn.create({
    id: "leftAlign",
    center: vector.create(340, 223),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: SETTINGS.ui.contextMenu.textMenu.alignment.left,
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (leftAlign instanceof Error) {
    return leftAlign
  }

  let centerAlign = btn.create({
    id: "centerAlign",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: SETTINGS.ui.contextMenu.textMenu.alignment.center,
    font: {
      font: SETTINGS.ui.contextMenu.textFormat.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (centerAlign instanceof Error) {
    return centerAlign
  }

  let rightAlign = btn.create({
    id: "rightAlign",
    center: vector.create(0, 0),
    width: buttonWidth,
    height: buttonHeight,
    rotation: 0,
    label: SETTINGS.ui.contextMenu.textMenu.alignment.right,
    font: {
      font: fontBtn.props.font.font,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      fontSize: SETTINGS.ui.contextMenu.textFormat.fontSize,
      italic: false,
      bold: false,
    },
    icon: undefined,
    idleColor: "rgba(0,0,0,0)",
    hoverColor: "rgba(42, 161, 152, 0.8)",
    toggledColor: "rgba(100,100,100,0.8)",
    opacity: 1,
    padding: 5,
    cornerRadii: SETTINGS.ui.contextMenu.button.cornerRadii,
  })

  if (rightAlign instanceof Error) {
    return rightAlign
  }

  btn.update(textAlignBtn, {
    center: vector.add(
      base.props.center,
      vector.create(
        6 * (buttonWidth + padding) - padding + buttonWidth / 2,
        base.props.height / 2
      )
    ),
  })

  pnl.update(textAlignPanel, {
    center: vector.create(
      textAlignBtn.props.center.x - textAlignBtn.props.width / 2,
      textAlignBtn.props.center.y + buttonHeight
    ),
  })

  btn.addChild(textAlignBtn, textAlignPanel)
  pnl.addChildren(textAlignPanel, [leftAlign, centerAlign, rightAlign])

  box = {
    center: vector.add(
      textAlignPanel.props.center,
      vector.create(
        textAlignPanel.props.width / 2,
        textAlignPanel.props.height / 2
      )
    ),
    width: textAlignPanel.props.width,
    height: textAlignPanel.props.height,
    rotation: textAlignPanel.props.rotation,
  }

  arrange.inGrid([leftAlign, centerAlign, rightAlign], padding / 2, box)

  pnl.addChildren(base, [
    fontBtn,
    fontSizeBtn,
    palatteButton,
    bold,
    italic,
    underline,
    textAlignBtn,
  ])

  // set/get
  const set = (props: textMenuProps): void | Error => {
    switch (props.font) {
      case SETTINGS.ui.contextMenu.textMenu.fonts.sans: {
        let textFormat = { ...fontBtn.props.font }
        textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.sans

        btn.update(fontBtn, {
          label: "Sans",
          font: textFormat,
        })

        btn.switchTo([sansFont, serifFont, codeFont, handFont], sansFont)
        break
      }

      case SETTINGS.ui.contextMenu.textMenu.fonts.serif: {
        let textFormat = { ...fontBtn.props.font }
        textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.serif

        btn.update(fontBtn, {
          label: "Serif",
          font: textFormat,
        })

        btn.switchTo([sansFont, serifFont, codeFont, handFont], serifFont)
        break
      }

      case SETTINGS.ui.contextMenu.textMenu.fonts.code: {
        let textFormat = { ...fontBtn.props.font }
        textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.code

        btn.update(fontBtn, {
          label: "Code",
          font: textFormat,
        })
        btn.switchTo([sansFont, serifFont, codeFont, handFont], codeFont)
        break
      }

      case SETTINGS.ui.contextMenu.textMenu.fonts.hand: {
        let textFormat = { ...fontBtn.props.font }
        textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.hand

        btn.update(fontBtn, {
          label: "Hand",
          font: textFormat,
        })

        btn.switchTo([sansFont, serifFont, codeFont, handFont], handFont)
        break
      }
    }

    // fontSize size
    switch (props.fontSize) {
      case SETTINGS.ui.contextMenu.textMenu.fontSize.normal:
        btn.update(fontSizeBtn, { label: "N" })
        btn.switchTo([normalText, heading1, heading2, heading3], normalText)
        break
      case SETTINGS.ui.contextMenu.textMenu.fontSize.heading3:
        btn.update(fontSizeBtn, { label: "H3" })
        btn.switchTo([normalText, heading1, heading2, heading3], heading3)
        break
      case SETTINGS.ui.contextMenu.textMenu.fontSize.heading2:
        btn.update(fontSizeBtn, { label: "H2" })
        btn.switchTo([normalText, heading1, heading2, heading3], heading2)
        break
      case SETTINGS.ui.contextMenu.textMenu.fontSize.heading1:
        btn.update(fontSizeBtn, { label: "H1" })
        btn.switchTo([normalText, heading1, heading2, heading3], heading1)
        break
      default:
        return new Error("Invalid stroke width")
    }

    // font color
    if (props.fontColor) {
      btn.update(palatteButton, { idleColor: props.fontColor })
      btn.update(palatteButton, { toggledColor: props.fontColor })
    }

    if (props.bold) {
      if (!bold.toggled) btn.toggle(bold)
    } else {
      if (bold.toggled) btn.toggle(bold)
    }

    if (props.italic) {
      if (!italic.toggled) btn.toggle(italic)
    } else {
      if (italic.toggled) btn.toggle(italic)
    }

    switch (props.align) {
      case "Left": {
        let textFormat = { ...fontBtn.props.font }

        btn.update(textAlignBtn, {
          label: SETTINGS.ui.contextMenu.textMenu.alignment.left,
          font: textFormat,
        })

        btn.switchTo([leftAlign, centerAlign, rightAlign], leftAlign)
        break
      }

      case "Center": {
        let textFormat = { ...fontBtn.props.font }

        btn.update(textAlignBtn, {
          label: SETTINGS.ui.contextMenu.textMenu.alignment.center,
          font: textFormat,
        })

        btn.switchTo([leftAlign, centerAlign, rightAlign], centerAlign)
        break
      }

      case "Right": {
        let textFormat = { ...fontBtn.props.font }

        btn.update(textAlignBtn, {
          label: SETTINGS.ui.contextMenu.textMenu.alignment.right,
          font: textFormat,
        })

        btn.switchTo([leftAlign, centerAlign, rightAlign], rightAlign)
        break
      }
    }

    // #TODO: add underline in text
    // if (props.textFormat.underline) {
    //   if (!underline.toggle) btn.toggle(underline)
    // } else {
    //   if (underline.toggle) btn.toggle(underline)
    // }

    //TODO: add more properties here

    return
  }

  const get = (): textMenuProps | Error => {
    let props: textMenuProps = {
      font: SETTINGS.ui.contextMenu.textMenu.fonts.hand,
      fontSize: SETTINGS.ui.contextMenu.textMenu.fontSize.normal,
      fontColor: SETTINGS.ui.contextMenu.textFormat.fontColor,
      bold: false,
      italic: false,
      align: "Left",
    }

    switch (fontBtn.props.label) {
      case "Sans":
        props.font = SETTINGS.ui.contextMenu.textMenu.fonts.sans
        break
      case "Serif":
        props.font = SETTINGS.ui.contextMenu.textMenu.fonts.serif
        break
      case "Code":
        props.font = SETTINGS.ui.contextMenu.textMenu.fonts.code
        break
      case "Hand":
        props.font = SETTINGS.ui.contextMenu.textMenu.fonts.hand
        break
      default:
        return new Error("Invalid font size")
    }

    switch (fontSizeBtn.props.label) {
      case "N":
        props.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.normal
        break
      case "H3":
        props.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.heading3
        break
      case "H2":
        props.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.heading2
        break
      case "H1":
        props.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.heading1
        break
      default:
        return new Error("Invalid font size")
    }

    props.fontColor = palatteButton.props.idleColor
    props.bold = bold.toggled
    props.italic = italic.toggled

    switch (textAlignBtn.props.label) {
      case SETTINGS.ui.contextMenu.textMenu.alignment.left:
        props.align = "Left"
        break
      case SETTINGS.ui.contextMenu.textMenu.alignment.right:
        props.align = "Right"
        break
      case SETTINGS.ui.contextMenu.textMenu.alignment.center:
        props.align = "Center"
        break
      default:
        return new Error("Invalid text alignment")
    }

    return props
  }

  const textMenu = menu.create(base, el, "textMenu", get, set)

  sansFont.events.subscribe("clicked", () => {
    btn.switchTo([sansFont, serifFont, codeFont, handFont], sansFont)
    let textFormat = { ...fontBtn.props.font }
    textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.sans

    btn.update(fontBtn, {
      label: "Sans",
      font: textFormat,
    })

    textMenu.events.publish("optionUpdate", ["font"])
  })

  serifFont.events.subscribe("clicked", () => {
    btn.switchTo([sansFont, serifFont, codeFont, handFont], serifFont)
    let textFormat = { ...fontBtn.props.font }
    textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.serif

    btn.update(fontBtn, {
      label: "Serif",
      font: textFormat,
    })

    textMenu.events.publish("optionUpdate", ["font"])
  })

  codeFont.events.subscribe("clicked", () => {
    btn.switchTo([sansFont, serifFont, codeFont, handFont], codeFont)
    let textFormat = { ...fontBtn.props.font }
    textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.code

    btn.update(fontBtn, {
      label: "Code",
      font: textFormat,
    })

    textMenu.events.publish("optionUpdate", ["font"])
  })

  handFont.events.subscribe("clicked", () => {
    btn.switchTo([sansFont, serifFont, codeFont, handFont], handFont)
    let textFormat = { ...fontBtn.props.font }
    textFormat.font = SETTINGS.ui.contextMenu.textMenu.fonts.hand

    btn.update(fontBtn, {
      label: "Hand",
      font: textFormat,
    })

    textMenu.events.publish("optionUpdate", ["font"])
  })

  fontBtn.events.subscribe("update", (updates: any) => {
    if ("font" in updates) {
      let textFormat = { ...fontBtn.props.font }
      btn.update(fontSizeBtn, {
        font: textFormat,
      })

      let tf = { ...textFormat }
      tf.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.normal
      btn.update(normalText, { font: tf })
      tf = { ...textFormat }
      tf.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.heading1
      btn.update(heading1, { font: tf })
      tf = { ...textFormat }
      tf.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.heading2
      btn.update(heading2, { font: tf })
      tf.fontSize = SETTINGS.ui.contextMenu.textMenu.fontSize.heading3
      btn.update(heading3, { font: tf })

      tf = { ...textFormat }
      tf.bold = true
      btn.update(bold, { font: tf })

      tf = { ...textFormat }
      tf.italic = true
      btn.update(italic, { font: tf })
      btn.update(underline, { font: textFormat })
    }
  })

  normalText.events.subscribe("clicked", () => {
    // #FIX: switchTo isn't working
    btn.switchTo([normalText, heading1, heading2, heading3], normalText)
    btn.update(fontSizeBtn, { label: "N" })
    // btn.toggle(size)
    // strokeSizePanel.events.publish("close")
    textMenu.events.publish("optionUpdate", ["fontSize"])
  })

  heading1.events.subscribe("clicked", () => {
    btn.switchTo([normalText, heading1, heading2, heading3], heading1)
    btn.update(fontSizeBtn, { label: "H1" })
    // btn.toggle(size)
    // strokeSizePanel.events.publish("close")
    textMenu.events.publish("optionUpdate", ["fontSize"])
  })

  heading2.events.subscribe("clicked", () => {
    btn.switchTo([normalText, heading1, heading2, heading3], heading2)
    btn.update(fontSizeBtn, { label: "H2" })
    // btn.toggle(size)
    // strokeSizePanel.events.publish("close")
    textMenu.events.publish("optionUpdate", ["fontSize"])
  })

  heading3.events.subscribe("clicked", () => {
    btn.switchTo([normalText, heading1, heading2, heading3], heading3)
    btn.update(fontSizeBtn, { label: "H3" })
    // btn.toggle(size)
    // strokeSizePanel.events.publish("close")
    textMenu.events.publish("optionUpdate", ["fontSize"])
  })

  palatteButton.events.subscribe("colorChange", () => {
    textMenu.events.publish("optionUpdate", ["fontColor"])
  })

  bold.events.subscribe("clicked", () => {
    btn.toggle(bold)
    textMenu.events.publish("optionUpdate", ["bold"])
  })

  italic.events.subscribe("clicked", () => {
    btn.toggle(italic)
    textMenu.events.publish("optionUpdate", ["italic"])
  })

  underline.events.subscribe("clicked", () => {
    btn.toggle(underline)
    textMenu.events.publish("optionUpdate", ["underline"])
  })

  leftAlign.events.subscribe("clicked", () => {
    // #FIX: switchTo isn't working
    btn.switchTo([leftAlign, centerAlign, rightAlign], leftAlign)
    btn.update(textAlignBtn, {
      label: SETTINGS.ui.contextMenu.textMenu.alignment.left,
    })
    textMenu.events.publish("optionUpdate", ["align"])
  })

  rightAlign.events.subscribe("clicked", () => {
    // #FIX: switchTo isn't working
    btn.switchTo([leftAlign, centerAlign, rightAlign], rightAlign)
    btn.update(textAlignBtn, {
      label: SETTINGS.ui.contextMenu.textMenu.alignment.right,
    })
    textMenu.events.publish("optionUpdate", ["align"])
  })

  centerAlign.events.subscribe("clicked", () => {
    // #FIX: switchTo isn't working
    btn.switchTo([leftAlign, centerAlign, rightAlign], centerAlign)
    btn.update(textAlignBtn, {
      label: SETTINGS.ui.contextMenu.textMenu.alignment.center,
    })

    textMenu.events.publish("optionUpdate", ["align"])
  })

  menu.setVisible(textMenu, false, true)

  return textMenu
}

export { create }
