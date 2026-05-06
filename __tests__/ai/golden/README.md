# Golden Eval Harness

Catches regressions in the Gemini-backed AI surface (currently
`callGeminiHealthProfile` and `callGeminiMealSafety`).

## Modes

### Synthetic (default — runs in every CI)

Each case ships a hand-crafted "good Gemini response" alongside the
input and bound assertions. The harness:

1. Runs the synthetic response through the production Zod schema
   (`AIHealthProfileResponseSchema`, `MealSafetyResponseSchema`).
2. Runs the case's assertions against the validated response.

What this catches:

- **Zod-schema drift** — someone tightens a schema, the synthetic
  responses that used to validate now fail.
- **Assertion-set rot** — the bounds we expect for "hypertension
  alone" stop matching what good Gemini output looks like.

What this does NOT catch:

- Real Gemini misbehavior (responses that hallucinate, drop
  required fields, return wrong values for known conditions).

```bash
npm test -- ai/golden
```

### Live (manual / nightly)

Each case sends its `input` to the real Gemini API; the response
goes through the production code path (`callGeminiHealthProfile`,
`callGeminiMealSafety`) and is asserted against the same bounds.

```bash
RUN_LIVE_AI_TESTS=1 GEMINI_API_KEY=... npm test -- ai/golden
```

What this catches:

- **Prompt regressions** — Gemini still emits the right shape but
  semantically wrong values for known conditions.
- **Gemini behavior drift** — the model evolves, your prompt no
  longer produces what it used to.

What this does NOT catch:

- Anything synthetic mode catches (run both for full coverage).

Live mode is gated behind `RUN_LIVE_AI_TESTS=1` so CI stays free,
deterministic, and fast.

## Adding a case

Cases live in `cases/<pipeline>-cases.ts`. Each case is:

```ts
{
  name: 'human-readable case name (becomes the Jest test title)',
  input: { /* what we pass to the AI fn */ },
  synthetic: { /* a hand-crafted good Gemini response */ },
  assertions: (response) => {
    // Throw on bound violation. Use harness helpers:
    //   assertNumber(path, value, { between, atLeast, atMost, equals })
    //   assertStringContains(path, value, { containsAny, containsAll })
    //   assertArray(path, value, { minLength, maxLength, every, some })
  },
}
```

Bound style — assert RANGES, not exact values. Gemini is
non-deterministic across runs; a case for "hypertension" doesn't
require `sodium === 2000`, it requires `1500 <= sodium <= 2300`.

## Why bounds, not exact match

Live mode against a live model is inherently noisy. A regression
catch is "Gemini stopped flagging high-sodium meals at all", not
"Gemini said 1850mg today vs. 1900mg last week". Tight equality
gates would be flaky and useless; loose bounds catch the bugs that
matter.
