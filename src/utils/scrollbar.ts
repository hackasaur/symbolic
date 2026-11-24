import * as vector from "./vector.ts";
import { updateObject } from "./misc";
import { pubSub, PubSub } from "./pubsub.ts";
import * as anim from "./anim.ts";
import { LinearGradient } from "./gl.ts";
import { clamp } from "./misc";
import { PointerInput } from "./inputs.ts";
import { Vector2D } from "./vector.ts";
import { Tween, Easing } from "@tweenjs/tween.js";
import { Color } from "./gl.ts";
import tinycolor from "tinycolor2";

export interface ScrollbarProps {
  coords: Vector2D;
  offset: number; // 0 to 1
  windowLength: number;
  contentLength: number;
  sliderSize: number;
  extension: number;
  sliderColor: Color;
  barColor: Color;
  flip?: boolean;
}

export interface Scrollbar {
  props: ScrollbarProps;
  sliderLength: number;
  animations: { [key: string]: Tween<Object> };
  events: PubSub;
  flip: boolean;
  selected: boolean;
  hover: boolean;
  sliderGradient?: CanvasGradient;
}

const getSliderLength = (windowLength: number, contentsLength: number) => {
  return windowLength ** 2 / contentsLength;
};

const create = (props: ScrollbarProps) => {
  let scrollbar: Scrollbar = {
    props: {
      coords: vector.copy(props.coords),
      offset: props.offset,
      windowLength: props.windowLength,
      contentLength: props.contentLength,
      sliderSize: props.sliderSize,
      sliderColor: props.sliderColor,
      barColor: props.barColor,
      extension: props.extension,
    },
    sliderLength: getSliderLength(props.windowLength, props.contentLength),
    animations: {},
    events: pubSub(["scroll", "hover", "update"]),
    flip: props.flip ? props.flip : false,
    selected: false,
    hover: false,
    sliderGradient: undefined,
  };

  let expand: Tween = new Tween(scrollbar.props)
    .to({
      sliderSize: scrollbar.props.sliderSize + scrollbar.props.extension,
      coords: vector.add(
        scrollbar.props.coords,
        vector.create(-scrollbar.props.extension, 0),
      ),
    })
    .duration(200)
    .easing(Easing.Sinusoidal.Out);

  let shrink: Tween = new Tween(scrollbar.props)
    .to({
      sliderSize: scrollbar.props.sliderSize,
      coords: vector.copy(scrollbar.props.coords),
    })
    .duration(200)
    .easing(Easing.Sinusoidal.In);

  scrollbar.animations = {
    expand: expand,
    shrink: shrink,
  };

  return scrollbar;
};

const update = (scrollbar: Scrollbar, updates: Object) => {
  updateObject(scrollbar.props, updates);

  if ("windowLength" in updates || "contentsLength" in updates) {
    scrollbar.sliderLength = getSliderLength(
      scrollbar.props.windowLength,
      scrollbar.props.contentLength,
    );
  }

  scrollbar.events.publish("update", { updates });
};

