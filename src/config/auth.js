import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged, onIdTokenChanged as firebaseOnIdTokenChanged } from 'firebase/auth';
import { app } from './firebase'; // Import your initialized Firebase app instance

// Get the Auth instance
const auth = getAuth(app);

// --- Authentication State Observers ---
// Use onAuthStateChanged to subscribe to user changes (login/logout)
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}

// Use onIdTokenChanged to subscribe to ID token changes (useful for server-side auth)
export function onIdTokenChanged(callback) {
  return firebaseOnIdTokenChanged(auth, callback);
}

// --- Sign-In Function ---
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider(); // Create a new Google Auth provider instance

  try {
    // Sign in using a pop-up window
    await signInWithPopup(auth, provider);
    console.log("Signed in with Google successfully!");
  } catch (error) {
    // Handle errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.customData?.email;
    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Error signing in with Google:", errorMessage, "Code:", errorCode, "Email:", email, "Credential:", credential);
    // You might want to display a user-friendly error message in your UI
  }
}

// --- Sign-Out Function ---
export async function signOut() {
  try {
    await firebaseSignOut(auth); // Sign out the current user
    console.log("Signed out successfully!");
  } catch (error) {
    console.error("Error signing out:", error);
  }
}
