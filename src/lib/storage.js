// A thin wrapper around localStorage. Every read/write for the app's plan
// data goes through here so that, if a backend is added later, only this
// file needs to change (e.g. swap these for `fetch` calls to an API).

const STORAGE_KEY = "savings-tracker:plan:v1";

export function loadPlan() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Couldn't read saved plan from localStorage:", err);
    return null;
  }
}

export function savePlan(plan) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch (err) {
    console.error("Couldn't save the plan to localStorage:", err);
  }
}

export function clearPlan() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Couldn't clear the saved plan:", err);
  }
}
