# V5: five-minute walkthrough

This is a rehearsal script, not a claim that an interview or live presentation has already happened. Use your own pace. Allow about three minutes of explanation and two minutes for interaction.

## Before presenting

Run `npm run showcase:launch` and open http://127.0.0.1:4174/#showtime. Check that the journey list loads. If you want fresh report snapshots, run `npm run verify:v5` first. Keep API credentials, terminals containing secrets, personal tabs and unrelated windows out of any screen share. The included recording captures only a clean local browser context.

## 0:00–1:00 — Set the scope

**Show:** V5 showcase, first guide stage. Presentation mode is optional.

**Say:**

> I built this project to show how I approach quality engineering from requirements to reproducible evidence. It uses Playwright, TypeScript and a local PostgreSQL commerce application.
>
> I used AI assistance during development. The current runtime examples are authored offline fixtures. They do not call a live model. That distinction matters: I want every result to have a clear source.
>
> Everything in this demonstration runs locally. Orders and refunds are simulated, and paid services are disabled.

## 1:00–2:00 — Run the healthy journey

**Do:** Keep `J-CANCEL` selected, choose **Healthy control**, and click **Run journey locally**.

**Say:**

> This journey signs in, adds two notebooks, checks out, cancels the order, and checks the resulting stock and order state.
>
> Each step is an actual HTTP operation against an isolated application instance. A separate reference model calculates the expected result. The runner compares the response with that expectation and shows the observation here.
>
> Cancellation should restore the stock once. Repeating cancellation should not restore it a second time, and a finalized cancellation should reject a later refund.

**Check:** “Healthy journey passed.” Do not describe a partial stream as a completed run.

## 2:00–3:00 — Reveal a controlled defect

**Do:** Select **Simulated fault: missing stock restoration** and run again.

**Say:**

> Now I am deliberately introducing a specific stock-restoration defect. The healthy control must pass first. The faulty run then uses a different disposable database schema, so this does not corrupt the normal demo.
>
> The first mismatch is visible: the model expects 20 notebooks after cancellation, but the faulty application returns 18.
>
> This is an observed symptom of the injected defect. It is not a live AI diagnosis, and I am not claiming this one journey catches every possible defect.

## 3:00–4:00 — Make the result reproducible

**Do:** Show **First divergence**, the run identity and replay command. Click **Download run evidence** if useful.

**Say:**

> The evidence includes the authored journey identity, a content hash, the run time, expected and observed values, and a replay command. It excludes credentials, session cookies and shipping data.
>
> Another engineer can run the same journey locally and review the same contract. If the connection or execution stream fails, the UI does not leave an old successful result in place.
>
> A selected fault may also survive a journey that does not exercise the relevant behavior. The runner reports that honestly rather than calling every demonstration a success.

## 4:00–5:00 — Explain the engineering choices

**Show:** V4 journey intelligence or framework design.

**Say:**

> The wider evaluation uses eight authored journeys and nine curated lifecycle faults. The release passed 301 local test executions across API, framework, database, showcase and browser checks.
>
> The design separates business intent, the reference model, HTTP execution and evidence. Generated source remains quarantined; the runner never evaluates arbitrary generated JavaScript.
>
> The next step for production would be real identity, operational controls and workload-specific validation. For this portfolio, my focus is clear boundaries, meaningful assertions and evidence someone else can reproduce.

## Questions to rehearse

| Question                                | Direct answer                                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is AI generating these tests live?      | No. Current runtime examples are authored offline fixtures. The framework includes AI workflow contracts and review gates, while live APIs are blocked.           |
| Why is the expected result independent? | The journey model derives outcomes without importing application/store code. That reduces the chance of repeating the same implementation error in the assertion. |
| Is this production-ready?               | It is a local reference implementation. Identity and payments are synthetic, and production operations need separate work.                                        |
| Did GitHub Actions pass for V5?         | V5 was verified locally. Hosted project workflows are disabled under the zero-spend policy. V3 has historical hosted results.                                     |
| What does a passing scan establish?     | Only the scenarios and automated rules exercised. It is not exhaustive product coverage or accessibility certification.                                           |
| Can I replay the fault?                 | Yes: `npm run showcase:replay -- --journey=J-CANCEL --fault=missing-restock`.                                                                                     |

## Short recording

The release includes a silent recording of actual local UI execution, with a chapter/caption file. It is a condensed demonstration, not the full spoken rehearsal. Regenerate it with `npm run showcase:record` after starting the local showcase. The recording script uses deliberate reading pauses, not fake progress or invented results.
