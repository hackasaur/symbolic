import * as mnu from "./menu"
import * as vector from "../utils/vector.ts"
import * as geometry from "../utils/geometry.ts"
import * as ctxMenu from "../menu/contextMenu.ts"
import { getBoundingBoxOfShape } from "../shapes/group.ts"
import { updateObject } from "../utils/misc"
import { pubSub, PubSub } from "../utils/pubsub.ts"
import { Vector2D } from "../utils/vector.ts"
import { Menu } from "./menu.ts"
import { SETTINGS } from "../../settings.ts"
import { AppContext } from "../../inputToEvents.ts"
import { ShapeAny } from "../shapes/types.ts"

export interface ContextMenu {
  type: "ContextMenu"
  id: string
  coords: Vector2D
  currentMenu: string
  events: PubSub
  menus: { [key: string]: mnu.Menu }
  visible: boolean
  closed: boolean
  pointerInside: boolean
}

// #TODO: toggle button should not be passed to the contextMenu.create()
// instead only the props of the button should be passed
const create = (
  id: string,
  coords: Vector2D,
  menus: { [key: string]: mnu.Menu },
  currentMenu: string,
  el: HTMLElement
): ContextMenu | Error => {
  for (let m in menus) {
    mnu.close(menus[m])
  }

  let contextMenu: ContextMenu = {
    type: "ContextMenu",
    id: id,
    coords: vector.copy(coords),
    currentMenu,
    events: pubSub([
      "move",
      "drag",
      "switch",
      "update",
      "unhide",
      "hide",
      "setVisible",
      "open",
      "close",
      "pointerenter",
      "pointerexit",
    ]),
    menus,
    visible: true,
    closed: true,
    pointerInside: false,
  }

  for (let key in contextMenu.menus) {
    contextMenu.menus[key].events.subscribe("open", () => {
      contextMenu.closed = false
    })

    contextMenu.menus[key].events.subscribe("close", () => {
      contextMenu.closed = true
    })

    contextMenu.menus[key].events.subscribe("pointerenter", () => {
      contextMenu.events.publish("pointerenter")
    })

    contextMenu.menus[key].events.subscribe("pointerexit", () => {
      contextMenu.events.publish("pointerexit")
    })
  }

  return contextMenu
}

const move = (contextMenu: ContextMenu, coords: Vector2D, menuId?: string) => {
  update(contextMenu, { coords: vector.copy(coords) })

  if (menuId === undefined) {
    for (let key in contextMenu.menus) {
      // NOTE: need to add the width/2 and height/2 to the center of the menu else it shifts when open
      // TODO: this does not look neat. There should be a neater way to do this

      let menu = getMenu(contextMenu, key)

      if (menu instanceof Error) {
        console.error(menu)
        return
      }

      let offsetCoords = vector.add(
        contextMenu.coords,
        vector.create(
          menu.rootPanel.props.width / 2,
          menu.rootPanel.props.height / 2
        )
      )

      mnu.move(menu, offsetCoords)
    }
  } else {
    let menu = getMenu(contextMenu, menuId)

    if (menu instanceof Error) {
      console.error(menu)
      return
    }

    let offsetCoords = vector.add(
      contextMenu.coords,
      vector.create(
        menu.rootPanel.props.width / 2,
        contextMenu.menus[menuId].rootPanel.props.height / 2
      )
    )
    mnu.move(contextMenu.menus[menuId], offsetCoords)
  }

  contextMenu.events.publish("move", coords)
}

const drag = (contextMenu: ContextMenu, delta: Vector2D): void => {
  update(contextMenu, { center: vector.add(contextMenu.coords, delta) })

  for (let key in contextMenu.menus) {
    mnu.drag(contextMenu.menus[key], delta)
  }

  contextMenu.events.publish("drag", delta)
}

const switchTo = (contextMenu: ContextMenu, menuId: string) => {
  update(contextMenu, { currentMenu: menuId })

  contextMenu.events.publish("switch", menuId)
}

