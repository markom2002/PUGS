import {
  clearMatchSession,
  readMatchSession,
  rememberMatchSession,
} from "./matchSession";
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
test("new app session does not reuse an old device-wide enrolment", () => {
  localStorage.setItem(
    "skocko-session",
    JSON.stringify({ code: "123456", token: "old" }),
  );
  expect(readMatchSession(null)).toBeNull();
  expect(localStorage.getItem("skocko-session")).toBeNull();
});
test("the same active match can resume after refresh in its tab", () => {
  rememberMatchSession({ code: "123456", token: "active" });
  expect(readMatchSession("123456")).toEqual({
    code: "123456",
    token: "active",
  });
  expect(localStorage.getItem("skocko-session")).toBeNull();
});
test("a new invitation never silently enters the previous room", () => {
  rememberMatchSession({ code: "123456", token: "old" });
  expect(readMatchSession("654321")).toBeNull();
  expect(sessionStorage.getItem("pugs-arena")).toBeNull();
});
test("explicit PIN entry and finished-match cleanup require enrolment again", () => {
  rememberMatchSession({ code: "123456", token: "old" });
  expect(readMatchSession("")).toBeNull();
  rememberMatchSession({ code: "123456", token: "old" });
  clearMatchSession();
  expect(readMatchSession(null)).toBeNull();
});

test('opening the app without an explicit room PIN always begins a fresh session',()=>{rememberMatchSession({code:'123456',token:'previous'});expect(readMatchSession(null)).toBeNull();});
