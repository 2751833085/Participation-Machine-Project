export function formatCountdown(msLeft) {
  if (msLeft <= 0) return "0:00";
  const seconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
