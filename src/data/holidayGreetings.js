export const HOLIDAY_GREETINGS_KEY = "peoplehub-holiday-greetings";

export function readHolidayGreetings() {
  try {
    const raw = localStorage.getItem(HOLIDAY_GREETINGS_KEY);
    if (!raw) return { greetings: {}, error: "" };
    const greetings = JSON.parse(raw);
    if (!greetings || typeof greetings !== "object" || Array.isArray(greetings)
      || Object.values(greetings).some((greeting) => !greeting || typeof greeting !== "object" || typeof greeting.image !== "string")) {
      return { greetings: {}, error: "Saved holiday greetings have an invalid format." };
    }
    return { greetings, error: "" };
  } catch (error) {
    return {
      greetings: {},
      error: error instanceof Error ? error.message : "Holiday greetings could not be loaded.",
    };
  }
}

export function writeHolidayGreetings(greetings) {
  localStorage.setItem(HOLIDAY_GREETINGS_KEY, JSON.stringify(greetings));
}
