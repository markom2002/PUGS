import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { PwaProvider, InstallButton } from "./Pwa";
const setup = () =>
  render(
    <PwaProvider>
      <InstallButton />
    </PwaProvider>,
  );
test("installation guide opens, closes with Escape and restores focus", () => {
  setup();
  const trigger = screen.getByRole("button", { name: /Instaliraj/ });
  trigger.focus();
  fireEvent.click(trigger);
  expect(
    screen.getByRole("dialog", { name: "Arena ide s tobom." }),
  ).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
test("native installation prompt only runs after the user requests it", async () => {
  setup();
  const prompt = jest.fn().mockResolvedValue(undefined);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  act(() => window.dispatchEvent(event));
  expect(prompt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Instaliraj/ }));
  fireEvent.click(
    screen.getByRole("button", { name: /Instaliraj Live Quiz Arena/ }),
  );
  await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});
test("offline status is visible and installed apps stop offering installation", () => {
  setup();
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("status")).toHaveTextContent("Nema internet veze");
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  act(() => window.dispatchEvent(new Event("appinstalled")));
  expect(
    screen.queryByRole("button", { name: /Instaliraj/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("✓ APLIKACIJA")).toBeInTheDocument();
});
