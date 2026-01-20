import firebase from "firebase/compat/app"
import "firebase/compat/auth"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import "./login.css"

interface EmailAuthProps {
  onCancel: () => void
}

export default function EmailAuth({ onCancel }: EmailAuthProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (mode === "register") {
        // Register new account
        const userCredential = await firebase
          .auth()
          .createUserWithEmailAndPassword(email, password)

        // Set display name
        if (userCredential.user) {
          await userCredential.user.updateProfile({ displayName })
          // Force refresh user info
          await userCredential.user.reload()
        }
        console.log("Registration successful")
      } else {
        // Login existing account
        await firebase.auth().signInWithEmailAndPassword(email, password)
        console.log("Login successful")
      }
    } catch (err: any) {
      console.error("Authentication error:", err)
      // User-friendly error messages
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("Email already in use. Please sign in instead.")
          setMode("login") // Switch to login mode
          break
        case "auth/invalid-email":
          setError("Invalid email format")
          break
        case "auth/user-not-found":
          setError("User not found. Please register first.")
          setMode("register") // Switch to register mode
          break
        case "auth/wrong-password":
          setError("Incorrect password")
          break
        case "auth/weak-password":
          setError("Password is too weak (minimum 6 characters)")
          break
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.")
          break
        default:
          setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    try {
      const provider = new firebase.auth.GoogleAuthProvider()
      await firebase.auth().signInWithPopup(provider)
      console.log("Google sign-in successful")
    } catch (err: any) {
      console.error("Google sign-in error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="email-auth-container" style={styles.container}>
      <h2 style={styles.title}>
        {mode === "login" ? "Sign In" : "Create Account"}
      </h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          style={styles.input}
          autoComplete="email"
        />

        {mode === "register" && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
            autoComplete="name"
          />
        )}

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          style={styles.input}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={6}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bubbly green"
          style={styles.button}
        >
          {loading
            ? "Loading..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login")
          setError("")
        }}
        disabled={loading}
        style={styles.switchButton}
      >
        {mode === "login"
          ? "Don't have an account? Register"
          : "Already have an account? Sign In"}
      </button>

      <div style={styles.divider}>
        <span>or</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="bubbly blue"
        style={styles.button}
      >
        🔍 Sign in with Google
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        style={styles.cancelButton}
      >
        Cancel
      </button>
    </div>
  )
}

// Inline styles
const styles = {
  container: {
    maxWidth: "400px",
    margin: "0 auto",
    padding: "2rem",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "8px"
  },
  title: {
    textAlign: "center" as const,
    marginBottom: "1.5rem",
    color: "white"
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem"
  },
  input: {
    padding: "0.8rem",
    fontSize: "1rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "white"
  },
  button: {
    width: "100%",
    padding: "0.8rem",
    fontSize: "1rem",
    cursor: "pointer"
  },
  switchButton: {
    marginTop: "1rem",
    padding: "0.5rem",
    background: "none",
    border: "none",
    color: "#4a9eff",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.9rem"
  },
  cancelButton: {
    marginTop: "0.5rem",
    padding: "0.5rem",
    background: "none",
    border: "none",
    color: "#999",
    cursor: "pointer",
    fontSize: "0.9rem"
  },
  divider: {
    margin: "1rem 0",
    textAlign: "center" as const,
    color: "#999"
  },
  error: {
    color: "#ff4444",
    fontSize: "0.9rem",
    margin: "0",
    padding: "0.5rem",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: "4px"
  }
}
