import Anthropic from "@anthropic-ai/sdk";

export type Platform = "x" | "linkedin" | "reddit";
export type ChaosLevel = 1 | 2 | 3 | 4 | 5;

export interface ReactorOptions {
  /** Anthropic API key. Falls back to process.env.ANTHROPIC_API_KEY. */
  apiKey?: string;
  /** Model to use. Defaults to a current Claude model. */
  model?: string;
  /** Inject a preconfigured client (custom baseURL, testing, etc.). */
  client?: Anthropic;
}

export interface GenerateInput extends ReactorOptions {
  topic: string;
  platform?: Platform;
  chaos?: ChaosLevel;
  /** How many posts to generate. Default 3. */
  count?: number;
}

export interface GenerateResult {
  angles: string[];
  posts: string[];
}

const DEFAULT_MODEL = "claude-sonnet-4-6";

const PLATFORM_STYLE: Record<Platform, string> = {
  x: "lowercase, no punctuation, absurdist, max ~2 lines, terminally online",
  linkedin:
    "thought-leader 'broetry' parody. one-line paragraphs. fake-deep. humblebrag. ends with 'Agree?' or 'Thoughts?'",
  reddit:
    "overconfident reply-guy energy, unsolicited correction, ends with 'Source: am [thing]'",
};

const CHAOS_LABEL: Record<ChaosLevel, string> = {
  1: "mildly cursed",
  2: "unwell",
  3: "posting through it",
  4: "menace to society",
  5: "banned in 3 countries",
};

const GUARDRAILS =
  "Humor is absurdist, self-deprecating, and observational. Do NOT target real " +
  "named people, use slurs, punch at protected groups, or post anything genuinely " +
  "hateful. The joke is the bit, not a person.";

function client(opts: ReactorOptions): Anthropic {
  if (opts.client) return opts.client;
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No API key. Set ANTHROPIC_API_KEY or pass { apiKey } to the function."
    );
  }
  return new Anthropic({ apiKey });
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
}

/** Brainstorm angles, then write posts. One agent pass. */
export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const platform = input.platform ?? "x";
  const chaos = input.chaos ?? 2;
  const count = input.count ?? 3;
  const c = client(input);

  const system =
    `You are a shitpost generator. Output format: ${PLATFORM_STYLE[platform]}.\n` +
    `Chaos level: ${chaos}/5 (${CHAOS_LABEL[chaos]}) — higher = more unhinged and surreal.\n` +
    `${GUARDRAILS}\n\n` +
    `First brainstorm ${count} comedic angles, then write ${count} posts.\n` +
    `Respond with ONLY valid JSON, no markdown, exactly:\n` +
    `{"angles":[...],"posts":[...]}`;

  const message = await c.messages.create({
    model: input.model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: `${system}\n\nTOPIC: ${input.topic}` }],
  });

  const parsed = JSON.parse(textOf(message)) as Partial<GenerateResult>;
  return {
    angles: Array.isArray(parsed.angles) ? parsed.angles : [],
    posts: Array.isArray(parsed.posts) ? parsed.posts : [],
  };
}

export interface ThreadInput extends ReactorOptions {
  topic: string;
  chaos?: ChaosLevel;
  /** Number of posts in the chain. Default 4. */
  length?: number;
}

export interface ThreadResult {
  posts: string[];
}

/** Generate a connected X thread that escalates across the chain. */
export async function generateThread(input: ThreadInput): Promise<ThreadResult> {
  const chaos = input.chaos ?? 2;
  const length = input.length ?? 4;
  const c = client(input);

  const system =
    `You are a shitpost generator writing a single X (twitter) thread.\n` +
    `Format: ${PLATFORM_STYLE.x}.\n` +
    `Chaos level: ${chaos}/5 (${CHAOS_LABEL[chaos]}). Escalate as the thread goes on — ` +
    `start grounded, end completely unhinged.\n` +
    `${GUARDRAILS}\n\n` +
    `Write exactly ${length} connected posts forming one coherent thread on the topic. ` +
    `Each post should stand alone but build on the last.\n` +
    `Respond with ONLY valid JSON, no markdown, exactly:\n` +
    `{"posts":[...]}`;

  const message = await c.messages.create({
    model: input.model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: `${system}\n\nTOPIC: ${input.topic}` }],
  });

  const parsed = JSON.parse(textOf(message)) as Partial<ThreadResult>;
  return { posts: Array.isArray(parsed.posts) ? parsed.posts : [] };
}

export interface WorseInput extends ReactorOptions {
  post: string;
  platform?: Platform;
}

/** Second agent pass: escalate one post into something more deep-fried. */
export async function makeWorse(input: WorseInput): Promise<string> {
  const platform = input.platform ?? "x";
  const c = client(input);

  const message = await c.messages.create({
    model: input.model ?? DEFAULT_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content:
          `Take this post and make it noticeably more unhinged, surreal, and ` +
          `deep-fried while keeping the same topic and this format: ` +
          `${PLATFORM_STYLE[platform]}. ${GUARDRAILS}\n` +
          `Reply with ONLY the new post text, no preamble, no quotes.\n\n` +
          `POST: ${input.post}`,
      },
    ],
  });

  return textOf(message);
}

export const platforms: Platform[] = ["x", "linkedin", "reddit"];
export const chaosLabels = CHAOS_LABEL;
