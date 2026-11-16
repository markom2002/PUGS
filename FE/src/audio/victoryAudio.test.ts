import { waitFor } from "@testing-library/react";
function harness() {
  const gain = {
    gain: {
      value: 0.35,
      cancelScheduledValues: jest.fn(),
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
  const nodes: any[] = [];
  const context: any = {
    state: "suspended",
    currentTime: 0,
    destination: {},
    resume: jest.fn(async () => {
      context.state = "running";
    }),
    decodeAudioData: jest.fn(async () => ({
      duration: 30,
      sampleRate: 100,
      getChannelData: () => new Float32Array(3000).fill(0.2),
    })),
    createGain: () => gain,
    createBufferSource: () => {
      const node = {
        buffer: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        onended: null,
      };
      nodes.push(node);
      return node;
    },
  };
  const constructor = jest.fn(() => context);
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    writable: true,
    value: constructor,
  });
  let audio: any;
  jest.isolateModules(() => {
    audio = require("./victoryAudio");
  });
  return { audio, context, gain, nodes, constructor };
}
afterEach(() => {
  delete (window as any).AudioContext;
});
test("audio context is prepared on a game gesture and reused later", async () => {
  const { audio, context, constructor } = harness();
  const remove = audio.installVictoryAudioUnlock();
  expect(constructor).not.toHaveBeenCalled();
  window.dispatchEvent(new Event("pointerup"));
  await waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
  expect(context.state).toBe("running");
  await audio.unlockVictoryAudio();
  expect(constructor).toHaveBeenCalledTimes(1);
  remove();
});
test("highlight starts automatically on the unlocked context, fades, pauses and resumes", async () => {
  const { audio, context, gain, nodes } = harness();
  await audio.unlockVictoryAudio();
  const ended = jest.fn();
  const playback = await audio.createVictoryPlayback(
    { arrayBuffer: async () => new ArrayBuffer(4) } as Blob,
    0.35,
    ended,
  );
  await playback.play();
  expect(nodes[0].start).toHaveBeenCalledWith(0, 0, 18);
  expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.35, 0.6);
  context.currentTime = 5;
  playback.pause();
  expect(nodes[0].stop).toHaveBeenCalled();
  await playback.play();
  expect(nodes[1].start).toHaveBeenCalledWith(5, 5, 13);
  playback.setVolume(0.1);
  expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.1, 5.15);
  nodes[1].onended();
  expect(ended).toHaveBeenCalledTimes(1);
  await playback.play();
  expect(nodes[2].start).toHaveBeenCalledWith(5, 0, 18);
  playback.dispose();
  expect(nodes[2].stop).toHaveBeenCalled();
  expect(gain.disconnect).toHaveBeenCalled();
});

test("question music starts on the shared context and spans the remaining question, not eight seconds", async () => {
  const { audio, nodes } = harness();
  await audio.unlockVictoryAudio();
  const now = jest.spyOn(Date, "now").mockReturnValue(100000);
  try {
    const player = await audio.createQuestionPlayback({ arrayBuffer: async () => new ArrayBuffer(4) }, 98000, 117500, jest.fn());
    await player.play();
    expect(nodes[0].start).toHaveBeenCalledWith(0, 2, 17.5);
    player.dispose();
    expect(nodes[0].stop).toHaveBeenCalled();
  } finally { now.mockRestore(); }
});
test("late music does not play after the question deadline", async () => {
  const { audio, nodes } = harness();
  await audio.unlockVictoryAudio();
  const now = jest.spyOn(Date, "now").mockReturnValue(120000);
  const ended = jest.fn();
  try {
    const player = await audio.createQuestionPlayback({ arrayBuffer: async () => new ArrayBuffer(4) }, 98000, 117500, ended);
    await player.play();
    expect(nodes).toHaveLength(0);
    expect(ended).toHaveBeenCalledTimes(1);
    player.dispose();
  } finally { now.mockRestore(); }
});
