import Phaser from "phaser";
import type { InputState } from "../types";

interface Sample {
  x: number;
  y: number;
  t: number;
}

// Управление одним пальцем (мобилка):
//   удержание и ведение влево/вправо — ходьба
//   быстрый свайп вверх — прыжок
//   быстрый свайп вниз — рывок
//   короткий тап — атака / взаимодействие
export class TouchInput {
  private scene: Phaser.Scene;

  private active = false;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private anchorX = 0;
  private movedFar = false;
  private samples: Sample[] = [];

  private jumpQueued = false;
  private dashQueued = false;
  private attackQueued = false;
  private interactQueued = false;

  private lastJumpTime = -9999;
  private lastDashTime = -9999;

  private moveDir = 0;
  private lastTapY = 9999;

  private readonly DEADZONE = 14;
  private readonly TAP_MAX_DIST = 20;
  private readonly TAP_MAX_TIME = 240;
  private readonly SWIPE_SPEED = 0.32;
  private readonly SWIPE_MIN_DIST = 22;
  private readonly SWIPE_WINDOW = 90;
  private readonly JUMP_COOLDOWN = 200;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupPointer();
  }

  private eventTime(p: Phaser.Input.Pointer): number {
    const ts = p.event?.timeStamp;
    return typeof ts === "number" && ts > 0 ? ts : performance.now();
  }

  private setupPointer(): void {
    const input = this.scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.on(Phaser.Input.Events.GAME_OUT, this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    this.active = true;
    this.startX = p.x;
    this.startY = p.y;
    this.anchorX = p.x;
    this.startTime = this.eventTime(p);
    this.movedFar = false;
    this.moveDir = 0;
    this.samples = [{ x: p.x, y: p.y, t: this.startTime }];
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.active) return;
    const t = this.eventTime(p);
    this.samples.push({ x: p.x, y: p.y, t });
    const cutoff = t - this.SWIPE_WINDOW * 2;
    while (this.samples.length > 2 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }

    const totalDx = p.x - this.startX;
    const totalDy = p.y - this.startY;
    if (Math.abs(totalDx) > this.TAP_MAX_DIST || Math.abs(totalDy) > this.TAP_MAX_DIST) {
      this.movedFar = true;
    }

    this.detectSwipe(p, t);

    const dx = p.x - this.anchorX;
    if (Math.abs(dx) > this.DEADZONE) {
      this.moveDir = dx > 0 ? 1 : -1;
    } else {
      this.moveDir = 0;
    }
  }

  private detectSwipe(p: Phaser.Input.Pointer, t: number): void {
    let ref: Sample | null = null;
    for (let i = 0; i < this.samples.length; i++) {
      if (t - this.samples[i].t <= this.SWIPE_WINDOW) {
        ref = this.samples[i];
        break;
      }
    }
    if (!ref) return;
    const dt = t - ref.t;
    if (dt < 10) return;
    const vx = (p.x - ref.x) / dt;
    const vy = (p.y - ref.y) / dt;
    const dyWin = p.y - ref.y;

    if (
      vy < -this.SWIPE_SPEED &&
      Math.abs(dyWin) > this.SWIPE_MIN_DIST &&
      Math.abs(vy) > Math.abs(vx) * 0.8 &&
      t - this.lastJumpTime > this.JUMP_COOLDOWN
    ) {
      this.jumpQueued = true;
      this.lastJumpTime = t;
      this.anchorX = p.x;
      this.samples = [{ x: p.x, y: p.y, t }];
      return;
    }

    if (
      vy > this.SWIPE_SPEED &&
      Math.abs(dyWin) > this.SWIPE_MIN_DIST &&
      Math.abs(vy) > Math.abs(vx) * 0.8 &&
      t - this.lastDashTime > this.JUMP_COOLDOWN
    ) {
      this.dashQueued = true;
      this.lastDashTime = t;
      this.samples = [{ x: p.x, y: p.y, t }];
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (!this.active) return;
    const t = this.eventTime(p);
    const dist = Phaser.Math.Distance.Between(this.startX, this.startY, p.x, p.y);
    const dur = t - this.startTime;

    if (!this.movedFar && dist < this.TAP_MAX_DIST && dur < this.TAP_MAX_TIME) {
      this.attackQueued = true;
      this.interactQueued = true;
      this.lastTapY = p.y;
    } else {
      const totalDx = p.x - this.startX;
      const totalDy = p.y - this.startY;
      if (dur > 0 && Math.abs(totalDy) > Math.abs(totalDx)) {
        const v = totalDy / dur;
        if (
          totalDy < -this.SWIPE_MIN_DIST &&
          v < -0.25 &&
          t - this.lastJumpTime > this.JUMP_COOLDOWN
        ) {
          this.jumpQueued = true;
          this.lastJumpTime = t;
        } else if (
          totalDy > this.SWIPE_MIN_DIST &&
          v > 0.25 &&
          t - this.lastDashTime > this.JUMP_COOLDOWN
        ) {
          this.dashQueued = true;
          this.lastDashTime = t;
        }
      }
    }

    this.active = false;
    this.moveDir = 0;
    this.samples = [];
  }

  poll(): InputState {
    const state: InputState = {
      moveDir: this.moveDir,
      jumpPressed: this.jumpQueued,
      dashPressed: this.dashQueued,
      attackPressed: this.attackQueued,
      interactPressed: this.interactQueued,
    };
    this.jumpQueued = false;
    this.dashQueued = false;
    this.attackQueued = false;
    this.interactQueued = false;
    return state;
  }

  isActive(): boolean {
    return this.active;
  }

  getLastTapY(): number {
    return this.lastTapY;
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.off(Phaser.Input.Events.GAME_OUT, this.onUp, this);
  }
}
