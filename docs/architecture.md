# Architecture

The framework separates test intent from implementation details:

- `tests/`: business scenarios and assertions.
- `src/pages/`: UI interaction models.
- `src/api/clients/`: service-specific HTTP operations.
- `src/api/schemas/`: runtime API contract validation.
- `src/fixtures/`: dependency injection for test objects.
- `src/data/builders/`: deterministic, overridable test data.

The framework deliberately avoids a giant base class. Playwright fixtures provide composition, isolation, and clear dependencies.
