const getSeries = (initial: number, final: number, n: number): number[] => {
  let s: number[] = []
  let d = (final - initial) / n

  for (let i = 0; i < n; i++) {
    s.push(initial + i * d)
  }

  return s
}

const permArrays = <T>(arrays: T[][], callback: (mem: T[]) => void): void => {
  let counter = 0
  let n = 1
  let mem: T[] = []

  for (let a of arrays) {
    n *= a.length
  }

  const iterate = (i = 0, mem: T[]) => {
    if (counter > n) {
      return
    }

    for (let j = 0; j < arrays[i].length; j++) {
      if (j > 0) {
        mem.pop()
      }

      mem.push(arrays[i][j])

      if (i === arrays.length - 1) {
        callback([...mem])
        counter++

        if (j === arrays[i].length - 1) {
          return
        }

        continue
      }

      iterate(i + 1, [...mem])
    }

    return
  }

  iterate(0, mem)
}

const mean = (values: number[]): number => {
  let mean = values.reduce((a, b) => a + b) / values.length
  return mean
}

const stdDev = (values: number[]): number => {
  let mean = values.reduce((a, b) => a + b) / values.length
  let dev = values.map((value) => (value - mean) ** 2)
  let stdDev = Math.sqrt(dev.reduce((a, b) => a + b) / values.length)
  return stdDev
}

const median = (values: number[]): number => {
  // Sort the array in ascending order
  const sortedValues = [...values].sort((a, b) => a - b)

  const length = sortedValues.length
  const mid = Math.floor(length / 2)

  // If length is odd, return the middle element
  if (length % 2 !== 0) {
    return sortedValues[mid]
  }

  // If length is even, return the average of the two middle elements
  return (sortedValues[mid - 1] + sortedValues[mid]) / 2
}

export { getSeries, permArrays, mean, stdDev, median }
