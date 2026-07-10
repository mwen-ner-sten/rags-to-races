import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isFeatureAvailable } from "@/config/features";

/** Balance Visualizer now lives inside the Dev tab. Redirect old bookmarks. */
export default function BalancePage() {
  if (!isFeatureAvailable("balance_visualizer")) notFound();
  redirect("/");
}
