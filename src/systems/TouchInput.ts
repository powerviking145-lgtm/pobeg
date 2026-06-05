import Phaser from "phaser";
import type { InputState } from "../types";

interface Sample {
  x: number;
  y: number;
  t: number;
}

interface FingerTrack {
  id: number;
  role: "move" | "action";
  startX: number;
  startY: number;
  startTime: number;
  moveAnchorX: number;
  movedFar: boolean;
  samples: Sample[];
}

// Управление двумя пальцами (мобилка):
//   палец 1 — удержание и ведение влево/вправо (ходьба, пока палец на экране)
//   палец 2 — свайп вверх прыжок, вниз рывок, короткий тап удар/действие
// Один палец тоже работает: ведение + свайп ↑↓ без отпускания.
export class TouchInput {
  private scene: Phaser.Scene;

  private fingers = new Map<number, FingerTrack>();
  private movePointerId: number | null = null;

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
    const id = p.id;
    if (this.fingers.has(id)) return;

    const role: FingerTrack["role"] =
      this.movePointerId === null ? "move" : "action";

    const t = this.eventTime(p);
    const track: FingerTrack = {
      id,
      role,
      startX: p.x,
      startY: p.y,
      startTime: t,
      moveAnchorX: p.x,
      movedFar: false,
      samples: [{ x: p.x, y: p.y, t }],
    };
    this.fingers.set(id, track);

    if (role === "move") {
      this.movePointerId = id;
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const track = this.fingers.get(p.id);
    if (!track) return;

    const t = this.eventTime(p);
    track.samples.push({ x: p.x, y: p.y, t });
    const cutoff = t - this.SWIPE_WINDOW * 2;
    while (track.samples.length > 2 && track.samples[0].t < cutoff) {
      track.samples.shift();
    }

    const totalDx = p.x - track.startX;
    const totalDy = p.y - track.startY;
    if (Math.abs(totalDx) > this.TAP_MAX_DIST || Math.abs(totalDy) > this.TAP_MAX_DIST) {
      track.movedFar = true;
    }

    this.detectSwipe(track, p, t);

    if (track.role === "move") {
      const dx = p.x - track.moveAnchorX;
      if (Math.abs(dx) > this.DEADZONE) {
        this.moveDir = dx > 0 ? 1 : -1;
      } else if (this.movePointerId === track.id) {
        this.moveDir = 0;
      }
    }
  }

  private detectSwipe(track: FingerTrack, p: Phaser.Input.Pointer, t: number): void {
    let ref: Sample | null = null;
    for (let i = 0; i < track.samples.length; i++) {
      if (t - track.samples[i].t <= this.SWIPE_WINDOW) {
        ref = track.samples[i];
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
      if (track.role === "move") {
        track.moveAnchorX = p.x;
      }
      track.samples = [{ x: p.x, y: p.y, t }];
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
      track.samples = [{ x: p.x, y: p.y, t }];
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const track = this.fingers.get(p.id);
    if (!track) return;

    const t = this.eventTime(p);
    const dist = Phaser.Math.Distance.Between(track.startX, track.startY, p.x, p.y);
    const dur = t - track.startTime;

    if (!track.movedFar && dist < this.TAP_MAX_DIST && dur < this.TAP_MAX_TIME) {
      this.attackQueued = true;
      this.interactQueued = true;
      this.lastTapY = p.y;
    } else {
      const totalDx = p.x - track.startX;
      const totalDy = p.y - track.startY;
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

    this.fingers.delete(p.id);
    if (this.movePointerId === track.id) {
      this.movePointerId = null;
      this.moveDir = 0;
    }
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
    return this.fingers.size > 0;
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
