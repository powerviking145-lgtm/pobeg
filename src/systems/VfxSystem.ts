import Phaser from "phaser";
import { TEX } from "../config";

// Визуальные эффекты: удар, hit-stop, вспышки.
export class VfxSystem {
  constructor(private scene: Phaser.Scene) {}

  slash(x: number, y: number, facing: 1 | -1): void {
    if (!this.scene.textures.exists(TEX.slash)) return;
    const s = this.scene.add
      .image(x + facing * 28, y - 28, TEX.slash)
      .setFlipX(facing === -1)
      .setScale(1.2)
      .setAlpha(0.9)
      .setDepth(20);
    this.scene.tweens.add({
      targets: s,
      alpha: 0,
      scaleX: facing * 1.6,
      scaleY: 1.6,
      duration: 140,
      onComplete: () => s.destroy(),
    });
  }

  hitStop(ms = 60, scale = 0.15): void {
    const prev = this.scene.time.timeScale;
    this.scene.time.timeScale = scale;
    this.scene.time.delayedCall(ms, () => {
      this.scene.time.timeScale = prev;
    });
  }

  enemyPop(target: Phaser.GameObjects.GameObject): void {
    this.scene.tweens.add({
      targets: target,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 180,
      ease: "Back.in",
      onComplete: () => target.destroy(),
    });
  }

  gateOpen(sprite: Phaser.GameObjects.GameObject): void {
    this.scene.tweens.add({
      targets: sprite,
      y: "-=96",
      alpha: 0,
      duration: 400,
      ease: "Cubic.in",
      onComplete: () => sprite.destroy(),
    });
  }

  leverPull(sprite: Phaser.GameObjects.GameObject): void {
    const img = sprite as Phaser.GameObjects.Image;
    this.scene.tweens.add({
      targets: img,
      angle: img.angle === 0 ? -28 : 0,
      duration: 200,
      ease: "Back.out",
    });
  }

  crateShards(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const shard = this.scene.add
        .rectangle(x, y - 20, 8, 8, 0xc08a4a)
        .setDepth(15);
      this.scene.tweens.add({
        targets: shard,
        x: x + Phaser.Math.Between(-40, 40),
        y: y - Phaser.Math.Between(10, 50),
        alpha: 0,
        angle: Phaser.Math.Between(0, 360),
        duration: 400,
        onComplete: () => shard.destroy(),
      });
    }
  }

  dashTrail(x: number, y: number, flipX: boolean, tint: number): void {
    const ghost = this.scene.add
      .sprite(x, y, TEX.player_sheet, 0)
      .setOrigin(0.5, 1)
      .setFlipX(flipX)
      .setTint(tint)
      .setAlpha(0.45)
      .setDepth(9);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 200,
      onComplete: () => ghost.destroy(),
    });
  }

  confetti(count = 40): void {
    const colors = [0x3ad17a, 0xffd23f, 0xe05a47, 0x7ed957, 0xffffff];
    const w = this.scene.scale.width;
    for (let i = 0; i < count; i++) {
      const c = Phaser.Math.RND.pick(colors);
      const p = this.scene.add
        .rectangle(Phaser.Math.Between(0, w), -10, 8, 12, c)
        .setDepth(50);
      this.scene.tweens.add({
        targets: p,
        y: this.scene.scale.height + 20,
        x: p.x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(0, 720),
        duration: Phaser.Math.Between(1200, 2200),
        delay: Phaser.Math.Between(0, 400),
        onComplete: () => p.destroy(),
      });
    }
  }
}
