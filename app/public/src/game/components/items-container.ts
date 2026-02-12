import { ArraySchema, SetSchema } from "@colyseus/schema"
import { GameObjects } from "phaser"
import { getNightmareItemSlotLimit } from "../../../../models/nightmare"
import Player from "../../../../models/colyseus-models/player"
import { Item } from "../../../../types/enum/Item"
import { values } from "../../../../utils/schemas"
import { DEPTH } from "../depths"
import GameScene from "../scenes/game-scene"
import ItemContainer from "./item-container"

export default class ItemsContainer extends GameObjects.Container {
  scene: GameScene
  pokemonId: string | null
  playerId: string
  items: Item[] = []

  constructor(
    scene: GameScene,
    inventory: SetSchema<Item> | ArraySchema<Item>,
    x: number,
    y: number,
    pokemonId: string | null,
    playerId: string
  ) {
    super(scene, x, y)
    this.scene = scene
    this.pokemonId = pokemonId
    this.playerId = playerId
    this.setDepth(DEPTH.POKEMON_ITEM)
    scene.add.existing(this)
    this.render(inventory)
  }

  render(inventory: SetSchema<Item> | ArraySchema<Item>) {
    this.removeAll(true)

    const itemSize = this.pokemonId === null ? 70 : 25
    const itemsPerColumn = this.pokemonId === null ? 6 : 3
    const xDirection = this.pokemonId === null ? -1 : 1
    const items = values(inventory)
    let itemSlotLimit: number | null = null
    if (this.pokemonId) {
      const boardPokemon = this.scene.room?.state.players
        .get(this.playerId)
        ?.board.get(this.pokemonId)
      itemSlotLimit = getNightmareItemSlotLimit(boardPokemon?.nightmareReward)
    }

    this.items = []
    const renderedItems =
      itemSlotLimit == null ? items : items.slice(0, itemSlotLimit)
    renderedItems.forEach((item, i) => {
      this.items.push(item)
      const x = xDirection * itemSize * Math.floor(i / itemsPerColumn)
      const y = (i % itemsPerColumn) * itemSize
      this.add(
        new ItemContainer(this.scene, x, y, item, this.pokemonId, this.playerId)
      )
    })
  }

  closeTooltips() {
    for (let i = 0; i < this.list.length; i++) {
      const it = <ItemContainer>this.list[i]
      it.closeDetail()
    }
  }

  setPlayer(player: Player) {
    this.playerId = player.id
    this.render(player.items)
  }

  updateCount(item: Item, count: number) {
    for (let i = 0; i < this.list.length; i++) {
      const it = <ItemContainer>this.list[i]
      if (it.name === item) {
        it.updateCount(count)
      }
    }
  }
}
