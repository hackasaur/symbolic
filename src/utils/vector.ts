export interface Vector2D {
  x: number
  y: number
}

export const create = (x: number, y: number): Vector2D => {
  return { x: x, y: y }
}

export const copy = (vector: Vector2D): Vector2D => {
  return create(vector.x, vector.y)
}

export const add = (a: Vector2D, b: Vector2D): Vector2D => {
  // add vectors a,b
  return create(a.x + b.x, a.y + b.y)
}

export const subtract = (a: Vector2D, b: Vector2D): Vector2D => {
  // subtract vectors b from a
  return create(a.x - b.x, a.y - b.y)
}

export const dot = (a: Vector2D, b: Vector2D): number => {
  return a.x * b.x + a.y * b.y
}

export const multiply = (a: Vector2D, b: Vector2D): Vector2D => {
  return create(a.x * b.x, a.y * b.y)
}

export const scale = (
  point: Vector2D,
  about: Vector2D,
  scaleFactor: Vector2D
): Vector2D => {
  const pointMinusAbout: Vector2D = subtract(point, about)
  const scaledVector: Vector2D = create(
    scaleFactor.x * pointMinusAbout.x,
    scaleFactor.y * pointMinusAbout.y
  )
  return add(about, scaledVector)
}

export const rotate = (
  coords: Vector2D,
  angle: number,
  about?: Vector2D
): Vector2D => {
  // rotate coords about a pivot point
  if (angle === 0 || angle % (2 * Math.PI) === 0) {
    return create(coords.x, coords.y)
  }

  if (about === undefined) {
    about = create(0, 0)
  }

  const x: number =
    about.x +
    (coords.x - about.x) * Math.cos(angle) -
    (coords.y - about.y) * Math.sin(angle)
  const y: number =
    about.y +
    (coords.x - about.x) * Math.sin(angle) +
    (coords.y - about.y) * Math.cos(angle)
  return create(x, y)
}

// had to name this something different than scale2D
export const scaleSimple = (vector: Vector2D, factor: number) => {
  return create(vector.x * factor, vector.y * factor)
}

export const rotateSimple = (coords: Vector2D, angle: number) => {
  if (angle === 0) {
    return create(coords.x, coords.y)
  }
  const x: number = coords.x * Math.cos(angle) - coords.y * Math.sin(angle)
  const y: number = coords.x * Math.sin(angle) + coords.y * Math.cos(angle)
  return create(x, y)
}

export const unit = (vector: Vector2D) => {
  let length = Math.sqrt(vector.x ** 2 + vector.y ** 2)

  return scaleSimple(vector, 1 / length)
}

export const areEqual = (a: Vector2D, b: Vector2D, tol?: number): boolean => {
  if (tol === undefined) {
    tol = 10 ** -4
  }

  return Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol
}

export const size = (vector: Vector2D) => {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2)
}

export const sizeSquared = (vector: Vector2D) => {
  return vector.x ** 2 + vector.y ** 2
}

export const flip = (vector: Vector2D) => {
  return create(-vector.x, -vector.y)
}

export const ORIGIN = create(0, 0)
