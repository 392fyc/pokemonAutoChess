import React from "react"
import { useTranslation } from "react-i18next"
import { getPortraitSrc } from "../../../../../utils/avatar"
import { Item } from "../../../../../types/enum/Item"
import { Pkm, PkmIndex } from "../../../../../types/enum/Pokemon"
import {
  CHAMELEON_REFRESH_COST,
  CHAMELEON_SHOP_STAGE,
  getChameleonShopPrice
} from "../../../../../types/chameleon-shop"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import {
  chameleonShopBuy,
  chameleonShopRefresh
} from "../../../stores/NetworkStore"
import { ItemDetailTooltip } from "../../../game/components/item-detail"
import { Money } from "../icons/money"
import { Tooltip } from "react-tooltip"
import "./game-chameleon-shop.css"

export default function GameChameleonShop() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const stageLevel = useAppSelector((state) => state.game.stageLevel)
  const items = useAppSelector((state) => state.game.chameleonShop)
  const money = useAppSelector((state) => state.game.money)
  const itemTooltipId = "chameleon-item-detail-tooltip"

  if (stageLevel < CHAMELEON_SHOP_STAGE) return null

  const slots: Array<Item | null> = [...items]
  while (slots.length < 3) slots.push(null)

  return (
    <div id="chameleon-shop" className="my-container">
      <div className="chameleon-shop-header">
        <img
          className="chameleon-shop-icon"
          src={getPortraitSrc(PkmIndex[Pkm.KECLEON])}
          alt="Kecleon"
        />
        <div className="chameleon-shop-title">Chameleon Shop</div>
        <button
          className="bubbly blue chameleon-refresh-button"
          disabled={money < CHAMELEON_REFRESH_COST}
          onClick={() => dispatch(chameleonShopRefresh())}
          type="button"
          data-tooltip-id="chameleon-refresh-tooltip"
          aria-label={t("refresh")}
        >
          <img src="/assets/ui/refresh.svg" alt="" />
        </button>
      </div>
      <div className="chameleon-shop-items">
        {slots.map((item, index) => {
          if (!item) {
            return (
              <div key={`empty-${index}`} className="chameleon-shop-item empty" />
            )
          }
          const price = getChameleonShopPrice(item)
          return (
            <button
              key={`${item}-${index}`}
              className="chameleon-shop-item"
              type="button"
              disabled={money < price}
              onClick={() => dispatch(chameleonShopBuy(index))}
              data-tooltip-id={itemTooltipId}
              data-tooltip-content={item}
            >
              <img src={`/assets/item/${item}.png`} alt={item} />
              <div className="chameleon-shop-item-info">
                <span className="chameleon-shop-item-name">
                  {t(`item.${item}`)}
                </span>
                <span className="chameleon-shop-item-price">{price}</span>
              </div>
            </button>
          )
        })}
      </div>
      <ItemDetailTooltip id={itemTooltipId} className="chameleon-item-tooltip" />
      <Tooltip
        id="chameleon-refresh-tooltip"
        className="custom-theme-tooltip"
        place="top"
      >
        <Money value={`${t("refresh")} ${CHAMELEON_REFRESH_COST}`} />
      </Tooltip>
    </div>
  )
}
