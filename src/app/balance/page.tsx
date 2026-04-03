import BalanceDashboard from "@/components/Admin/BalanceDashboard";

const IS_PROD = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export default function BalancePage() {
  if (IS_PROD) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500 text-sm">Not available in production.</p>
      </div>
    );
  }

  return <BalanceDashboard />;
}
