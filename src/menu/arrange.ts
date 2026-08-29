import { Rectangle } from "../utils/geometry.ts"
import * as vector from "../utils/vector.ts"
import * as btn from "./button.ts"
import { Button } from "./button.ts"

const inGrid = (
  buttons: Button[],
  padding: number,
  box: Rectangle
): Button[] => {
  let cursor = vector.create(
    box.center.x - box.width / 2 + padding,
    box.center.y - box.height / 2 + padding
  )

  let row = 0
  for (let i = 0; i < buttons.length; i++) {
    let button = buttons[i]

    // if overflowing from the right side
    // shift cursor to the next row of the grid
    if (
      cursor.x + button.props.width + padding > box.center.x + box.width / 2 &&
      row > 0
    ) {
      cursor.x = box.center.x - box.width / 2 + padding
      cursor.y += button.props.height + padding
    }

    let center = vector.create(
      cursor.x + button.props.width / 2,
      cursor.y + button.props.height / 2
    )

    btn.update(button, { center: center })

    cursor.x += button.props.width + padding
    row++
  }

  return buttons
}

export { inGrid }
