"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CircleCheck as Sparkles, X, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import UserAvatar from "@/components/ui/UserAvatar";

export default function GenderPromptModal() {
  const { user, profile, gender, updateGender } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<"male" | "female">("male");
  const [saving, setSaving] = useState(false);

  // Automatically detect when user logs in and needs gender selection
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const checkAndPrompt = () => {
      // Check if user has already explicitly saved a gender choice
      const savedGender = profile?.gender || localStorage.getItem(`sm_user_gender_chosen_${user.uid}`);
      const justLoggedIn = sessionStorage.getItem("sm_just_logged_in");

      if (!savedGender || justLoggedIn === "true") {
        sessionStorage.removeItem("sm_just_logged_in");
        setSelected(gender === "female" ? "female" : "male");
        setIsOpen(true);
      }
    };

    // Prompt immediately upon authentication / hydration
    const timer = setTimeout(checkAndPrompt, 150);
    return () => clearTimeout(timer);
  }, [user, profile, gender]);

  // Listen to manual or programmatic trigger events
  useEffect(() => {
    const handleOpen = () => {
      setSelected((gender || profile?.gender || "male") === "female" ? "female" : "male");
      setIsOpen(true);
    };
    window.addEventListener("open-gender-prompt", handleOpen);
    return () => window.removeEventListener("open-gender-prompt", handleOpen);
  }, [gender, profile]);

  if (!isOpen || !user) return null;

  const handleSave = async (chosenGender: "male" | "female") => {
    setSaving(true);
    try {
      await updateGender(chosenGender);
      localStorage.setItem(`sm_user_gender_chosen_${user.uid}`, chosenGender);
      setIsOpen(false);
    } catch (e) {
      console.warn("Could not save gender:", e);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`sm_user_gender_chosen_${user.uid}`, selected);
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          onClick={handleDismiss}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#111111] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white z-10 select-none overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header (100% English) */}
          <div className="text-center mb-6 pt-1">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Select Your Gender
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
              Please choose your gender so we can set up your personalized profile avatar.
            </p>
          </div>

          {/* Two Interactive Selection Cards: Male & Female */}
          <div className="grid grid-cols-2 gap-3.5 mb-6">
            {/* Male Option */}
            <button
              type="button"
              onClick={() => setSelected("male")}
              className={`relative p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                selected === "male"
                  ? "border-blue-500 bg-blue-500/15 shadow-[0_0_25px_rgba(59,130,246,0.3)] scale-[1.02]"
                  : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="relative">
                <UserAvatar gender="male" size="xl" className="ring-2 ring-blue-500/50 shadow-lg" />
                {selected === "male" && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-white">Male</span>
                <span className="block text-[11px] text-blue-400 font-semibold mt-0.5">👨 Male Icon</span>
              </div>
            </button>

            {/* Female Option */}
            <button
              type="button"
              onClick={() => setSelected("female")}
              className={`relative p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                selected === "female"
                  ? "border-pink-500 bg-pink-500/15 shadow-[0_0_25px_rgba(236,72,153,0.3)] scale-[1.02]"
                  : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="relative">
                <UserAvatar gender="female" size="xl" className="ring-2 ring-pink-500/50 shadow-lg" />
                {selected === "female" && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-white">Female</span>
                <span className="block text-[11px] text-pink-400 font-semibold mt-0.5">👩 Female Icon</span>
              </div>
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(selected)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-black font-black text-xs sm:text-sm tracking-wide shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>
              {saving
                ? "Setting Avatar..."
                : `Set as ${selected === "female" ? "Female 👩" : "Male 👨"} Profile`}
            </span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
