import * as vector from "../utils/vector.ts"
import * as gl from "../utils/gl.ts"
import * as geometry from "../utils/geometry.ts"
import { updateObject } from "../utils/misc.ts"
import { Vector2D } from "../utils/vector.ts"
import * as katex from "katex"
import "katex/dist/katex.min.css"
import * as htmlToImage from "html-to-image"

// export class AppError extends Error {
//   data: any
//   constructor(message: string, data?: any) {
//     super(message)
//     this.name = "AppError"
//     this.data = data
//   }
// }

interface TexProps {
  coords: Vector2D
  height: number
  text: string
}

export interface Tex {
  type: "Tex"
  props: TexProps
  image: HTMLImageElement | undefined
  tmpHTMLelement: HTMLElement
}

const create = (props: TexProps): Tex | Error => {
  let tmpElement = document.createElement("div")

  if (tmpElement === null) {
    return new Error(`tex.create(): tmpElement cannot be null`)
  }

  tmpElement.id = "tmp"
  tmpElement.style.fontSize = `${props.height}px`

  document.body.append(tmpElement)

  let image: HTMLImageElement | undefined = undefined

  let tex: Tex = {
    type: "Tex",
    props: {
      coords: vector.copy(props.coords),
      height: props.height,
      text: props.text,
    },
    image,
    tmpHTMLelement: tmpElement,
  }

  getImage(props, tmpElement).then((img) => {
    document.body.removeChild(tmpElement)

    if (img instanceof Error) {
      console.error(img)
    } else {
      tex.image = img
    }
  })

  return tex
}

const draw = (ctx: CanvasRenderingContext2D, tex: Tex): void => {
  if (!tex.image) {
    console.error(`tex.draw(): image is undefined`)
    return
  }

  let width = tex.image.width
  let height = tex.image.height

  ctx.drawImage(
    tex.image,
    tex.props.coords.x,
    tex.props.coords.y,
    (tex.props.height * width) / height,
    tex.props.height
  )

  return
}

const getImage = async (
  props: TexProps,
  el: HTMLElement
): Promise<HTMLImageElement | Error> => {
  katex.render(props.text, el, {
    throwOnError: false,
  })

  let img: HTMLImageElement | undefined = undefined

  await htmlToImage
    .toSvg(el, { pixelRatio: gl.DPR() })
    .then(async (dataUrl: string) => {
      img = await createImage(dataUrl)
    })

  if (img === undefined) {
    return Error(`tex.getImage(): image is undefined`)
  }

  return img
}

export async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      img.decode().then(() => {
        requestAnimationFrame(() => resolve(img))
      })
    }

    img.onerror = reject
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.src = url
  })
}

export async function nodeToDataURL(
  node: HTMLElement,
  width: number,
  height: number
): Promise<SVGSVGElement> {
  const xmlns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(xmlns, "svg")
  const foreignObject = document.createElementNS(xmlns, "foreignObject")

  svg.setAttribute("width", `${width}`)
  svg.setAttribute("height", `${height}`)
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)

  foreignObject.setAttribute("width", "100%")
  foreignObject.setAttribute("height", "100%")
  foreignObject.setAttribute("x", "0")
  foreignObject.setAttribute("y", "0")
  foreignObject.setAttribute("externalResourcesRequired", "true")

  svg.appendChild(foreignObject)
  foreignObject.appendChild(node)
  return svg
}

const update = async (
  tex: Tex,
  props: Partial<TexProps>
): Promise<void | Error> => {
  updateObject(tex.props, props)

  document.body.append(tex.tmpHTMLelement)

  let img = await getImage(tex.props, tex.tmpHTMLelement)

  document.body.removeChild(tex.tmpHTMLelement)

  if (img instanceof Error) return img
  tex.image = img
  return
}

const getWidth = (tex: Tex): number | Error => {
  if (!tex.image) {
    return Error(`tex.getWidth(): image is undefined`)
  }

  let width = tex.image.width
  let height = tex.image.height

  return (tex.props.height * width) / height
}

export { create, draw, update, getWidth }
