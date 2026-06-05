import Phaser from "phaser";

import { TEX } from "../config";



export type EnemyVariant = "normal" | "fast";



export class Enemy extends Phaser.Physics.Arcade.Sprite {

  hp = 2;

  variant: EnemyVariant = "normal";

  private dir: 1 | -1 = 1;

  private speed = 70;

  private nextFlip = 0;

  private hurtUntil = 0;



  constructor(scene: Phaser.Scene, x: number, y: number, variant: EnemyVariant = "normal") {

    super(scene, x, y, TEX.enemy);

    this.variant = variant;

    if (variant === "fast") {

      this.hp = 1;

      this.speed = 110;

      this.setTint(0xffaa88);

    }

    scene.add.existing(this);

    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);

    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setSize(34, 38);

    body.setOffset(9, 6);

    this.dir = Math.random() < 0.5 ? -1 : 1;

    this.setDepth(8);

    this.safePlayAnim("enemy_roll");

  }



  update(time: number): void {

    if (!this.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;



    if (time < this.hurtUntil) return;



    if (body.blocked.left) this.dir = 1;

    else if (body.blocked.right) this.dir = -1;

    if (time > this.nextFlip) {

      this.nextFlip = time + Phaser.Math.Between(1500, 3200);

      if (Math.random() < 0.35) this.dir = (-this.dir) as 1 | -1;

    }



    body.setVelocityX(this.dir * this.speed);

    this.setFlipX(this.dir === 1);

  }



  private safePlayAnim(key: string): void {
    if (!this.scene.anims.exists(key)) return;
    const anim = this.scene.anims.get(key);
    if (!anim?.frames?.length) return;
    this.play(key);
  }

  flashHit(): void {
    this.hurtUntil = this.scene.time.now + 120;
    this.setTint(0xffffff);
    this.safePlayAnim("enemy_hurt");
    this.scene.time.delayedCall(120, () => {
      if (!this.active) return;
      this.clearTint();
      if (this.variant === "fast") this.setTint(0xffaa88);
      this.safePlayAnim("enemy_roll");
    });
  }



  takeHit(amount: number, fromX: number): boolean {

    this.hp -= amount;

    this.flashHit();

    const body = this.body as Phaser.Physics.Arcade.Body;

    const knock = this.x < fromX ? -1 : 1;

    body.setVelocity(knock * 160, -180);

    return this.hp <= 0;

  }

}

