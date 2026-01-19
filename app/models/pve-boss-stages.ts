
export interface PVEBossStage {
  stageLevel: number;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    ap: number;
  };
  statMultipliers: {
    hp: number;
    atk: number;
    def: number;
    ap: number;
  };
  abilities: string[]; // Boss-specific abilities
  rewards: {
    itemId: string;
    chance: number; // Probability of dropping this item (0 to 1)
    quantity: number;
  }[];
  triggerCondition: {
    minWave: number;
    playerLevel?: number; // Optional player level condition
  };
}

export const pikachuBossStage: PVEBossStage = {
  stageLevel: 1,
  baseStats: {
    hp: 1000,
    atk: 50,
    def: 20,
    ap: 30,
  },
  statMultipliers: {
    hp: 1.1,
    atk: 1.05,
    def: 1.02,
    ap: 1.08,
  },
  abilities: ["ThunderShock", "QuickAttack"],
  rewards: [
    { itemId: "item_thunderstone", chance: 0.5, quantity: 1 },
    { itemId: "item_gold", chance: 1.0, quantity: 100 },
    { itemId: "item_exp_share", chance: 0.3, quantity: 1 },
  ],
  triggerCondition: {
    minWave: 5,
    playerLevel: 5,
  },
};
