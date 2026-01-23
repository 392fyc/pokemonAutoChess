import React from "react"
import { useTranslation } from "react-i18next"
import { IDetailledPokemon } from "../../../../../models/mongo-models/bot-v2"
import { PkmIndex } from "../../../../../types/enum/Pokemon"
import PokemonPortrait from "../pokemon-portrait"

export default function TeamEditor(props: {
  board: IDetailledPokemon[]
  showBench?: boolean
  readOnly?: boolean
  handleEditorClick: (
    x: number,
    y: number,
    rightClick: boolean,
    itemIndex?: number
  ) => void
  handleDrop: (x: number, y: number, e: React.DragEvent) => void
}) {
  const { t } = useTranslation()
  const isReadOnly = props.readOnly === true

  function handleOnDragStart(e: React.DragEvent, p: IDetailledPokemon) {
    if (isReadOnly) return
    e.stopPropagation()
    e.dataTransfer.setData("text/plain", ["cell", p.x, p.y].join(","))
  }

  function handleOnDragOver(e: React.DragEvent) {
    if (isReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as HTMLElement
    target.classList.add("dragover")
  }

  function handleOnDragEnd(e: React.DragEvent) {
    if (isReadOnly) return
    e.stopPropagation()
    const target = e.target as HTMLElement
    target.classList.remove("dragover")
  }

  function handleDrop(x: number, y: number, e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isReadOnly) {
      handleOnDragEnd(e)
      return
    }
    props.handleDrop(x, y, e)
    handleOnDragEnd(e)
  }

  return (
    <div id="team-editor">
      <table>
        <tbody>
          {[3, 2, 1].map((y) => {
            return (
              <BoardRow
                key={"row" + y}
                y={y}
                board={props.board}
                readOnly={isReadOnly}
                handleEditorClick={props.handleEditorClick}
                handleDrop={handleDrop}
                handleOnDragStart={handleOnDragStart}
                handleOnDragOver={handleOnDragOver}
                handleOnDragEnd={handleOnDragEnd}
              />
            )
          })}
        </tbody>
      </table>
      {props.showBench && (
        <>
          <p>{t("bench")}</p>
          <table>
            <tbody>
              <BoardRow
                y={0}
                board={props.board}
                readOnly={isReadOnly}
                handleEditorClick={props.handleEditorClick}
                handleDrop={handleDrop}
                handleOnDragStart={handleOnDragStart}
                handleOnDragOver={handleOnDragOver}
                handleOnDragEnd={handleOnDragEnd}
              />
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function BoardRow(props: {
  y: number
  board: IDetailledPokemon[]
  readOnly?: boolean
  handleEditorClick: (
    x: number,
    y: number,
    rightClick: boolean,
    itemIndex?: number
  ) => void
  handleDrop: (x: number, y: number, e: React.DragEvent) => void
  handleOnDragStart: (e: React.DragEvent, p: IDetailledPokemon) => void
  handleOnDragOver: (e: React.DragEvent) => void
  handleOnDragEnd: (e: React.DragEvent) => void
}) {
  const {
    y,
    board,
    readOnly,
    handleEditorClick,
    handleOnDragStart,
    handleOnDragOver,
    handleOnDragEnd
  } = props
  const isReadOnly = readOnly === true

  function handleDrop(x: number, y: number, e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    props.handleDrop(x, y, e)
    handleOnDragEnd(e)
  }

  return (
            <tr key={"row" + y}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((x) => {
        const p = board.find((p) => p.x === x && p.y === y)
        return (
          <td
            key={"row" + y + "-col" + x}
            onClick={
              isReadOnly
                ? undefined
                : (e) => {
                    e.preventDefault()
                    handleEditorClick(x, y, false)
                  }
            }
            onContextMenu={
              isReadOnly
                ? undefined
                : (e) => {
                    e.preventDefault()
                    handleEditorClick(x, y, true)
                  }
            }
            onDragOver={isReadOnly ? undefined : handleOnDragOver}
            onDragLeave={isReadOnly ? undefined : handleOnDragEnd}
            onDrop={isReadOnly ? undefined : (e) => handleDrop(x, y, e)}
          >
            {p && (
              <div
                draggable={!isReadOnly}
                onDragStart={(e) => handleOnDragStart(e, p)}
              >
                <PokemonPortrait
                  portrait={{
                    index: PkmIndex[p.name],
                    shiny: p.shiny,
                    emotion: p.emotion
                  }}
                />
                {p.items && (
                  <div className="pokemon-items">
                    {p.items.map((it, j) => {
                      return (
                        <img
                          key={j}
                          src={"assets/item/" + it + ".png"}
                          onContextMenu={
                            isReadOnly
                              ? undefined
                              : (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleEditorClick(x, y, true, j)
                                }
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </td>
        )
      })}
    </tr>
  )
}
