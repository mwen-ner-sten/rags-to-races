import { formatRate, rateSign } from "@/components/resources/formatRate";

export interface RateChipProps {
  /** Net change per second; sign decides the tint. */
  perSecond: number;
  size?: "sm" | "md";
  className?: string;
  /** Accessible description of what is changing, e.g. "Scrap Bucks". */
  label?: string;
}

/**
 * "+1.2/s" pill. Positive rates read --success, negative --danger, zero is
 * muted. Purely presentational; the number is formatted by formatRate.
 */
export default function RateChip({ perSecond, size = "md", className, label }: RateChipProps) {
  const sign = rateSign(perSecond);
  const text = formatRate(perSecond);
  return (
    <span
      className={["ui-rate", `ui-rate--${sign}`, `ui-rate--${size}`, className ?? ""].filter(Boolean).join(" ")}
      aria-label={label ? `${label} ${text}` : undefined}
      data-rate-sign={sign}
    >
      {text}
    </span>
  );
}
