export function observationWindow(now = new Date()) {
  const format = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  return {
    period_start: format(new Date(now.getTime() - 6 * 86400000)),
    period_end: format(now),
  };
}
