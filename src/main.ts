import Phaser from "phaser";
import { GAME_W, GAME_H, GRAVITY_Y } from "./config";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";
import { WinScene } from "./scenes/WinScene";
import { LevelClearScene } from "./scenes/LevelClearScene";
import { PromoScene } from "./scenes/PromoScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#0e1726",
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    keyboard: true,
    activePointers: 3,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, LevelClearScene, WinScene, PromoScene],
};

const game = new Phaser.Game(config);
// Доступ к игре из консоли (отладка).
(window as unknown as { game: Phaser.Game }).game = game;
