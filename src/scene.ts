import { Container, Graphics, Rectangle } from "pixi.js";
import type { Application, FederatedPointerEvent, Ticker } from "pixi.js";

interface GameElements {
  count: HTMLElement;
  area: HTMLElement;
  rate: HTMLElement;
  gravity: HTMLElement;
  slower: HTMLElement;
  faster: HTMLElement;
  lighter: HTMLElement;
  heavier: HTMLElement;
}

interface ShapeData {
  kind: "circle" | "ellipse" | "star" | "polygon" | "irregular";
  radius: number;
  width?: number;
  height?: number;
  sides?: number;
  points?: number[];
}

const colors = [0xff6b6b, 0xffca58, 0x65d68e, 0x59a8ff, 0x9f7aea, 0xff79b0];

class FallingShape extends Graphics {
  readonly surfaceArea: number;
  readonly radius: number;
  private speed = 40;

  constructor(data: ShapeData, color: number) {
    super();
    this.radius = data.radius;
    this.surfaceArea = this.drawShape(data, color);
    this.eventMode = "static";
    this.cursor = "pointer";
  }

  fall(seconds: number, gravity: number) {
    this.speed += gravity * seconds;
    this.y += this.speed * seconds;
    this.rotation += seconds * 0.35;
  }

  private drawShape(data: ShapeData, color: number) {
    if (data.kind === "circle") {
      this.circle(0, 0, data.radius);
      this.finish(color);
      return Math.PI * data.radius ** 2;
    }

    if (data.kind === "ellipse") {
      const width = data.width!;
      const height = data.height!;
      this.ellipse(0, 0, width, height);
      this.finish(color);
      return Math.PI * width * height;
    }

    if (data.kind === "star") {
      const innerRadius = data.radius * 0.46;
      this.star(0, 0, 5, data.radius, innerRadius);
      this.finish(color);
      return 5 * data.radius * innerRadius * Math.sin(Math.PI / 5);
    }

    if (data.kind === "irregular") {
      this.poly(data.points!);
      this.finish(color);
      return polygonArea(data.points!);
    }

    this.regularPoly(0, 0, data.radius, data.sides!);
    this.finish(color);
    return (
      0.5 *
      data.sides! *
      data.radius ** 2 *
      Math.sin((Math.PI * 2) / data.sides!)
    );
  }

  private finish(color: number) {
    this.fill({ color, alpha: 0.94 });
    this.stroke({ color: 0xffffff, width: 2, alpha: 0.72 });
  }
}

class ShapeFactory {
  static create(irregular = false) {
    const radius = random(22, 38);
    let data: ShapeData;

    if (irregular) {
      data = {
        kind: "irregular",
        radius,
        points: this.irregularPoints(radius),
      };
    } else {
      const option = Math.floor(Math.random() * 7);
      if (option < 4) {
        data = { kind: "polygon", radius, sides: option + 3 };
      } else if (option === 4) {
        data = { kind: "circle", radius };
      } else if (option === 5) {
        data = {
          kind: "ellipse",
          radius,
          width: radius,
          height: radius * random(0.55, 0.78),
        };
      } else {
        data = { kind: "star", radius };
      }
    }

    return new FallingShape(
      data,
      colors[Math.floor(Math.random() * colors.length)]
    );
  }

  private static irregularPoints(radius: number) {
    const count = Math.floor(random(5, 9));
    const points: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const distance = radius * random(0.52, 1);
      points.push(Math.cos(angle) * distance, Math.sin(angle) * distance);
    }
    return points;
  }
}

export class ShapeGame {
  private readonly shapes: FallingShape[] = [];
  private readonly layer = new Container();
  private readonly background = new Graphics();
  private elapsed = 0;
  private spawnRate = 1;
  private gravity = 180;

  constructor(
    private readonly app: Application,
    private readonly elements: GameElements
  ) {
    this.background.eventMode = "static";
    this.background.on("pointerdown", this.addAtPointer, this);
    this.app.stage.addChild(this.background, this.layer);
    this.app.ticker.add(this.update, this);
    this.app.renderer.on("resize", this.resize, this);
    this.bindControls();
    this.resize();
    this.updateDisplay();
  }

  private addAtPointer(event: FederatedPointerEvent) {
    const position = event.getLocalPosition(this.layer);
    this.addShape(position.x, position.y, true);
  }

  private addShape(x?: number, y?: number, irregular = false) {
    const shape = ShapeFactory.create(irregular);
    const width = this.app.screen.width;
    const left = Math.min(shape.radius, width / 2);
    const right = Math.max(left, width - shape.radius);
    shape.position.set(x ?? random(left, right), y ?? -shape.radius - 2);
    shape.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.removeShape(shape);
    });
    this.shapes.push(shape);
    this.layer.addChild(shape);
    this.updateDisplay();
  }

  private removeShape(shape: FallingShape) {
    const index = this.shapes.indexOf(shape);
    if (index === -1) return;
    this.shapes.splice(index, 1);
    shape.destroy();
    this.updateDisplay();
  }

  private update(ticker: Ticker) {
    const seconds = Math.min(ticker.deltaMS / 1000, 0.05);
    this.elapsed += seconds;
    const interval = 1 / this.spawnRate;

    while (this.elapsed >= interval) {
      this.elapsed -= interval;
      this.addShape();
    }

    for (let i = this.shapes.length - 1; i >= 0; i -= 1) {
      const shape = this.shapes[i];
      shape.fall(seconds, this.gravity);
      if (shape.y - shape.radius > this.app.screen.height)
        this.removeShape(shape);
    }
  }

  private bindControls() {
    this.elements.slower.addEventListener("click", () => {
      this.spawnRate = Math.max(0.5, this.spawnRate - 0.5);
      this.updateDisplay();
    });
    this.elements.faster.addEventListener("click", () => {
      this.spawnRate = Math.min(5, this.spawnRate + 0.5);
      this.updateDisplay();
    });
    this.elements.lighter.addEventListener("click", () => {
      this.gravity = Math.max(60, this.gravity - 30);
      this.updateDisplay();
    });
    this.elements.heavier.addEventListener("click", () => {
      this.gravity = Math.min(420, this.gravity + 30);
      this.updateDisplay();
    });
  }

  private resize() {
    const { width, height } = this.app.screen;
    this.background.clear().rect(0, 0, width, height).fill({ color: 0x10172a });
    this.background.hitArea = new Rectangle(0, 0, width, height);
  }

  private updateDisplay() {
    const area = this.shapes.reduce((sum, shape) => sum + shape.surfaceArea, 0);
    this.elements.count.textContent = String(this.shapes.length);
    this.elements.area.textContent = `${Math.round(area).toLocaleString()} px²`;
    this.elements.rate.textContent = `${this.spawnRate.toFixed(1)} / sec`;
    this.elements.gravity.textContent = `${this.gravity} px/s²`;
  }
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function polygonArea(points: number[]) {
  let area = 0;
  for (let i = 0; i < points.length; i += 2) {
    const next = (i + 2) % points.length;
    area += points[i] * points[next + 1] - points[next] * points[i + 1];
  }
  return Math.abs(area) / 2;
}
