export function formatPrice(perToken: string): string {
  const n = parseFloat(perToken);
  if (!n || n === 0) return "free";
  const perMillion = n * 1_000_000;
  return perMillion < 0.01 ? "<$0.01" : `$${perMillion.toFixed(2)}`;
}

export function formatPricePer1M(perToken: string): string {
  const n = parseFloat(perToken);
  if (!n || n === 0) return "free";
  const perMillion = n * 1_000_000;
  return perMillion < 0.01 ? "<$0.01/1M" : `$${perMillion.toFixed(2)}/1M`;
}

export function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n || "-");
}

export function formatModality(modality: string): string {
  if (modality.includes("image") || modality.includes("audio") || modality.includes("video")) {
    return "multi";
  }
  return "text";
}
