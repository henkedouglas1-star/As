import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  UserCredential,
} from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoaded: boolean;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfileData: (profile: UserProfile) => void;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setAuthInitialized(true);
        } else {
          setUser(null);
          setProfile(null);
          setAuthInitialized(true);
          setProfileLoaded(true);
        }
      },
      (error) => {
        console.error('[Firebase Auth] onAuthStateChanged error:', error);
        setUser(null);
        setProfile(null);
        setAuthInitialized(true);
        setProfileLoaded(true);
      }
    );

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore profile listener when authenticated user is present
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }

    setProfileLoaded(false);
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setProfileLoaded(true);
      },
      (error) => {
        console.warn('[Firebase Firestore] Profile sync warning:', error);
        // Even if Firestore has a network hiccup, mark profileLoaded so UI doesn't hang
        setProfileLoaded(true);
      }
    );

    return () => unsubscribeProfile();
  }, [user]);

  // Real Google Sign-in via Firebase Auth (no synthetic demo accounts or silent swallowing)
  const signInWithGoogle = async (): Promise<UserCredential> => {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('[Google Popup Sign-In Error]:', err);
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    setProfileLoaded(true);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Signout complete:', err);
    }
  };

  const setProfileData = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
    }
    return null;
  };

  // The application is loading until Firebase Auth has initialized AND
  // if an active user exists, their Firestore profile has been checked.
  const loading = !authInitialized || (Boolean(user) && !profileLoaded);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoaded,
        signInWithGoogle,
        logout,
        signOut: logout,
        setProfileData,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
