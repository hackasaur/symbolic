import * as vector from "./vector.ts";
import { updateObject } from "./misc";
import { PointerInput } from "./inputs.ts";
import { Vector2D } from "./vector.ts";
import { Tween, Easing } from "@tweenjs/tween.js";
import { pubSub, PubSub } from "./pubsub.ts";
import * as anim from "./anim.ts";
import { clamp } from "./misc";

export interface ScrollbarProps {
  coords: Vector2D;
  offset: number;
  windowLength: number;
  contentLength: number;
  sliderSize: number;
  extension: number;
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
}

const getSliderLength = (windowLength: number, contentsLength: number) => {
  return windowLength ** 2/ contentsLength;
};

const create = (props: ScrollbarProps) => {
  let scrollbar: Scrollbar = {
    props: {
      coords: vector.copy(props.coords),
      offset: props.offset,
      windowLength: props.windowLength,
      contentLength: props.contentLength,
      sliderSize: props.sliderSize,
      extension: props.extension,
    },
    sliderLength: getSliderLength(props.windowLength, props.contentLength),
    animations: {},
    events: pubSub(["scroll", "hover", "update"]),
    flip: props.flip ? props.flip : false,
    selected: false,
    hover: false,
  };

  let expand: Tween = new Tween(scrollbar)
    .to({
      sliderSize: scrollbar.sliderSize + scrollbar.extension,
    })
    .duration(400)
    .easing(Easing.Sinusoidal.Out);

  let shrink: Tween = new Tween(scrollbar)
    .to({
      sliderSize: scrollbar.sliderSize + scrollbar.extension,
    })
    .duration(400)
    .easing(Easing.Sinusoidal.Out);

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
      scrollbar.props.offset * (scrollbar.props.windowLength - scrollbar.sliderLength),
    scrollbar.props.sliderSize,
    scrollbar.sliderLength,
    scrollbar.props.sliderSize / 2,
  );

  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fill(slider);
};

const scroll = (scrollbar: Scrollbar, delta: number): void => {
  scrollbar.events.publish("scroll", {
    offset: scrollbar.props.offset,
    delta,
  });

  let offset = scrollbar.props.offset + (delta / (scrollbar.props.windowLength - scrollbar.sliderLength))

  offset = clamp(offset, 0, 1 )
  update(scrollbar, { offset });
};

const expand = (scrollbar: Scrollbar): void => {
  scrollbar.animations.expand.start();
};

const shrink = (scrollbar: Scrollbar): void => {
  scrollbar.animations.shrink.start();
};

const areCoordsOnSlider = (coords: Vector2D, scrollbar: Scrollbar): boolean => {
  coords = vector.subtract(coords, scrollbar.props.coords);
  if (
    coords.x > 0 &&
    coords.x < scrollbar.props.sliderSize &&
    coords.y > scrollbar.props.offset &&
    coords.y < scrollbar.props.offset + scrollbar.sliderLength
  ) {
    return true;
  }

  return false;
};

const areCoordsInside = (coords: Vector2D, scrollbar: Scrollbar): boolean => {
  if (
    coords.x > scrollbar.props.coords.x &&
    coords.x < scrollbar.props.coords.x + scrollbar.props.sliderSize &&
    coords.y > scrollbar.props.coords.y &&
    coords.y < scrollbar.props.coords.y + scrollbar.props.windowLength
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
        scrollbar.events.publish("hover");
        scrollbar.selected = true;
      } else if (areCoordsInside(pointerInput.coords, scrollbar)) {
        // the delta the slider needs to scroll to reach under the cursor
        const delta =
          vector.subtract(pointerInput.coords, scrollbar.props.coords).y -
          scrollbar.props.offset;
        scroll(scrollbar, delta);
      }
    }

    case "move": {
      if (areCoordsOnSlider(pointerInput.coords, scrollbar)) {
        if (scrollbar.selected) {
          scroll(scrollbar, pointerInput.delta.y);
        } else if(scrollbar.hover === false) {
          scrollbar.hover = true;
          anim.stop(scrollbar, "shrink")
          anim.play(scrollbar, "expand")
        }
        scrollbar.events.publish("hover");
      } else if (scrollbar.hover) {
        scrollbar.hover = false;
        anim.stop(scrollbar, "expand")
        anim.play(scrollbar, "shrink")
      }
    }

    case "up": {
      scrollbar.selected = false;
    }
  }
};

export { create, draw, scroll, expand, shrink, update, handlePointerInput };
