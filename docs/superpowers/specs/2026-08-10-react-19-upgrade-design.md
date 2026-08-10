# React 19 Upgrade Design

## Goal

Upgrade the Coop client from React 18.2 to the latest React 19 release while preserving existing application behavior and keeping the dependency migration reviewable.

The implementation follows the [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide). React and React DOM will be pinned to 19.2.8, with the latest compatible React 19 type packages.

## Scope

The change is limited to the `client` package:

- Upgrade `react`, `react-dom`, `@types/react`, and `@types/react-dom`.
- Run and review the guide's React 19 runtime and TypeScript codemods against `client/src`.
- Fix React 19 TypeScript changes, including scoped JSX types and initialized refs.
- Upgrade React Testing Library to its React 19-compatible release and add its required DOM Testing Library peer.
- Upgrade React-facing dependencies to the smallest maintained release line that declares React 19 support.
- Replace archived `react-beautiful-dnd` with the API-compatible, Apache-2.0-licensed `@hello-pangea/dnd` fork.
- Remove the unused `react-query` provider and dependency.
- Regenerate `client/package-lock.json` with npm.

This change will not adopt new React 19 features or perform unrelated component refactors.

## Dependency Strategy

React-facing dependencies with a compatible release in their existing major line will remain on that major line. This includes Tiptap 2.x, React Day Picker 8.x, Recharts 2.x, and Sonner 1.x. `next-themes`, Vaul, and `react-helmet-async` will move to their smallest practical React 19-compatible releases, with source changes only where their published APIs require them.

The React 18.2 baseline tests pass but repeatedly warn that `ReactDOM.render` is used. The application entry point already uses `createRoot`; the calls come from React Testing Library 11. React Testing Library will move to its maintained React 19-compatible release, which uses the supported rendering API, and its required `@testing-library/dom` peer will be declared directly.

`react-beautiful-dnd` is not suitable as a long-term exception because it is archived, deprecated, and sensitive to React rendering and layout timing. Coop uses it in two source files, and `@hello-pangea/dnd` preserves the same component model and types while declaring React 19 support.

`react-query` is instantiated only in `client/src/index.tsx`; no client source consumes its context or APIs. Its provider and dependency will be removed rather than migrated.

`react-table` 7.8.0 is the sole deliberate peer-range exception. It does not declare React 19 support, but its headless hook implementation has no identified dependency on APIs removed in React 19. Coop uses its v7 API across ten files, so migration to current TanStack Table is a separate, higher-risk refactor. The React 19 work will verify existing table behavior as far as the current automated suite permits and explicitly document the remaining unsupported peer range.

## Migration Process

1. Establish the React 18.2 client test, lint, build, and audit baseline.
2. Temporarily install React 18.3 and run automated checks to surface the deprecation warnings recommended by the React guide. No user-operated browser is required.
3. Run `react/19/migration-recipe` and `types-react-codemod preset-19` against `client/src`.
4. Inspect every codemod change and retain only changes relevant to this migration.
5. Install React 19.2.8 and the approved compatibility dependency updates without `--legacy-peer-deps` or forced resolution.
6. Resolve source, type, and runtime failures with the smallest behavior-preserving edits.
7. Reinstall from the resulting lockfile to prove it is reproducible.

The runtime codemod is expected to make few or no changes because the client already uses the modern JSX transform and `createRoot`, and the initial source scan found no removed React DOM APIs. The TypeScript codemod is expected to update global JSX references and a zero-argument `useRef` call.

## Verification

The final worktree must pass:

- `npm ci` in `client` from the regenerated lockfile;
- `npm ls react react-dom` to detect duplicate or invalid core React installations;
- `npm run lint` in `client`;
- `npm run test:prepush` in `client`;
- `npm run build` in `client`;
- a browser smoke test when the local application can run without unavailable backend or authentication data.

`npm audit` and package license metadata will be compared with the baseline. The migration must not introduce an unreviewed incompatible license or a newly known vulnerability. Existing audit findings are not expanded into unrelated dependency remediation.

## Risks and Controls

- **Codemod overreach:** review the diff and revert unrelated mechanical changes before implementation continues.
- **Test renderer behavior changes:** upgrade React Testing Library before React 19 and use the existing 204-test suite to detect semantic changes from concurrent rendering.
- **Dependency API drift:** prefer compatible releases in current major lines and make source changes only when checks identify a real incompatibility.
- **Drag-and-drop regression:** use the maintained API-compatible fork and verify the routing rules component through available tests and browser smoke testing.
- **Stale table peer metadata:** retain `react-table` only as an explicit temporary exception and keep a full table migration out of this upgrade.
- **Install reproducibility:** never hand-edit the lockfile and verify it with a clean `npm ci`.
