import firebase from "firebase/compat/app"
import "firebase/compat/auth"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { FIREBASE_CONFIG } from "../../../../../config"
import { throttle } from "../../../../../utils/function"
import { joinLobbyRoom } from "../../../game/lobby-logic"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { logIn, logOut } from "../../../stores/NetworkStore"
import EmailAuth from "./email-auth"  // Import new component

import "./login.css"

export default function Login() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const uid = useAppSelector((state) => state.network.uid)
  const displayName = useAppSelector((state) => state.network.displayName)
  const email = useAppSelector((state) => state.network.email)
  const [prejoining, setPrejoining] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [showEmailAuth, setShowEmailAuth] = useState(false)  // New state

  const preJoinLobby = throttle(async function prejoin() {
    setPrejoining(true)
    return joinLobbyRoom(dispatch, navigate)
      .then(() => navigate("/lobby"))
      .catch(() => setPrejoining(false))
  }, 1000)

  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG)
    
    // Enable persistence for maintaining login state
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log("Firebase persistence enabled")
      })
      .catch((error) => {
        console.error("Firebase persistence setup failed:", error)
      })
  }

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = firebase.auth().onAuthStateChanged((u) => {
      if (u) {
        console.log("User signed in:", u.email, u.uid)
        dispatch(logIn(u))
      } else {
        console.log("User not signed in")
      }
    })

    // Cleanup function
    return () => unsubscribe()
  }, [dispatch])

  const handleGoogleSignIn = async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider()
      await firebase.auth().signInWithPopup(provider)
    } catch (error) {
      console.error("Google sign-in failed:", error)
    }
  }

  const handleTwitterSignIn = async () => {
    try {
      const provider = new firebase.auth.TwitterAuthProvider()
      await firebase.auth().signInWithPopup(provider)
    } catch (error) {
      console.error("Twitter sign-in failed:", error)
    }
  }

  // Show email auth interface if requested
  if (showEmailAuth && !uid) {
    return <EmailAuth onCancel={() => setShowEmailAuth(false)} />
  }

  // Show login options if not signed in
  if (!uid) {
    return (
      <div id="play-panel">
        <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>
          Pokemon Auto Chess
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px", margin: "0 auto" }}>
          <button
            className="bubbly blue"
            onClick={handleGoogleSignIn}
            style={{ padding: "1rem" }}
          >
            🔍 Sign in with Google
          </button>

          <button
            className="bubbly red"
            onClick={() => setShowEmailAuth(true)}
            style={{ padding: "1rem" }}
          >
            ✉️ Sign in with Email
          </button>

          <button
            className="bubbly"
            onClick={handleTwitterSignIn}
            style={{ padding: "1rem", backgroundColor: "#1DA1F2" }}
          >
            🐦 Sign in with Twitter
          </button>
        </div>
      </div>
    )
  } else {
    return (
      <div id="play-panel">
        <p>
          {t("authenticated_as")}:{" "}
          <span title={`${displayName}${email ? ` (${email})` : ""}`}>
            {t("hover_to_reveal")}
          </span>
        </p>
        <ul className="actions">
          <li>
            <button
              className="bubbly green"
              onClick={preJoinLobby}
              disabled={prejoining}
            >
              {prejoining ? t("connecting") : t("join_lobby")}
            </button>
          </li>
          <li>
            <button
              className="bubbly red"
              disabled={prejoining || loggingOut}
              onClick={async () => {
                setLoggingOut(true)
                try {
                  await firebase.auth().signOut()
                  dispatch(logOut())
                } finally {
                  setLoggingOut(false)
                }
              }}
            >
              {loggingOut ? t("signing_out") : t("sign_out")}
            </button>
          </li>
        </ul>
      </div>
    )
  }

  // Show lobby join button if signed in
  return (
    <div id="play-panel">
      <p>
        {t("authenticated_as")}:{" "}
        <span title={displayName}>{displayName || "Anonymous"}</span>
      </p>
      <ul className="actions">
        <li>
          <button
            className="bubbly green"
            onClick={preJoinLobby}
            disabled={prejoining}
          >
            {prejoining ? t("connecting") : t("join_lobby")}
          </button>
        </li>
        <li>
          <button
            className="bubbly red"
            disabled={prejoining || loggingOut}
            onClick={async () => {
              setLoggingOut(true)
              try {
                await firebase.auth().signOut()
                dispatch(logOut())
              } finally {
                setLoggingOut(false)
              }
            }}
          >
            {loggingOut ? t("signing_out") : t("sign_out")}
          </button>
        </li>
      </ul>
    </div>
  )
}