export const concatInPlace = <T>(head: Array<T>, tail: Array<T>) => {
  for (let i in tail) {
    head.push(tail[i])
  }
  return head
}

export const remove = <T extends string | number>(arr: Array<T>, val: T) => {
  let idx = arr.indexOf(val)
  if (!(idx >= 0)) return arr
  let h = arr.slice(0, idx)
  let t = arr.slice(idx + 1)
  return concatInPlace(h, t)
}
