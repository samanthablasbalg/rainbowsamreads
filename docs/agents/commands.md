# Agent command guide

The agent environment provides the project toolchain directly. `/opt/venv` is already on `PATH`; no
virtualenv activation or dependency installation is needed. Run these commands directly. Agents do
not have Docker access and must not suggest or attempt Docker commands. If a required service is not
running, report that dependency and the command's actual failure.

| Task                            | Command                                                   |
| ------------------------------- | --------------------------------------------------------- |
| Backend tests                   | `cd backend && pytest`                                    |
| Focused backend test            | `cd backend && pytest tests/path.py::test_name`           |
| Frontend unit tests             | `cd frontend && npm test`                                 |
| Focused frontend test           | `cd frontend && npm test -- src/path.spec.tsx`            |
| Frontend lint, types, and tests | `cd frontend && npm run check`                            |
| End-to-end tests                | `cd e2e && npm test -- --project=chromium --reporter=dot` |
| Repository checks               | `pre-commit run --all-files`                              |

Storybook tests require the separately started Storybook service. Run them with
`cd frontend && npm run test:storybook` when that service is available.

The end-to-end suite resets test-worker personal data and removes E2E-owned catalog records; the
development user's data survives. `cd backend && python -m scripts.seed_dev` replaces development
data. A screenshot or inspection request does not authorize reseeding.
