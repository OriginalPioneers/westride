# WeStride Design

[design.westride.org](https://design.westride.org)

Storybook for the WeStride brand and the Astryx components used to build the platform.

Brand covers the identity: color, the wordmark, and the stamp. Foundations cover the Stone theme tokens that product screens use. Components are the Astryx pieces to compose with.

```bash
bunx turbo run dev --filter=design
bunx turbo run build --filter=design
```

`dev` serves Storybook at http://localhost:6006. `build` writes a static site to `apps/design/storybook-static`, which is what design.westride.org should host.
