# React 19 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Coop client to React 19.2.8 while preserving application behavior and replacing the React integrations that cannot safely remain on their current versions.

**Architecture:** Keep the migration inside the independent `client` package. First use React 18.3 to expose deprecated behavior and modernize the test renderer, then align React-facing dependencies, and finally install React 19 and apply the official runtime and TypeScript codemods. Preserve the current component/provider architecture except for removing the unused React Query provider and replacing the archived drag-and-drop package with its API-compatible maintained fork.

**Tech Stack:** React 19.2.8, TypeScript 5.9, Vite 7, Vitest 4, React Testing Library 16, npm 11, Node 24.

## Global Constraints

- Work only in `/Users/tao/dev/roost/coop/.worktrees/react-19-upgrade` on branch `upgrade/react-19`.
- Use Node 24 as required by `.nvmrc`.
- Limit product changes to the `client` package; documentation under `docs/superpowers` records the migration process.
- Pin `react` and `react-dom` to exactly `19.2.8`, `@types/react` to exactly `19.2.18`, and `@types/react-dom` to exactly `19.2.4`.
- Run and review both official guide codemods; never accept unrelated mechanical changes.
- Never hand-edit `client/package-lock.json`; regenerate it with npm.
- Never use `--legacy-peer-deps`, `--force`, or an npm override to hide peer incompatibility.
- Preserve current UI and data behavior; do not adopt unrelated React 19 features.
- Retain `react-table@7.8.0` as the sole documented React peer-range exception; its API migration is out of scope.
- Treat the baseline five audit findings (two moderate and three high) as pre-existing; do not introduce additional findings.
- All added or upgraded direct packages use MIT or Apache-2.0 licenses, compatible with Coop's Apache-2.0 license.
- Add `Co-Authored-By: Amp` to agent-authored commits.

## File Map

- `client/package.json`: declares React, React types, testing tools, and React-facing dependencies.
- `client/package-lock.json`: npm-generated reproducible dependency graph.
- `client/src/index.tsx`: application provider composition; remove the unused React Query provider.
- `client/src/webpages/dashboard/mrt/queue_routing/ManualReviewQueueRoutingRule.tsx`: drag handle type import and one scoped JSX type.
- `client/src/webpages/dashboard/mrt/queue_routing/RoutingRulesControlPanel.tsx`: drag-and-drop component imports.
- `client/src/components/common/CopyTextComponent.tsx`: two global JSX element types.
- `client/src/webpages/dashboard/mrt/manual_review_job/v2/ManualReviewJobMagnifyImageComponent.tsx`: two global JSX element types.
- `client/src/utils/useOutsideClick.ts`: zero-argument `useRef` call removed by React 19 types.

---

### Task 1: Stage React 18.3 and modernize the test renderer

**Files:**

- Modify: `client/package.json`
- Modify: `client/package-lock.json`

**Interfaces:**

- Consumes: the passing React 18.2 baseline of 32 test files and 204 passing tests.
- Produces: a React 18.3 client whose test suite renders through `createRoot` and emits no `ReactDOM.render is no longer supported` warning.

- [ ] **Step 1: Install the React 18 warning release exactly**

Run from `client`:

```bash
npm install --save-exact react@18.3.1 react-dom@18.3.1
```

Expected: `package.json` records `18.3.1` without a caret and npm regenerates `package-lock.json` without an `ERESOLVE` failure.

- [ ] **Step 2: Run the React 18.3 warning pass before changing test infrastructure**

```bash
npm run test:prepush 2>&1 | tee /tmp/coop-react-18.3-before-testing-library.log
rg -n 'ReactDOM\.render is no longer supported' /tmp/coop-react-18.3-before-testing-library.log
```

Expected: all 204 tests still pass, and `rg` finds the existing renderer deprecation warning. Record any additional React-specific warning before continuing.

- [ ] **Step 3: Upgrade React Testing Library and install its required DOM peer**

```bash
npm install --save-dev @testing-library/react@16.3.2 @testing-library/dom@10.4.1
```

Expected `package.json` entries:

```json
"@testing-library/dom": "^10.4.1",
"@testing-library/react": "^16.3.2"
```

- [ ] **Step 4: Prove the modern test renderer removes the deprecated mount path**

```bash
npm run test:prepush 2>&1 | tee /tmp/coop-react-18.3-after-testing-library.log
! rg 'ReactDOM\.render is no longer supported' /tmp/coop-react-18.3-after-testing-library.log
```

