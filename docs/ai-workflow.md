# AI engineering workflow

## Tasks and evidence

| Task    | Inputs                                     | Output                                               | Gate                                                                                                                   |
| ------- | ------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Plan    | Retrieved requirement IDs and text         | Risk scenarios, steps, expected behavior, priorities | Strict schema, known IDs, unique IDs/titles, positive and risk categories for every requirement                        |
| Draft   | Requirements, fixture API instructions     | TypeScript code and review notes                     | Strict schema, known requirement IDs, approved import, explicit test/assertion calls, selected unsafe-construct checks |
| Triage  | Labeled incident or actual Playwright JSON | Observations, hypotheses, confidence, next checks    | Strict schema and known evidence IDs; evidence required                                                                |
| Locator | Supplied DOM snippet                       | Locator expressions with reasons                     | Known evidence IDs and mandatory human review                                                                          |
| Impact  | Requirements and change question           | Suggested regression scope                           | Known requirement IDs and mandatory full release suite                                                                 |

The CLI passes the accepted plan into the draft task as additional context. The Studio runs each task independently. This is a bounded task pipeline, not an autonomous coding agent: no tools, browser control, filesystem access or code execution are granted to the model. Drafts still require compiler checks and human review before promotion.

## Live provider

The OpenAI adapter uses `responses.parse`, `zodTextFormat`, `store: false`, a 45-second request timeout, SDK retries disabled, and a 6000 output-token cap per request. The pipeline permits one repair for rejected schema/semantic output. Provider errors stop immediately. Refused or incomplete responses fail closed.

The exact model is configured with `AI_MODEL`; no default or account-specific model access is assumed. Each accepted task records mode, model, attempts, reported tokens, elapsed time, prompt version and a SHA-256 input hash. Input/output tokens are usage counts, not a calculated dollar cost.

References: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create).

## Offline provider

Authored example responses exercise the same schemas, gates, CLI and Studio. They are not captured model completions, do not interpret new questions and report zero model tokens. The UI explicitly labels this mode. The sample failure is synthetic; it is not represented as a failure observed in the commerce suite.

## Grounding and limits

Retrieval ranks a small versioned requirement corpus by lexical overlap, with deterministic ties. This is a transparent retrieval example, not vector RAG. Common key, bearer-token, password and email patterns are redacted before provider input. This is incomplete pattern-based redaction: do not submit sensitive artifacts without review.

Evidence-ID validation checks reference existence. It does not prove the cited text supports every conclusion. Plan gates check required structure and coverage categories, not full business correctness. Static draft inspection can miss obfuscated or indirect unsafe behavior. Generated files stay under ignored `artifacts/drafts/*.txt` and are never automatically run.

Prompt injection is mitigated by treating evidence as data, avoiding tools, redaction and output gates. The regression suite checks boundaries with injected instructions and invalid outputs; it is not a measured guarantee that a live model resists all attacks.

## Review and promotion

1. Read the source requirement and cited evidence.
2. Verify status codes, test-data assumptions and business expectations independently.
3. Inspect every generated line, including imports and external destinations.
4. Adapt the draft import path for its final test location.
5. Add the approved spec to an appropriate test folder and run typecheck/lint and the targeted suite.
6. Review traces, then run the release suite before merging.

Locator suggestions remain proposals. Never replace a failed assertion with a passing one or promote a model's claim of success without execution evidence.

## Actual failure investigation

```bash
npm test
npm run ai:live -- --results=test-results/results.json
```

This replaces the illustrative incident with a bounded, redacted extract of actual Playwright stats and suites. Inspect the report locally before sending it. A successful suite should be reported as no observed failure. In offline mode, use the default synthetic incident; authored examples are not a general report-analysis engine.

## Version-two case generation

See [version two](version-two.md) for the sixth AI workflow, independent expectation oracle, virtual compiler, review manifest and seeded-defect evaluation. The CLI commands `ai:candidates` and `ai:candidates:live` produce separate offline/live provenance. Neither executes the candidates. The original five-task CLI remains available for the other workflows.
