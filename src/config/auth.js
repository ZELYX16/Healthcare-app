import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged, onIdTokenChanged as firebaseOnIdTokenChanged } from 'firebase/auth';
import { app } from './firebase';

// Get the Auth instance
const auth = getAuth(app);

export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}

export function onIdTokenChanged(callback) {
  return firebaseOnIdTokenChanged(auth, callback);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();

  try {
    await signInWithPopup(auth, provider);
    console.log("Signed in with Google successfully!");
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    const email = error.customData?.email;
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Error signing in with Google:", errorMessage, "Code:", errorCode, "Email:", email, "Credential:", credential);
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    console.log("Signed out successfully!");
  } catch (error) {
    console.error("Error signing out:", error);
  }
}
