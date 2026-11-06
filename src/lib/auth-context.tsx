"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  sendPhoneSignInCode: (phoneNumber: string, containerId: string) => Promise<ConfirmationResult>;
  confirmPhoneSignInCode: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  signInWithPhonePassword: (phoneNumber: string, password: string) => Promise<void>;
  signUpWithPhone: (name: string, phoneNumber: string, password: string, confirmation: ConfirmationResult, code: string) => Promise<void>;
  resetPhonePassword: (phoneNumber: string, confirmation: ConfirmationResult, code: string, newPassword: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  gender: "male" | "female" | "other" | string | null;
  updateGender: (g: "male" | "female" | "other") => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  USER_LOGGED_IN: "oneplace_logged_in",
  SAVED_PHONE: "oneplace_user_phone",
};

let phoneRecaptchaVerifier: RecaptchaVerifier | null = null;

function getPhoneLoginAlias(phoneNumber: string) {
  return `${phoneNumber.replace(/\D/g, "")}@mobile.1place.lk`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let docUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (docUnsub) {
        docUnsub();
        docUnsub = null;
      }

      if (u) {
        // Check admin status from custom claims or adminUsers collection
        try {
          const idTokenResult = await u.getIdTokenResult();
          const hasAdminClaim = Boolean(idTokenResult.claims.admin);
          if (hasAdminClaim) {
            setIsAdmin(true);
          } else {
            // Verify from adminUsers collection
            const adminDoc = await getDoc(doc(db, "adminUsers", u.uid));
            setIsAdmin(adminDoc.exists());
          }
        } catch {
          setIsAdmin(false);
        }

        // Subscribe to live user profile changes
        docUnsub = onSnapshot(
          doc(db, "users", u.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setProfile(data);
              if (data.phone) {
                localStorage.setItem(STORAGE_KEYS.SAVED_PHONE, data.phone);
              }
            } else {
              setProfile({
                uid: u.uid,
                displayName: u.displayName || "Valued Customer",
                email: u.email || "",
                role: "customer",
                createdAt: new Date().toISOString(),
              });
            }
          },
          (err) => {
            console.warn("User profile fetch error:", err);
          }
        );
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      authUnsub();
      if (docUnsub) docUnsub();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");
  }, []);

  const sendPhoneSignInCode = useCallback(async (phoneNumber: string, containerId: string) => {
    phoneRecaptchaVerifier?.clear();
    const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
    phoneRecaptchaVerifier = verifier;
    try {
      return await signInWithPhoneNumber(auth, phoneNumber, verifier);
    } catch (error) {
      verifier.clear();
      phoneRecaptchaVerifier = null;
      throw error;
    }
  }, []);

  const confirmPhoneSignInCode = useCallback(async (confirmation: ConfirmationResult, code: string) => {
    const credential = await confirmation.confirm(code.trim());
    phoneRecaptchaVerifier?.clear();
    phoneRecaptchaVerifier = null;
    const phone = credential.user.phoneNumber || "";
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");

    try {
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        displayName: credential.user.displayName || "Valued Customer",
        email: credential.user.email || "",
        phone,
        role: "customer",
        lastLoginAt: new Date().toISOString(),
      }, { merge: true });
    } catch (dbErr) {
      console.warn("Could not sync phone user profile:", dbErr);
    }
  }, []);

  const signInWithPhonePassword = useCallback(async (phoneNumber: string, password: string) => {
    const alias = getPhoneLoginAlias(phoneNumber);
    await signInWithEmailAndPassword(auth, alias, password);
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");
  }, []);

  const signUpWithPhone = useCallback(async (name: string, phoneNumber: string, password: string, confirmation: ConfirmationResult, code: string) => {
    const phoneCredential = await confirmation.confirm(code.trim());
    phoneRecaptchaVerifier?.clear();
    phoneRecaptchaVerifier = null;
    const alias = getPhoneLoginAlias(phoneNumber);
    const linked = await linkWithCredential(phoneCredential.user, EmailAuthProvider.credential(alias, password));
    await updateProfile(linked.user, { displayName: name.trim() });
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");
    localStorage.setItem(STORAGE_KEYS.SAVED_PHONE, phoneNumber);
    await setDoc(doc(db, "users", linked.user.uid), {
      uid: linked.user.uid,
      displayName: name.trim(),
      email: "",
      phone: phoneNumber,
      phoneLoginAlias: alias,
      role: "customer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }, []);

  const resetPhonePassword = useCallback(async (phoneNumber: string, confirmation: ConfirmationResult, code: string, newPassword: string) => {
    const verified = await confirmation.confirm(code.trim());
    phoneRecaptchaVerifier?.clear();
    phoneRecaptchaVerifier = null;
    const verifiedPhone = verified.user.phoneNumber || "";
    if (verifiedPhone !== phoneNumber) {
      await firebaseSignOut(auth);
      throw new Error("The verified number does not match. Please request a new code.");
    }
    const hasPasswordProvider = verified.user.providerData.some((provider) => provider.providerId === "password");
    if (hasPasswordProvider) {
      await updatePassword(verified.user, newPassword);
    } else {
      const alias = getPhoneLoginAlias(phoneNumber);
      await linkWithCredential(verified.user, EmailAuthProvider.credential(alias, newPassword));
    }
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });

    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");
    if (phone) {
      localStorage.setItem(STORAGE_KEYS.SAVED_PHONE, phone.trim());
    }

    // Persist new customer record to Firestore
    try {
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          displayName: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : "",
          role: "customer",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (dbErr) {
      console.warn("Could not write user profile to Firestore:", dbErr);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");

    try {
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          displayName: cred.user.displayName || "Google Customer",
          email: cred.user.email || "",
          photoURL: cred.user.photoURL || "",
          role: "customer",
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (dbErr) {
      console.warn("Could not sync Google user profile:", dbErr);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const cred = await signInWithPopup(auth, provider);
    sessionStorage.setItem(STORAGE_KEYS.USER_LOGGED_IN, "true");

    try {
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          displayName: cred.user.displayName || "Apple Customer",
          email: cred.user.email || "",
          photoURL: cred.user.photoURL || "",
          role: "customer",
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (dbErr) {
      console.warn("Could not sync Apple user profile:", dbErr);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }, []);

  const updateUserProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!user) throw new Error("User is not signed in.");

      if (data.displayName) {
        await updateProfile(user, { displayName: data.displayName });
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          ...data,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    },
    [user]
  );

  const gender = profile?.gender || null;

  const updateGender = useCallback(
    async (g: "male" | "female" | "other") => {
      if (user) {
        await updateUserProfile({ gender: g });
      }
    },
    [user, updateUserProfile]
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    setIsAdmin(false);
    sessionStorage.removeItem(STORAGE_KEYS.USER_LOGGED_IN);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        signIn,
        sendPhoneSignInCode,
        confirmPhoneSignInCode,
        signInWithPhonePassword,
        signUpWithPhone,
        resetPhonePassword,
        signUp,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        updateUserProfile,
        gender,
        updateGender,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const fallbackAuthContext: AuthContextType = {
  user: null,
  profile: null,
  isAdmin: false,
  loading: false,
  signIn: async () => {},
  sendPhoneSignInCode: async () => { throw new Error("Phone sign-in is unavailable."); },
  confirmPhoneSignInCode: async () => { throw new Error("Phone sign-in is unavailable."); },
  signInWithPhonePassword: async () => { throw new Error("Phone sign-in is unavailable."); },
  signUpWithPhone: async () => { throw new Error("Phone sign-up is unavailable."); },
  resetPhonePassword: async () => { throw new Error("Phone password reset is unavailable."); },
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
  gender: null,
  updateGender: async () => {},
  signOut: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx || fallbackAuthContext;
}
