import { KeyboardInput, ModifierKeys } from "./inputs"

export const isOnlyChord = (keyboardInfo: KeyboardInput, combo: string[]) => {
  let s = new Set(combo)
  let found = new Set<string>()
  for (let [mod, present] of Object.entries(keyboardInfo.modifiers)) {
    if (present) found.add(mod)
  }
  found.add(keyboardInfo.key)
  if (s.size === found.size && s.union(found).size === s.size) return true
  return false
}
