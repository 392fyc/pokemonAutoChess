# Economic and Roguelike System Design Proposals

## Economic System Proposals

### Solution 1: Dynamic Interest & Tiered Gold Rewards

**Concept:** Introduce more granular and strategic income generation beyond simple linear interest, allowing players to choose between investing heavily in their economy or prioritizing immediate board strength.

**Mechanics:**
*   **Tiered Interest**: Replace the current `floor(money / 10)` capped at 5 with tiered interest breakpoints.
    *   1-9 Gold: 0 Interest
    *   10-19 Gold: +1 Interest
    *   20-29 Gold: +2 Interest
    *   30-39 Gold: +3 Interest
    *   40-49 Gold: +4 Interest
    *   50+ Gold: +5 Interest (Can be extended to 60+ for +6 Interest, etc., for higher risk/reward).
    *   This encourages players to accumulate gold to hit specific thresholds for increased passive income.
*   **Win/Loss Streak Multiplier for All Gold**: Enhance the existing streak rewards by applying a small multiplier to *all* gold received (base income + interest) based on streak length.
    *   E.g., 3-4 streak: 1.1x gold; 5-6 streak: 1.2x gold; 7+ streak: 1.3x gold.
    *   This makes maintaining streaks significantly more rewarding economically, creating a strong incentive for early game dominance or strategic losing.
*   **"Economic Gamble" Special Rule**: Introduce a new `SpecialGameRule` that temporarily modifies economic parameters for a few rounds.
    *   Example: For 2-3 rounds, "Double Interest, No Streak Gold" or "Half Interest, Double Streak Gold." This forces players to adapt their economic strategy mid-game.

**Player Utilization:**
*   Players will constantly make decisions: hold gold to reach the next interest tier or spend to strengthen the board and maintain a streak.
*   Risk-averse players might prioritize reaching 50+ gold for consistent maximum interest. Aggressive players might sacrifice early interest to secure and extend win streaks for amplified income.
*   The "Economic Gamble" rule creates high-stakes decision points where players must decide whether to lean into the bonus (e.g., stack gold during double interest) or play against its benefits (e.g., aggressively reroll to maintain a streak despite no streak gold).

**Implementation Notes:**
*   Modify `computeIncome` in `E:/PokeAutoChess/pokemonAutoChess/app/rooms/commands/game-commands.ts` to incorporate tiered interest calculations and streak-based gold multipliers.
*   Add new entries to the `SpecialGameRule` enum in `E:/PokeAutoChess/pokemonAutoChess/app/types/Config.ts` (or a dedicated enum file if created) for "Economic Gamble" rules. Logic for these rules would be applied within `computeIncome` or in the `updatePlayerBetweenStages` hook in `game-commands.ts`.
*   Update `GameStateStore` in `E:/PokeAutoChess/pokemonAutoChess/app/public/src/stores/GameStore.ts` to display the current interest tier, streak multiplier status, and active "Economic Gamble" rule to the player.

### Solution 2: Resource Choice Rounds

**Concept:** At specific `TOWN` stages, players are presented with a high-impact choice between different resource types (gold, experience, items, buffs) that can significantly alter their game plan. This is inspired by "Hextech Augments" but focused on fundamental resources.

**Mechanics:**
*   **Choice Event Trigger**: Integrate new "Resource Choice" phases into or in alternation with existing `ItemCarouselStages` or `PortalCarouselStages` defined in `E:/PokeAutoChess/pokemonAutoChess/app/types/Config.ts`. These would occur at less frequent, key stages (e.g., stages 5, 10, 15).
*   **Player Choices**: Players are presented with 2-3 randomly generated options and must select one. Examples of choices:
    *   **Gold Spurt**: Gain a substantial amount of immediate gold (e.g., 10-20 gold).
    *   **Experience Surge**: Gain a significant amount of experience points (e.g., equivalent to 1-2 levels, or a fixed amount that puts them close to the next level).
    *   **Item Component Pouch**: Receive a small collection of random basic item components (e.g., 3-5).
    *   **Shop Refresh Scroll**: Gain 3-5 free shop rerolls for the upcoming rounds.
    *   **Temporary Global Buff**: All player's Pokemon gain a temporary stat boost (e.g., +5 Attack for the next 2 rounds, or +10% HP for the next combat).
