// Способности персонажа (открываются по мере роста — это и есть метроидвания-гейтинг).
export type AbilityId = "doubleJump" | "dash" | "smash";

// Стадия роста (тамаготчи).
export interface GrowthStage {
  id: number;
  name: string;
  minPoints: number;
  scale: number; // только визуальный размер (не влияет на силу)
  jumpVelocity: number;
  moveSpeed: number;
  maxHp: number;
  stompDamage: number; // урон прыжком сверху
  ability: AbilityId | null;
}

// Тип цели ежедневного задания.
export type QuestType = "eat" | "kill" | "noDamage" | "smash";

// Одно ежедневное задание (с прогрессом).
export interface QuestState {
  id: string;
  type: QuestType;
  title: string;
  target: number;
  progress: number;
  reward: number; // очки роста за выполнение
  claimed: boolean;
}

// Набор заданий на конкретный день.
export interface DailyQuests {
  date: string; // YYYY-MM-DD
  items: QuestState[];
}

// Сохраняемый прогресс игрока.
export interface SaveData {
  version: number;
  growthPoints: number; // накопленные очки роста (тамаготчи) — не сбрасываются
  totalRuns: number;
  lastPromoDate: string | null; // YYYY-MM-DD последней выдачи промокода
  promosClaimedToday: number; // сколько промо выдано сегодня (макс. 5)
  promos: PromoRecord[];
  bestTimeMs: number | null;
  tutorialSeen: boolean;
  muted: boolean;
  quests: DailyQuests | null;
}

// Запись о выданном промокоде.
export interface PromoRecord {
  code: string;
  date: string; // YYYY-MM-DD
  reward: string; // человекочитаемое описание награды
  usedInStore: boolean; // отметка «активирован в магазине»
}

export type RoomTheme = "aisle" | "produce" | "dairy" | "checkout";

export type PuzzleType = "lever" | "plate" | "crate" | "patrol";

export interface PuzzleHint {
  rx: number;
  ry: number;
  type: PuzzleType;
  text: string;
}

// Один прямоугольный объект уровня (в пикселях).
export interface LevelObject {
  x: number;
  y: number;
  kind:
    | "food"
    | "enemy"
    | "crate"
    | "key"
    | "lever"
    | "door"
    | "gate"
    | "spike"
    | "exit"
    | "decor"
    | "pressurePlate";
  meta?: Record<string, number | string | boolean>;
}

// Результат генерации уровня.
export interface GeneratedLevel {
  seed: number;
  widthTiles: number;
  heightTiles: number;
  tiles: number[][];
  roomVariants: number[][];
  roomThemes: RoomTheme[][];
  mainPathRooms: string[];
  puzzleHints: PuzzleHint[];
  start: { x: number; y: number };
  objects: LevelObject[];
}

// Команды управления (абстракция над клавиатурой/тачем).
export interface InputState {
  moveDir: number; // -1..1
  jumpPressed: boolean; // фронт нажатия (один кадр)
  dashPressed: boolean;
  attackPressed: boolean;
  interactPressed: boolean;
}