Expected: 32 test files and 204 tests pass, and the negated `rg` exits successfully because the warning is gone.

- [ ] **Step 5: Verify the staged dependency boundary**

```bash
npm run lint
npm run build
git diff --check
```

Expected: each command exits 0. Existing ESLint and bundle-size warnings are acceptable; new errors are not.

- [ ] **Step 6: Commit the React 18.3 warning stage**

```bash
git add client/package.json client/package-lock.json
git commit -m "Prepare client tests for React 19

Co-Authored-By: Amp"
```

---

### Task 2: Align React-facing dependencies and remove obsolete providers

**Files:**

- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: `client/src/index.tsx:15-17,147-162`
- Modify: `client/src/webpages/dashboard/mrt/queue_routing/ManualReviewQueueRoutingRule.tsx:8-12`
- Modify: `client/src/webpages/dashboard/mrt/queue_routing/RoutingRulesControlPanel.tsx:1-6`
- Test: `client/src/coop-ui/Calendar.test.tsx`
- Test: `client/src/coop-ui/Drawer.test.tsx`

**Interfaces:**

- Consumes: React 18.3 and React Testing Library 16 from Task 1.
- Produces: React-facing dependencies whose declared peers include React 19, except for the approved `react-table` v7 exception.

- [ ] **Step 1: Replace archived and unused packages**

Run from `client`:

```bash
npm uninstall react-beautiful-dnd react-query
npm uninstall --save-dev @types/react-beautiful-dnd
npm install @hello-pangea/dnd@18.0.1
```

Expected: `react-beautiful-dnd`, `react-query`, and `@types/react-beautiful-dnd` disappear from `package.json`; `@hello-pangea/dnd` appears under `dependencies`.

- [ ] **Step 2: Upgrade packages on their React 19-compatible release lines**

```bash
npm install \
  @tiptap/react@2.27.2 \
  @tiptap/starter-kit@2.27.2 \
  next-themes@0.4.6 \
  react-day-picker@8.10.2 \
  react-helmet-async@3.0.0 \
  recharts@2.15.4 \
  sonner@1.7.4 \
  vaul@1.1.2
```

Expected: npm completes without forced resolution. Tiptap, React Day Picker, Recharts, and Sonner remain on their existing major lines.

- [ ] **Step 3: Remove the unused React Query provider**

In `client/src/index.tsx`, remove:

```tsx
import { QueryClient, QueryClientProvider } from 'react-query';
```

Remove:

```tsx
const queryClient = new QueryClient();
```

Replace the root render tree with:

```tsx
root.render(
  <HelmetProvider>
    <ApolloProvider client={client}>
      <TooltipProvider>
        <App />
        <Toast position="bottom-right" />
      </TooltipProvider>
    </ApolloProvider>
  </HelmetProvider>,
);
```

- [ ] **Step 4: Switch the routing UI to the maintained DnD fork**

In `client/src/webpages/dashboard/mrt/queue_routing/ManualReviewQueueRoutingRule.tsx`, replace the type import with:

```tsx
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
```

In `client/src/webpages/dashboard/mrt/queue_routing/RoutingRulesControlPanel.tsx`, replace the component import with:

```tsx
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
```

Do not change the render-prop structure, reorder callback, draggable IDs, or drag-disabled conditions.

- [ ] **Step 5: Run focused UI regression tests**

```bash
npx vitest run \
  src/coop-ui/Calendar.test.tsx \
  src/coop-ui/Drawer.test.tsx \
  --passWithNoTests
```

Expected: all six tests pass, covering the upgraded React Day Picker and Vaul wrappers.

- [ ] **Step 6: Verify all dependency-backed source code under React 18.3**

```bash
npm run lint
npm run test:prepush
npm run build
rg -n "react-beautiful-dnd|from ['\"]react-query['\"]" src package.json || true
git diff --check
```

Expected: lint, tests, and build exit 0. The final `rg` prints no matches.

- [ ] **Step 7: Commit the compatibility dependency layer**

```bash
git add \
  client/package.json \
  client/package-lock.json \
  client/src/index.tsx \
  client/src/webpages/dashboard/mrt/queue_routing/ManualReviewQueueRoutingRule.tsx \
  client/src/webpages/dashboard/mrt/queue_routing/RoutingRulesControlPanel.tsx
git commit -m "Align client dependencies with React 19

Co-Authored-By: Amp"
```

