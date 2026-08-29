import {
  add,
  subtract,
  rotate,
  rotateSimple,
  dot,
  scaleSimple,
  scale,
} from "./vector.ts"
import * as vector from "./vector.ts"
import { DPR } from "./gl.ts"
import { Vector2D } from "./vector.ts"

export interface LineSegment {
  p1: Vector2D
  p2: Vector2D
}

export interface Rectangle {
  center: Vector2D
  width: number
  height: number
  rotation: number
}

export interface Ellipse {
  center: Vector2D
  radiusX: number
  radiusY: number
  rotation: number
}

export interface Line {
  start: Vector2D
  end: Vector2D
}

export interface RectIntersects {
  top: Vector2D | null
  right: Vector2D | null
  bottom: Vector2D | null
  left: Vector2D | null
}

export interface Spread {
  deltaX: number
  deltaY: number
}

export const getDistance = (coords1: Vector2D, coords2: Vector2D): number => {
  let deltaX = coords2.x - coords1.x
  let deltaY = coords2.y - coords1.y
  return Math.sqrt(deltaX ** 2 + deltaY ** 2)
}

export const manhattanDistance = (
  coords1: Vector2D,
  coords2: Vector2D
): number => {
  let deltaX = Math.abs(coords2.x - coords1.x)
  let deltaY = Math.abs(coords2.y - coords1.y)
  return deltaX + deltaY
}

export const spreadBetweenPoints = (
  coords1: Vector2D,
  coords2: Vector2D
): Spread => {
  return {
    deltaX: coords2.x - coords1.x,
    deltaY: coords2.y - coords1.y,
  }
}

export const lineIntersect = (
  // https://gist.github.com/alexcpn/45c5026397e11751583891831cc36456
  l1: LineSegment,
  l2: LineSegment
): Vector2D | null => {
  const p1 = l1.p1
  const p2 = l1.p2
  const q1 = l2.p1
  const q2 = l2.p2

  // Calculate the direction vectors of the two line segments
  const dx1 = p2.x - p1.x
  const dy1 = p2.y - p1.y
  const dx2 = q2.x - q1.x
  const dy2 = q2.y - q1.y

  // Calculate the determinant of the direction vectors
  const det = dx1 * dy2 - dx2 * dy1

  // Check if the line segments are parallel (det is approximately 0)
  if (Math.abs(det) < 1e-6) {
    return null // No intersection (or infinite intersections, for overlapping segments)
  }

  // Calculate the parameters for the two line segments
  const t1 = ((q1.x - p1.x) * dy2 - (q1.y - p1.y) * dx2) / det
  const t2 = ((q1.x - p1.x) * dy1 - (q1.y - p1.y) * dx1) / det

  // Check if the intersection point is within the line segments
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    // Calculate the coordinates of the intersection point
    const intersectionX = p1.x + t1 * dx1
    const intersectionY = p1.y + t1 * dy1

    return vector.create(intersectionX, intersectionY)
  }

  return null // No intersection within the line segments
}

export const lineRectIntersect = (
  line: LineSegment,
  rect: Rectangle
): RectIntersects => {
  // returns all the intersections that a line segment has with a rectangle

  let topLeft: Vector2D = vector.create(
    rect.center.x - rect.width / 2,
    rect.center.y - rect.height / 2
  )
  let topRight: Vector2D = vector.create(
    rect.center.x + rect.width / 2,
    rect.center.y - rect.height / 2
  )
  let bottomRight: Vector2D = vector.create(
    rect.center.x + rect.width / 2,
    rect.center.y + rect.height / 2
  )
  let bottomLeft: Vector2D = vector.create(
    rect.center.x - rect.width / 2,
    rect.center.y + rect.height / 2
  )

  // rotate rectangle corners if rectangle has rotation
  if (rect.rotation % (2 * Math.PI) !== 0) {
    topLeft = rotate(topLeft, rect.rotation, rect.center)
    ;(topRight = rotate(topRight, rect.rotation, rect.center)),
      (bottomRight = rotate(bottomRight, rect.rotation, rect.center))
    bottomLeft = rotate(bottomLeft, rect.rotation, rect.center)
  }

  const topSide = { p1: topLeft, p2: topRight }
  const rightSide = { p1: topRight, p2: bottomRight }
  const bottomSide = { p1: bottomRight, p2: bottomLeft }
  const leftSide = { p1: topLeft, p2: bottomLeft }

  // get intersection with each side of the rectangle
  let top = lineIntersect(topSide, line)
  let right = lineIntersect(rightSide, line)
  let bottom = lineIntersect(bottomSide, line)
  let left = lineIntersect(leftSide, line)

  return { top: top, right: right, bottom: bottom, left: left }
}

