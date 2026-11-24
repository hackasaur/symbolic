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
  const [result, err] = gl.initializeCanvas("scene", SETTINGS.backgroundColor);

  if (err != null || result === null) {
    console.error(err);
    return;
  }

  let el = document.getElementById("canvas-container");

  if (el === null) {
    return;
  }

  const { canvas, ctx } = result;


  let textboxProps = {
    center: {
      x: 300,
      y: 950,
    },
    lines: [
      "Symbolic",
      "A graphical rich text editor designed for extensibility and performance",
      " — 2Bros. Inc.© 🚀",
      "",
      "A poet once said, “The whole universe is in a glass of wine.” We will probably never know in what sense he meant that, for poets do not write to be understood.But it is true that if we look at a glass of wine closely enough we see the entire universe.There are the things of physics: the twisting liquid which evaporates depending on the wind and weather, the reflections in the glass, and our imagination adds the atoms.The glass is a distillation of the earth’s rocks, and in its composition we see the secrets of the universe’s age, and the evolution of stars.What strange array of chemicals are in the wine? How did they come to be? There are the ferments, the enzymes, the substrates, and the products.There in wine is found the great generalization: all life is fermentation.Nobody can discover the chemistry of wine without discovering, as did Louis Pasteur, the cause of much disease.How vivid is the claret, pressing its existence into the consciousness that watches it! If our small minds, for some convenience, divide this glass of wine, this universe, into parts—physics, biology, geology, astronomy, psychology, and so on—remember that nature does not know it! So let us put it all back together, not forgetting ultimately what it is for.Let it give us one more final pleasure: drink it and forget it all!",
    ],
    richTextInfos: [
      {
        lineNoPosition: {
          lineNo: 0,
          positionInLine: 0,
        },
        textFormat: {
          font: "Courier New",
          fontSize: 40,
          fontColor: "PowderBlue",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: {
          lineNo: 1,
          positionInLine: 0,
        },
        textFormat: {
          font: "Bradley Hand",
          fontSize: 32,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
      {
        lineNoPosition: {
          lineNo: 1,
          positionInLine: 11,
        },
        textFormat: {
          font: "Bradley Hand",
          fontSize: 28,
          fontColor: "gold",
          italic: true,
          bold: false,
        },
      },
      {
        lineNoPosition: {
          lineNo: 1,
          positionInLine: 16,
        },
        textFormat: {
          font: "Baskerville",
          fontSize: 28,
          fontColor: "cyan",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: {
          lineNo: 1,
          positionInLine: 22,
        },
        textFormat: {
          font: "Courier New",
          fontSize: 28,
          fontColor: "magenta",
          italic: false,
          bold: true,
        },
      },
      {
        lineNoPosition: {
          lineNo: 1,
          positionInLine: 28,
        },
        textFormat: {
          font: "Bradley Hand",
          fontSize: 28,
          fontColor: "white",
          italic: false,
          bold: false,
        },
      },
    ],
    linespace: 5,
    padding: 8,
    textCursorPosition: {
      lineNo: 0,
      positionInLine: 0,
    },
    textCursorWidth: 2,
    align: "Left" as TextAlignment,
    boxAlign: "Left" as TextAlignment,
    width: 500,
    height: 600,
    rotation: 0,
    wordWrap: true,
    opacity: 1,
    scrollXY: {
      x: 0,
      y: 0,
    },
    scrollbarConfig: {
      sliderSize: SETTINGS.scrollbar.sliderSize,
      extension: SETTINGS.scrollbar.extension,
      sliderColor: SETTINGS.scrollbar.sliderColor,
      barColor: SETTINGS.scrollbar.barColor,
        padding: SETTINGS.scrollbar.padding
    },
    selectionColor: "rgba(0, 110, 212, 0.4)",
    selectionRadii: 3,
  };

  let textbox: txtbox.Textbox | Error = txtbox.create(textboxProps);

  if (textbox instanceof Error) {
    console.error(textbox);
    return;
  }

  // === Text Menu ===
  const textMenu = txtMenu.create(vector.create(180, 80), el);

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
      if (textbox.typing) {
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

  let mainLoop = renderer.startRenderLoop(
    ctx,
    el,
    textbox,
    textMenu,
    () => {},
    true,
  );

  // debug
  // slider to set the width (for debugging)
  const slider = document.getElementById("slider") as HTMLInputElement;
  slider.addEventListener("input", () => {
    txtbox.update(textbox, { width: Number(slider.value) });
    txtbox.updateWrap(textbox);
  });

  function move(dx: number, dy: number) {
    if (textbox instanceof Error) {
      console.error(textbox);
      return;
    }

    if (textMenu instanceof Error) {
      console.error(textMenu);
      return;
    }

    txtbox.drag(textbox, vector.create(dx, dy));
    menu.drag(textMenu, vector.create(dx, dy));
  }

  function rotate(delta: number) {
    if (textbox instanceof Error) {
      console.error(textbox);
      return;
    }

    txtbox.rotate(textbox, delta, textbox.props.center);
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
  document
    .getElementById("clockwise")!
    .addEventListener("click", () => rotate(0.01));
  document
    .getElementById("anti-clockwise")!
    .addEventListener("click", () => rotate(-0.01));
}

main();