const draw = (
  ctx: CanvasRenderingContext2D,
  scrollbar: Scrollbar,
): void | Error => {
  let slider: Path2D = new Path2D();
  slider.roundRect(
    scrollbar.props.coords.x,
    scrollbar.props.coords.y +
      scrollbar.props.offset *
        (scrollbar.props.windowLength - scrollbar.sliderLength),
    scrollbar.props.sliderSize,
    scrollbar.sliderLength,
    scrollbar.props.sliderSize / 2,
  );

  let bar: Path2D = new Path2D();
  bar.roundRect(
    scrollbar.props.coords.x,
    scrollbar.props.coords.y,
    scrollbar.props.sliderSize,
    scrollbar.props.windowLength,
    scrollbar.props.sliderSize / 2,
  );

  for (let animation in scrollbar.animations) {
    if (anim.isPlaying(scrollbar, animation)) anim.update(scrollbar, animation);
  }

  let color = scrollbar.props.barColor;
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
  ctx.fill(bar);

  // #sub-optimal: same gradient shouldn't have to be created on every draw call
  if (scrollbar.sliderGradient === undefined) {
    let gradient: CanvasGradient = ctx.createLinearGradient(
      scrollbar.props.coords.x,
      scrollbar.props.coords.y,
      scrollbar.props.coords.x + scrollbar.props.sliderSize,
      scrollbar.props.coords.y + scrollbar.props.windowLength,
    );
    let color = scrollbar.props.sliderColor;
    gradient.addColorStop(0, `rgba(0, 0, 0, 0.2)`);
    gradient.addColorStop(0.1, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
    gradient.addColorStop(0.9, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    scrollbar.sliderGradient = gradient;
  }
  ctx.fillStyle = scrollbar.sliderGradient;
  ctx.fill(slider);
};

const scroll = (scrollbar: Scrollbar, delta: number): void => {
  let offset =
    scrollbar.props.offset +
    delta / (scrollbar.props.windowLength - scrollbar.sliderLength);

  offset = clamp(offset, 0, 1);
  update(scrollbar, { offset });
  scrollbar.events.publish("scroll", {
    delta,
  });
};

const expand = (scrollbar: Scrollbar): void => {
  anim.stop(scrollbar, "shrink");
  anim.play(scrollbar, "expand");
};

const shrink = (scrollbar: Scrollbar): void => {
  anim.stop(scrollbar, "expand");
  anim.play(scrollbar, "shrink");
};

const areCoordsOnSlider = (coords: Vector2D, scrollbar: Scrollbar, extend?: number): boolean => {
  extend = extend === undefined ? 0 : extend
  coords = vector.subtract(coords, scrollbar.props.coords);

  if (
    coords.x > 0 - extend &&
    coords.x < scrollbar.props.sliderSize + extend &&
    coords.y >
      scrollbar.props.offset *
        (scrollbar.props.windowLength - scrollbar.sliderLength) - extend &&
    coords.y <
      scrollbar.props.offset *
        (scrollbar.props.windowLength - scrollbar.sliderLength) +
        scrollbar.sliderLength + extend
  ) {
    return true;
  }

  return false;
};

const areCoordsInside = (coords: Vector2D, scrollbar: Scrollbar, extend?: number): boolean => {
  extend = extend === undefined ? 0 : extend

  if (
    coords.x > scrollbar.props.coords.x - extend &&
    coords.x < scrollbar.props.coords.x + scrollbar.props.sliderSize + extend &&
    coords.y > scrollbar.props.coords.y - extend &&
    coords.y < scrollbar.props.coords.y + scrollbar.props.windowLength + extend
  ) {
    return true;
  }

  return false;
};

const handlePointerInput = (
  scrollbar: Scrollbar,
  pointerInput: PointerInput,
): void => {
  switch (pointerInput.inputType) {
    case "down": {
      if (areCoordsOnSlider(pointerInput.coords, scrollbar)) {
        scrollbar.selected = true;
        scrollbar.props.sliderColor = tinycolor(scrollbar.props.sliderColor)
          .lighten(20)
          .toRgb();
        scrollbar.sliderGradient = undefined;
        break;
      } else if (areCoordsInside(pointerInput.coords, scrollbar)) {
        // the delta the slider needs to scroll to reach under the cursor
        // const delta =
        //   vector.subtract(pointerInput.coords, scrollbar.props.coords).y -
        //   scrollbar.props.offset *
        //     (scrollbar.props.windowLength - scrollbar.sliderLength) -
        //   scrollbar.sliderLength / 2;

        let dist =
          scrollbar.props.flip === true
            ? pointerInput.coords.x - scrollbar.props.coords.x
            : pointerInput.coords.y - scrollbar.props.coords.y;
        dist /= scrollbar.props.windowLength
        let direction = dist > scrollbar.props.offset ? 1 : -1;

        // scroll by the slider's length
        const delta = direction * scrollbar.sliderLength;

        let offset_prev = scrollbar.props.offset;
        let scrollAnim = new Tween({ offset: scrollbar.props.offset })
          .to({ offset: scrollbar.props.offset + delta })
          .onUpdate((props) => {
            let delta = props.offset - offset_prev;
            scroll(scrollbar, delta);
            offset_prev = props.offset;
          })
          .duration(200)
          .easing(Easing.Quintic.InOut);

        scrollbar.animations["scrollAnim"] = scrollAnim;
        anim.play(scrollbar, "scrollAnim");
      }
      break;
    }

    case "move": {
      if (scrollbar.selected) {
        scroll(scrollbar, pointerInput.delta.y);
      } else if (areCoordsInside(pointerInput.coords, scrollbar, 10)) {
        scrollbar.events.publish("hover");
        if (scrollbar.hover === false) {
          scrollbar.hover = true;
          expand(scrollbar);
        }
      } else if (scrollbar.hover) {
        scrollbar.hover = false;
        shrink(scrollbar);
      }
      break;
    }

    case "up": {
      if (scrollbar.selected) {
        scrollbar.props.sliderColor = tinycolor(scrollbar.props.sliderColor)
          .darken(20)
          .toRgb();
        scrollbar.sliderGradient = undefined;
        scrollbar.selected = false;
      }
    }
  }
};

const offsetToActualDistance = (offset: number, windowLength: number) => {
  return offset * windowLength
}

export {
  create,
  draw,
  scroll,
  expand,
  shrink,
  update,
  handlePointerInput,
  areCoordsInside,
  areCoordsOnSlider,
  offsetToActualDistance
};
