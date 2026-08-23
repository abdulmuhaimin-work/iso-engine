# iso-engine

TypeScript + Vite framework for isometric Canvas 2D web games. Pure client-side project — no backend, database, or external services.

## Cursor Cloud specific instructions

- Dependencies are installed via the update script (`npm install`). Node 22 and npm 10 are already available.
- There is **no lint script and no test suite**. Type checking via `tsc` is the effective static-analysis gate. Run `npx tsc --noEmit` to type-check, or `npm run build` (which runs `tsc && vite build`).
- Run the dev server with `npm run dev` (Vite on port `5173`). The Vite config sets `open: true`; in a headless VM this just prints a harmless "unable to open browser" style notice and the server keeps serving — do not treat it as an error.
- The project serves four separate HTML entry points, all under the same dev server:
  - `/` — interactive resume (default homepage)
  - `/demo.html` — harbor city demo
  - `/editor.html` — tilemap editor
  - `/builder.html` — brick / prop builder
  - Convenience scripts `npm run demo` / `npm run editor` / `npm run builder` just launch Vite with `--open` pointed at the respective page.
- Core functionality is browser-interactive (click-to-move on an isometric canvas with A* pathfinding), so verifying changes generally requires loading a page in a browser rather than a headless check.
