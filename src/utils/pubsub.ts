// #TIP: be careful not to subscribe an event in another event's subsciption or
// subscribe multiple times creating duplicates of the callbacks
// might be why you're facing that bug ;)

export interface PubSub {
  eventCallbacks: { [key: string]: Function[] }
  subscribe: (eventName: string, signal: Function) => void
  subscribeAll: (callback: Function) => void
  unsubscribe: (eventName: string) => void
  unsubscribeAll: () => void
  publish: (eventName: string, signal?: any) => void
  register: (eventName: string) => void
  track: (cb: (eventName: string, arg?: any) => void) => void
  stopTrack: () => void
  debug: () => void
}

export const pubSub = (events: string[], debug?: boolean): PubSub => {
  let eventCallbacks: { [key: string]: Function[] } = {}
  let logCallbacks: Function[] = []

  for (let event of events) {
    eventCallbacks[event] = []
  }

  return {
    subscribe: (eventName: string, callback: Function): void => {
      if (eventName in eventCallbacks) {
        eventCallbacks[eventName].push(callback)
      } else {
        console.error(`event ${eventName} does not exist in ${[...events]}`)
        return
      }

      if (debug) {
        console.trace(`pubSub.subscribe(): subscribed to event '${eventName}'`)
      }
    },

    subscribeAll: (callback: Function): void => {
      for (let eventName in eventCallbacks) {
        eventCallbacks[eventName].push(callback)
      }
    },

    unsubscribe: (eventName: string): void => {
      if (eventName in eventCallbacks) {
        delete eventCallbacks[eventName]
      } else {
        console.error(`event ${eventName} does not exist in ${[...events]}`)
      }

      if (debug) {
        console.log(
          `pubSub.unsubscribe(): unsubscribed from event '${eventName}'`
        )
      }
    },

    unsubscribeAll: (): void => {
      for (const eventName in eventCallbacks) {
        delete eventCallbacks[eventName]
      }

      if (debug) {
        console.trace(`pubSub.unsubscribeAll(): unsubscribed from all events`)
      }
    },

    publish: (eventName: string, signal?: any) => {
      if (debug) {
        if (signal) {
          console.trace(
            `pubSub.publish(): published event '${eventName}' with signal=`,
            signal
          )
        } else {
          console.trace(`pubSub.publish(): published event '${eventName}'`)
        }
      }

      for (let cb of logCallbacks) {
        cb(eventName, signal)
      }

      if (eventName in eventCallbacks) {
        for (let callback of eventCallbacks[eventName]) {
          if (signal) {
            callback(signal)
          } else {
            callback()
          }
        }
      } else {
        console.error(`event ${eventName} does not exist in [${events}]`)
      }
    },

    register: (eventName: string): void => {
      eventCallbacks[eventName] = []

      if (debug) {
        console.trace(`pubSub.register(): registered event '${eventName}'`)
      }
    },

    track: (callback: (eventName: string, signal?: any) => void) => {
      logCallbacks.push(callback)

      return
    },

    stopTrack: (): void => {
      logCallbacks = []
      return
    },

    debug: (): void => {
      debug = true
    },

    eventCallbacks,
  }
}
