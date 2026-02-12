import "dotenv/config"
import { Encoder } from "@colyseus/schema"
import { HttpProxyAgent } from "http-proxy-agent"
import { HttpsProxyAgent } from "https-proxy-agent"
import http from "node:http"
import https from "node:https"
/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to host your server on Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually
 * instantiate a Colyseus Server as documented here:
 *
 * See: https://docs.colyseus.io/server/api/#constructor-options
 */
import { listen } from "@colyseus/tools"
import { logger, matchMaker } from "colyseus"
import { CronJob } from "cron"
import app from "./app.config"
import { initializeMetrics } from "./metrics"
import { initCronJobs } from "./services/cronjobs"
import { fetchLeaderboards } from "./services/leaderboard"
import { fetchMetaReports } from "./services/meta"

/*
Changed buffer size to 512kb to avoid warnings from colyseus. We need to scale down the amount of data we're sending so it gets sent in multiple packets or increase the buffer size even more.
I think the buffer size is a bit of a sanity check, the only time I've really seen it needed is if you have infra requirements for buffer sizes, for instance working with steamworks the max packet size is 512kb
 */
Encoder.BUFFER_SIZE = 512 * 1024

function normalizeProxyEnv() {
  const proxy =
    process.env.CLASH_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy

  if (proxy) {
    if (!process.env.HTTP_PROXY) process.env.HTTP_PROXY = proxy
    if (!process.env.HTTPS_PROXY) process.env.HTTPS_PROXY = proxy
    if (!process.env.http_proxy) process.env.http_proxy = proxy
    if (!process.env.https_proxy) process.env.https_proxy = proxy
    try {
      ;(http as any).globalAgent = new HttpProxyAgent(proxy)
      ;(https as any).globalAgent = new HttpsProxyAgent(proxy)
      logger.info("[PROXY] Applied global proxy agent", { proxy })
    } catch (error) {
      logger.warn("[PROXY] Failed to apply global proxy agent", error)
    }
  }

  const defaults = ["127.0.0.1", "localhost", "::1"]
  const currentNoProxy = process.env.NO_PROXY || process.env.no_proxy || ""
  const noProxySet = new Set(
    currentNoProxy
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  )
  defaults.forEach((entry) => noProxySet.add(entry))
  const normalizedNoProxy = Array.from(noProxySet).join(",")
  process.env.NO_PROXY = normalizedNoProxy
  process.env.no_proxy = normalizedNoProxy
}

normalizeProxyEnv()

async function main() {
  if (process.env.NODE_APP_INSTANCE) {
    const processNumber = Number(process.env.NODE_APP_INSTANCE ?? "0")
    const port = (Number(process.env.PORT) ?? 2569) + processNumber
    initializeMetrics()
    await listen(app)
    if (port === 2569) {
      // only the first thread of the first instance will create the lobby and init cron jobs
      await matchMaker.createRoom("lobby", {})
      checkLobby()
      initCronJobs()
    }
  } else {
    await listen(app, process.env.PORT ? parseInt(process.env.PORT) : 9000)
    await matchMaker.createRoom("lobby", {})
    initCronJobs()
  }

  logger.info("Fetching leaderboards...")
  fetchLeaderboards()
  setInterval(() => fetchLeaderboards(), 1000 * 60 * 10) // refresh every 10 minutes
  logger.info("Fetching meta reports...")
  fetchMetaReports()
  setInterval(() => fetchMetaReports(), 1000 * 60 * 60 * 24) // refresh every 24 hours
}

function checkLobby() {
  logger.info("checkLobby cron job")
  CronJob.from({
    cronTime: "* * * * *",
    timeZone: "Europe/Paris",
    onTick: async () => {
      const lobbies = await matchMaker.query({ name: "lobby" })
      if (lobbies.length === 0) {
        logger.warn(
          `Lobby room has not been found, retrying 2 times before recreating...`
        )

        // Retry 2 times with 10 second wait between attempts
        let retryCount = 0
        const maxRetries = 2

        while (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10 seconds
          retryCount++

          const retriedLobbies = await matchMaker.query({ name: "lobby" })
          if (retriedLobbies.length > 0) {
            logger.info(`Lobby room found on retry attempt ${retryCount}`)
            return
          }
          logger.warn(
            `Retry attempt ${retryCount}/${maxRetries} failed, lobby still not found`
          )
        }

        logger.warn(
          `All retry attempts failed, automatically remaking lobby room`
        )
        matchMaker.createRoom("lobby", {})
      }
    },
    start: true
  })
}

main()
