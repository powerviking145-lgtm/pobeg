import Phaser from "phaser";

import { TEX } from "../config";

import { createPlaceholderTextures } from "../systems/textures";

import { registerAnimations } from "../systems/AnimationSystem";

import { saveSystem } from "../systems/SaveSystem";

import { Music } from "../systems/Music";

import { Sfx } from "../systems/Sound";

import bgCityUrl from "../assets/bg_city.png";
import bgMidUrl from "../assets/bg_city_mid.png";
import bgFgUrl from "../assets/bg_city_fg.png";
import plateOffUrl from "../assets/plate_off.png";
import plateOnUrl from "../assets/plate_on.png";



export class BootScene extends Phaser.Scene {

  constructor() {

    super("Boot");

  }



  preload(): void {

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {

      // fallback на программную графику

    });



    this.load.image(TEX.bg, bgCityUrl);
    this.load.image(TEX.bg_mid, bgMidUrl);
    this.load.image(TEX.bg_fg, bgFgUrl);
    this.load.image(TEX.pressure_plate, plateOffUrl);
    this.load.image(TEX.pressure_plate_on, plateOnUrl);
  }



  create(): void {

    createPlaceholderTextures(this);

    registerAnimations(this);

    Music.init();

    Sfx.setMuted(saveSystem.get().muted);

    this.scene.start("Menu");

  }

}

