import { test } from "node:test";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { generate, generateThread, makeWorse } from "../src/index.js";

/** Minimal fake Anthropic client that returns a fixed text block. */
function fakeClient(text: string): Anthropic {
  return {
    messages: {
      create: async () => ({ content: [{ type: "text", text }] }),
    },
  } as unknown as Anthropic;
}

test("generate parses angles and posts from the model response", async () => {
  const client = fakeClient(
    JSON.stringify({ angles: ["a1", "a2"], posts: ["p1", "p2", "p3"] })
  );
  const res = await generate({ topic: "mondays", client });
  assert.deepEqual(res.angles, ["a1", "a2"]);
  assert.deepEqual(res.posts, ["p1", "p2", "p3"]);
});

test("generate strips markdown code fences before parsing", async () => {
  const client = fakeClient('```json\n{"angles":[],"posts":["x"]}\n```');
  const res = await generate({ topic: "t", client });
  assert.deepEqual(res.posts, ["x"]);
});

test("generateThread returns the chain of posts", async () => {
  const client = fakeClient(JSON.stringify({ posts: ["1/3", "2/3", "3/3"] }));
  const res = await generateThread({ topic: "housing", length: 3, client });
  assert.equal(res.posts.length, 3);
  assert.equal(res.posts[0], "1/3");
});

test("makeWorse returns the escalated post text", async () => {
  const client = fakeClient("now its worse");
  const out = await makeWorse({ post: "mild", client });
  assert.equal(out, "now its worse");
});

test("throws a clear error when no API key and no client", async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(() => generate({ topic: "t" }), /No API key/);
  if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
});
