import {defineTheme} from '@astryxdesign/core/theme';
import {stoneTheme} from '@astryxdesign/theme-stone/built';
import {brandColors, brandPastels} from './brand';

const SANS_FALLBACKS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * WeStride's product theme: Stone's surfaces and semantics, set in Figtree
 * (the brand's only typeface), with the identity palette published as
 * `--color-brand-*` tokens for the logo, marketing bands, and brand moments,
 * and its pastel tints as `--color-brand-pastel-*` tokens that follow the
 * light or dark mode. Product controls stay on Stone's semantic tokens.
 */
export const westrideTheme = defineTheme({
  name: 'westride',
  extends: stoneTheme,

  // `typography` replaces the base config, so Stone's scale is restated here.
  typography: {
    scale: {base: 14, ratio: 1.25},
    body: {family: 'Figtree', fallbacks: SANS_FALLBACKS},
    heading: {
      family: 'Figtree',
      fallbacks: SANS_FALLBACKS,
      weights: {3: 'bold', 4: 'bold'},
    },
    code: {
      family: 'JetBrains Mono',
      fallbacks: '"SF Mono", Monaco, Consolas, monospace',
    },
  },

  localTokens: Object.fromEntries([
    ...brandColors.map((color) => [color.token, color.hex]),
    ...brandPastels.map((pastel) => [
      pastel.token,
      `light-dark(${pastel.hex}, ${pastel.darkHex})`,
    ]),
  ]),
});
