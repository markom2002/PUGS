export type MatchSession = { code: string; token: string };
export function clearMatchSession() {
  try {
    sessionStorage.removeItem("pugs-arena");
  } catch {}
  try {
    localStorage.removeItem("skocko-session");
  } catch {}
}
export function readMatchSession(
  invitation: string | null,
): MatchSession | null {
  // Old device-wide sessions must not auto-enrol users in another match.
  try {
    localStorage.removeItem("skocko-session");
  } catch {}
  try {
    if (invitation === null) { clearMatchSession(); return null; }
    const saved = JSON.parse(sessionStorage.getItem("pugs-arena") || "null");
    if (
      !saved ||
      typeof saved.code !== "string" ||
      !/^\d{6}$/.test(saved.code) ||
      typeof saved.token !== "string" ||
      !saved.token ||
      (invitation !== null && invitation !== saved.code)
    ) {
      clearMatchSession();
      return null;
    }
    return saved;
  } catch {
    clearMatchSession();
    return null;
  }
}
export function rememberMatchSession(session: MatchSession) {
  try {
    sessionStorage.setItem("pugs-arena", JSON.stringify(session));
  } catch {}
  try {
    localStorage.removeItem("skocko-session");
  } catch {}
}