---

### Task 3: Install React 19 and apply the official codemods

**Files:**

- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: `client/src/components/common/CopyTextComponent.tsx:1-20`
- Modify: `client/src/utils/useOutsideClick.ts:1-15`
- Modify: `client/src/webpages/dashboard/mrt/queue_routing/ManualReviewQueueRoutingRule.tsx:8-36`
- Modify: `client/src/webpages/dashboard/mrt/manual_review_job/v2/ManualReviewJobMagnifyImageComponent.tsx:1-35`

**Interfaces:**

- Consumes: the React 19-compatible dependency layer from Task 2.
- Produces: a compiling React 19.2.8 application with scoped JSX types and mutable initialized refs.

- [ ] **Step 1: Install React 19 and matching type packages exactly**

Run from `client`:

```bash
npm install --save-exact react@19.2.8 react-dom@19.2.8
npm install --save-dev --save-exact @types/react@19.2.18 @types/react-dom@19.2.4
```

Expected: npm may warn that `react-table@7.8.0` declares peers only through React 18. It must not fail resolution, install a second React version, or report another direct unsupported React peer.

- [ ] **Step 2: Demonstrate the React 19 type migration is needed**

```bash
npm run lint 2>&1 | tee /tmp/coop-react-19-before-codemods.log
```

Expected: the command fails on React 19 type changes such as global `JSX`, zero-argument `useRef`, or other concrete incompatibilities. Preserve the output for comparison; do not suppress errors.

- [ ] **Step 3: Run the official runtime migration recipe from the guide**

```bash
npx codemod@latest react/19/migration-recipe
git diff --stat
git diff -- client/src
```

Expected: the recipe scans the client. It may be a no-op because application code already uses `createRoot` and the modern JSX transform. Reject any unrelated formatting or generated GraphQL changes.

- [ ] **Step 4: Run the official React 19 TypeScript codemod**

```bash
npx types-react-codemod@latest preset-19 ./src
git diff --stat
git diff -- client/src
```

Expected: changes are limited to React 19 type compatibility. `client/src/graphql/generated.ts` must remain untouched.

- [ ] **Step 5: Normalize the codemod result to the repository's existing import style**

Ensure `client/src/components/common/CopyTextComponent.tsx` uses:

```tsx
import { ReactElement, useState } from 'react';

// In props:
displayValue?: string | ReactElement;
footerItems?: ReactElement[];
```

Ensure `client/src/webpages/dashboard/mrt/manual_review_job/v2/ManualReviewJobMagnifyImageComponent.tsx` uses:

```tsx
import { ReactElement, useContext, useMemo } from 'react';

// In props:
fallbackComponent: ReactElement;
footerComponent?: ReactElement;
```

Because `ManualReviewQueueRoutingRule.tsx` already imports the React namespace, ensure its icon prop is:

```tsx
icon: React.JSX.Element;
```

Ensure `client/src/utils/useOutsideClick.ts` initializes the ref without the deprecated mutable-ref cast:

```tsx
const ref = useRef<HTMLInputElement>(null);
```

- [ ] **Step 6: Confirm all guide-sensitive source patterns are gone**

```bash
rg -n --glob '*.{ts,tsx,js,jsx}' \
  'ReactDOM\.(render|hydrate|findDOMNode|unmountComponentAtNode)|react-dom/test-utils|react-test-renderer/shallow|createFactory\(|\.contextTypes\s*=|\.childContextTypes\s*=|getChildContext\s*\(' \
  src || true
rg -n --glob '*.{ts,tsx}' 'useRef\(\)|(^|[^.[:alnum:]_])JSX\.' src || true
```

Expected: both searches print no matches. The second expression rejects the removed global `JSX` namespace while allowing scoped `React.JSX` references.

- [ ] **Step 7: Run the complete React 19 client checks**

```bash
npm run lint
npm run test:prepush 2>&1 | tee /tmp/coop-react-19-tests.log
! rg 'ReactDOM\.render is no longer supported|outdated JSX transform' /tmp/coop-react-19-tests.log
npm run build
git diff --check
```

Expected: lint, 32 test files with 204 passing tests, warning assertion, build, and diff check all exit 0. Existing Apollo diagnostic output and React Router future-flag warnings are baseline noise, not React 19 failures.

- [ ] **Step 8: Commit the React 19 core migration**