*   **Limited & Strategic Choices**: The choices are powerful and appear less frequently than standard item carousels, forcing strategic thinking.

**Player Utilization:**
*   Players will make high-impact decisions based on their current board strength, economic needs, and long-term strategy.
*   Players who are behind might use "Gold Spurt" or "Experience Surge" to quickly catch up. Players with a strong board might opt for "Item Component Pouch" to complete powerful items or a "Temporary Global Buff" to press their advantage.
*   These choices introduce dynamic pivot points in the game, similar to TFT's augments, but focused on core resources, allowing for more flexible adaptation to game state.

**Implementation Notes:**
*   Define new stage types or extend existing `PortalCarouselStages` in `E:/PokeAutoChess/pokemonAutoChess/app/types/Config.ts` to designate "Resource Choice" stages.
*   Implement a new command class (e.g., `OnChooseResourceCommand`) that handles player selection and applies the chosen resource effect in `E:/PokeAutoChess/pokemonAutoChess/app/rooms/commands/game-commands.ts`.
*   The `OnUpdatePhaseCommand` in `game-commands.ts` would be responsible for generating the random resource choices when a "Resource Choice" stage is triggered.
*   Update `GameStateStore` in `E:/PokeAutoChess/pokemonAutoChess/app/public/src/stores/GameStore.ts` to display the available resource choices to the player.

---

## Roguelike System Proposals

### Solution 3: Hex/Augment System

**Concept:** At specific "TOWN" stages, players are offered game-altering "Augments" that provide powerful, persistent buffs or unique strategic advantages for the rest of the game, similar to TFT's Hextech Augments.

**Mechanics:**
*   **Augment Carousel Stages**: Introduce new `PortalCarouselStages` specifically designated as "Augment Stages." These would occur at less frequent, high-impact stages (e.g., Stage 3, 6, 9, 12).
*   **Augment Pool**: A diverse pool of augments, categorized for strategic depth:
    *   **Economic Augments**: "Lucky Streak" (gain +1 gold for every 3 gold spent on shop rerolls), "Investor's Insight" (maximum interest increased by 2, or interest earned at 8 gold intervals instead of 10).
    *   **Combat Augments**: "Battle Fury" (all Pokemon gain +10% Attack Damage on their first attack each combat), "Last Stand" (your last surviving Pokemon gains massive stats when below 20% HP).
    *   **Utility Augments**: "Swift Scout" (gain +1 shop slot permanently), "Component Crafter" (item components have a small chance to drop an additional copy after PVE rounds).
    *   **Unique Unit Augments**: "Chosen One" (one specific Pokemon type appears more frequently in your shop for the rest of the game), "Synergy Specialist" (gain +1 level to a chosen synergy).
*   **Player Choice**: Similar to `ItemCarouselStages`, players pick one augment from a limited selection (e.g., 3 random augments). Augments are permanent for the game.

**Player Utilization:**
*   Players will make fundamental strategic decisions by building their team compositions and overall game plan around their chosen augments, creating unique and highly replayable runs.
*   An early economic augment could enable a "fast 9" strategy, while a strong combat augment might encourage an aggressive mid-game push to secure wins and snowball.
*   Augments provide a strong sense of progression, identity, and power fantasy for each game, making each playthrough feel distinct.

