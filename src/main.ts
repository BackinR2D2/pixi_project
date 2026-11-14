import { Application } from "pixi.js";

import { ShapeGame } from "./scene.ts";

const container = document.getElementById("pixi-container")!;
const app = new Application();

await app.init({
  resizeTo: container,
  backgroundAlpha: 0,
  resolution: Math.min(window.devicePixelRatio, 2),
  autoDensity: true,
  antialias: true,
});

container.appendChild(app.canvas);

new ShapeGame(app, {
  count: document.getElementById("shape-count")!,
  area: document.getElementById("shape-area")!,
  rate: document.getElementById("spawn-rate")!,
  gravity: document.getElementById("gravity-value")!,
  slower: document.getElementById("rate-down")!,
  faster: document.getElementById("rate-up")!,
  lighter: document.getElementById("gravity-down")!,
  heavier: document.getElementById("gravity-up")!,
});
