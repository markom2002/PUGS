import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RoomInvite from "./RoomInvite";
afterEach(() => jest.restoreAllMocks());
test("desktop invitation resolves to a LAN address instead of localhost", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        lanUrls: ["http://192.168.1.8:5087"],
        publicUrl: null,
      }),
    });
  render(<RoomInvite code="123456" />);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Link pozivnice" })).toHaveValue(
      "http://192.168.1.8:5087/arena?code=123456",
    ),
  );
  expect(
    screen.getByRole("button", { name: "Preko interneta" }),
  ).toBeDisabled();
});
test("active internet invitation is preferred and can switch back to Wi-Fi", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        lanUrls: ["http://192.168.1.8:5087"],
        publicUrl: "https://party.trycloudflare.com",
      }),
    });
  render(<RoomInvite code="123456" />);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Link pozivnice" })).toHaveValue(
      "https://party.trycloudflare.com/arena?code=123456",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Ista Wi-Fi mreža" }));
  expect(screen.getByRole("textbox", { name: "Link pozivnice" })).toHaveValue(
    "http://192.168.1.8:5087/arena?code=123456",
  );
});
