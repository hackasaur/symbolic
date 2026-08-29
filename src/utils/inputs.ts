import { Vector2D } from "./vector"
import * as vector from "./vector"
import * as gl from "./gl"
import { pubSub, PubSub } from "./pubsub"

export interface PointerInput {
  inputType: "down" | "move" | "up" | "wheel"
  coords: Vector2D
  delta: Vector2D
  clicks: number
  isPressed: boolean
  distanceAccured: number // Distance traveled by the pointer while pressed
  pressedTime: number
}

export interface KeyboardInput {
  key: string
  modifiers: ModifierKeys
  prevKey: string | undefined
  timeDelta: number | undefined
}

export interface ModifierKeys {
  Control: boolean
  Shift: boolean
  Alt: boolean
  Meta: boolean
}

const numberKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
const alphabetKeys: string[] = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
]
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
const modifierKeys: string[] = ["Control", "Shift", "Alt", "Meta"]

const createPointerEvents = (el: HTMLElement): PubSub => {
  let isPressed = false
  let prevCoords: Vector2D | undefined = undefined
  let delta: Vector2D = vector.create(0, 0)
  let distanceAccured = 0

  let timerId: number = 0
  let clicks: number = 1
  let isConsecutiveClick: boolean = true
  let consecutiveClickTime: number = 250
  let pressedTimestamp: number | undefined = undefined

  let events: PubSub = pubSub([
    "pointer-down",
    "pointer-move",
    "pointer-up",
    "pointer",
    "wheel",
  ])

  el.addEventListener("pointerdown", (pointerEvent) => {
    let coords = gl.getPointerCoords(pointerEvent)
    isPressed = true
    delta = vector.create(0, 0)

    let pointerInfo: PointerInput = {
      inputType: "down",
      coords: coords,
      delta: delta,
      clicks: clicks,
      isPressed,
      distanceAccured: 0,
      pressedTime: 0,
    }

    pressedTimestamp = performance.now()

    isConsecutiveClick = true
    // clear the previous timeout
    clearTimeout(timerId)

    timerId = setTimeout(() => {
      // if the timeout gets completed then it's not a consecutive click
      isConsecutiveClick = false
      clicks = 1
    }, consecutiveClickTime)

    if (isConsecutiveClick === true) {
      clicks++
    }

    prevCoords = vector.copy(coords)
    events.publish("pointer-down", pointerInfo)
    events.publish("pointer", pointerInfo)
  })

  el.addEventListener("pointermove", (pointerEvent) => {
    let coords = gl.getPointerCoords(pointerEvent)
    delta = vector.create(
      prevCoords ? coords.x - prevCoords.x : 0,
      prevCoords ? coords.y - prevCoords.y : 0
    )
    if (isPressed) {
      distanceAccured += vector.size(delta)
    }

    let pressedTime = 0
    if (isPressed && pressedTimestamp) {
      pressedTime = performance.now() - pressedTimestamp
    }

    let pointerInfo: PointerInput = {
      inputType: "move",
      coords: coords,
      delta,
      clicks: clicks,
      isPressed,
      distanceAccured: distanceAccured,
      pressedTime,
    }

    prevCoords = vector.copy(coords)
    events.publish("pointer-move", pointerInfo)
    events.publish("pointer", pointerInfo)
  })

  el.addEventListener("pointerup", (pointerEvent) => {
    isPressed = false
    let coords = gl.getPointerCoords(pointerEvent)
    delta = vector.create(0, 0)

    let pressedTime = 0
    if (pressedTimestamp) {
      pressedTime = performance.now() - pressedTimestamp
    }

    let pointerInfo: PointerInput = {
      inputType: "up",
      coords: coords,
      delta: delta,
      clicks: 0,
      isPressed,
      distanceAccured: distanceAccured,
      pressedTime,
    }

    distanceAccured = 0
    pressedTimestamp = undefined
    prevCoords = undefined
    events.publish("pointer-up", pointerInfo)
    events.publish("pointer", pointerInfo)
  })

  el.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault()
      let coords = gl.getPointerCoords(event)

      delta = vector.create(event.deltaX, event.deltaY)

      let pointerInfo: PointerInput = {
        inputType: "wheel",
        coords: coords,
        delta: delta,
        clicks: 0,
        isPressed,
        distanceAccured: 0,
        pressedTime: 0,
      }

      events.publish("wheel", pointerInfo)
    },
    { passive: false }
  )

  // #TODO: add support for touch events <https://developer.mozilla.org/en-US/docs/Web/API/Touch_events>

  return events
}

const createKeyboardEvents = (): PubSub => {
  let key: string | undefined = undefined
  let prevKey: string | undefined = undefined
  let timestamp: number | undefined
  let timeDelta: number = 0
  let keyboardInput: KeyboardInput | undefined = undefined

  const modifiers: ModifierKeys = {
    Control: false,
    Shift: false,
    Alt: false,
    Meta: false,
  }

  let events: PubSub = pubSub(["key-down", "key-up"])

  window.addEventListener("keydown", (event) => {
    key = event.key
    modifiers["Control"] = event.getModifierState("Control")
    modifiers["Shift"] = event.getModifierState("Shift")
    modifiers["Alt"] = event.getModifierState("Alt")
    modifiers["Meta"] = event.getModifierState("Meta")

    let t = performance.now()
    if (timestamp !== undefined) {
      timeDelta = t - timestamp
    }
    timestamp = t

    keyboardInput = {
      key,
      modifiers: { ...modifiers },
      prevKey,
      timeDelta,
    }

    events.publish("key-down", keyboardInput)

    prevKey = key
  })

  window.addEventListener("keyup", (event) => {
    key = event.key
    modifiers["Control"] = event.getModifierState("Control")
    modifiers["Shift"] = event.getModifierState("Shift")
    modifiers["Alt"] = event.getModifierState("Alt")
    modifiers["Meta"] = event.getModifierState("Meta")

    let t = performance.now()
    if (timestamp !== undefined) {
      timeDelta = t - timestamp
    }
    timestamp = t

    keyboardInput = {
      key,
      modifiers: { ...modifiers },
      prevKey,
      timeDelta,
    }

    events.publish("key-up", keyboardInput)

    prevKey = key
  })

  return events
}

export {
  createPointerEvents,
  createKeyboardEvents,
  nonCharacterKeys,
  modifierKeys,
}
