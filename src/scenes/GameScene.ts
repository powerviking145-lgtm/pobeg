import Phaser from "phaser";
import { TILE, TEX, COLORS, GRAVITY_Y, GAME_W, GAME_H, ROOM_W, ROOM_H } from "../config";
import { PuzzleSystem } from "../systems/PuzzleSystem";
import { LevelGenerator } from "../systems/LevelGenerator";
import { InputSystem } from "../systems/InputSystem";
import { GrowthSystem } from "../systems/GrowthSystem";
import { saveSystem } from "../systems/SaveSystem";
import { Player } from "../entities/Player";
import { Enemy, type EnemyVariant } from "../entities/Enemy";
import { Sfx } from "../systems/Sound";
import { Music } from "../systems/Music";
import { Quests } from "../systems/Quests";
import { VfxSystem } from "../systems/VfxSystem";
import { makeFloatingLabel, makeButton, sharpenText } from "../systems/ui";
import { HUD_FONT, HUD_FONT_FAMILY, HUD_COLORS, HUD_LAYOUT } from "../systems/uiTheme";
import { getPromosClaimedToday } from "../systems/PromoSystem";
import type { GeneratedLevel, LevelObject, InputState, QuestType } from "../types";

interface TutorialStep {
  text: string;
}

export class GameScene extends Phaser.Scene {
  private controls!: InputSystem;
  private player!: Player;
  private level!: GeneratedLevel;

  private layer!: Phaser.Tilemaps.TilemapLayer;
  private enemies!: Phaser.Physics.Arcade.Group;
  private crates!: Phaser.Physics.Arcade.Group;
  private foods!: Phaser.Physics.Arcade.StaticGroup;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Phaser.Physics.Arcade.StaticGroup;
  private levers!: Phaser.Physics.Arcade.StaticGroup;
  private exitZone!: Phaser.Physics.Arcade.Image;

  private puzzles = new PuzzleSystem();

  private hasKey = false;
  private startPos = { x: 0, y: 0 };
  private runStartTime = 0;
  private won = false;
  private tookDamage = false;

  private tutorialSteps: TutorialStep[] = [];
  private tutorialIdx = 0;
  private tutorialText?: Phaser.GameObjects.Text;
  private tutorialBg?: Phaser.GameObjects.Graphics;
  private tutorialBtn?: Phaser.GameObjects.Container;
  private vfx!: VfxSystem;
  private lastTrailAt = 0;
  private levelIndex = 1;
  private chainSeed?: number;
  private leverHintShown = false;

  constructor() {
    super("Game");
  }

  init(data?: { levelIndex?: number; chainSeed?: number }): void {
    this.levelIndex = Math.max(1, data?.levelIndex ?? 1);
    this.chainSeed = data?.chainSeed;
  }

