# AI-Assisted Engineering Workflow

Claude Code and GitHub Copilot may assist development, but generated code is reviewed like human-written code.

Good uses:

- explain unfamiliar TypeScript or Playwright APIs;
- propose test cases from requirements;
- identify duplication and brittle selectors;
- review failures and traces;
- suggest refactors with tests;
- draft documentation.

Do not use AI to invent expected business behavior, expose secrets, or silently weaken assertions to make a test pass.

A useful Claude Code prompt is: "Review this failing test as a senior SDET. Diagnose the failure from evidence first. Do not change assertions until you can explain why the expected behavior is wrong."
