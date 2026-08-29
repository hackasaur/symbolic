import * as vector from "../utils/vector.ts"
import * as pnl from "./panel.ts"
import * as btn from "./button.ts"
import * as anim from "../utils/anim.ts"
import * as inputs from "../utils/inputs.ts"
import { updateObject } from "../utils/misc"
import { Panel } from "./panel.ts"
import { Button } from "./button.ts"
import { Easing, Tween, Group } from "@tweenjs/tween.js"
import { pubSub, PubSub } from "../utils/pubsub.ts"
import { Vector2D } from "../utils/vector.ts"
import { SETTINGS } from "../../settings.ts"

export interface Menu {
  type: "Menu"
  id: string
  center: vector.Vector2D
  rootPanel: Panel
  events: PubSub
  get: () => object | Error
  set: (props: object) => void | Error
  closed: boolean
}

// #TODO: remove magic numbers
// #NOTE: menu is closed initially, so you need to call menu.open() to see it
// it shouldn't be closed intially
const addAnimations = (panel: Panel): void => {
  let props = panel.props
  let openDuration = SETTINGS.ui.menu.openDuration
  let closeDuration = SETTINGS.ui.menu.closeDuration

  let from = {
    width: 0,
    height: 0,
  }

  let prev = {
    width: 0,
    height: 0,
  }

  let open = new Tween(from)
    .to({ width: props.width, height: props.height }, openDuration)
    .easing(Easing.Quintic.Out)
    .onUpdate((updates) => {
      let deltaX = updates.width - prev.width
      let deltaY = updates.height - prev.height
      let delta = vector.create(deltaX / 2, deltaY / 2)

      pnl.update(panel, {
        ...updates,
        center: vector.add(panel.props.center, delta),
      })

      prev.width = updates.width
      prev.height = updates.height
    })
    .onStart(() => {
      pnl.setVisible(panel, true)
    })

  let close = new Tween(from)
    .to({ width: 0, height: 0 }, closeDuration)
    .easing(Easing.Quintic.In)
    .onUpdate((updates) => {
      let deltaX = updates.width - prev.width
      let deltaY = updates.height - prev.height
      let delta = vector.create(deltaX / 2, deltaY / 2)

      pnl.update(panel, {
        ...updates,
        center: vector.add(panel.props.center, delta),
      })

      prev.width = updates.width
      prev.height = updates.height
    })
    .onStart(() => {})
    .onComplete(() => {
      pnl.setVisible(panel, false)
    })

  let inflate = new Tween(from)
    .to({ width: props.width + 5, height: props.height + 5 }, openDuration)
    .easing(Easing.Sinusoidal.Out)
    .onUpdate((updates) => {
      pnl.update(panel, updates)
    })

  let deflate = new Tween(from)
    .to({ width: props.width, height: props.height }, openDuration)
    .easing(Easing.Sinusoidal.Out)
    .onUpdate((updates) => {
      pnl.update(panel, updates)
    })

  pnl.update(panel, { width: 0, height: 0 })

  // #TODO: fade in animation should exist for each indiviual button
  // fade in animation for elements
  let fadeInElements = new Group()
  let fadeOutElements = new Group()
  let fadeInDuration = SETTINGS.ui.menu.fadeInDuration
  let fadeOutDuration = SETTINGS.ui.menu.fadeOutDuration

  for (let el of panel.children) {
    let obj = {
      opacity: 0,
    }

    let fadeInElement = new Tween(el)
      .to({ opacity: el.props.opacity }, fadeInDuration)
      .easing(Easing.Sinusoidal.In)
      .onUpdate((updates) => {
        // btn.update(el, updates)
      })
      .delay(100)
      .onEveryStart(() => {
        btn.setVisible(el, true)
      })

    fadeInElements.add(fadeInElement)

    let fadeOutElement = new Tween(el)
      .to({ opacity: 0 }, fadeOutDuration)
      .easing(Easing.Sinusoidal.Out)
      .onUpdate((updates) => {
        btn.update(el, updates)
      })
      .onComplete(() => {
        btn.setVisible(el, false)
      })

    fadeOutElements.add(fadeOutElement)

    btn.update(el, { opacity: 0, visible: true })
  }

  anim.add(panel, "open", open)
  anim.add(panel, "close", close)
  anim.add(panel, "inflate", inflate)
  anim.add(panel, "deflate", deflate)
  anim.add(panel, "fadeInElements", fadeInElements)
  anim.add(panel, "fadeOutElements", fadeOutElements)

  panel.events.register("open")
  panel.events.register("close")

  panel.events.subscribe("open", () => {
    anim.stopAll(panel)
    anim.play(panel, "open")
    anim.play(panel, "fadeInElements")
  })

  panel.events.subscribe("close", () => {
    anim.stopAll(panel)
    anim.play(panel, "close")
    anim.play(panel, "fadeOutElements")
    for (let childButton of panel.children) {
      if (childButton.toggled) {
        btn.toggle(childButton)
      }
      for (let panel of childButton.children) {
        panel.events.publish("close")
      }
    }
  })

  for (let childButton of panel.children) {
    if (childButton.children.length === 0) {
      childButton.events.subscribe("clicked", () => {
        let clickedButton = childButton
        for (let childButton of panel.children) {
          if (childButton !== clickedButton) {
            for (let childPanel of childButton.children) {
              if (childButton.toggled) {
                anim.stopAll(childPanel)
                anim.play(childPanel, "close")
                anim.play(childPanel, "fadeOutElements")
                btn.toggle(childButton)
              }
            }
          }
        }
      })
    }

    for (let childPanel of childButton.children) {
      childButton.events.subscribe("clicked", () => {
        let clickedButton = childButton

        if (!childButton.toggled) {
          anim.stopAll(childPanel)
          anim.play(childPanel, "open")
          anim.play(childPanel, "fadeInElements")
          btn.toggle(childButton)
        } else if (childButton.toggled) {
          anim.stopAll(childPanel)
          anim.play(childPanel, "close")
          anim.play(childPanel, "fadeOutElements")
          btn.toggle(childButton)

          for (let button of childPanel.children) {
            if (button.toggled) {
              btn.toggle(button)
            }

            for (let panel of button.children) {
              panel.events.publish("close")
            }
          }
        }

        for (let childButton of panel.children) {
          if (childButton !== clickedButton) {
            for (let childPanel of childButton.children) {
              if (childButton.toggled) {
                anim.stopAll(childPanel)
                anim.play(childPanel, "close")
                anim.play(childPanel, "fadeOutElements")
                btn.toggle(childButton)
              }
            }
          }
        }
      })

      addAnimations(childPanel)
    }
  }
}

