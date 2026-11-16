import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Arena from "./Arena";

beforeEach(() => {
  sessionStorage.clear(); localStorage.removeItem("skocko-session");
  jest.restoreAllMocks();
});
test("PIN invitations open the join form and preserve the PIN", () => {
  render(
    <MemoryRouter initialEntries={["/arena?code=123456"]}>
      <Arena />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: /Tvoja ekipa/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("PIN sobe")).toHaveValue("123456");
});
test("failed join shows the server error and allows another attempt", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Nema sobe sa tim PIN-om." }),
    });
  render(
    <MemoryRouter initialEntries={["/arena?code=123456"]}>
      <Arena />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Tvoj nadimak"), {
    target: { value: "Ana" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: /Ulazim u igru/i }).closest("form")!,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Nema sobe sa tim PIN-om.",
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Ulazim u igru/i }),
    ).toBeEnabled(),
  );
  expect(sessionStorage.getItem("pugs-arena")).toBeNull();
});
test("joining stores a private session and resumes state polling", async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: "123456", token: "secret" }),
    })
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "123456",
        phase: "countdown",
        index: -1,
        seconds: 20,
        deadline: new Date(Date.now() + 4000).toISOString(),
        serverNow: new Date().toISOString(),
        me: "Ana",
        isHost: false,
        votes: [],
        selected: ["Sport", "Nauka", "Priroda", "Istorija"],
        categories: [],
        players: [],
        question: null,
        musicCount: 5,
      }),
    });
  const view = render(
    <MemoryRouter initialEntries={["/arena?code=123456"]}>
      <Arena />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Tvoj nadimak"), {
    target: { value: "Ana" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: /Ulazim u igru/i }).closest("form")!,
  );
  expect(await screen.findByText("SPREMNI? KREĆEMO!")).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem("pugs-arena")!)).toEqual({
    code: "123456",
    token: "secret",
  });
  expect(global.fetch).toHaveBeenLastCalledWith(
    expect.stringContaining("/rooms/123456"),
    expect.objectContaining({
      headers: expect.objectContaining({ "X-Player-Token": "secret" }),
    }),
  );
  view.unmount();
});

test('live ranking shows scores, response speed and rank changes', async () => {
  sessionStorage.setItem('pugs-arena',JSON.stringify({code:'123456',token:'secret'}));
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({
    code:'123456',phase:'question',index:0,seconds:20,deadline:new Date(Date.now()+20000).toISOString(),serverNow:new Date().toISOString(),
    me:'Ana',isHost:false,votes:[],selected:['Sport','Nauka','Priroda','Istorija'],categories:[],musicCount:5,
    question:{text:'Koji je glavni grad Italije?',category:'Kaladont',initial:'R',audioUrl:null},submitted:true,myAnswer:'Rim',
    rankingLive:true,answeredCount:1,competitorCount:2,players:[
      {name:'Ana',host:false,score:145,rank:1,rankChange:1,responseMs:2000,averageMs:2000,questionPoints:145,fastest:true,correct:1,answered:true,voted:true},
      {name:'Boris',host:false,score:0,rank:2,rankChange:-1,responseMs:null,averageMs:null,questionPoints:0,fastest:false,correct:0,answered:false,voted:true}
    ]
  })});
  const view=render(<MemoryRouter initialEntries={['/arena']}><Arena/></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Poredak uživo'})).toBeInTheDocument();
  expect(screen.getByText('2.00 s · ⚡ najbrži')).toBeInTheDocument();
  expect(screen.getByText('+145')).toBeInTheDocument();
  expect(screen.getByText('↑ 1')).toBeInTheDocument();
  expect(screen.getByText('↓ 1')).toBeInTheDocument();
  view.unmount();
});
