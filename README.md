# shitpost-reactor

Agentic shitpost generator powered by Claude. Feed it a topic, set the chaos dial, get cursed posts — straight from your terminal.

```bash
npx shitpost-reactor "mondays"
```

## Install

```bash
npm install -g shitpost-reactor
# or run without installing:
npx shitpost-reactor "<topic>"
```

Bring your own Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
shitpost-reactor "my code review" -p linkedin -c 4
shitpost-reactor "the housing market" --thread -n 5
shitpost-reactor "running" --worse
shitpost-reactor "mondays" --json
```

| Flag | | Description | Default |
|------|---|-------------|---------|
| `-p` | `--platform` | `x` \| `linkedin` \| `reddit` | `x` |
| `-c` | `--chaos` | chaos dial, `1`–`5` | `2` |
| `-n` | `--count` | posts to make / thread length | `3` |
| `-t` | `--thread` | one escalating X thread instead | off |
| | `--worse` | second pass to escalate each post | off |
| | `--json` | raw JSON output | off |

**Platforms** map to distinct voices: `x` (lowercase absurdist), `linkedin` (broetry thought-leader parody), `reddit` (overconfident reply-guy).

**Chaos** runs from `1` (mildly cursed) to `5` (banned in 3 countries).

## How the flow works

Real agent passes, not a single prompt:

1. **generate** — brainstorms comedic *angles* first, then writes posts from them. Angles are surfaced so you can see the reasoning.
2. **thread** — writes one coherent X chain that escalates from grounded to unhinged across the posts.
3. **`--worse`** — an optional second pass that takes each post and deep-fries it further.

## Use it as a library

```ts
import { generate, generateThread, makeWorse } from "shitpost-reactor";

const { angles, posts } = await generate({ topic: "mondays", platform: "x", chaos: 3 });
const thread = await generateThread({ topic: "rent", length: 5 });
const worse = await makeWorse({ post: posts[0] });
```

Fully typed. You can inject a preconfigured client via `{ client }` (custom baseURL, testing).

## Develop

```bash
npm install
npm run build     # src/ -> dist/ with .d.ts
npm test          # mocked SDK, no key or network needed
```

## Release

Tagging a version publishes automatically via GitHub Actions (`.github/workflows/publish.yml`), with npm provenance. Set an `NPM_TOKEN` repo secret first, then:

```bash
npm version patch    # bumps version + creates a git tag
git push --follow-tags
```

## Guardrails

The humor is absurdist, self-deprecating, and observational. The generator avoids targeting real named people, slurs, protected-group jokes, and genuinely hateful content. The joke is the bit, not a person.

## License

MIT
