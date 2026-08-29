export const generateShortId = () => {
  let id = crypto.randomUUID().split("-")[4]
  if (!id) {
    throw new Error("failed to generate short id, id is undefined")
  }
  return id
}
