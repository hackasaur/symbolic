import { cloneDeep, cloneDeepWith } from "lodash-es"

/**
 * @module obj
 * This module provides utility functions for working with nested objects.
 * It includes functions for deep copying, deleting, updating, and retrieving nested properties using dot-notation paths.
 * It also includes a function for computing the difference between two objects.
 */

/**
 * Deeply clones a nested value from an object, with options to customize cloning.
 *
 * @param options - The options object.
 * @param options.obj - The source object to copy from.
 * @param options.path - The dot-notation path to the value to copy (e.g., 'a.b.c'). If empty string or undefined, clones the entire object.
 * @param options.cloneWith - Optional customizer function for cloning. Receives the value and should return a custom version or undefined to let lodash handle it. Useful for types that lodash might not clone as desired (e.g., keeping instances by reference).
 * @returns The cloned value, or undefined if the path is invalid.
 *
 * @note This function uses lodash's `cloneDeep` / `cloneDeepWith`. It supports cloning of functions and symbols by reference, and preserves prototypes of custom class instances where possible.
 */
export type CopyNestedOptions = {
  obj: Record<string, any>
  path?: string
  cloneWith?: (
    value: any,
    key?: string | number,
    object?: any,
    stack?: any
  ) => any
  onlyInclude?: string[]
}

export const copyNested = (options: CopyNestedOptions): any => {
  const { obj, path, cloneWith, onlyInclude = [] } = options
  let target = obj
  if (path) {
    const keys = path.split(".")
    for (let key of keys) {
      if (target && typeof target === "object" && key in target) {
        target = target[key]
      } else {
        return
      }
    }
  }
  if (onlyInclude.length === 0) {
    return cloneWith ? cloneDeepWith(target, cloneWith) : cloneDeep(target)
  }
  // Filter to only include whitelisted keys/subtrees
  const filtered: any = {}
  for (const include of onlyInclude) {
    if (target && typeof target === "object" && include in target) {
      const value = cloneWith
        ? cloneDeepWith(target[include], cloneWith)
        : cloneDeep(target[include])
      filtered[include] = value
    }
  }
  return filtered
}

export const updateNested = (
  obj: Record<string, any>,
  path: string,
  val: any
): void => {
  if (!path) {
    return
  }
  const keys = path.split(".")
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (
      !(key in current) ||
      typeof current[key] !== "object" ||
      current[key] === null
    ) {
      current[key] = {}
    }
    current = current[key]
  }
  current[keys[keys.length - 1]] = val
}
/**
 * Updates a nested property in an object and returns the operation(s) performed.
 *
 * @param obj - The object to update.
 * @param path - The dot-notation path to update.
 * @param val - The new value to set.
 * @param cloneWith - Optional customizer function for cloning.
 * @returns An array of operations (Ops) describing the changes.
 */
export const updateAndGetPatch = (
  obj: any,
  path: string,
  val: Leaf | Record<string, any>,
  cloneWith?: (
    value: any,
    key?: string | number,
    object?: any,
    stack?: any
  ) => any
) => {
  if (!isValidPath(path)) return []
  if (typeof obj !== "object" || obj === null) return []
  let pathAsArray = path.split(".")
  let current = obj
  let currentPath = ""
  let ops: Op[] = []
  for (let i = 0; i < pathAsArray.length; i++) {
    let node = pathAsArray[i]
    currentPath = currentPath ? `${currentPath}.${node}` : node

    if (!hasKey(current, node)) {
      let subtree = buildSubtree(
        pathAsArray.slice(i + 1, pathAsArray.length),
        val
      )
      ops.push({
        type: "create",
        oldVal: undefined,
        newVal: cloneWith
          ? cloneDeepWith(subtree, cloneWith)
          : cloneDeep(subtree),
        path: currentPath,
      })
      current[node] = subtree
      return ops
    }

    if (isLeaf(current[node])) {
      let subtree = buildSubtree(
        pathAsArray.slice(i + 1, pathAsArray.length),
        val
      )

      ops.push({
        path: currentPath,
        type: "update",
        oldVal: cloneWith
          ? cloneDeepWith(current[node], cloneWith)
          : cloneDeep(current[node]),
        newVal: cloneWith
          ? cloneDeepWith(subtree, cloneWith)
          : cloneDeep(subtree),
      })
      current[node] = subtree
      return ops
    }
    current = current[node]
  }
  return []
}

export const deleteNested = (obj: Record<string, any>, path: string) => {
  const keys = path.split(".")
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (current && typeof current === "object" && key in current) {
      current = current[key]
    } else {
      return false
    }
  }
  const lastKey = keys[keys.length - 1]
  if (current && typeof current === "object" && lastKey in current) {
    delete current[lastKey]
    return true
  }
  return false
}

export const getNested = (obj: Record<string, any>, path: string): any => {
  const keys = path.split(".")
  let current = obj
  for (let key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key]
    } else {
      return
    }
  }
  return current
}

type Op = {
  path: string
  type: "create" | "update" | "remove"
  oldVal: any
  newVal: any
}

const unionOfKeys = (
  oldVal: Record<string, any>,
  newVal: Record<string, any>
) => {
  let keys: Record<string, boolean> = {}
  for (let k of Object.keys(oldVal)) {
    keys[k] = true
  }

  for (let k of Object.keys(newVal)) {
    keys[k] = true
  }
  return Object.keys(keys)
}

export type Leaf = any
/*
 * We want to start comparing when we hit leaf nodes.
 * This function documents types we consider "leaf" (atomic) for the diffing algorithm.
 * Note: Functions and symbols are considered leaves, so they are compared by reference.
 */
