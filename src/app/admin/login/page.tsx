"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Lock, User, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/business-info";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem("admin_auth", "true");
        localStorage.setItem("admin_auth", "true");
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Invalid administrative credentials. Access restricted.");
        setIsLoading(false);
      }
    } catch {
      setError("Network or authentication server error. Please try again.");
      setIsLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername("admin");
    setPassword("oneplace2026");
    setError("");
  };

  return <div className="account-page admin-login">
    <div className="account-topbar"><Link href="/" className="inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to store</Link></div>
    <div className="account-page-card account-surface">
      <div className="account-brand"><Link href="/"><img src="/logo.png" alt="ONEPLACE" /></Link></div>
      <div className="account-heading"><h1>Your store. Your space.</h1><p>Sign in to manage your ONEPLACE store.</p></div>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert" className="admin-feedback">{error}</p>}
        <div><label htmlFor="store-admin-username" className="block">Username</label><div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><input id="store-admin-username" autoComplete="username" spellCheck={false} autoCapitalize="none" autoCorrect="off" required disabled={isLoading} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username (e.g. admin)" className="w-full pr-4" /></div></div>
        <div><label htmlFor="store-admin-password" className="block">Password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><input id="store-admin-password" autoComplete="current-password" spellCheck={false} autoCapitalize="none" autoCorrect="off" required disabled={isLoading} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full pr-12" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 text-neutral-400 flex items-center justify-center">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        <button type="submit" disabled={isLoading} className="w-full text-white mt-3">{isLoading ? "Signing in…" : "Sign in to your store"}</button>
      </form>
      <div className="mt-5 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-300">Admin Access:</span>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
          >
            Auto-fill credentials
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-neutral-400">
          Username: <span className="text-neutral-200">admin</span> | Password: <span className="text-neutral-200">oneplace2026</span>
        </p>
      </div>
      <p className="text-center text-xs text-neutral-400 mt-5">For authorized store administrators.</p>
    </div>
    <p className="text-center text-xs text-neutral-400">ONEPLACE · Store workspace</p>
  </div>;
}
