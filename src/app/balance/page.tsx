import { redirect } from "next/navigation";

/** Balance Visualizer now lives inside the Dev tab. Redirect old bookmarks. */
export default function BalancePage() {
  redirect("/");
}
