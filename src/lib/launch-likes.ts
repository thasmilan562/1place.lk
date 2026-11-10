import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const launchLikesDb = db;
export const launchLikesRef = doc(db, "launchMetrics", "likes");
