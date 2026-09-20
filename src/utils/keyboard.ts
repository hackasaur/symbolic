import { KeyboardInput, ModifierKeys } from "./inputs";

export const isOnlyChord = (keyboardInfo: KeyboardInput, combo: string[]) => {
  let s = new Set(combo);
  let found = new Set<string>();
  for (let [mod, present] of Object.entries(keyboardInfo.modifiers)) {
    if (present) found.add(mod);
  }
  found.add(keyboardInfo.key);
  if (s.size === found.size && s.union(found).size === s.size) return true;
  return false;
};

export const getKeysDown = (keyboardInput: KeyboardInput) => {
  let modifiersStr = "";
  let modifier: keyof ModifierKeys;
  let key = keyboardInput.key === " " ? "Space" : keyboardInput.key

  for (modifier in keyboardInput.modifiers) {
    if (keyboardInput.modifiers[modifier]) {
      modifiersStr += `${modifier}+`;
      if(key === modifier) key = ""
    }
  }

  modifiersStr =  modifiersStr.concat(key)
  if (modifiersStr.endsWith("+")) modifiersStr = modifiersStr.substring(0, modifiersStr.length - 1)
  return modifiersStr
};
