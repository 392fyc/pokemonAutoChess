import { Item, ShinyItems, TownItems } from "./enum/Item"

export const CHAMELEON_SHOP_STAGE = 21
export const CHAMELEON_REFRESH_COST = 2

export function getChameleonShopPrice(item: Item): number {
  if ((ShinyItems as Item[]).includes(item)) return 20
  if ((TownItems as Item[]).includes(item)) return 5
  return 10
}
