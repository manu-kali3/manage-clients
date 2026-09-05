export type EventStatus = "upcoming" | "today" | "past";

export function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function eventStatus(date: string, today: string): EventStatus {
  if (date === today) return "today";
  return date > today ? "upcoming" : "past";
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
