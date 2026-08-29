const updateObject = (objToBeUpdated: any, updates: any): void => {
  // CAUTION: updates objects in place
  for (let key in updates) {
    // if (objToBeUpdated[key] === undefined)
    //   console.error(`Key ${key} not found in object to be updated`)

    // #NOTE2Self: This function cannot make nested updates to objects
    // can deep updates be done?
    objToBeUpdated[key] = updates[key]
  }
}

const createIdGen = (seed: number): (() => string) => {
  // NOTE: a very basic id generator
  let prevId_num = seed

  const idGen = () => {
    prevId_num = prevId_num + 1
    return prevId_num.toString()
  }

  return idGen
}

export { updateObject, createIdGen }

export async function loadSvgAsHtmlImage(
  svgPath: string
): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()

    // Important for cross-origin SVGs (e.g. from CDN)
    // Allows canvas to read pixels later if needed
    img.crossOrigin = "anonymous"

    img.onload = () => {
      resolve(img)
    }

    img.onerror = () => {
      reject(
        new Error(`Failed to load SVG as image: ${svgPath}\n
        - Check if the file exists
        - Check if the server allows CORS (for remote URLs)
        - Ensure the file is a valid SVG`)
      )
    }

    // Trigger loading
    img.src = svgPath
  })
}