const handleInputs = (panel: Panel, el: HTMLElement): void => {
  pnl.handleInputs(panel, el)

  for (let button of panel.children) {
    btn.handleInputs(button, el)

    for (let panel of button.children) {
      handleInputs(panel, el)
    }
  }

  return
}

const pointerEnterExitEvent = (panel: Panel, events: PubSub): void => {
  // BROKEN: this doesn't work correctly.
  // A fix could be to use areCoordsInside() instead instead of pointer enter/exit of all the elements
  const pointerEnterExitRecur = (panel: Panel) => {
    let inside = false
    panel.events.subscribe("pointerenter", () => {
      if (!inside) {
        events.publish("pointerenter")
        inside = true
      }
    })

    panel.events.subscribe("pointerexit", () => {
      if (inside) {
        events.publish("pointerexit")
        inside = false
      }
    })

    for (let button of panel.children) {
      for (let childPanel of button.children) {
        pointerEnterExitRecur(childPanel)
      }
    }
  }

  pointerEnterExitRecur(panel)

  // let inside = false
  // let pointerEvents = inputs.createPointerEvents(el)

  // pointerEvents.subscribe("pointer-move", (pointerInfo: inputs.PointerInfo) => {
  //   let coords = vector.copy(pointerInfo.coords)
  //   if (areCoordsInside(menu, coords)) {
  //     if ((inside = false)) {
  //       inside = true
  //       menu.events.publish("pointerenter")
  //     }
  //   } else if (inside === true) {
  //     inside = false
  //     menu.events.publish("pointerexit")
  //   }
  // })
}

const allElementsById = (menu: Menu): { [key: string]: Panel | Button } => {
  let elementsById: { [key: string]: Panel | Button } = {}

  const allElementsByIdRecursive = (
    panel: Panel,
    elementsById: { [key: string]: Panel | Button }
  ): void => {
    elementsById[panel.props.id] = panel

    for (let button of panel.children) {
      elementsById[button.props.id] = button
      for (let panel of button.children) {
        allElementsByIdRecursive(panel, elementsById)
      }
    }
  }

  allElementsByIdRecursive(menu.rootPanel, elementsById)

  return elementsById
}

const getElementById = (menu: Menu, id: string): Panel | Button | Error => {
  const elementsById = allElementsById(menu)
  if (id in elementsById) {
    return elementsById[id]
  } else {
    return Error(
      `getElementById(): id ${id} does not exist in menu.elementsById`
    )
  }
}

