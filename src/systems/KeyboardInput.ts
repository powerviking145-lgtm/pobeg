import Phaser from "phaser";
import type { InputState } from "../types";

// Клавиатурное управление для ПК (работает параллельно с тачем).
// ←/→ или A/D — ходьба, Space/↑/W — прыжок, Shift/↓/S — рывок, F — удар, E — действие.
export class KeyboardInput {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error("Keyboard plugin недоступен");
    }
    kb.enabled = true;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(KC.LEFT),
      right: kb.addKey(KC.RIGHT),
      a: kb.addKey(KC.A),
      d: kb.addKey(KC.D),
      up: kb.addKey(KC.UP),
      down: kb.addKey(KC.DOWN),
      w: kb.addKey(KC.W),
      s: kb.addKey(KC.S),
      space: kb.addKey(KC.SPACE),
      shift: kb.addKey(KC.SHIFT),
      f: kb.addKey(KC.F),
      e: kb.addKey(KC.E),
    };
  }

  poll(): InputState {
    const k = this.keys;
    let moveDir = 0;
    if (k.left.isDown || k.a.isDown) moveDir = -1;
    else if (k.right.isDown || k.d.isDown) moveDir = 1;

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(k.space) ||
      Phaser.Input.Keyboard.JustDown(k.up) ||
      Phaser.Input.Keyboard.JustDown(k.w);

    const dashPressed =
      Phaser.Input.Keyboard.JustDown(k.shift) ||
      Phaser.Input.Keyboard.JustDown(k.down) ||
      Phaser.Input.Keyboard.JustDown(k.s);

    const attackPressed = Phaser.Input.Keyboard.JustDown(k.f);
    const interactPressed = Phaser.Input.Keyboard.JustDown(k.e);

    return { moveDir, jumpPressed, dashPressed, attackPressed, interactPressed };
  }

  isActive(): boolean {
    const k = this.keys;
    return (
      k.left.isDown ||
      k.right.isDown ||
      k.a.isDown ||
      k.d.isDown ||
      k.up.isDown ||
      k.down.isDown ||
      k.w.isDown ||
      k.s.isDown ||
      k.space.isDown ||
      k.shift.isDown
    );
  }
}
