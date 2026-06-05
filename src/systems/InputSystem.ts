import Phaser from "phaser";
import type { InputState } from "../types";
import { TouchInput } from "./TouchInput";
import { KeyboardInput } from "./KeyboardInput";

export type ControlMode = "touch" | "keyboard" | "both";

// Два вида управления: жесты одним пальцем (мобилка) + клавиатура (ПК).
// Объединяет ввод: клавиатура и тач работают одновременно без конфликтов.
export class InputSystem {
  private touch: TouchInput;
  private keyboard: KeyboardInput;

  constructor(scene: Phaser.Scene) {
    this.touch = new TouchInput(scene);
    this.keyboard = new KeyboardInput(scene);
    this.ensureCanvasFocus(scene);
  }

  private ensureCanvasFocus(scene: Phaser.Scene): void {
    const canvas = scene.game.canvas;
    canvas.setAttribute("tabindex", "1");
    canvas.style.outline = "none";
    const focus = () => canvas.focus();
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, focus);
    focus();
  }

  poll(): InputState {
    const t = this.touch.poll();
    const k = this.keyboard.poll();

    // Движение: клавиатура приоритетнее, иначе тач-ведение.
    const moveDir = k.moveDir !== 0 ? k.moveDir : t.moveDir;

    return {
      moveDir,
      jumpPressed: t.jumpPressed || k.jumpPressed,
      dashPressed: t.dashPressed || k.dashPressed,
      attackPressed: t.attackPressed || k.attackPressed,
      interactPressed: t.interactPressed || k.interactPressed,
    };
  }

  getLastTapY(): number {
    return this.touch.getLastTapY();
  }

  getActiveMode(): ControlMode {
    const kb = this.keyboard.isActive();
    const touch = this.touch.isActive();
    if (kb && touch) return "both";
    if (kb) return "keyboard";
    return "touch";
  }

  destroy(): void {
    this.touch.destroy();
  }
}
