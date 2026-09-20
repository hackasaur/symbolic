/**
 * 1 SETTINGS to rule them all
 **/

export type LineJoin = "round" | "bevel" | "miter";
export type LineCap = "butt" | "round" | "square";
import { DPR } from "./utils/gl";
import * as vector from "./utils/vector";

export const SETTINGS = {
  backgroundColor: "rgb(20, 22, 27)", //dark
  windowPadding: 10,
  strokeWidth: 2,
  strokeColor: "rgb(248, 248, 242)",
  strokeStyle: "solid",
  lineDash: [5, 5] as [number, number],
  cornerRadii: 3,
  DPR: DPR(),
  minDeliberateDist: 3,
  button: {
    font: "Fira Mono",
    fontSize: 8,
    FontColor: "white",
    idleColor: "#586e75",
    hoverColor: "rgba(139, 233, 253, 1)",
    toggleColor: "rgba(98, 114, 164, 1)",
    padding: 2,
    cornerRadii: 2,
  },
  textbox: {
    linespace: 5,
    padding: 4,
    cursorWidth: 2,
    highlightColor: "rgba(0, 110, 212, 0.4)",
    highlightRadii: 3,
    defaultWidth: 200,
  },
  debug: {
    enableStressTest: false,
    pointerHaloRadius: 20,
    runTests: false,
  },
  ui: {
    button: {
      dims: vector.create(30, 27),
      idleColor: "rgba(0, 0, 0, 0)",
      hoverColor: "rgba(189, 147, 249, 0.4)",
      toggledColor: "rgba(100,100,100,0.8)",
      opacity: 1,
      padding: 5,
      cornerRadii: 3,
    },
    panel: {
      strokeWidth: 2,
      idleColor: "rgb(0, 0, 0)",
      opacity: 0.4,
      cornerRadii: 5,
      shadow: {
        shadowColor: "rgba(0, 0, 0, 1)",
        shadowOffsetX: 4,
        shadowOffsetY: 4,
        shadowBlur: 15,
      },
    },
    palatte: {
      strokeWidth: 2,
      strokeColor: "rgb(98, 114, 164)",
      palatteBtnDims: vector.create(18, 18),
      colorButtonDims: vector.create(15, 15),
      hues: 8,
      shades: 4,
      padding: 5,
      bgOpacity: 0.4,
    },
    textFormat: {
      font: "Helvetica Neue",
      fontColor: "rgb(255,255,255)",
      fontSize: 14,
      italic: false,
      bold: false,
    },
    strokeSizes: {
      small: 2,
      medium: 3,
      large: 5,
    },
    opacityLevels: {
      low: 0.2,
      medium: 0.6,
      high: 1,
    },
    textMenu: {
      textFormat: {
        font: "Helvetica Neue",
        fontColor: "rgb(255,255,255)",
        fontSize: 14,
        italic: false,
        bold: false,
      },
      padding: 5,
      fontSize: {
        normal: 24,
        heading3: 28,
        heading2: 32,
        heading1: 36,
      },
      fonts: {
        hand: "Bradley Hand",
        code: "Courier New",
        sans: "Avenir Next",
        serif: "Baskerville",
      },
      alignment: {
        left: "|-",
        center: "-|-",
        right: "-|",
      },
    },
    menu: {
      openDuration: 300,
      closeDuration: 200,
      fadeInDuration: 350,
      fadeOutDuration: 150,
      gap: 10,
    },
  },
  waypoints: {
    duration: 500,
  },
};