const getMenu = (contextMenu: ContextMenu, menuId: string): Menu | Error => {
  if (!(menuId in contextMenu.menus))
    return Error(`ctxMenu.getMenu(): id '${menuId}' not found in context menu`)
  return contextMenu.menus[menuId]
}

const update = (contextMenu: ContextMenu, updates: any) => {
  updateObject(contextMenu, updates)
}

const draw = (ctx: CanvasRenderingContext2D, contextMenu: ContextMenu) => {
  if (!contextMenu.visible) return

  for (let key in contextMenu.menus) {
    let menu = contextMenu.menus[key]
    mnu.draw(ctx, menu)
  }

  // btn.draw(ctx, contextMenu.toggle)
}

// NOTE: calling this hide/unhide for the lack of a better name
// open/close could be interpreted as just opening/closing the current menu(?)
// here we also hide the toggle button
const hide = (contextMenu: ContextMenu) => {
  mnu.close(getCurrentMenu(contextMenu))
  contextMenu.events.publish("hide")
}

const unhide = (contextMenu: ContextMenu) => {
  setVisible(contextMenu, true)
  // mnu.open(getCurrentMenu(contextMenu))
  // anim.play(contextMenu.toggle, "fadeIn")
  contextMenu.events.publish("unhide")
}

const close = (contextMenu: ContextMenu, menuId: string): void => {
  if (contextMenu.menus[menuId]) mnu.close(contextMenu.menus[menuId])
  contextMenu.events.publish("close")
}

const open = (contextMenu: ContextMenu, menuId: string): void => {
  mnu.open(contextMenu.menus[menuId])
  contextMenu.events.publish("open")
}

const setVisible = (contextMenu: ContextMenu, value: boolean) => {
  contextMenu.visible = value

  // #NOTE: have to do this to make sure that the context menu fades in (from opacity = 0)
  // when unhide is called after setVisible(contextMenu, false) is set
  // #TODO there should be a better a way to do this.
  // if (value === false) {
  //   contextMenu.toggle.opacity = 0
  // } else {
  //   contextMenu.toggle.opacity = contextMenu.toggle.props.opacity
  // }

  contextMenu.events.publish("setVisible", value)
}

const areCoordsInside = (contextMenu: ContextMenu, coords: Vector2D) => {
  if (
    mnu.areCoordsInside(contextMenu.menus[contextMenu.currentMenu], coords) &&
    !contextMenu.menus[contextMenu.currentMenu].closed
  ) {
    return true
  }

  return false
}

const getCurrentMenu = (contextMenu: ContextMenu): Menu => {
  return contextMenu.menus[contextMenu.currentMenu]
}