```bash
git add \
  client/package.json \
  client/package-lock.json \
  client/src/components/common/CopyTextComponent.tsx \
  client/src/utils/useOutsideClick.ts \
  client/src/webpages/dashboard/mrt/queue_routing/ManualReviewQueueRoutingRule.tsx \
  client/src/webpages/dashboard/mrt/manual_review_job/v2/ManualReviewJobMagnifyImageComponent.tsx
git commit -m "Upgrade client to React 19

Co-Authored-By: Amp"
```

---

### Task 4: Prove reproducibility, dependency safety, and browser startup

**Files:**

- Verify: `client/package.json`
- Verify: `client/package-lock.json`
- Verify: all modified client source files

**Interfaces:**

- Consumes: the committed React 19 client from Task 3.
- Produces: reproducible installation, documented dependency state, and final release confidence.

- [ ] **Step 1: Reinstall exclusively from the generated lockfile**

Run from `client`:

```bash
npm ci 2>&1 | tee /tmp/coop-react-19-npm-ci.log
```

Expected: exit 0 without `ERESOLVE`, `--legacy-peer-deps`, or lockfile mutation. A peer warning attributable only to `react-table@7.8.0` is the approved exception.

- [ ] **Step 2: Inspect the installed React graph**

```bash
npm ls react react-dom --all 2>&1 | tee /tmp/coop-react-19-tree.log || true
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const roots = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.bin') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name === 'react') {
      const packagePath = path.join(fullPath, 'package.json');
      if (fs.existsSync(packagePath)) {
        roots.push([fullPath, require(path.resolve(packagePath)).version]);
      }
    }
    if (entry.isDirectory() && (entry.name === 'node_modules' || directory.endsWith('node_modules'))) {
      walk(fullPath);
    }
  }
}
walk('node_modules');
const versions = [...new Set(roots.map(([, version]) => version))];
console.log(roots);
if (versions.length !== 1 || versions[0] !== '19.2.8') process.exit(1);
NODE
```

Expected: every installed `react` package resolves to 19.2.8. Review `/tmp/coop-react-19-tree.log`; any invalid peer other than `react-table@7.8.0` blocks completion.

- [ ] **Step 3: Compare the security result with the baseline**

```bash
npm audit --json > /tmp/coop-react-19-audit.json || test $? -eq 1
node - <<'NODE'
const audit = require('/tmp/coop-react-19-audit.json');
const counts = audit.metadata.vulnerabilities;
console.log(counts);
if (counts.total > 5 || counts.moderate > 2 || counts.high > 3 || counts.critical > 0) {
  process.exit(1);
}
NODE
```

Expected: no critical finding and no increase over the baseline of two moderate and three high findings. Do not run `npm audit fix` as part of this scoped migration.

- [ ] **Step 4: Verify direct dependency licenses**

```bash
node - <<'NODE'
const packages = [
  'react',
  'react-dom',
  '@testing-library/react',
  '@testing-library/dom',
  '@hello-pangea/dnd',
  '@tiptap/react',
  '@tiptap/starter-kit',
  'next-themes',
  'react-day-picker',
  'react-helmet-async',
  'recharts',
  'sonner',
  'vaul',
];
const allowed = new Set(['MIT', 'Apache-2.0']);
for (const name of packages) {
  const metadata = require(`./node_modules/${name}/package.json`);
  console.log(`${name}@${metadata.version}: ${metadata.license}`);
  if (!allowed.has(metadata.license)) process.exitCode = 1;
}
NODE
```

Expected: every package reports MIT or Apache-2.0.

- [ ] **Step 5: Run final checks after the clean install**

```bash
npm run lint
npm run test:prepush
npm run build
git status --short
```

Expected: all checks exit 0 and `git status --short` prints nothing.

- [ ] **Step 6: Smoke-test browser startup without user intervention**

Start Vite on loopback:

```bash
npm run start -- --host 127.0.0.1
```

Using browser tooling, navigate to `http://127.0.0.1:3000/login`. Expected: the login application renders, static assets load, and the console contains no React 19 compatibility error, outdated JSX-transform warning, or uncaught render error. If authenticated backend data is unavailable, record that drag-and-drop interaction could not be exercised manually; the production build and type checks remain mandatory.

- [ ] **Step 7: Review the final branch diff**

```bash
git log --oneline main..HEAD
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: two documentation commits and three implementation commits; changes are limited to the approved spec/plan documents, client dependency manifests, and the source files listed in this plan.
