# WeStride Design

[design.westride.org](https://design.westride.org)

Storybook for the WeStride brand and the Astryx components used to build the platform.

Brand covers the identity: the logo system, brand icon, color palette, Figtree typography, and the tagline. Foundations cover the WeStride theme tokens that product screens use. Components are the Astryx pieces to compose with.

The identity itself lives in `packages/theme` (`@westride/theme`): the palette, type, and tagline constants, and the `westride` Astryx theme that publishes the palette as `--color-brand-*` tokens. Change the brand there, run `bun run build --cwd packages/theme`, and every app picks it up.

```bash
bunx turbo run dev --filter=design
bunx turbo run build --filter=design
```

`dev` serves Storybook at http://localhost:6006. `build` writes a static site to `apps/design/storybook-static`, which is what design.westride.org should host.