export const midPoint = (line: LineSegment): Vector2D => {
  let x = line.p1.x + (line.p2.x - line.p1.x) / 2
  let y = line.p1.y + (line.p2.y - line.p1.y) / 2

  return vector.create(x, y)
}

export const lineEllipseIntersect = (
  line: LineSegment,
  ellipse: Ellipse
): Vector2D[] => {
  // <https://www.xarg.org/book/computer-graphics/line-segment-ellipse-intersection/>
  let ls: LineSegment = { p1: line.p1, p2: line.p2 } //clone

  ls.p1 = rotate(
    subtract(ls.p1, ellipse.center),
    -ellipse.rotation,
    vector.create(0, 0)
  )

  ls.p2 = rotate(
    subtract(ls.p2, ellipse.center),
    -ellipse.rotation,
    vector.create(0, 0)
  )

  let radiusX2 = ellipse.radiusX ** 2
  let radiusY2 = ellipse.radiusY ** 2

  const intersects: Vector2D[] = []

  const BminusA = subtract(ls.p2, ls.p1)

  //coefficients
  const a = radiusX2 * BminusA.y ** 2 + radiusY2 * BminusA.x ** 2
  const b =
    2 * (radiusX2 * ls.p1.y * BminusA.y + radiusY2 * ls.p1.x * BminusA.x)
  const c =
    radiusX2 * ls.p1.y ** 2 + radiusY2 * ls.p1.x ** 2 - radiusX2 * radiusY2

  const discriminant = b ** 2 - 4 * a * c

  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant)
    const t1 = (-b + sqrtD) / (2 * a)
    const t2 = (-b - sqrtD) / (2 * a)

    if (0 <= t1 && t1 <= 1) {
      intersects.push(
        add(
          rotate(
            add(scaleSimple(BminusA, t1), ls.p1),
            ellipse.rotation,
            vector.create(0, 0)
          ),
          ellipse.center
        )
      )
    }

    if (0 <= t2 && t2 <= 1 && Math.abs(t1 - t2) > 1e-16) {
      intersects.push(
        add(
          rotate(
            add(scaleSimple(BminusA, t2), ls.p1),
            ellipse.rotation,
            vector.create(0, 0)
          ),
          ellipse.center
        )
      )
    }
  }

  return intersects
}

export const getCentroid = (points: Vector2D[]): Vector2D | Error => {
  if (points.length === 0)
    return Error(`geometry.centroid(): points.length cannot be 0`)

  let n = points.length
  let centroid = points.reduce((a, b) => vector.create(a.x + b.x, a.y + b.y))
  centroid = vector.create(centroid.x / n, centroid.y / n)
  return centroid
}

export const arctan2 = (y: number, x: number): number => {
  // return the angle w.r.t the x-axis anticlockwise
  let radians = Math.atan2(y, x)
  if (radians > 0) {
    radians = 2 * Math.PI - radians
  } else {
    radians = Math.abs(radians)
  }

  return radians
}

export function transformCoords(
  coords: Vector2D,
  about: Vector2D,
  scale: number
): Vector2D {
  return vector.create(coords.x / scale + about.x, coords.y / scale + about.y)
}

