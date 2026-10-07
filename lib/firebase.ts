import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyB6mvjV1WEvnxADAuCK-a3yRVOYwsi-MBc",
  authDomain: "stampa-sur.firebaseapp.com",
  projectId: "stampa-sur",
  storageBucket: "stampa-sur.firebasestorage.app",
  messagingSenderId: "470058775709",
  appId: "1:470058775709:web:31d0eb5f01c26417e9d074",
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

export function firebaseErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'El email o la contraseña son incorrectos.',
    'auth/user-not-found': 'No encontramos una cuenta con ese email.',
    'auth/wrong-password': 'La contraseña es incorrecta.',
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-email': 'El email no es válido',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de completar el acceso.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití ventanas emergentes e intentá nuevamente.',
    'auth/operation-not-allowed': 'Este método de acceso todavía no está habilitado en Firebase Console.',
    'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisá tu conexión e intentá nuevamente.',
  }
  if (messages[code]) return messages[code]
  if (error instanceof Error && error.message) return error.message
  return 'Ocurrió un error. Intentá nuevamente.'
}