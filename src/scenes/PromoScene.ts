import Phaser from "phaser";
import { GAME_W, GAME_H, COLORS } from "../config";
import { makeButton, drawSceneBackground } from "../systems/ui";
import { Music } from "../systems/Music";
import { saveSystem } from "../systems/SaveSystem";

export class PromoScene extends Phaser.Scene {
  private fromScene = "Menu";

  constructor() {
    super("Promo");
  }

  init(data: { from?: string }): void {
    this.fromScene = data?.from ?? "Menu";
  }

  create(): void {
    drawSceneBackground(this, COLORS.skyTop, COLORS.sky, 0.55);
    Music.play("menu");
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.add
      .text(GAME_W / 2, 70, "МОИ ПРОМОКОДЫ", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#ffd23f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const promos = saveSystem.get().promos;
    if (promos.length === 0) {
      this.add
        .text(
          GAME_W / 2,
          GAME_H / 2 - 40,
          "Пока пусто.\nПройди игру и получи\nпромокод за день!",
          {
            fontFamily: "system-ui, sans-serif",
            fontSize: "20px",
            color: "#c8d2e0",
            align: "center",
          }
        )
        .setOrigin(0.5);
    } else {
      this.renderList(promos);
    }

    makeButton(
      this,
      GAME_W / 2,
      GAME_H - 70,
      "НАЗАД",
      () => this.scene.start(this.fromScene),
      { fill: 0x3ad17a, width: 240 }
    );
  }

  private renderList(
    promos: ReturnType<typeof saveSystem.get>["promos"]
  ): void {
    const startY = 130;
    const rowH = 116;
    const maxRows = 5;
    const list = promos.slice(0, maxRows);

    list.forEach((p, i) => {
      const y = startY + i * rowH;
      const card = this.add.graphics();
      card.fillStyle(0x16223c, 0.95);
      card.fillRoundedRect(24, y, GAME_W - 48, rowH - 14, 14);
      card.lineStyle(2, p.usedInStore ? 0x4a5670 : 0xffd23f, 0.7);
      card.strokeRoundedRect(24, y, GAME_W - 48, rowH - 14, 14);

      this.add.text(40, y + 14, p.code, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: p.usedInStore ? "#7e8aa0" : "#ffffff",
        fontStyle: "bold",
      });
      this.add.text(40, y + 48, p.reward, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#9ad9b0",
        wordWrap: { width: GAME_W - 120 },
      });
      this.add.text(40, y + 74, `получен: ${p.date}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#6e7a90",
      });

      // Кнопка копирования.
      makeButton(
        this,
        GAME_W - 120,
        y + 30,
        "Копировать",
        () => this.copyCode(p.code),
        { width: 150, height: 40, fontSize: 16, fill: 0x3ad17a }
      );

      // Отметка «активирован в магазине».
      makeButton(
        this,
        GAME_W - 120,
        y + 76,
        p.usedInStore ? "Активирован ✓" : "Отметить",
        () => {
          if (!p.usedInStore) {
            saveSystem.markPromoUsed(p.code);
            this.scene.restart();
          }
        },
        {
          width: 150,
          height: 40,
          fontSize: 15,
          fill: p.usedInStore ? 0x4a5670 : 0xffd23f,
          textColor: p.usedInStore ? "#c8d2e0" : "#0e1726",
        }
      );
    });

    if (promos.length > maxRows) {
      this.add
        .text(
          GAME_W / 2,
          startY + maxRows * rowH + 4,
          `…и ещё ${promos.length - maxRows}`,
          {
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            color: "#7e8aa0",
          }
        )
        .setOrigin(0.5);
    }
  }

  private copyCode(code: string): void {
    const flash = (msg: string) => {
      const t = this.add
        .text(GAME_W / 2, GAME_H - 130, msg, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          color: "#7ed957",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: t,
        alpha: 0,
        y: GAME_H - 160,
        duration: 1200,
        onComplete: () => t.destroy(),
      });
    };
    try {
      navigator.clipboard?.writeText(code);
      flash("Скопировано!");
    } catch {
      flash(code);
    }
  }
}