**Implementation Notes:**
*   Define a new `Augment` enum/interface in `E:/PokeAutoChess/pokemonAutoChess/app/types/Config.ts` to list available augments and their associated effects.
*   Add new `Stage` types or extend `PortalCarouselStages` in `E:/PokeAutoChess/pokemonAutoChess/app/types/Config.ts` to trigger augment selection.
*   Implement an `OnChooseAugmentCommand` in `E:/PokeAutoChess/pokemonAutoChess/app/rooms/commands/game-commands.ts` to apply the chosen augment's persistent effects. Effects can be handled via modifications to `updatePlayerBetweenStages`, shop generation logic, combat calculations, or other relevant game systems.
*   New, more complex effects might require additions to `app/core/effects/effect.ts` and related effect handler files.
*   Update `GameStateStore` in `E:/PokeAutoChess/pokemonAutoChess/app/public/src/stores/GameStore.ts` to display chosen augments and the current selection options to the player.

### Solution 4: Elite PVE Encounters & Wandering Bosses

**Concept:** Introduce more varied and challenging PVE encounters with unique mechanics and high-value rewards, going beyond simple `PVEStages`, fostering adaptation and strategic team building for specific threats.

**Mechanics:**
*   **"Boss" PVE Stages**: Designate specific `PVEStages` (e.g., every 5th stage) as "Boss" stages. These encounters would feature a single, powerful Pokemon or a unique set of abilities and environmental effects.
    *   Example: A "Raid Boss" Snorlax with massive HP and an ability that puts your frontline to sleep. Or a "Shifty" Zoroark that frequently swaps positions with your backline units.
    *   Bosses could have unique synergies or `SpecialGameRule` effects active during their fight.
*   **Dynamic Wandering Elite Pokemon**: Expand `spawnWanderingPokemons` (`E:/PokeAutoChess/pokemonAutoChess/app/rooms/commands/game-commands.ts:1912`) to include "Elite Wanderers" with special properties, increased difficulty, and unique, high-value drops.
    *   Example: A "Shiny Gimmighoul" that is hard to defeat but drops a significant amount of gold or a unique item component.
    *   "Corrupted Wanderer" that applies a debuff (e.g., -10% Attack) to your entire team if not defeated quickly, but grants a powerful temporary team buff (e.g., +15% HP for next combat) if beaten within a turn limit.
*   **Strategic Reward Choices**: Upon defeating a "Boss" or "Elite Wanderer", players get to choose from a selection of rewards, often more impactful than standard PVE drops.
    *   Guaranteed Rare Item Drop.
    *   Substantial Gold Reward (e.g., 20+ gold).
    *   Experience for all active Pokemon (e.g., all current board Pokemon gain 100 EXP).
    *   Unique "Boss Item" or "Wanderer Charm" that grants a specific powerful, often temporary or consumable, buff.

**Player Utilization:**
*   Players will need to adapt their team compositions and itemization specifically for boss encounters. This adds a new layer of strategic planning where players might scout upcoming PVE stages and pivot their builds.
*   Deciding whether to take risks to defeat an "Elite Wanderer" for a potentially game-changing high reward versus playing safe would be a key strategic choice.
*   The reward choices after a successful boss/elite encounter allow players to further customize their run based on their immediate needs (economy, items, experience).

**Implementation Notes:**
*   Extend `PVEStages` in `E:/PokeAutoChess/pokemonAutoChess/app/types/Config.ts` to define properties for "Boss" stages (e.g., `isBoss: true`, `bossPokemon: Pkm.SNORLAX`, `bossAbilities: [Ability.SLEEP_POWDER]`).
*   Modify `spawnWanderingPokemons` in `E:/PokeAutoChess/pokemonAutoChess/app/rooms/commands/game-commands.ts` to randomly spawn "Elite Wanderers" with special flags, increased stats, and unique drop tables.
*   Implement specific combat logic and AI for bosses/elite wanderers with unique abilities within the game simulation.
*   Add reward selection logic after PVE victories, possibly reusing or adapting the `OnChooseResourceCommand` or similar command for specialized rewards.
*   Update `GameStateStore` in `E:/PokeAutoChess/pokemonAutoChess/app/public/src/stores/GameStore.ts` to display boss health, wanderer special properties, and reward choices to the player.