const isLeaf = (val: any): val is Leaf => {
  return (
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean" ||
    typeof val === "symbol" ||
    typeof val === "bigint" ||
    typeof val === "function" ||
    val === undefined ||
    val === null ||
    Array.isArray(val) ||
    val instanceof Date ||
    val instanceof RegExp ||
    val instanceof Map ||
    val instanceof Set ||
    val instanceof WeakMap ||
    val instanceof WeakSet ||
    val instanceof Promise ||
    val instanceof Error
  )
}

const hasKey = (obj: Record<string, any>, key: string) => {
  return obj.hasOwnProperty(key)
}

const isSame = (val1: any, val2: any) => {
  const bothAreLeaf = isLeaf(val1) && isLeaf(val2)
  // For objects like Arrays, Set, Regex, Path2D etc
  // comparisons using === operator will never return true.
  // This means even if they have not changed
  // they will be considered different during a comparison
  // in the diff function. This is intentional since
  // we always want to consider them as updates as comparing them
  // can be quiet complex. In the future we might add
  // comparators for types we want support tracking changes on.
  return bothAreLeaf && typeof val1 === typeof val2 && val1 === val2
}

/**
 * Computes the difference between two objects and returns a list of operations.
 * It recurses into plain objects but treats arrays and other complex types (Map, Set, etc.) as atomic "leaf" nodes.
 *
 * Custom class instances are supported via lodash cloning, which attempts to preserve prototypes and methods.
 * For types that cannot be deeply cloned (like Path2D), they can be handled via the optional `cloneWith` customizer.
 *
 * @param args - The arguments object.
 * @param args.oldObj - The original object.
 * @param args.newObj - The new object.
 * @param args.currentPath - The current path in the recursion (optional, defaults to "").
 * @param args.ops - The accumulated list of operations (optional, defaults to []).
 * @param args.cloneWith - Optional customizer function for cloning values in the resulting Ops.
 * @returns An array of operations describing the diff.
 */
export const diff = (args: {
  oldObj: Record<string, any>
  newObj: Record<string, any>
  currentPath?: string
  ops?: Op[]
  cloneWith?: (
    value: any,
    key?: string | number,
    object?: any,
    stack?: any
  ) => any
  onlyInclude?: string[]
}): Op[] => {
  let {
    oldObj,
    newObj,
    currentPath = "",
    ops = [],
    cloneWith,
    onlyInclude = [],
  } = args

  // console.log(`diffing old,new `, oldObj, newObj)
  // check if passed obj are themselves leaf nodes
  // record an update if they are not the same and return immediately
  if (isLeaf(oldObj) || isLeaf(newObj)) {
    if (!isSame(oldObj, newObj)) {
      ops.push({
        type: "update",
        path: currentPath,
        newVal: cloneWith
          ? cloneDeepWith(newObj, cloneWith)
          : cloneDeep(newObj),
        oldVal: cloneWith
          ? cloneDeepWith(oldObj, cloneWith)
          : cloneDeep(oldObj),
      })
    }
    return ops
  }
  let keys =
    onlyInclude.length === 0 ? unionOfKeys(oldObj, newObj) : onlyInclude
  for (let key of keys) {
    let fullPath = currentPath ? `${currentPath}.${key}` : key
    // key is only present in newObj
    // it means its a create op
    if (!hasKey(oldObj, key) && hasKey(newObj, key)) {
      ops.push({
        type: "create",
        path: fullPath,
        newVal: cloneWith
          ? cloneDeepWith(newObj[key], cloneWith)
          : cloneDeep(newObj[key]),
        oldVal: undefined,
      })
      continue
    }

    //key is present in both objs
    //this translates to an update op
    if (hasKey(newObj, key) && hasKey(oldObj, key)) {
      if (isLeaf(newObj[key]) || isLeaf(oldObj[key])) {
        if (!isSame(oldObj[key], newObj[key])) {
          ops.push({
            type: "update",
            path: fullPath,
            newVal: cloneWith
              ? cloneDeepWith(newObj[key], cloneWith)
              : cloneDeep(newObj[key]),
            oldVal: cloneWith
              ? cloneDeepWith(oldObj[key], cloneWith)
              : cloneDeep(oldObj[key]),
          })
          continue
        }
        continue
      } else {
        diff({
          oldObj: oldObj[key],
          newObj: newObj[key],
          currentPath: fullPath,
          ops,
          cloneWith,
        })
      }
      continue
    }

    // key is present only in oldObj
    // this translates to the remove op
    if (!hasKey(newObj, key) && hasKey(oldObj, key)) {
      ops.push({
        type: "remove",
        path: fullPath,
        oldVal: cloneWith
          ? cloneDeepWith(oldObj[key], cloneWith)
          : cloneDeep(oldObj[key]),
        newVal: undefined,
      })
      continue
    }
  }
  return ops
}

const isValidPath = (path: string): boolean => {
  if (!path || path === "") return false
  if (path.startsWith(".") || path.endsWith(".")) return false
  if (path.includes("..")) return false
  return true
}

export const buildSubtree = (path: string[], val: any) => {
  if (path.length === 0) return val
  let obj: any = {}
  let current: any = obj
  for (let i = 0; i < path.length; i++) {
    if (i === path.length - 1) {
      current[path[i]] = val
    } else {
      current[path[i]] = {}
    }
    current = current[path[i]]
  }
  return obj
}

export const deleteExcept = (obj: Record<string, any>, keys: string[]) => {
  for (let key in obj) {
    if (!keys.includes(key)) {
      delete obj[key]
    }
    return obj
  }
}
