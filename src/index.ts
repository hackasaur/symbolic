import * as txtbox from "./textbox.ts";
import * as gl from "./utils/gl";
import * as renderer from "./renderer";
import * as vector from "./utils/vector";
import * as inputs from "./utils/inputs";
import * as inputHandler from "./inputHandler.ts";
import * as txtMenu from "./textMenu.ts";
import * as menu from "./utils/menu/menu.ts";
import { getKeysDown } from "./utils/keyboard.ts";
import { TextAlignment, TextFormat } from "./text.ts";
import { SETTINGS } from "./settings";

function main() {
  const [result, err] = gl.initializeCanvas("scene", "black");

  if (err != null || result === null) {
    console.error(err);
    return;
  }

  let el = document.getElementById("canvas-container");

  if (el === null) {
    return;
  }

  const { canvas, ctx } = result;

  // === Textbox ===
  let text = {
    lines: [
      // text for debugging
      "Symbolic",
      "A graphical rich text editor designed for extensibility and performance",
      // "The quick brown fox jumped over the lazy dog",
      // "",
      // "0123456789.<.>,;:/?|()[]{}-+=_*&^@!$%^&*~`",
      // "言語",
      // " — 2Bros. Inc.© 🚀",
    ],
    richTextInfos: [
      {
        lineNoPosition: { lineNo: 0, positionInLine: 0 },
        textFormat: {
          font: "Courier New",
          fontSize: 36,
          fontColor: "PowderBlue",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 0 },
        textFormat: {
          font: "Bradley Hand",
          fontSize: 32,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 11 },
        textFormat: {
          font: "Bradley Hand",
          fontSize: 28,
          fontColor: "gold",
          italic: true,
          bold: false,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 16 },
        textFormat: {
          font: "Baskerville",
          fontSize: 28,
          fontColor: "cyan",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 21 },
        textFormat: {
          font: "Courier New",
          fontSize: 28,
          fontColor: "magenta",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: { lineNo: 1, positionInLine: 28},
        textFormat: {
          font: "Bradley Hand",
          fontSize: 28,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
      // {
      //   lineNoPosition: { lineNo: 2, positionInLine: 4 },
      //   textFormat: {
      //     font: "Avenir Next",
      //     fontSize: 24,
      //     fontColor: "green",
      //     italic: true,
      //     bold: false,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 2, positionInLine: 15 },
      //   textFormat: {
      //     font: "Baskerville",
      //     fontSize: 28,
      //     fontColor: "skyblue",
      //     italic: false,
      //     bold: true,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 2, positionInLine: 19 },
      //   textFormat: {
      //     font: "Bradley Hand",
      //     fontSize: 28,
      //     fontColor: "red",
      //     italic: true,
      //     bold: false,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 2, positionInLine: 26 },
      //   textFormat: {
      //     font: "Bradley Hand",
      //     fontSize: 24,
      //     fontColor: "white",
      //     italic: false,
      //     bold: false,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 2, positionInLine: 36 },
      //   textFormat: {
      //     font: "Bradley Hand",
      //     fontSize: 24,
      //     fontColor: "yellow",
      //     italic: true,
      //     bold: false,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 2, positionInLine: 40 },
      //   textFormat: {
      //     font: "Bradley Hand",
      //     fontSize: 28,
      //     fontColor: "skyblue",
      //     italic: false,
      //     bold: true,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 3, positionInLine: 0 },
      //   textFormat: {
      //     font: "Bradley Hand",
      //     fontSize: 32,
      //     fontColor: "white",
      //     italic: false,
      //     bold: false,
      //   },
      // },
      // {
      //   lineNoPosition: { lineNo: 5, positionInLine: 0 },
      //   textFormat: {
      //     font: "Avenir Next",
      //     fontSize: 24,
      //     fontColor: "white",
      //     italic: false,
      //     bold: false,
      //   },
      // },
    ],
    center: vector.create(600, 400),
    width: 550,
    height: 0,
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
    scrollable: false,
    boxAlign: "Left" as TextAlignment,
  };

  let textbox: txtbox.Textbox | Error = txtbox.create(text);
  if (textbox instanceof Error) {
    console.error(textbox);
    return;
  }

  // === Text Menu ===
  const textMenu = txtMenu.create(vector.create(400, 250), el);

  if (textMenu instanceof Error) {
    console.error(textMenu);
    return;
  }

  menu.open(textMenu);

  txtbox.initEventsHandler(textbox);

  let pointerEvents = inputs.createPointerEvents(el);
  let keyboardEvents = inputs.createKeyboardEvents();

  pointerEvents.subscribe("pointer", (pointerInput: inputs.PointerInput) => {
    inputHandler.handlePointerInput(pointerInput, textbox, {
      areCoordsInside: (coords: vector.Vector2D) => {
        return menu.areCoordsInside(coords, textMenu);
      },
      set: (textFormat: TextFormat & { align: TextAlignment }) => {
        textMenu.set(textFormat);
        return;
      },
    });
  });

  const keyDownDiv = document.getElementById("key") as HTMLDivElement;
  keyboardEvents.subscribe(
    "key-down",
    (keyboardInput: inputs.KeyboardInput) => {
      inputHandler.handleKeyboardInput(textbox, keyboardInput);
      if(textbox.typing){
      const key = getKeysDown(keyboardInput);
        keyDownDiv.innerText = key;
      }
    },
  );

  textMenu.events.subscribe("optionUpdate", (keys: string[]) => {
    // #TODO: Arrows should also be typable
    let textFormat: any = textMenu.get();

    let tf: {
      font?: string;
      fontSize?: number;
      fontColor?: string;
      italic?: boolean;
      bold?: boolean;
      align?: string;
    } = {};

    for (let key of keys) {
      if (key === "font") {
        tf.font = textFormat.font;
      }
      if (key === "fontSize") {
        tf.fontSize = textFormat.fontSize;
      }
      if (key === "fontColor") {
        tf.fontColor = textFormat.fontColor;
      }
      if (key === "italic") {
        tf.italic = textFormat.italic;
      }
      if (key === "bold") {
        tf.bold = textFormat.bold;
      }
      if (key === "align") {
        tf.align = textFormat.align;
      }
    }

    if (textbox.selectedTextPos.selected || tf.align !== undefined) {
      txtbox.changeTextformat(
        textbox,
        textFormat,
        textbox.selectedTextPos.posA,
        textbox.selectedTextPos.posB,
      );
    }

    if (textbox.textCursor !== null) {
      txtbox.updateTextCursor(textbox, textFormat);
    }
  });

  // slider to set the width (for debugging)
  const slider = document.getElementById("slider") as HTMLInputElement;

  let mainLoop = renderer.startRenderLoop(
    ctx,
    el,
    textbox,
    textMenu,
    () => {},
    true,
  );

  // debug
  slider.addEventListener("input", () => {
    txtbox.update(textbox, { width: Number(slider.value) });
    txtbox.updateWrap(textbox);
  });

  function move(dx: number, dy: number) {
    if (textbox instanceof Error) {
      console.error(textbox)
      return
    }

    if (textMenu instanceof Error) {
      console.error(textMenu)
      return
    }

    txtbox.drag(textbox, vector.create(dx, dy));
    menu.drag(textMenu, vector.create(dx, dy));
  }

  let step = 20;
  document
    .getElementById("up")!
    .addEventListener("click", () => move(0, -step));
  document
    .getElementById("down")!
    .addEventListener("click", () => move(0, step));
  document
    .getElementById("left")!
    .addEventListener("click", () => move(-step, 0));
  document
    .getElementById("right")!
    .addEventListener("click", () => move(step, 0));
}

main();