  create(): void {
    this.won = false;
    this.hasKey = false;
    this.tookDamage = false;
    this.puzzles = new PuzzleSystem();
    Quests.ensureToday();

    const seed =
      this.chainSeed ?? ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.chainSeed = undefined;
    this.leverHintShown = false;
    this.level = LevelGenerator.generate(seed);

    this.addBackdrop();
    this.buildTilemap();
    this.buildDecorLayer();
    this.puzzles.setHints(this.level.puzzleHints);
    this.createGroups();
    this.spawnObjects();
    this.createPlayer();
    this.setupColliders();
    this.setupCamera();

    this.controls = new InputSystem(this);
    this.vfx = new VfxSystem(this);
    this.runStartTime = this.time.now;
    Music.play("game");

    // HUD поверх сцены.
    this.scene.launch("UI");
    this.updateHud();
    this.setupTutorial();
    this.cameras.main.fadeIn(250, 0, 0, 0);

    saveSystem.incrementRuns();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      this.scene.stop("UI");
    });
  }

  private addBackdrop(): void {
    const sw = this.scale.width;
    const sh = this.scale.height;
    if (this.textures.exists(TEX.bg)) {
      this.add
        .image(sw / 2, sh / 2, TEX.bg)
        .setDisplaySize(sw, sh)
        .setScrollFactor(0)
        .setDepth(-100);
    }
    if (this.textures.exists(TEX.bg_mid)) {
      this.add
        .image(sw / 2, sh * 0.35, TEX.bg_mid)
        .setDisplaySize(sw, sh)
        .setScrollFactor(0.15)
        .setDepth(-95);
    }
    if (this.textures.exists(TEX.bg_fg)) {
      this.add
        .image(sw / 2, sh * 0.7, TEX.bg_fg)
        .setDisplaySize(sw, sh * 0.5)
        .setScrollFactor(0.35)
        .setDepth(-92);
    }
    const overlay = this.add.graphics().setScrollFactor(0).setDepth(-90);
    overlay.fillStyle(0x0e1726, 0.12);
    overlay.fillRect(0, 0, sw, sh);
  }

  private buildTilemap(): void {
    const map = this.make.tilemap({
      data: this.level.tiles,
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = map.addTilesetImage(TEX.tiles, TEX.tiles, TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tileset, 0, 0)!;
    this.layer.setCollisionByExclusion([-1]);

    const wPx = this.level.widthTiles * TILE;
    const hPx = this.level.heightTiles * TILE;
    this.physics.world.setBounds(0, 0, wPx, hPx);
  }

  private buildDecorLayer(): void {
    const themeAccent: Record<string, number> = {
      aisle: 0x3ad17a,
      produce: 0x7ed957,
      dairy: 0xa8d8f0,
      checkout: 0xffd23f,
    };
    const mainSet = new Set(this.level.mainPathRooms);
    for (let ry = 0; ry < this.level.roomThemes.length; ry++) {
      for (let rx = 0; rx < this.level.roomThemes[ry].length; rx++) {
        const key = `${rx},${ry}`;
        const onMain = mainSet.has(key);
        const theme = this.level.roomThemes[ry][rx];
        const ox = rx * ROOM_W;
        const oy = ry * ROOM_H;
        const accent = themeAccent[theme] ?? 0x3ad17a;

        if (onMain) {
          const band = this.add.graphics().setDepth(-2);
          band.fillStyle(accent, 0.12);
          band.fillRect((ox + 1) * TILE, (oy + 1) * TILE, (ROOM_W - 2) * TILE, 6);
          continue;
        }

        const band = this.add.graphics().setDepth(-2);
        band.fillStyle(accent, 0.1);
        band.fillRect((ox + 1) * TILE, (oy + 1) * TILE, (ROOM_W - 2) * TILE, 2 * TILE);

        if (this.textures.exists(TEX.shelf_wall)) {
          const midY = (oy + Math.floor(ROOM_H / 2) + 0.5) * TILE;
          this.add
            .image((ox + 2) * TILE, midY, TEX.shelf_wall)
            .setOrigin(0.5)
            .setDepth(-1)
            .setAlpha(0.58)
            .setScale(1);
          this.add
            .image((ox + ROOM_W - 2) * TILE, midY, TEX.shelf_wall)
            .setOrigin(0.5)
            .setFlipX(true)
            .setDepth(-1)
            .setAlpha(0.58)
            .setScale(1);
        }

        if (theme === "aisle" && (rx + oy) % 2 === 0) {
          this.spawnDust(ox, oy);
        }
        if (theme === "checkout") {
          this.spawnCheckoutGlint(ox, oy, accent);
        }
      }
    }
  }

  private spawnDust(ox: number, oy: number): void {
    if (!this.textures.exists(TEX.spark)) return;
    const px = (ox + ROOM_W / 2) * TILE;
    const py = (oy + ROOM_H / 2) * TILE;
    const p = this.add.particles(px, py, TEX.spark, {
      speed: { min: 4, max: 12 },
      angle: { min: 200, max: 340 },
      lifespan: 1200,
      scale: { start: 0.15, end: 0 },
      alpha: { start: 0.25, end: 0 },
      frequency: 900,
      quantity: 1,
      tint: 0xc8d2e0,
    });
    p.setDepth(-1);
  }

  private spawnCheckoutGlint(ox: number, oy: number, tint: number): void {
    const g = this.add.graphics().setDepth(0).setAlpha(0.15);
    g.fillStyle(tint, 0.35);
    g.fillRect((ox + 2) * TILE, (oy + 3) * TILE, (ROOM_W - 4) * TILE, 4);
    this.tweens.add({
      targets: g,
      alpha: { from: 0.08, to: 0.22 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });
  }

  private createGroups(): void {
    this.enemies = this.physics.add.group();
    this.crates = this.physics.add.group();
    this.foods = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.keys = this.physics.add.staticGroup();
    this.levers = this.physics.add.staticGroup();
  }

  private spawnObjects(): void {
    for (const obj of this.level.objects) {
      this.spawnObject(obj);
    }
  }

  private spawnObject(obj: LevelObject): void {
    switch (obj.kind) {
      case "food": {
        const f = this.foods.create(obj.x, obj.y, TEX.food) as Phaser.Physics.Arcade.Image;
        f.setOrigin(0.5, 1).refreshBody();
        this.tweens.add({
          targets: f,
          y: obj.y - 6,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
        break;
      }
      case "enemy": {
        const variant = (obj.meta?.variant as EnemyVariant) ?? "normal";
        const e = new Enemy(this, obj.x, obj.y, variant);
        this.enemies.add(e);
        break;
      }
      case "decor": {
        this.add
          .image(obj.x, obj.y, TEX.decor_sign)
          .setOrigin(0.5, 1)
          .setDepth(2)
          .setAlpha(0.85);
        break;
      }
      case "crate": {
        const c = this.crates.create(obj.x, obj.y, TEX.crate) as Phaser.Physics.Arcade.Image;
        c.setOrigin(0.5, 1);
        const body = c.body as Phaser.Physics.Arcade.Body;
        body.setSize(40, 40).setOffset(0, 0);
        body.setDragX(800);
        body.pushable = true;
        c.setData("kind", "crate");
        if (obj.meta?.puzzle && obj.meta?.linkId) {
          this.puzzles.registerCratePlate(c, String(obj.meta.linkId));
        }
        break;
      }
      case "key": {
        const k = this.keys.create(obj.x, obj.y, TEX.key) as Phaser.Physics.Arcade.Image;
        k.setOrigin(0.5, 1).refreshBody();
        this.tweens.add({
          targets: k,
          angle: 8,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
        break;
      }
      case "lever": {
        const l = this.levers.create(obj.x, obj.y, TEX.lever) as Phaser.Physics.Arcade.Image;
        l.setOrigin(0.5, 1).refreshBody();
        if (obj.meta?.linkId) {
          this.puzzles.registerLever(l, String(obj.meta.linkId));
        }
        break;
      }
      case "pressurePlate": {
        const tex = this.textures.exists(TEX.pressure_plate)
          ? TEX.pressure_plate
          : TEX.tiles;
        const p = this.physics.add.staticImage(obj.x, obj.y, tex);
        p.setOrigin(0.5, 1).refreshBody();
        const body = p.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(TILE - 4, 10);
        body.updateFromGameObject();
        const mode = obj.meta?.mode === "crate" ? "crate" : "hold";
        if (obj.meta?.linkId) {
          this.puzzles.registerPlate(p, String(obj.meta.linkId), mode);
        }
        break;
      }
      case "gate": {
        const sprite = this.physics.add.staticImage(obj.x, obj.y, TEX.gate);
        sprite.setOrigin(0.5, 1).refreshBody();
        const linkId = String(obj.meta?.linkId ?? "");
        const mode =
          obj.meta?.mode === "hold"
            ? "hold"
            : obj.meta?.mode === "crate"
              ? "crate"
              : "lever";
        this.puzzles.registerGate(sprite, linkId, mode);
        break;
      }
      case "spike": {
        const s = this.spikes.create(obj.x, obj.y, TEX.spike) as Phaser.Physics.Arcade.Image;
        s.setOrigin(0.5, 1);
        const body = s.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(TILE, 12);
        body.updateFromGameObject();
        break;
      }
      case "exit": {
        this.exitZone = this.physics.add.staticImage(obj.x, obj.y, TEX.exit);
        this.exitZone.setOrigin(0.5, 1).refreshBody();
        this.exitZone.setDepth(5);
        break;
      }
    }
  }

  private createPlayer(): void {
    this.startPos = { x: this.level.start.x, y: this.level.start.y };
    this.player = new Player(this, this.startPos.x, this.startPos.y);
    this.player.setAbilities(GrowthSystem.unlockedAbilities());
    const stage = GrowthSystem.currentStage();
    this.player.applyGrowthStats(stage, true);
    this.player.onDashTrail = (x, y, flip) => {
      this.vfx.dashTrail(x, y, flip, 0x7ed957);
    };
  }

  private setupColliders(): void {
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.crates, this.layer);
    this.physics.add.collider(this.crates, this.crates);
    this.physics.add.collider(this.player, this.crates);

    // Ворота (физический барьер, пока закрыты).
    for (const gate of this.puzzles.gates) {
      this.physics.add.collider(
        this.player,
        gate.sprite,
        undefined,
        () => this.puzzles.gateColliderFilter(gate),
        this
      );
    }

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onPlayerEnemy,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.foods,
      this.onEatFood,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.keys,
      this.onCollectKey,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.spikes,
      this.onSpike,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.exitZone,
      this.onReachExit,
      undefined,
      this
    );
  }

  private setupCamera(): void {
    const wPx = this.level.widthTiles * TILE;
    const hPx = this.level.heightTiles * TILE;
    const topHud = HUD_LAYOUT.topPanelH;
    const bottomHud = HUD_LAYOUT.bottomPanelH + HUD_LAYOUT.questPanelH;

    // Доп. прокрутка у краёв карты — ГГ остаётся между HUD-панелями, а не под ними.
    this.cameras.main.setBounds(0, -topHud, wPx, hPx + bottomHud);
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, (bottomHud - topHud) / 2);
    this.physics.world.gravity.y = GRAVITY_Y;
  }

  update(time: number): void {
    if (this.won) return;
    const input = this.controls.poll();

    // Игнорируем тап по верхней HUD-полосе (кнопки ☰/сердца), чтобы он не бил.
    if ((input.attackPressed || input.interactPressed) && this.controls.getLastTapY() < 120) {
      input.attackPressed = false;
      input.interactPressed = false;
    }
    const questStripTop = GAME_H - HUD_LAYOUT.questPanelH - HUD_LAYOUT.bottomPanelH;
    if ((input.attackPressed || input.interactPressed) && this.controls.getLastTapY() > questStripTop) {
      input.attackPressed = false;
      input.interactPressed = false;
    }

    // Визуальный отклик жестов.
    if (input.jumpPressed) this.gestureFeedback("↑", "#7ed957");
    if (input.dashPressed) this.gestureFeedback(this.player.flipX ? "«" : "»", "#ffd23f");

    this.updateTutorial(input);

    // Тап у рычага -> взаимодействие (а не удар).
    if (input.interactPressed) {
      const interacted = this.tryInteract();
      if (interacted) {
        input.attackPressed = false;
        input.interactPressed = false;
      }
    }

    this.player.update(input, time);

    if (this.player.isDashing && time - this.lastTrailAt > 50) {
      this.lastTrailAt = time;
      this.vfx.dashTrail(this.player.x, this.player.y, this.player.flipX, 0x7ed957);
    }

    if (input.attackPressed) {
      this.doAttack();
    }

    this.updateDangerMusic();

    this.puzzles.updatePlayerRoom(
      this,
      this.player.x,
      this.player.y,
      ROOM_W,
      ROOM_H,
      TILE
    );
    this.puzzles.updateHoldPlates(this.player, (a, b) =>
      this.physics.overlap(a, b)
    );
    this.puzzles.updateCratePlates(this.crates, (a, b) => this.physics.overlap(a, b));

    this.enemies.children.iterate((e) => {
      (e as Enemy).update(time);
      return true;
    });

    if (this.player.hp <= 0) {
      this.respawn();
    }

    this.updateHud();
  }

  private updateDangerMusic(): void {
    let near = this.player.hp <= 2;
    if (!near) {
      this.enemies.children.iterate((e) => {
        const en = e as Enemy;
        if (en.active && Phaser.Math.Distance.Between(en.x, en.y, this.player.x, this.player.y) < TILE * 4) {
          near = true;
        }
        return true;
      });
    }
    Music.setDanger(near);
  }

  private tryInteract(): boolean {
    let used = false;
    this.levers.children.iterate((l) => {
      const lever = l as Phaser.Physics.Arcade.Image;
      if (
        !used &&
        Phaser.Math.Distance.Between(
          lever.x,
          lever.y,
          this.player.x,
          this.player.y
        ) < TILE * 1.4
      ) {
        const linkId = this.puzzles.leverLinks.get(lever);
        if (linkId) {
          this.puzzles.toggleLever(linkId, lever, {
            leverPull: (o) => this.vfx.leverPull(o),
            gateOpen: (o) => this.vfx.gateOpen(o),
            burst: (x, y, c) => this.burst(x, y, c, 12),
          });
          Sfx.lever();
          if (!this.leverHintShown) {
            this.leverHintShown = true;
            this.floatText(
              this.player.x,
              this.player.y - 80,
              "F / тап — откроет ворота",
              "#c8d2e0"
            );
          }
          this.floatText(lever.x, lever.y - 50, "Щёлк!", "#ffd23f");
          used = true;
        }
      }
      return true;
    });
    return used;
  }

  private doAttack(): void {
    Sfx.attack();
    this.vfx.slash(this.player.x, this.player.y, this.player.facing);
    const rect = this.player.getAttackRect();
    this.enemies.children.iterate((e) => {
      const enemy = e as Enemy;
      if (!enemy.active) return true;
      if (Phaser.Geom.Rectangle.Overlaps(rect, enemy.getBounds())) {
        const dead = enemy.takeHit(1, this.player.x);
        if (dead) {
          Sfx.kill();
          this.vfx.hitStop(60);
          this.cameras.main.shake(80, 0.006);
          this.burst(enemy.x, enemy.y - 18, 0xe05a47);
          this.floatText(enemy.x, enemy.y - 30, "+3", "#7ed957");
          this.vfx.enemyPop(enemy);
          this.gainGrowth(3);
          this.questProgress("kill");
        } else {
          Sfx.hitEnemy();
        }
      }
      return true;
    });

    if (this.player.abilities.has("smash")) {
      this.crates.children.iterate((c) => {
        const crate = c as Phaser.Physics.Arcade.Image;
        if (!crate.active) return true;
        if (Phaser.Geom.Rectangle.Overlaps(rect, crate.getBounds())) {
          Sfx.smash();
          this.vfx.crateShards(crate.x, crate.y);
          this.burst(crate.x, crate.y - 16, 0xffd23f, 8);
          this.floatText(crate.x, crate.y - 20, "Бум!", "#ffd23f");
          crate.destroy();
          this.gainGrowth(1);
          this.questProgress("smash");
        }
        return true;
      });
    }
  }

  private onPlayerEnemy: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    enemyObj
  ) => {
    const enemy = enemyObj as Enemy;
    if (!enemy.active) return;
    // Прыжок сверху на врага = удар.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const stomping = body.velocity.y > 60 && this.player.y < enemy.y - 8;
    if (stomping) {
      const dead = enemy.takeHit(this.player.stompDamage, this.player.x);
      body.setVelocityY(-380);
      if (dead) {
        Sfx.kill();
        this.vfx.hitStop(50);
        this.cameras.main.shake(80, 0.006);
        this.burst(enemy.x, enemy.y - 18, 0xe05a47);
        this.floatText(enemy.x, enemy.y - 30, "+3", "#7ed957");
        this.vfx.enemyPop(enemy);
        this.gainGrowth(3);
        this.questProgress("kill");
      } else {
        Sfx.hitEnemy();
      }
    } else {
      if (this.player.takeDamage(1, enemy.x)) {
        Sfx.hurt();
        this.tookDamage = true;
        this.cameras.main.shake(120, 0.008);
      }
    }
  };

  private onEatFood: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    foodObj
  ) => {
    const food = foodObj as Phaser.Physics.Arcade.Image;
    if (!food.active) return;
    const fx = food.x;
    const fy = food.y;
    food.destroy();
    this.player.heal(1);
    Sfx.eat();
    this.burst(fx, fy - 16, 0x7ed957, 8);
    this.floatText(fx, fy - 20, "+2", "#7ed957");
    this.gainGrowth(2);
    this.questProgress("eat");
    this.updateHud();
  };

  private onCollectKey: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    keyObj
  ) => {
    const key = keyObj as Phaser.Physics.Arcade.Image;
    if (!key.active) return;
    key.destroy();
    this.hasKey = true;
    Sfx.key();
    this.floatText(this.player.x, this.player.y - 60, "Ключ найден!", "#ffd23f");
    this.updateHud();
  };

  private onSpike: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    spikeObj
  ) => {
    const spike = spikeObj as Phaser.Physics.Arcade.Image;
    if (this.player.takeDamage(1, spike.x)) {
      Sfx.hurt();
      this.tookDamage = true;
      this.cameras.main.shake(120, 0.008);
    }
  };

  private onReachExit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = () => {
    if (this.won) return;
    if (!this.hasKey) {
      this.floatText(
        this.exitZone.x,
        this.exitZone.y - 130,
        "Нужен ключ!",
        "#e05a47"
      );
      return;
    }
    this.win();
  };

  private questProgress(type: QuestType, amount = 1): void {
    const before = Quests.ensureToday().items.map((q) => ({
      id: q.id,
      progress: q.progress,
    }));
    const completed = Quests.addProgress(type, amount);
    const after = Quests.ensureToday().items;
    for (const a of after) {
      const b = before.find((x) => x.id === a.id);
      if (b && a.progress !== b.progress) {
        this.registry.set("questPulseId", a.id);
        break;
      }
    }
    for (const q of completed) {
      this.floatText(
        this.player.x,
        this.player.y - 100,
        `Задание: ${q.title} ✓ +${q.reward}`,
        "#ffd23f"
      );
      this.gainGrowth(q.reward);
    }
    this.updateHud();
  }

  private gainGrowth(points: number): void {
    const { newAbilities, leveledUp } = GrowthSystem.addPoints(points);
    if (leveledUp || newAbilities.length) {
      Sfx.levelUp();
    }
    if (leveledUp) {
      const stage = GrowthSystem.currentStage();
      this.player.applyGrowthStats(stage);
      this.player.setAbilities(GrowthSystem.unlockedAbilities());
      this.burst(this.player.x, this.player.y - 30, 0xffd23f, 16);
      this.floatText(
        this.player.x,
        this.player.y - 80,
        `Рост: ${stage.name}!`,
        "#ffd23f"
      );
      this.floatText(
        this.player.x,
        this.player.y - 108,
        GrowthSystem.statLine(stage),
        "#7ed957"
      );
    }
    if (newAbilities.length) {
      const names: Record<string, string> = {
        doubleJump: "Двойной прыжок!",
        dash: "Рывок!",
        smash: "Удар-разлом!",
      };
      newAbilities.forEach((a, i) => {
        this.floatText(
          this.player.x,
          this.player.y - 110 - i * 26,
          names[a] ?? a,
          "#7ed957"
        );
      });
    }
    this.updateHud();
  }

  private respawn(): void {
    this.player.hp = this.player.maxHp;
    this.player.isDashing = false;
    this.player.setPosition(this.startPos.x, this.startPos.y);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(true);
    this.cameras.main.flash(250, 40, 0, 0);
    this.floatText(this.startPos.x, this.startPos.y - 70, "Снова в путь!", "#c8d2e0");
    this.updateHud();
  }

  private win(): void {
    this.won = true;
    Sfx.win();
    const timeMs = this.time.now - this.runStartTime;
    saveSystem.recordBestTime(timeMs);
    if (!this.tookDamage) this.questProgress("noDamage");
    this.gainGrowth(10); // бонус за прохождение
    this.cameras.main.fade(600, 0, 0, 0);
    this.time.delayedCall(650, () => {
      this.scene.stop("UI");
      this.scene.start("LevelClear", { timeMs, levelIndex: this.levelIndex });
    });
  }

  private setupTutorial(): void {
    const force = this.registry.get("forceTutorial") === true;
    if (saveSystem.get().tutorialSeen && !force) return;
    this.registry.set("forceTutorial", false);

    this.tutorialSteps = [
      { text: "Идти: 1-й палец влево/вправо или ← → / A D" },
      { text: "Прыжок: 2-й палец свайп ↑ или Space / W" },
      {
        text: "Основной путь проходим сразу. Рост открывает секреты в боковых комнатах!",
      },
      {
        text: "У ключевой комнаты — плита. Тап у рычага в боковинках — взаимодействие.",
      },
    ];
    this.tutorialIdx = 0;

    this.tutorialBg = this.add.graphics().setScrollFactor(0).setDepth(40);
    this.tutorialText = sharpenText(
      this.add
        .text(GAME_W / 2, 340, "", {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: HUD_FONT.md,
          color: HUD_COLORS.primary,
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: GAME_W - 48 },
          stroke: HUD_COLORS.panel,
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(41)
    );
    this.tutorialBtn = makeButton(this, GAME_W / 2, 430, "ДАЛЕЕ", () =>
      this.advanceTutorial()
    ).setScrollFactor(0).setDepth(42);
    this.renderTutorial();
  }

  private advanceTutorial(): void {
    if (!this.tutorialText) return;
    this.tutorialIdx++;
    if (this.tutorialIdx >= this.tutorialSteps.length) {
      saveSystem.setTutorialSeen(true);
      this.tutorialText.destroy();
      this.tutorialBg?.destroy();
      this.tutorialBtn?.destroy();
      this.tutorialText = undefined;
      this.tutorialBg = undefined;
      this.tutorialBtn = undefined;
      this.floatText(this.player.x, this.player.y - 90, "Готово! Беги в магазин!", "#7ed957");
      return;
    }
    this.renderTutorial();
  }

  private renderTutorial(): void {
    if (!this.tutorialText || !this.tutorialBg) return;
    const step = this.tutorialSteps[this.tutorialIdx];
    const label = `Шаг ${this.tutorialIdx + 1}/${this.tutorialSteps.length}\n${step.text}`;
    this.tutorialText.setText(label);
    const b = this.tutorialText.getBounds();
    this.tutorialBg.clear();
    this.tutorialBg.fillStyle(0x0e1726, 0.82);
    this.tutorialBg.fillRoundedRect(b.x - 18, b.y - 14, b.width + 36, b.height + 28, 14);
    this.tutorialBg.lineStyle(2, 0xffd23f, 0.8);
    this.tutorialBg.strokeRoundedRect(b.x - 18, b.y - 14, b.width + 36, b.height + 28, 14);
  }

  private updateTutorial(_input: InputState): void {
    // Туториал продвигается кнопкой «Далее».
  }

  private burst(x: number, y: number, color: number, count = 10): void {
    const p = this.add.particles(x, y, TEX.spark, {
      speed: { min: 60, max: 200 },
      angle: { min: 0, max: 360 },
      lifespan: 420,
      scale: { start: 0.9, end: 0 },
      gravityY: 300,
      tint: color,
      emitting: false,
    });
    p.setDepth(55);
    p.explode(count, x, y);
    this.time.delayedCall(500, () => p.destroy());
  }

  private gestureFeedback(symbol: string, color: string): void {
    const t = this.add
      .text(this.player.x, this.player.y - 70, symbol, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: t,
      alpha: 0,
      scale: 1.6,
      duration: 350,
      onComplete: () => t.destroy(),
    });
  }

  private floatText(x: number, y: number, msg: string, color: string): void {
    const t = makeFloatingLabel(this, x, y, msg, color);
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  private updateHud(): void {
    const stage = GrowthSystem.currentStage();
    const { ratio } = GrowthSystem.progressToNext();
    const quests = Quests.ensureToday().items;
    this.registry.set("hud", {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      stageName: stage.name,
      stageStats: GrowthSystem.statLine(stage),
      puzzleHint: this.puzzles.currentHint,
      growthRatio: ratio,
      hasKey: this.hasKey,
      runTimeMs: this.time.now - this.runStartTime,
      dashCooldown: this.player.getDashCooldownRatio(this.time.now),
      hasDash: this.player.abilities.has("dash"),
      controlMode: this.controls.getActiveMode(),
      quests: quests.map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        progress: q.progress,
        target: q.target,
        claimed: q.claimed,
      })),
      bestTimeMs: saveSystem.get().bestTimeMs,
      levelIndex: this.levelIndex,
      promosToday: getPromosClaimedToday(),
      showControlsHint: saveSystem.get().totalRuns < 2,
      questPulseId: this.registry.get("questPulseId") as string | null,
    });
  }
}
