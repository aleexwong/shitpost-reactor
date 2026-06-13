#!/usr/bin/env node
import {
  generate,
  generateThread,
  makeWorse,
  platforms,
  type Platform,
  type ChaosLevel,
} from "./index.js";

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  amber: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

const HELP = `${c.bold("shitpost-reactor")} — agentic shitpost generator powered by Claude

${c.amber("Usage:")}
  shitpost-reactor <topic> [options]

${c.amber("Options:")}
  -p, --platform <x|linkedin|reddit>   target platform        (default: x)
  -c, --chaos <1-5>                    chaos dial             (default: 2)
  -n, --count <number>                 how many posts/length  (default: 3)
  -t, --thread                         write one escalating X thread instead
      --worse                          second pass to escalate each post
      --json                           print raw JSON instead of pretty output
  -h, --help                           show this

${c.amber("Setup:")}
  export ANTHROPIC_API_KEY=sk-ant-...

${c.amber("Examples:")}
  shitpost-reactor "mondays"
  shitpost-reactor "my code review" -p linkedin -c 4
  shitpost-reactor "the housing market" --thread -n 5
  npx shitpost-reactor "running" --worse
`;

interface Args {
  topic: string;
  platform: Platform;
  chaos: ChaosLevel;
  count: number;
  thread: boolean;
  worse: boolean;
  json: boolean;
}

function parse(argv: string[]): Args | null {
  const a: Args = {
    topic: "",
    platform: "x",
    chaos: 2,
    count: 3,
    thread: false,
    worse: false,
    json: false,
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") return null;
    else if (arg === "-t" || arg === "--thread") a.thread = true;
    else if (arg === "--worse") a.worse = true;
    else if (arg === "--json") a.json = true;
    else if (arg === "-p" || arg === "--platform") a.platform = argv[++i] as Platform;
    else if (arg === "-c" || arg === "--chaos")
      a.chaos = Math.min(5, Math.max(1, Number(argv[++i]) || 2)) as ChaosLevel;
    else if (arg === "-n" || arg === "--count") a.count = Number(argv[++i]) || 3;
    else rest.push(arg);
  }
  a.topic = rest.join(" ").trim();
  if (!a.topic) return null;
  if (!platforms.includes(a.platform)) a.platform = "x";
  return a;
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (!args) {
    console.log(HELP);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(c.red("✗ ANTHROPIC_API_KEY is not set.\n"));
    console.error(c.dim("  export ANTHROPIC_API_KEY=sk-ant-...\n"));
    process.exit(1);
  }

  process.stderr.write(c.dim("reacting…\n"));

  try {
    if (args.thread) {
      const { posts } = await generateThread({
        topic: args.topic,
        chaos: args.chaos,
        length: args.count,
      });
      if (args.json) {
        console.log(JSON.stringify({ posts }, null, 2));
        return;
      }
      console.log("");
      posts.forEach((post, i) => {
        console.log(c.amber(`${i + 1}/${posts.length}`));
        console.log(post + "\n");
      });
      return;
    }

    const result = await generate({
      topic: args.topic,
      platform: args.platform,
      chaos: args.chaos,
      count: args.count,
    });

    if (args.worse) {
      result.posts = await Promise.all(
        result.posts.map((p) => makeWorse({ post: p, platform: args.platform }))
      );
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.angles.length) {
      console.log(c.dim("\nangles considered:"));
      for (const a of result.angles) console.log(c.dim(`  — ${a}`));
    }
    console.log("");
    result.posts.forEach((post, i) => {
      console.log(c.amber(`▌ post ${i + 1}`));
      console.log(post + "\n");
    });
  } catch (err) {
    console.error(c.red("\n✗ the machine jammed."));
    console.error(c.dim(`  ${(err as Error).message}`));
    process.exit(1);
  }
}

main();