const create = (
  panel: Panel,
  el: HTMLElement,
  id: string,
  get?: () => object | Error,
  set?: (props: object) => void | Error
): Menu => {
  addAnimations(panel)
  handleInputs(panel, el)

  let events = pubSub([
    "move",
    "drag",
    "pointerenter",
    "pointerexit",
    "open",
    "close",
    "update",
    "optionUpdate",
    "setClosed",
  ])

  pointerEnterExitEvent(panel, events)

  return {
    type: "Menu",
    id: id,
    center: vector.copy(panel.props.center),
    rootPanel: panel,
    events,
    get: get
      ? get
      : () => Error(`Menu.get(): get() method is not assigned yet`),
    set: set
      ? set
      : (props: object) =>
          Error(`Menu.set(): set() method is not assigned yet`),
    closed: false,
  }
}

const move = (menu: Menu, coords: Vector2D): void => {
  update(menu, { center: vector.copy(coords) })
  pnl.move(menu.rootPanel, coords)

  menu.events.publish("move", coords)
}

const drag = (menu: Menu, delta: Vector2D): void => {
  update(menu, { center: vector.add(menu.center, delta) })
  pnl.drag(menu.rootPanel, delta)

  menu.events.publish("drag", delta)
}

const update = (menu: Menu, updates: any): void => {
  updateObject(menu, updates)
  menu.events.publish("update", updates)
}

const draw = (ctx: CanvasRenderingContext2D, menu: Menu): void => {
  pnl.draw(ctx, menu.rootPanel)
}

const open = (menu: Menu): void => {
  setVisible(menu, true)
  menu.rootPanel.events.publish("open")
  menu.events.publish("open")
  setClosed(menu, false)
}

const close = (menu: Menu, instant = false): void => {
  if (instant === false) {
    menu.rootPanel.events.publish("close")
    menu.events.publish("close")
    setClosed(menu, true)
  } else if (instant === true) {
    closeInstant(menu.rootPanel)
  }
}

const collapse = (menu: Menu, buttonId: string): void => {
  let button = getElementById(menu, buttonId) as Button
  if (button instanceof Error) {
    console.error(button)
    return
  }

  if (button.toggled) {
    button.toggled = false
  }

  for (let panel of button.children) {
    panel.events.publish("close")
  }
}

const closeInstant = (panel: Panel) => {
  panel.width = 0
  panel.height = 0
  pnl.setVisible(panel, false)

  for (let button of panel.children) {
    button.opacity = 0
    btn.setVisible(button, false)

    for (let panel of button.children) {
      closeInstant(panel)
    }
  }

  return
}

const areCoordsInside = (menu: Menu, coords: Vector2D): boolean => {
  const elements = allElementsById(menu)
  for (let id in elements) {
    let element = elements[id]
    if (element.type === "Panel") {
      if (pnl.areCoordsInside(element, coords)) {
        return true
      }
    } else if (element.type === "Button") {
      if (btn.areCoordsInside(element, coords)) {
        return true
      }
    }
  }

  return false
}

const set = (menu: Menu, props: object): void | Error => {
  return menu.set(props)
}

const get = (menu: Menu): object | Error => {
  return menu.get()
}

const setClosed = (menu: Menu, value: boolean): void => {
  menu.closed = value
  menu.events.publish("setClosed", value)
}

const setVisible = (menu: Menu, value: boolean, deep = false): void => {
  pnl.setVisible(menu.rootPanel, value, deep)
}

export {
  create,
  update,
  move,
  drag,
  getElementById,
  draw,
  open,
  close,
  handleInputs,
  areCoordsInside,
  setVisible,
  set,
  get,
  collapse,
}

// const addAnimations = (rootPanel: Panel): void => {
//   // non-recursive
//   // Initialize a queue with the root panel
//   const queue: Panel[] = [rootPanel]

//   // Process each panel iteratively
//   while (queue.length > 0) {
//     const panel = queue.shift()! // Dequeue the next panel

//     // Existing logic for a single panel
//     let props = panel.props
//     let openDuration = SETTINGS.ui.menu.openDuration
//     let closeDuration = SETTINGS.ui.menu.closeDuration

//     let from = {
//       width: 0,
//       height: 0,
//     }

//     let prev = {
//       width: 0,
//       height: 0,
//     }

//     let open = new Tween(from)
//       .to({ width: props.width, height: props.height }, openDuration)
//       .easing(Easing.Quintic.Out)
//       .onUpdate((updates) => {
//         let deltaX = updates.width - prev.width
//         let deltaY = updates.height - prev.height
//         let delta = vector.create(deltaX / 2, deltaY / 2)

//         pnl.update(panel, {
//           ...updates,
//           center: vector.add(panel.props.center, delta),
//         })

//         prev.width = updates.width
//         prev.height = updates.height
//       })
//       .onStart(() => {
//         pnl.setVisible(panel, true)
//         // console.log("open", panel.props.id)
//       })

