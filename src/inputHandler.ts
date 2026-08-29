import { Textbox } from "./text/textbox";
import { areCoordsInside } from "./text/textbox";
import { PointerInput, KeyboardInput } from "./utils/inputs";

const handlePointerInput = (
  textbox: Textbox,
  pointerInput: PointerInput,
): void => {
  if (!areCoordsInside(pointerInput.coords, textbox)) {
    switch (pointerInput.inputType) {
      case "down": {
        textbox.typing = false;
        textbox.events.publish("deselect");
      }
    }

    return;
  }

  if (pointerInput !== undefined) {
    switch (pointerInput.inputType) {
      case "down": {
        let coords = pointerInput.coords;
        let clicks = pointerInput.clicks;

        const singleClick = clicks === 1;
        const doubleClick = clicks === 2;
        const tripleClick = clicks === 3;

        if (doubleClick) {
          textbox.events.publish("select-word", coords);
          break;
        } else if (tripleClick) {
          // select line when triple click on a typing shape
          textbox.events.publish("select-line", coords);
          break;
        } else if (singleClick) {
          textbox.typing = true;
          textbox.events.publish("place-cursor", coords);
          break;
        }

        break;
      }

      case "move": {
        if (!pointerInput.isPressed) {
          return;
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
