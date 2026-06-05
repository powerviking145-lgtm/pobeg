import Phaser from "phaser";
import {
  DASH_SPEED,
  DASH_DURATION,
  ACCEL,
  DECEL,
  COYOTE_MS,
  JUMP_BUFFER_MS,
  TEX,
  playerStageFrameBase,
  playerTexForStage,
} from "../config";
import { GrowthSystem } from "../systems/GrowthSystem";
import { playerAnimKey, hasPlayerSheet } from "../systems/AnimationSystem";
import type { AbilityId, GrowthStage, InputState } from "../types";
import { Sfx } from "../systems/Sound";

export class Player extends Phaser.Physics.Arcade.Sprite {
  maxHp = 3;
  hp = 3;
  facing: 1 | -1 = 1;
  stompDamage = 1;

  private stageId = 0;
  private baseScale = 0.38;
  private jumpVelocity = 450;
  private moveSpeed = 190;
  private jumpsLeft = 1;
  isDashing = false;
  private dashUntil = 0;
  dashCooldownUntil = 0;
  private invulnUntil = 0;

  private attacking = false;
  private attackUntil = 0;

  private coyoteUntil = 0;
  private jumpBufferUntil = 0;

  abilities: Set<AbilityId> = new Set();
  onDashTrail?: (x: number, y: number, flipX: boolean) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const stage = GrowthSystem.currentStage();
    const tex = hasPlayerSheet(scene) ? TEX.player_sheet : playerTexForStage(stage.id);
    super(
      scene,
      x,
      y,
      tex,
      hasPlayerSheet(scene) ? playerStageFrameBase(stage.id) : 0
    );
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.applyGrowthStats(stage, true);
  }

  setAbilities(abilities: Set<AbilityId>): void {
    this.abilities = abilities;
  }

  /** Применить статы стадии: размер, прыжок, скорость, HP. */
  applyGrowthStats(stage: GrowthStage, fullHeal = false): void {
    const prevMax = this.maxHp;
    this.stageId = stage.id;
    this.baseScale = stage.scale;
    this.jumpVelocity = stage.jumpVelocity;
    this.moveSpeed = stage.moveSpeed;
    this.maxHp = stage.maxHp;
    this.stompDamage = stage.stompDamage;

    this.setScale(stage.scale);
    const base = playerStageFrameBase(stage.id);
    if (this.scene.textures.exists(TEX.player_sheet)) {
      this.setTexture(TEX.player_sheet, base);
    } else {
      const tex = playerTexForStage(stage.id);
      if (this.scene.textures.exists(tex)) this.setTexture(tex);
    }

    this.refreshHitbox();

    if (fullHeal) {
      this.hp = this.maxHp;
    } else if (stage.maxHp > prevMax) {
      this.hp = Math.min(this.hp + (stage.maxHp - prevMax), this.maxHp);
    } else {
      this.hp = Math.min(this.hp, this.maxHp);
    }
  }

  private refreshHitbox(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const s = this.baseScale;
    body.setSize(Math.round(28 * s), Math.round(40 * s));
    body.setOffset(Math.round(10 * s), Math.round(12 * s));
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil;
  }

  get isAttacking(): boolean {
    return this.attacking;
  }

  getDashCooldownRatio(time: number): number {
    const cdEnd = this.dashCooldownUntil;
    const cdStart = cdEnd - (DASH_DURATION + 350);
    if (time >= cdEnd) return 1;
    return Phaser.Math.Clamp((time - cdStart) / (cdEnd - cdStart), 0, 1);
  }

  getAttackRect(): Phaser.Geom.Rectangle {
    const w = 40 * this.scaleX;
    const h = 36 * this.scaleY;
    const x = this.facing === 1 ? this.x : this.x - w;
    const y = this.y - h;
    return new Phaser.Geom.Rectangle(x, y, w, h);
  }

  update(input: InputState, time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    if (onGround) this.coyoteUntil = time + COYOTE_MS;
    if (input.jumpPressed) this.jumpBufferUntil = time + JUMP_BUFFER_MS;

    if (this.isDashing && time >= this.dashUntil) {
      this.isDashing = false;
      body.setAllowGravity(true);
    }

    if (onGround) {
      this.jumpsLeft = this.abilities.has("doubleJump") ? 2 : 1;
    }

    if (!this.isDashing) {
      const targetVx = input.moveDir * this.moveSpeed;
      const vx = body.velocity.x;
      if (input.moveDir !== 0) {
        const next = Phaser.Math.Linear(
          vx,
          targetVx,
          Math.min(1, (ACCEL * this.scene.game.loop.delta) / 1000 / this.moveSpeed)
        );
        body.setVelocityX(next);
        this.facing = input.moveDir > 0 ? 1 : -1;
        this.setFlipX(this.facing === -1);
      } else {
        const sign = Math.sign(vx);
        const decel = (DECEL * this.scene.game.loop.delta) / 1000;
        const next = Math.abs(vx) <= decel ? 0 : vx - sign * decel;
        body.setVelocityX(next);
      }
    }

    if (time <= this.jumpBufferUntil && this.jumpsLeft > 0 && !this.isDashing) {
      body.setVelocityY(-this.jumpVelocity);
      body.setAllowGravity(true);
      this.jumpsLeft -= 1;
      this.jumpBufferUntil = 0;
      if (onGround || time <= this.coyoteUntil) {
        this.coyoteUntil = 0;
      }
      Sfx.jump();
    }

    if (
      input.dashPressed &&
      this.abilities.has("dash") &&
      !this.isDashing &&
      time >= this.dashCooldownUntil
    ) {
      this.isDashing = true;
      this.dashUntil = time + DASH_DURATION;
      this.dashCooldownUntil = time + DASH_DURATION + 350;
      this.invulnUntil = time + DASH_DURATION;
      body.setAllowGravity(false);
      body.setVelocityY(0);
      body.setVelocityX(this.facing * DASH_SPEED);
      Sfx.dash();
      this.onDashTrail?.(this.x, this.y, this.flipX);
    }

    if (input.attackPressed && !this.attacking) {
      this.attacking = true;
      this.attackUntil = time + 160;
      this.playAnim("attack", true);
    }
    if (this.attacking && time >= this.attackUntil) {
      this.attacking = false;
    }

    this.updateAnimation(onGround, body.velocity.x);
    this.setAlpha(this.isInvulnerable ? (Math.floor(time / 60) % 2 ? 0.4 : 1) : 1);
  }

  private updateAnimation(onGround: boolean, vx: number): void {
    if (this.attacking) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!onGround || body.velocity.y < -40) {
      this.setAirFrame();
    } else if (Math.abs(vx) > 30) {
      this.playAnim("run");
    } else {
      this.playAnim("idle");
    }
  }

  private setAirFrame(): void {
    if (!this.scene.textures.exists(TEX.player_sheet)) return;
    if (this.anims.isPlaying) this.anims.stop();
    this.setTexture(TEX.player_sheet, playerStageFrameBase(this.stageId) + 4);
  }

  private playAnim(state: "idle" | "run" | "jump" | "attack", force = false): void {
    const key = playerAnimKey(this.stageId, state);
    if (!this.scene.anims.exists(key)) return;
    if (!force && this.anims.currentAnim?.key === key && this.anims.isPlaying) return;
    this.play(key, true);
  }

  takeDamage(amount: number, fromX: number): boolean {
    if (this.isInvulnerable) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnUntil = this.scene.time.now + 900;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const knock = this.x < fromX ? -1 : 1;
    body.setVelocity(knock * 260, -260);
    return true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
