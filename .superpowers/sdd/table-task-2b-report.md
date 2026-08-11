# Task 2b report

Status: DONE

Commit: recorded after commit below.

## Files and conversion decisions

- Migrated all 22 File Map consumers from v7 column keys to native v8 keys and replaced all seven direct `react-table` type imports with the app-facing `TableRow`/`TableColumnDef` exports.
- Preserved accessor names, order, sorting direction, renderer callbacks, raw `row.original.values` reads, row links, and selection callbacks.
- Moved filter renderers into `meta.filter`, retained filter function names, and removed the obsolete Manual Review Decisions `@ts-ignore`.
- Added the investigation result row's missing raw `values` object so its existing custom filters/sorts have their required raw source.
- Added a shared v8 `defaultColumn.cell` renderer so React-node accessor values retain v7 rendering behavior while explicit native cell callbacks still override it.
- Refined the existing faceting test's helper and DOM element types exposed by the first complete test TypeScript pass.

## Verification

- `npm ci`: passed; 1021 packages installed, 1023 audited.
- `npm run lint`: passed with 0 errors and 280 pre-existing warnings.
- Focused Table test: 6 passed.
- `npm run test:prepush`: 33 files passed; 210 passed, 2 skipped.
- Regression discovered during full suite: MergedReports initially exposed v8's default React-node stringification; after the shared default-cell fix its focused 2 tests passed and the complete suite passed.
- `npm run build`: passed; 8477 modules transformed.
- `npm ls`: exactly `@tanstack/react-table@8.21.3`, `react@18.2.0`, and `react-dom@18.2.0`; no legacy `react-table` package.
- Audit: npm status 1 with exactly 5 findings (2 moderate, 3 high), within threshold.
- `git diff --check`: passed.
- Both generated GraphQL guards: passed and unstaged.

## Searches and self-review

- No v7 package/import match remains in `src`, `package.json`, or `package-lock.json`.
- The legacy-key search matches only application filter metadata, filter-renderer `accessor` arguments, and an unrelated action-history `filter` object; every match was inspected and is not a legacy column key.
- Reviewed the 24-file Task 2b diff and combined v8 state for column order, raw-value behavior, callbacks, package versions, generated files, and scope. No v9 API, dependency, generated GraphQL, or unrelated cleanup was introduced.

## Concerns

- Tests continue to emit existing ReactDOM.render, React Router future-flag, Apollo mock, and jsdom warnings.
- Build continues to emit existing eval and chunk-size warnings.
