import { Easing, Tween, Group } from "@tweenjs/tween.js"

interface Element {
  props: any
  animations: { [key: string]: Tween<Object> | Group }
}

const play = (el: Element, animation: string): void => {
  if (!el.animations[animation]) {
    console.error(`Animation ${animation} not found`)
  }

  if (el.animations[animation] instanceof Tween) {
    el.animations[animation].startFromCurrentValues()
  } else if (el.animations[animation] instanceof Group) {
    let tweens = el.animations[animation].getAll()
    for (let tween of tweens) {
      tween.startFromCurrentValues()
    }
  }
}

const pause = (el: Element, id: string): void => {
  if (el.animations[id] instanceof Tween) {
    el.animations[id].pause()
  } else if (el.animations[id] instanceof Group) {
    let tweens = el.animations[id].getAll()
    for (let tween of tweens) {
      tween.pause()
    }
  }
}

const update = (el: Element, id: string): void => {
  let anim = el.animations[id]
  anim.update()
}

const stop = (el: Element, id: string): void => {
  if (el.animations[id] instanceof Tween) {
    el.animations[id].stop()
  } else if (el.animations[id] instanceof Group) {
    let tweens = el.animations[id].getAll()
    for (let tween of tweens) {
      tween.stop()
    }
  }
}

const stopAll = (el: Element): void => {
  for (let id in el.animations) {
    if (el.animations[id] instanceof Tween) {
      el.animations[id].stop()
    } else if (el.animations[id] instanceof Group) {
      let tweens = el.animations[id].getAll()
      for (let tween of tweens) {
        tween.stop()
      }
    }
  }
}

const isPlaying = (el: Element, id: string): boolean => {
  if (el.animations[id] instanceof Tween) {
    return el.animations[id].isPlaying()
  } else if (el.animations[id] instanceof Group) {
    // NOTE: a group would always be playing all of its tweens or none
    let tweens = el.animations[id].getAll()
    for (let tween of tweens) {
      return tween.isPlaying()
    }
  }

  return false
}

const isPaused = (el: Element, id: string): boolean => {
  if (el.animations[id] instanceof Tween) {
    return el.animations[id].isPaused()
  } else if (el.animations[id] instanceof Group) {
    let tweens = el.animations[id].getAll()
    for (let tween of tweens) {
      return tween.isPaused()
    }
  }

  return false
}

const add = (el: Element, id: string, tween: Tween | Group): void => {
  el.animations[id] = tween
}

const remove = (el: Element, id: string): void => {
  delete el.animations[id]
}

const removeAll = (el: Element): void => {
  for (let id in el.animations) {
    remove(el, id)
  }
}

const chain = (el: Element, ids: string[]): void | Error => {
  for (let i = 0; i < ids.length - 1; i++) {
    let anim1 = el.animations[ids[i]]
    let anim2 = el.animations[ids[i + 1]]
    if (anim1 instanceof Group) {
      return Error("Cannot chain a group")
    }

    if (anim2 instanceof Group) {
      return Error("Cannot chain a group")
    }

    anim1.chain(anim2)
  }
}

const end = (el: Element, animation: string): void => {
  if (!el.animations[animation]) {
    console.error(`Animation ${animation} not found`)
  }

  if (el.animations[animation] instanceof Tween) {
    el.animations[animation].end()
  } else if (el.animations[animation] instanceof Group) {
    let tweens = el.animations[animation].getAll()
    for (let tween of tweens) {
      tween.end()
    }
  }
}

export {
  play,
  pause,
  update,
  stop,
  stopAll,
  add,
  remove,
  removeAll,
  chain,
  isPlaying,
  isPaused,
  end,
}
