import { Textbox } from "./textbox";
import { areCoordsInside } from "./textbox";
import { Vector2D } from "./utils/vector";
import * as menu from "./utils/menu/menu";
import { PointerInput, KeyboardInput } from "./utils/inputs";
import { Menu } from "./utils/menu/menu";
import { TextFormat, TextAlignment } from "./text";

const handlePointerInput = (
  pointerInput: PointerInput,
  textbox: Textbox,
  menuHooks?: {
    areCoordsInside: (coords: Vector2D) => boolean;
    set: (textFormat: TextFormat & { align: TextAlignment }) => void;
  },
): void => {
  if (pointerInput !== undefined) {
    switch (pointerInput.inputType) {
      case "down": {
        let coordsInsideTextMenu =
          menuHooks !== undefined &&
          menuHooks.areCoordsInside(pointerInput.coords);

        let coordsOutsideTextbox = !areCoordsInside(
          pointerInput.coords,
          textbox,
        );

        if (coordsOutsideTextbox && !coordsInsideTextMenu) {
          textbox.typing = false;
          textbox.events.publish("deselect");
          break;
        } else if (coordsInsideTextMenu) {
          break;
        }

        let coords = pointerInput.coords;
        let clicks = pointerInput.clicks;

        const singleClick = clicks === 1;
        const doubleClick = clicks === 2;
        const tripleClick = clicks === 3;

        if (doubleClick) {
          textbox.events.publish("select-word", coords);
        } else if (tripleClick) {
          // select line when triple click on a typing shape
          textbox.events.publish("select-line", coords);
        } else if (singleClick) {
          textbox.typing = true;
          textbox.events.publish("place-cursor", coords);

          let textFormat = textbox.textCursor?.props.textFormat;
          if (!textFormat) {
            console.error(`textFormat cannot undefined`);
            return;
          }

          let tf = {
            ...textFormat,
            align: textbox.props.align,
          };

          if (menuHooks !== undefined) menuHooks.set(tf);
        }

        break;
      }

      case "move": {
        if (!pointerInput.isPressed) {
          return;
        }

        let coordsInsideTextMenu =
          menuHooks !== undefined &&
          menuHooks.areCoordsInside(pointerInput.coords);

        if (coordsInsideTextMenu) {
          break;
        }

        textbox.events.publish("select", pointerInput.coords);
      }

      case "up": {
        break;
      }
    }
  }
  return;
};

const handleKeyboardInput = (
  textbox: Textbox,
  keyboardInput: KeyboardInput,
) => {
  if (keyboardInput !== undefined && textbox.typing) {
    let key = keyboardInput.key;
    let modifiers = keyboardInput.modifiers;
    modifiers["Control"] = keyboardInput.modifiers["Control"];
    modifiers["Shift"] = keyboardInput.modifiers["Shift"];
    modifiers["Alt"] = keyboardInput.modifiers["Alt"];
    modifiers["Meta"] = keyboardInput.modifiers["Meta"];

    if (textbox.typing) {
      textbox.events.publish("type", {
        key,
        modifiers,
        textFormat: undefined,
      });
    }
    return;
  }
};

export { handleKeyboardInput, handlePointerInput };