export function normalizeAngle(theta: number): number {
  // For any angle in radians and returns an equivalent angle between 0 and 2π

  // use floor instead of modulus <https://stackoverflow.com/a/11980362/7940996>
  theta = theta - 2 * Math.PI * Math.floor(theta / (2 * Math.PI))

  if (theta < 0) {
    theta = 2 * Math.PI - theta
  }

  return theta
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function getBoundingBox(points: Vector2D[]): Rectangle {
  // NOTE: rotation is always 0 for a bounding box
  //
  if (points.length === 0) {
    return {
      center: vector.create(0, 0),
      width: 0,
      height: 0,
      rotation: 0,
    }
  }
  // Initialize min and max values with first point
  let minX = points[0].x
  let maxX = points[0].x
  let minY = points[0].y
  let maxY = points[0].y

  // Iterate through all points to find min and max values
  for (let i = 1; i < points.length; i++) {
    const x = points[i].x
    const y = points[i].y

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  let width = Math.abs(maxX - minX)
  let height = Math.abs(maxY - minY)
  let center = vector.create(minX + width / 2, minY + height / 2)

  return { center, width, height, rotation: 0 }
}

export function getDistances(points: Vector2D[]): number[] {
  let distances: number[] = []

  for (let i = 0; i < points.length - 1; i++) {
    distances.push(getDistance(points[i], points[i + 1]))
  }

  return distances
}

export function angleBetweenVectors(v1: Vector2D, v2: Vector2D) {
  // NOTE: this gives the counterclockwise angle between angle Between Vectors
  // Calculate dot product
  const dotProduct = v1.x * v2.x + v1.y * v2.y

  // Calculate magnitudes
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

  // Calculate the angle using dot product formula
  // cos(θ) = (v1 · v2) / (|v1| * |v2|)
  let cosTheta = dotProduct / (mag1 * mag2)

  // Ensure cosTheta is between -1 and 1 to avoid floating-point errors
  cosTheta = Math.max(-1, Math.min(1, cosTheta))

  // Get the angle in radians (between 0 and π)
  const angle = Math.acos(cosTheta)

  // Use cross product to determine the direction (clockwise or counterclockwise)
  const crossProduct = v1.x * v2.y - v1.y * v2.x

  // If cross product is negative, the angle is in the opposite direction
  // We adjust to get the full 0 to 2π range
  if (crossProduct < 0) {
    return 2 * Math.PI - angle
  }

  return angle
}

export function angleWithXaxis(vector: Vector2D): number {
  //NOTE: this is the clockwise angle with respect to the x-axis
  return Math.atan2(vector.y, vector.x)
}

// Calculate a single Catmull-Rom spline point
export function catmullRomSpline(
  p0: Vector2D,
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  t: number
): Vector2D {
  const t2 = t * t
  const t3 = t2 * t
  return vector.create(
    0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
  )
}

// Get all points of a Catmull-Rom spline as an array of 2D vectors
export function getCatmullRomSplinePoints(
  controlPoints: Vector2D[],
  steps = 20
): Vector2D[] {
  if (controlPoints.length < 2) return [] // Need at least 2 points

  const splinePoints: Vector2D[] = []

  // Include the first control point
  splinePoints.push(vector.create(controlPoints[0].x, controlPoints[0].y))

  // Iterate through each segment
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[Math.max(i - 1, 0)] // Previous point
    const p1 = controlPoints[i] // Start point
    const p2 = controlPoints[i + 1] // End point
    const p3 = controlPoints[Math.min(i + 2, controlPoints.length - 1)] // Next point

    // Calculate points between p1 and p2
    for (let t = 0; t <= 1; t += 1 / steps) {
      const point = catmullRomSpline(p0, p1, p2, p3, t)
      splinePoints.push(point)
    }
  }

  return splinePoints
}

// export const clustersToCentroids = (
//   points: Vector2D[],
//   lambda: number
// ): Vector2D[] | Error => {
//   let dists = getDistances(points)
//   let mean = dists.reduce((a, b) => a + b) / dists.length
//   let dev = dists.map((value) => (value - mean) ** 2)
//   let stdDev = Math.sqrt(dev.reduce((a, b) => a + b) / dists.length)
//   let epsilon = mean - lambda * stdDev

//   console.log(`mean=${mean}, dev=${stdDev}, epsilon=, ${epsilon}`)

//   let stroke = points.map((point) => vector.copy(point))
//   let start: number | null = null
//   let tooClosePoints: Vector2D[] = []
//   let centroids: Vector2D[] = []

//   for (let i = 0; i < stroke.length - 1; i++) {
//     // #TODO: handle case for last point (i = stroke.length - 1)
//     let begin =
//       start === null && getDistance(stroke[i], stroke[i + 1]) < epsilon

//     let inProgress =
//       start !== null && getDistance(stroke[i], stroke[i + 1]) < epsilon

//     let end = start !== null && getDistance(stroke[i], stroke[i + 1]) > epsilon

//     if (begin) {
//       start = i
//       tooClosePoints.push(stroke[i])
//     } else if (inProgress) {
//       tooClosePoints.push(stroke[i])
//     } else if (end && start !== null) {
//       if (tooClosePoints.length > 1) {
//         tooClosePoints.push(stroke[i])
//         let c = getCentroid(tooClosePoints)
//         if (c instanceof Error) return c

//         stroke.splice(start, i - start + 1, c)
//         i = start + 1
//         centroids.push(c)
//       }
//       start = null
//       tooClosePoints = []
//     }
//   }

//   if (start !== null && tooClosePoints.length > 1) {
//     if (tooClosePoints.length > 1) {
//       let c = getCentroid(tooClosePoints)
//       if (c instanceof Error) return c

//       stroke.splice(start, stroke.length - 1 - start, c)
//       centroids.push(c)
//     }
//   }
//   return stroke
// }

export const clustersToCentroids = (
  points: Vector2D[],
  lambda: number
): Vector2D[] | Error => {
  if (points.length < 2) return points // Early return for insufficient points

  // Calculate distances and epsilon threshold
  let dists = getDistances(points)
  let mean = dists.reduce((a, b) => a + b) / dists.length
  let dev = dists.map((value) => (value - mean) ** 2)
  let stdDev = Math.sqrt(dev.reduce((a, b) => a + b) / dists.length)
  let epsilon = mean - lambda * stdDev

  // console.log(`mean=${mean}, dev=${stdDev}, epsilon=${epsilon}`)

  // Working copy of points
  let stroke = points.map((point) => vector.copy(point))
  let centroids: Vector2D[] = []
  let tooClosePoints: Vector2D[] = []
  let start: number | null = null

  // Iterate through all points, including handling the last point
  for (let i = 0; i < stroke.length; i++) {
    // Determine if current point is too close to the next one (if it exists)
    let isTooClose = false
    let isLastPoint = i === stroke.length - 1

    if (!isLastPoint) {
      isTooClose = getDistance(stroke[i], stroke[i + 1]) < epsilon
    }

    // Start a new cluster
    if (start === null && isTooClose) {
      start = i
      tooClosePoints = [stroke[i]]
    }
    // Continue an existing cluster
    else if (start !== null && isTooClose) {
      tooClosePoints.push(stroke[i])
    }
    // End a cluster (either because points are too far or we reached the end)
    else if (start !== null && (!isTooClose || isLastPoint)) {
      // Include the current point if it's the last one and part of the cluster
      if (isLastPoint && tooClosePoints.length > 0) {
        tooClosePoints.push(stroke[i])
      }

      // Only process if we have a valid cluster (more than 1 point)
      if (tooClosePoints.length > 1) {
        const centroid = getCentroid(tooClosePoints)
        if (centroid instanceof Error) return centroid

        // Replace the cluster with its centroid
        const clusterLength = isLastPoint
          ? stroke.length - start
          : i - start + 1
        stroke.splice(start, clusterLength, centroid)
        centroids.push(centroid)

        // Adjust index to account for the splice
        i = start
      }

      // Reset cluster tracking
      start = null
      tooClosePoints = []
    }
  }

  return stroke
}

export const areCoordsInsideBox = (
  coords: Vector2D,
  box: Rectangle
): boolean => {
  if (box.rotation !== 0) {
    coords = vector.rotate(coords, -box.rotation, box.center)
  }

  return (
    coords.x >= box.center.x - Math.abs(box.width / 2) &&
    coords.x <= box.center.x + Math.abs(box.width / 2) &&
    coords.y >= box.center.y - Math.abs(box.height / 2) &&
    coords.y <= box.center.y + Math.abs(box.height / 2)
  )
}

export const areCoordsInsideCircle = (
  coords: Vector2D,
  center: Vector2D,
  radius: number
): boolean => {
  return (coords.x - center.x) ** 2 + (coords.y - center.y) ** 2 <= radius ** 2
}

function linearInterpolate(
  p1: Vector2D,
  p2: Vector2D,
  subdivisions: number
): Vector2D[] {
  let points: Vector2D[] = []

  for (let i = 1; i <= subdivisions; i++) {
    let t = i / subdivisions
    points.push(
      vector.create(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t)
    )
  }

  return points
}

export const linearInerpolatePoints = (
  points: Vector2D[],
  threshold: number
): Vector2D[] => {
  let interpolatedPoints: Vector2D[] = []

  let j = 0
  for (let i = 0; i < points.length - 1; i++) {
    interpolatedPoints.push(vector.copy(points[i]))
    let d = getDistance(points[i], points[i + 1])

    if (d > threshold) {
      let subdivisions = Math.floor(d / threshold)
      let pointsToInterpolate = linearInterpolate(
        points[i],
        points[i + 1],
        subdivisions
      )
      interpolatedPoints.splice(j + 1, 0, ...pointsToInterpolate)
      j += subdivisions
    }
    j++
  }

  return interpolatedPoints
}

export const resamplePoints = (
  points: Vector2D[],
  scale: number
): Vector2D[] | Error => {
  let points_copy: Vector2D[] = points.map((point: Vector2D) =>
    vector.copy(point)
  )

  // Get coordinates of bounding box
  let box = getBoundingBox(points)
  if (box instanceof Error) return box

  const minX = box.center.x - box.width / 2
  const maxX = box.center.x + box.width / 2
  const minY = box.center.y - box.height / 2
  const maxY = box.center.y + box.height / 2

  // # Length of diagonal
  let dia = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2))
  // # Scale diagonal to get interspacing distance S
  let S = dia / scale
  if (S < 2.5) S = 2.5

  // # Initialise distance holder and increment i
  let D = 0
  let i = 1
  let length = points.length
  const resampledPoints: Vector2D[] = []
  // resampledX = [x[0]]
  // resampledY = [y[0]]
  while (i < length) {
    let d = getDistance(points_copy[i - 1], points_copy[i])
    if (D + d >= S) {
      // # Calculate new point q that has distance S from prev point
      let q = vector.add(
        points_copy[i - 1],
        vector.scaleSimple(
          vector.subtract(points_copy[i], points_copy[i - 1]),
          (S - D) / d
        )
      )
      resampledPoints.push(q)
      // let qx = points_copy[i - 1].x + ((S - D) / d) * (x[i] - x[i - 1])
      // let qy = y[i-1] + ((S-D)/d)*(y[i]-y[i-1])
      // resampledX.append(qx)
      // resampledY.append(qy)
      points_copy.splice(i, 0, q)
      // x.insert(i, qx)
      // y.insert(i, qy)
      length = points_copy.length
      D = 0
    } else {
      D += d
    }
    i += 1
  }
  return resampledPoints
}
