# Security policy

Report security-sensitive issues privately to [erdal@eai.engineering](mailto:erdal@eai.engineering), subject `Security: playwright-ai-automation`. Include the affected commit/version, a synthetic reproduction and likely impact. Do not post exploit details, secrets or sensitive traces in public issues; never send a live API key.

The current default branch is the maintenance target. Historical release evidence remains tied to its original commit; no response or remediation SLA is guaranteed.

This is a loopback portfolio lab with synthetic users and simulated commerce/payments. Do not expose its demo accounts, local execution runner or PostgreSQL lab publicly. Tests of CSRF, ownership, replay or selected accessibility rules do not establish production security or accessibility certification.

Live model calls, cloud uploads and hosted project workflows are disabled. Saved local credentials must remain ignored. Do not enable paid/cloud paths merely to investigate an update. Generated proposals are review-only; model output must not become arbitrary executable code.

Keep real customer data, credentials, local databases and session traces out of commits and published evidence. Follow [dependency maintenance](docs/DEPENDENCY_MAINTENANCE.md) before accepting updates.