//     let close = new Tween(from)
//       .to({ width: 0, height: 0 }, closeDuration)
//       .easing(Easing.Quintic.In)
//       .onUpdate((updates) => {
//         let deltaX = updates.width - prev.width
//         let deltaY = updates.height - prev.height
//         let delta = vector.create(deltaX / 2, deltaY / 2)

//         pnl.update(panel, {
//           ...updates,
//           center: vector.add(panel.props.center, delta),
//         })

//         prev.width = updates.width
//         prev.height = updates.height
//       })
//       .onStart(() => {
//         // console.log("close", panel.props.id)
//       })
//       .onComplete(() => {
//         pnl.setVisible(panel, false)
//       })

//     let inflate = new Tween(from)
//       .to({ width: props.width + 5, height: props.height + 5 }, openDuration)
//       .easing(Easing.Sinusoidal.Out)
//       .onUpdate((updates) => {
//         pnl.update(panel, updates)
//       })

//     let deflate = new Tween(from)
//       .to({ width: props.width, height: props.height }, openDuration)
//       .easing(Easing.Sinusoidal.Out)
//       .onUpdate((updates) => {
//         pnl.update(panel, updates)
//       })

//     pnl.update(panel, { width: 0, height: 0 })

//     let fadeInElements = new Group()
//     let fadeOutElements = new Group()
//     let fadeInDuration = SETTINGS.ui.menu.fadeInDuration
//     let fadeOutDuration = SETTINGS.ui.menu.fadeInDuration

//     for (let el of panel.children) {
//       let obj = {
//         opacity: 0,
//       }

//       let fadeInElement = new Tween(obj)
//         .to({ opacity: el.props.opacity }, fadeInDuration)
//         .easing(Easing.Sinusoidal.In)
//         .onUpdate((updates) => {
//           btn.update(el, updates)
//         })
//         // .delay(100)
//         .onEveryStart(() => {
//           btn.setVisible(el, true)
//         })

//       fadeInElements.add(fadeInElement)

//       let fadeOutElement = new Tween(obj)
//         .to({ opacity: 0 }, fadeOutDuration)
//         .easing(Easing.Sinusoidal.Out)
//         .onUpdate((updates) => {
//           btn.update(el, updates)
//         })
//         .onStart(() => {
//           // #NOTE: need to play hoverFadeOut when the button is fading out
//           // because hover will not fade out if the cursor is inside the button
//           // and hover color will be still on when the panel is opened again
//           if (anim.isPlaying(el, "hoverFadeIn")) {
//             anim.stop(el, "hoverFadeIn")
//           }
//           anim.play(el, "hoverFadeOut")
//         })
//         .onComplete(() => {
//           btn.setVisible(el, false)
//         })

//       fadeOutElements.add(fadeOutElement)

//       btn.update(el, { opacity: 0, visible: true })
//     }

//     anim.add(panel, "open", open)
//     anim.add(panel, "close", close)
//     anim.add(panel, "inflate", inflate)
//     anim.add(panel, "deflate", deflate)
//     anim.add(panel, "fadeInElements", fadeInElements)
//     anim.add(panel, "fadeOutElements", fadeOutElements)

//     panel.events.register("open")
//     panel.events.register("close")

//     panel.events.subscribe("open", () => {
//       anim.stopAll(panel)
//       anim.play(panel, "open")
//       anim.play(panel, "fadeInElements")
//     })

//     panel.events.subscribe("close", () => {
//       anim.stopAll(panel)
//       anim.play(panel, "close")
//       anim.play(panel, "fadeOutElements")
//       for (let childButton of panel.children) {
//         if (childButton.toggled) {
//           btn.toggle(childButton)
//         }
//         for (let childPanel of childButton.children) {
//           childPanel.events.publish("close")
//         }
//       }
//     })

//     // Add child panels to the queue instead of recursive calls
//     for (let childButton of panel.children) {
//       btn.setVisible(childButton, false)
//       for (let childPanel of childButton.children) {
//         queue.push(childPanel) // Enqueue child panel for processing
//         childButton.events.subscribe("clicked", () => {
//           if (!childButton.toggled) {
//             anim.stopAll(childPanel)
//             anim.play(childPanel, "open")
//             anim.play(childPanel, "fadeInElements")
//             btn.toggle(childButton)
//           } else {
//             anim.stopAll(childPanel)
//             anim.play(childPanel, "close")
//             anim.play(childPanel, "fadeOutElements")
//             btn.toggle(childButton)

//             for (let button of childPanel.children) {
//               if (button.toggled) {
//                 btn.toggle(button)
//               }
//               for (let panel of button.children) {
//                 panel.events.publish("close")
//               }
//             }
//           }
//         })
//       }
//     }
//   }
// }
