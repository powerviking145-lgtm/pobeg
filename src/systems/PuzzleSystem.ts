import Phaser from "phaser";
import { TEX } from "../config";
import type { PuzzleHint } from "../types";

export interface GateState {
  sprite: Phaser.Physics.Arcade.Image;
  linkId: string;
  open: boolean;
  mode: "lever" | "hold" | "crate";
}

export interface PlateState {
  sprite: Phaser.Physics.Arcade.Image;
  linkId: string;
  mode: "hold" | "crate";
  pressed: boolean;
}

export class PuzzleSystem {
  gates: GateState[] = [];
  plates: PlateState[] = [];
  leverLinks = new Map<Phaser.GameObjects.GameObject, string>();
  cratePlateLinks = new Map<string, string>();
  hints: PuzzleHint[] = [];
  currentHint = "";

  registerGate(
    sprite: Phaser.Physics.Arcade.Image,
    linkId: string,
    mode: "lever" | "hold" | "crate" = "lever"
  ): void {
    this.gates.push({ sprite, linkId, open: false, mode });
  }

  registerPlate(
    sprite: Phaser.Physics.Arcade.Image,
    linkId: string,
    mode: "hold" | "crate"
  ): void {
    this.plates.push({ sprite, linkId, mode, pressed: false });
  }

  registerLever(obj: Phaser.GameObjects.GameObject, linkId: string): void {
    this.leverLinks.set(obj, linkId);
  }

  registerCratePlate(crate: Phaser.GameObjects.GameObject, linkId: string): void {
    this.cratePlateLinks.set(String(crate.name), linkId);
    crate.setData("puzzleLinkId", linkId);
  }

  setHints(hints: PuzzleHint[]): void {
    this.hints = hints;
  }

  updatePlayerRoom(
    _scene: Phaser.Scene,
    playerX: number,
    playerY: number,
    roomW: number,
    roomH: number,
    tile: number
  ): void {
    const rx = Math.floor(playerX / tile / roomW);
    const ry = Math.floor(playerY / tile / roomH);
    const hint = this.hints.find((h) => h.rx === rx && h.ry === ry);
    this.currentHint = hint?.text ?? "";
  }

  toggleLever(linkId: string, lever: Phaser.GameObjects.GameObject, vfx: {
    leverPull: (o: Phaser.GameObjects.GameObject) => void;
    gateOpen: (o: Phaser.GameObjects.GameObject) => void;
    burst: (x: number, y: number, c: number) => void;
  }): void {
    for (const gate of this.gates) {
      if (gate.linkId !== linkId || gate.mode !== "lever") continue;
      gate.open = !gate.open;
      if (gate.open) {
        const body = gate.sprite.body as Phaser.Physics.Arcade.StaticBody;
        body.enable = false;
        vfx.burst(gate.sprite.x, gate.sprite.y, 0xffd23f);
        vfx.gateOpen(gate.sprite);
      }
    }
    vfx.leverPull(lever);
  }

  updateHoldPlates(
    player: Phaser.GameObjects.Sprite,
    overlap: (a: Phaser.GameObjects.GameObject, b: Phaser.GameObjects.GameObject) => boolean
  ): void {
    for (const plate of this.plates) {
      if (plate.mode !== "hold") continue;
      const on = overlap(player, plate.sprite);
      plate.pressed = on;
      const tex = on ? TEX.pressure_plate_on : TEX.pressure_plate;
      if (plate.sprite.scene.textures.exists(tex)) plate.sprite.setTexture(tex);
      this.setGatesOpen(plate.linkId, on, "hold");
    }
  }

  updateCratePlates(
    crates: Phaser.Physics.Arcade.Group,
    overlap: (a: Phaser.GameObjects.GameObject, b: Phaser.GameObjects.GameObject) => boolean
  ): void {
    for (const plate of this.plates) {
      if (plate.mode !== "crate") continue;
      let on = false;
      crates.children.iterate((c) => {
        if (on) return true;
        const crate = c as Phaser.Physics.Arcade.Image;
        if (crate.active && overlap(crate, plate.sprite)) on = true;
        return true;
      });
      if (on && !plate.pressed) {
        plate.pressed = true;
        if (plate.sprite.scene.textures.exists(TEX.pressure_plate_on)) {
          plate.sprite.setTexture(TEX.pressure_plate_on);
        }
        this.setGatesOpen(plate.linkId, true, "crate");
      }
    }
  }

  private setGatesOpen(linkId: string, open: boolean, mode: "hold" | "crate"): void {
    for (const gate of this.gates) {
      if (gate.linkId !== linkId || gate.mode !== mode) continue;
      if (open === gate.open) continue;
      gate.open = open;
      const body = gate.sprite.body as Phaser.Physics.Arcade.StaticBody;
      if (open) {
        body.enable = false;
        gate.sprite.setVisible(false);
      } else {
        body.enable = true;
        gate.sprite.setVisible(true);
      }
    }
  }

  isGateBlocking(gate: GateState): boolean {
    return !gate.open;
  }

  gateColliderFilter(gate: GateState): boolean {
    return !gate.open;
  }
}