const repositionContextMenu = (
  contextMenu: ContextMenu,
  context: AppContext
) => {
  let scene = context.scene
  let ui = context.ui
  let zoom = context.scene.camera.props.zoom

  if (
    (context.selectedShapeId !== undefined || context.isTyping) &&
    context.tool === "Modify"
  ) {
    let shape: ShapeAny | Error = Error(`Shape is undefined`)

    if (context.selectedShapeId) {
      shape = scene.getShapeById(context.selectedShapeId)
    } else if (context.typingShapeId) {
      shape = scene.getShapeById(context.typingShapeId)
    }

    if (shape instanceof Error) {
      console.error(shape)
      return false
    }

    let box = getBoundingBoxOfShape(shape)

    switch (shape.type) {
      case "Rectangle": {
        let topLeftInViewport = geometry.transformCoords(
          vector.rotate(
            vector.subtract(
              box.center,
              vector.create(box.width / 2, box.height / 2)
            ),
            box.rotation,
            box.center
          ),
          vector.scaleSimple(context.scene.camera.props.coords, -zoom),
          1 / zoom
        )

        let menu = ctxMenu.getCurrentMenu(contextMenu)
        let delta = menu.rootPanel.width - box.width * zoom

        ctxMenu.move(
          ui.contextMenu,
          vector.add(
            topLeftInViewport,
            vector.create(
              -delta / 2,
              -menu.rootPanel.height * zoom -
                (3 * SETTINGS.transformer.padding) / zoom
            )
          ),
          contextMenu.currentMenu
        )

        break
      }

      case "Ellipse": {
        let width = box.width //shape.props.radiusX * 2
        let height = box.height //shape.props.radiusY * 2

        let topLeftInViewport = geometry.transformCoords(
          vector.subtract(box.center, vector.create(width / 2, height / 2)),
          vector.scaleSimple(context.scene.camera.props.coords, -zoom),
          1 / zoom
        )

        let menu = ctxMenu.getCurrentMenu(contextMenu)
        let delta = menu.rootPanel.width - width * zoom

        ctxMenu.move(
          ui.contextMenu,
          vector.add(
            topLeftInViewport,
            vector.create(
              -delta / 2,
              -menu.rootPanel.height * zoom -
                (3 * SETTINGS.transformer.padding) / zoom
            )
          ),
          contextMenu.currentMenu
        )

        break
      }

      case "Arrow": {
        // switch to rectMenu if not done already
        // ctxMenu.switchTo(ui.contextMenu, "arrowMenu")

        // // move context menu to the top-right of the shape whenever the shape is modified
        // ctxMenu.move(
        //   ui.contextMenu,
        //   geometry.transformCoords(
        //     shape.props.points[shape.props.points.length - 1],
        //     vector.scaleSimple(context.scene.camera.props.coords, -zoom),
        //     1 / zoom
        //   ),
        //   contextMenu.currentMenu
        // )

        let topLeftInViewport = geometry.transformCoords(
          vector.rotate(
            vector.subtract(
              box.center,
              vector.create(box.width / 2, box.height / 2)
            ),
            box.rotation,
            box.center
          ),
          vector.scaleSimple(context.scene.camera.props.coords, -zoom),
          1 / zoom
        )

        let menu = ctxMenu.getCurrentMenu(contextMenu)
        let delta = menu.rootPanel.width - box.width * zoom

        ctxMenu.move(
          ui.contextMenu,
          vector.add(
            topLeftInViewport,
            vector.create(
              -delta / 2,
              -menu.rootPanel.height * zoom -
                (3 * SETTINGS.transformer.padding) / zoom
            )
          ),
          contextMenu.currentMenu
        )

        break
      }

      case "Image": {
        let topLeftInViewport = geometry.transformCoords(
          vector.rotate(
            vector.subtract(
              box.center,
              vector.create(box.width / 2, box.height / 2)
            ),
            box.rotation,
            box.center
          ),
          vector.scaleSimple(context.scene.camera.props.coords, -zoom),
          1 / zoom
        )

        let menu = ctxMenu.getCurrentMenu(contextMenu)
        let delta = menu.rootPanel.width - box.width * zoom

        ctxMenu.move(
          ui.contextMenu,
          vector.add(
            topLeftInViewport,
            vector.create(
              -delta / 2,
              -menu.rootPanel.height * zoom -
                (3 * SETTINGS.transformer.padding) / zoom
            )
          ),
          contextMenu.currentMenu
        )

        break
      }

      case "Group": {
        let topLeftInViewport = geometry.transformCoords(
          vector.rotate(
            vector.subtract(
              box.center,
              vector.create(box.width / 2, box.height / 2)
            ),
            0,
            box.center
          ),
          vector.scaleSimple(context.scene.camera.props.coords, -zoom),
          1 / zoom
        )

        let menu = ctxMenu.getCurrentMenu(contextMenu)
        let delta = menu.rootPanel.width - box.width * zoom

        ctxMenu.move(
          ui.contextMenu,
          vector.add(
            topLeftInViewport,
            vector.create(
              -delta / 2,
              -menu.rootPanel.height * zoom -
                (3 * SETTINGS.transformer.padding) / zoom
            )
          ),
          contextMenu.currentMenu
        )

        break
      }
    }
  }
}

export {
  create,
  move,
  drag,
  switchTo,
  getMenu,
  update,
  draw,
  hide,
  unhide,
  open,
  close,
  setVisible,
  areCoordsInside,
  getCurrentMenu,
  repositionContextMenu,
}
