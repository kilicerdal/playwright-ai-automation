# Seven-minute showcase

## 0:00 — Show the outcome

Open `http://127.0.0.1:4174`. Explain: “This is my quality engineering workbench. The results come from executed tests; the AI artifacts identify whether a real model or an authored example produced them.” Show the pass/failure/flaky counts and browser projects.

## 1:00 — Run an AI task

Open AI engineering lab. Choose plan or draft, enter a question and run it. With credentials configured, select live mode. Without them, explain that offline mode is an authored example that exercises the same validation path. Show requirement references, attempt metadata and the quarantined draft. Do not describe examples as real model reasoning.

## 2:30 — Explain a difficult engineering problem

Show the lost-response recovery spec: the server commits the order, but the browser never receives the response. The browser retries the same idempotency key and receives the original order. Verify exactly one order through the API. This demonstrates a business guarantee, not merely clicking a checkout button.

## 3:30 — Demonstrate the product

Open Atlas on port 4173. Sign in with demo/demo-pass. Search, add two items, refresh, remove an item, and place a demo order. Point out responsive layout, accessible controls, integer-money totals and isolated state.

## 4:30 — Show failure investigation

Use the explicitly synthetic 503 incident in the AI lab, or run the live CLI against an actual failing report. Explain observations versus hypotheses and show evidence IDs. Describe why a locator proposal never silently heals a test and impact advice never bypasses the release gate.

## 5:30 — Inspect evidence

Open Test explorer and filter by ORDER-02 or a browser name. Open Traceability and expand a requirement. Run `npm run report` to inspect test actions and any retained failure artifacts.

## 6:30 — Discuss design choices

Explain API-based setup, fresh sessions, concurrency checks, strict contracts, bounded model calls, read-only CI permissions and dependency auditing. Be explicit about portfolio boundaries: in-memory data, no real payments, no hosted CI verification unless run there, and no claim of exhaustive coverage.

## Interview talking points

- “I designed the AI trust boundary so a model cannot execute tests or rewrite expected behavior.”
- “I test the live adapter contract without making CI dependent on credentials or nondeterministic completions.”
- “I validate an important distributed-systems property with a controlled lost-response test.”
- “I distinguish requirement linkage, automated accessibility checks and actual product coverage.”
- “I make the demo reproducible locally rather than depending on a shared public test site.”
