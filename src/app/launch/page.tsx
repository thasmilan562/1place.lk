import type { Metadata } from "next";
import LaunchCountdown from "@/components/launch/LaunchCountdown";
import "./launch.css";

export const metadata: Metadata = {
  title: "OnePlace opens at midnight",
  robots: { index: false, follow: false },
};

export default function LaunchPage() {
  return <LaunchCountdown />;
}
