---
title: 'Config v5'
description: Modern config and themes with @tamagui/config/v5
---

<IntroParagraph>
  The recommended Tamagui configuration gives you a complete design system, flexible theme
  generation, Tailwind aligned shorthands, multiple animation drivers, and easy
  customization.
</IntroParagraph>

V5 builds on v4 with more colors, theme helpers, and expanded media queries.
Migration from v4 is straightforward - see
[what's changed](#whats-different-from-v4).

First install the config package:

```bash
npm install @tamagui/config
```

### Changes from v4

- **Animations not bundled** - Import separately from `v5-css`, `v5-rn`,
  `v5-reanimated`, or `v5-motion`. See
  [Choosing an Animation Driver](#choosing-an-animation-driver).
- **Media query naming** - `2xl`/`2xs` → `xxl`/`xxs`/`xxxs`. Max queries use
  kebab-case: `max2Xl` → `max-xxl`.
- **`styleCompat: 'react-native'`** - `flex` now uses `flexBasis: 0` by default
  (v4 used `'legacy'` with `flexBasis: auto`).
- **`defaultPosition` not set** - Defaults to browser `static` instead of v4's
  `'relative'`. You can still set it in your config.

### New Features

- **More color themes**: gray, blue, red, yellow, green, orange, pink, purple,
  teal, neutral (v4 had blue, red, yellow, green, black, white)
- **More theme colors**: `shadow1`-`shadow8`, `highlight1`-`highlight8`,
  `background01`/`background001` through `background08`, `color01`/`color001`,
  `white0`/`white02`-`white08`, `black0`/`black02`-`black08`, and more
- **More animation values**: timing presets from `0ms` to `500ms`, plus named
  springs like `quick`, `bouncy`, `lazy`, and variants like `quickLessBouncy`
- **`createV5Theme` helper** for easy theme customization and swapping colors
- **`getTheme` callback** in `createV5Theme` for computing custom values across
  every theme automatically based on each theme's palette and scheme
- **Easier theme swapping**: pass only the `childrenThemes` you want to
  `createV5Theme` to replace or extend the default color set
- **Height-based media queries**: `height-sm`, `height-md`, `height-lg` and max variants
- **`touch`** and **`hoverable`** media queries for device capability detection
- **Color utilities**: `adjustPalette`, `adjustPalettes` for transforming
  palettes
- **Radix Colors v3** with improved accessibility (v4 used legacy Radix)

### Migrating from v4

To restore v4 behavior while using v5:

```tsx fileName="tamagui.config.ts"
import { defaultConfig } from '@tamagui/config/v5'
import { animations } from '@tamagui/config/v5-css'
import { createTamagui } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  animations,
  settings: {
    ...defaultConfig.settings,
    styleCompat: 'legacy',
    defaultPosition: 'relative',
  },
})
```

Update media query names in your code: `$2xl` → `$xxl`, `$2xs` → `$xxs`,
`$max2Xl` → `$max-xxl`.

---

## Choosing an Animation Driver

V5 provides separate entry points for different animation drivers, so you only
bundle what you need:

```tsx fileName="tamagui.config.ts"
import { defaultConfig } from '@tamagui/config/v5'
import { animations } from '@tamagui/config/v5-css'
import { createTamagui } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  animations,
})
```

Available animation drivers:

- **`@tamagui/config/v5-css`** - CSS animations (smallest bundle, great for web)
- **`@tamagui/config/v5-motion`** - Motion animations (spring physics, smooth)
- **`@tamagui/config/v5-rn`** - React Native Animated API
- **`@tamagui/config/v5-reanimated`** - Reanimated (best native performance)

<Notice>
  The base `@tamagui/config/v5` export includes no animations. Import animations
  separately from one of the driver entry points above.
</Notice>

### Cross-Platform Animation Setup

For apps targeting both web and native, you can use different animation drivers
per platform:

```tsx fileName="tamagui.config.ts"
import { defaultConfig } from '@tamagui/config/v5'
import { animations as animationsCSS } from '@tamagui/config/v5-css'
import { animations as animationsReanimated } from '@tamagui/config/v5-reanimated'
import { createTamagui, isWeb } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animationsCSS : animationsReanimated,
})
```

This gives you CSS animations on web (smaller bundle, better performance) and
Reanimated on native (smooth 60fps animations).

### Available Animations

All v5 animation drivers include these preset animations:

**Timing animations** (fixed duration):

<PropsTable
  data={[
    { name: '0ms', description: 'Instant (0ms)' },
    { name: '50ms', description: '50 milliseconds' },
    { name: '75ms', description: '75 milliseconds' },
    { name: '100ms', description: '100 milliseconds' },
    { name: '200ms', description: '200 milliseconds' },
    { name: '250ms', description: '250 milliseconds' },
    { name: '300ms', description: '300 milliseconds' },
    { name: '400ms', description: '400 milliseconds' },
    { name: '500ms', description: '500 milliseconds' },
  ]}
/>

**Spring animations** (physics-based):

<PropsTable
  data={[
    { name: 'superBouncy', description: 'Very bouncy, playful spring' },
    { name: 'bouncy', description: 'Bouncy spring with natural feel' },
    { name: 'superLazy', description: 'Very slow, heavy spring' },
    { name: 'lazy', description: 'Slow, relaxed spring' },
    { name: 'medium', description: 'Balanced spring for general use' },
    { name: 'slowest', description: 'Slowest spring animation' },
    { name: 'slow', description: 'Slow spring animation' },
    { name: 'quick', description: 'Fast, responsive spring' },
    { name: 'quickLessBouncy', description: 'Quick with minimal overshoot' },
    { name: 'quicker', description: 'Faster spring' },
    { name: 'quickerLessBouncy', description: 'Faster with minimal overshoot' },
    { name: 'quickest', description: 'Fastest spring' },
    {
      name: 'quickestLessBouncy',
      description: 'Fastest with minimal overshoot',
    },
  ]}
/>

---

## Customizing Themes with createV5Theme

The `createV5Theme` function lets you customize the default v5 themes. The
easiest way to add or change colors is using `@tamagui/colors` which provides
Radix color palettes:

```tsx fileName="tamagui.config.ts"
import { createV5Theme, defaultChildrenThemes, defaultConfig } from '@tamagui/config/v5'
import { cyan, cyanDark, amber, amberDark } from '@tamagui/colors'
import { createTamagui } from 'tamagui'

const themes = createV5Theme({
  childrenThemes: {
    // include defaults (blue, red, green, yellow, etc.)
    ...defaultChildrenThemes,
    // add new colors
    cyan: { light: cyan, dark: cyanDark },
    amber: { light: amber, dark: amberDark },
  },
})

export const config = createTamagui({
  ...defaultConfig,
  themes,
})
```

Or use only the colors you need:

```tsx fileName="tamagui.config.ts"
import { createV5Theme } from '@tamagui/config/v5'
import { blue, blueDark, gray, grayDark } from '@tamagui/colors'

// minimal theme with just blue and gray
const themes = createV5Theme({
  childrenThemes: {
    blue: { light: blue, dark: blueDark },
    gray: { light: gray, dark: grayDark },
  },
})
```

### createV5Theme Options

<PropsTable
  data={[
    {
      name: 'childrenThemes',
      type: 'Record<string, { light: ColorObject, dark: ColorObject }>',
      description:
        'Color themes to include. Use defaultChildrenThemes to include defaults, or pass only the colors you need. Works directly with @tamagui/colors.',
    },
    {
      name: 'darkPalette',
      type: 'string[]',
      description: 'Override the dark base palette (12 colors from darkest to lightest)',
    },
    {
      name: 'lightPalette',
      type: 'string[]',
      description: 'Override the light base palette (12 colors from lightest to darkest)',
    },
    {
      name: 'grandChildrenThemes',
      type: 'Record<string, { template: string }>',
      description: 'Override grandChildren themes (alt1, alt2, surface1, etc.)',
    },
    {
      name: 'componentThemes',
      type: 'false | ComponentThemes',
      default: 'false',
      description:
        'Component themes (defaults to false in v5). We recommend using defaultProps instead.',
    },
    {
      name: 'getTheme',
      type: '(info: { palette: string[], scheme: "light" | "dark" }) => Record<string, string>',
      description:
        "Callback that runs for every generated theme, letting you compute custom values based on each theme's palette and color scheme. The default uses this to generate opacity variants like color01, background001, etc.",
    },
  ]}
/>

### Customizing Every Theme with getTheme

The `getTheme` option lets you add computed colors to every generated theme. It
receives each theme's palette and scheme, so your custom values automatically
adapt to every color and light/dark variant:

```tsx fileName="tamagui.config.ts"
import { createV5Theme, opacify } from '@tamagui/config/v5'

const themes = createV5Theme({
  getTheme: ({ palette, scheme }) => {
    const bg = palette[7]
    const fg = palette[palette.length - 2]
    return {
      // add your own computed theme values
      myOverlay: opacify(bg, 0.5),
      mySubtleText: opacify(fg, 0.6),
    }
  },
})
```

This is how v5 generates its built-in opacity tokens (`background01`,
`color001`, etc.) — your custom `getTheme` merges on top of the defaults.

### Subtle Theme Variant

For a more muted look, use the subtle variant which has desaturated colors:

```tsx fileName="tamagui.config.ts"
import { defaultConfig, themes } from '@tamagui/config/v5-subtle'
import { createTamagui } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  themes,
})
```

### Custom Color Adjustments

Use `adjustPalette` to transform colors with a callback function. The callback
receives each color's HSL values and its 1-based index (1-12):

```tsx fileName="tamagui.config.ts"
import {
  adjustPalette,
  adjustPalettes,
  defaultChildrenThemes,
  createV5Theme,
} from '@tamagui/config/v5'

// adjust a single palette - desaturate and lighten
const mutedBlue = adjustPalette(blue, (hsl, i) => ({
  ...hsl,
  s: hsl.s * 0.7,
  l: Math.min(100, hsl.l * 1.1),
}))

// adjust multiple palettes at once with adjustPalettes
const mutedThemes = adjustPalettes(defaultChildrenThemes, {
  // 'default' applies to all colors not explicitly listed
  default: {
    light: (hsl, i) => ({ ...hsl, s: hsl.s * 0.8 }),
    dark: (hsl, i) => ({ ...hsl, s: hsl.s * 0.6, l: hsl.l * 0.9 }),
  },
  // override specific colors
  yellow: {
    light: (hsl) => ({ ...hsl, s: hsl.s * 0.5 }),
    dark: (hsl, i) => ({ ...hsl, s: hsl.s * (i <= 4 ? 0.3 : 0.8) }),
  },
  // skip adjustment for specific colors
  gray: undefined,
})

const themes = createV5Theme({ childrenThemes: mutedThemes })
```

The callback receives:

- `hsl` - object with `h` (hue 0-360), `s` (saturation 0-100), `l` (lightness
  0-100)
- `i` - 1-based index in the palette (1-12)

Use the index to apply different adjustments to background colors (1-4),
mid-tones (5-8), and foreground colors (9-12).

---

## Theme Values

V5 themes include a rich set of color values accessible via `$theme-*` tokens.

### Base Colors (color1-12)

Every theme includes 12 base colors that shift based on the theme:

```tsx
<View bg="$color1" />  // Lightest in light mode, darkest in dark mode
<View bg="$color6" />  // Mid-range
<View bg="$color12" /> // Darkest in light mode, lightest in dark mode
```

### Semantic Colors

Standard semantic values that adapt to each theme:

- `background`, `backgroundHover`, `backgroundPress`, `backgroundFocus`
- `color`, `colorHover`, `colorPress`, `colorFocus`
- `borderColor`, `borderColorHover`, `borderColorPress`, `borderColorFocus`
- `placeholderColor`, `outlineColor`

### Opacity Variants

Foreground and background colors with opacity variants. The naming uses the
opacity value without the decimal point (e.g., `01` = 10%, `0025` = 2.5%).

- `color01` (10%), `color0075` (7.5%), `color005` (5%), `color0025` (2.5%),
  `color002` (2%), `color001` (1%)
- `background01` (10%), `background0075` (7.5%), `background005` (5%),
  `background0025` (2.5%), `background002` (2%), `background001` (1%)
- `background02` (20%), `background04` (40%), `background06` (60%),
  `background08` (80%)

### White & Black (Fixed)

Always available regardless of theme, with opacity variants:

- `white`, `white0` (transparent), `white02`, `white04`, `white06`, `white08`
- `black`, `black0` (transparent), `black02`, `black04`, `black06`, `black08`
- `white1`-`white12`, `black1`-`black12` (12-step scales)

### Shadow & Highlight Colors

Pre-tuned shadow opacities (black) for light and dark modes:

- `shadow1` through `shadow8` (light shadows are subtler, dark are stronger)
- `shadowColor` - Default shadow color for the theme

Pre-tuned highlight opacities (white) for light and dark modes:

- `highlight1` through `highlight8` (matching shadow scale, useful for glows/overlays)

### Radix Color Scales

All color themes expose their full 12-step scale:

```tsx
<View bg="$blue5" />
<Text color="$red11" />
<View borderColor="$green7" />
```

Available scales: `gray1-12`, `blue1-12`, `red1-12`, `green1-12`, `yellow1-12`,
`orange1-12`, `pink1-12`, `purple1-12`, `teal1-12`

### Neutral Colors

The `neutral` scale maintains sufficient contrast on both light and dark
backgrounds - useful for text or UI that needs to work regardless of theme:

- `neutral1`-`neutral12`

### Accent Colors

Every theme includes an inverted accent scale for contrast elements:

- `accent1`-`accent12` - Inverted palette (light colors in dark mode, vice
  versa)
- `accentBackground`, `accentColor` - Quick access to accent bg/fg

```tsx
<Button theme="accent">Primary Action</Button>
<View bg="$accentBackground" color="$accentColor" />
```

---

## Color Themes

V5 includes these color themes by default:

- **Grayscale**: gray, neutral
- **Colors**: blue, green, red, yellow, orange, pink, purple, teal
- **Fixed**: black, white (generated from base palettes, don't change between
  light/dark)

Each color theme has 12 steps following the
[Radix Colors](https://www.radix-ui.com/colors) pattern.

Use any color theme with the `theme` prop:

```tsx
<Button theme="blue">Blue button</Button>
<Card theme="purple">Purple card</Card>
```

Access individual color values in any theme:

```tsx
<View bg="$orange5" borderColor="$teal7" />
<Text color="$pink11" />
```

---

## Templates

V5 includes default templates that control how theme values map to palette
indices. Available templates: `base`, `surface1`, `surface2`, `surface3`,
`alt1`, `alt2`, `inverse`.

For more details on how templates work, see the
[Creating Custom Themes Guide](/docs/guides/theme-builder).

## Component Themes

V5 keeps component themes because they solve a hard problem — how do you change
the theme of an entire area (like from `dark` to `dark_green`) but have the
components inside it still keep their relative shades?

One of the great things in Tamagui is being able to set component themes, and
sub-themes, and have an entire area of your UI re-theme and look perfect.

We'd exported just having the ability to set a default theme, like "surface1 =>
4", but then if you try and re-theme a component to `green`, that would
conflict. For example, if you made your default `<Button theme="surface3" />`,
then if someone uses it `<Button theme="green" />` now it's green, but not the
Button green that is typically stronger than your base green.

So for now we've left them on! We do want to move away from component themes in
general as they can be tricky to understand. But the benefits are also strong,
and until we find a great solution we're leaving them. You can always set
`componentThemes: false` in your `createV5Themes` function to turn it off.

---

## Settings

V5 config includes these default settings:

<PropsTable
  data={[
    { name: 'defaultFont', description: '"body"' },
    {
      name: 'fastSchemeChange',
      description:
        'true - Uses DynamicColorIOS on iOS for fast light/dark theme changes.',
    },
    {
      name: 'shouldAddPrefersColorThemes',
      description: 'true - Generates CSS for prefers-color-scheme.',
    },
    {
      name: 'allowedStyleValues',
      description: '"somewhat-strict-web" - Allows web-only values like vh, vw.',
    },
    {
      name: 'addThemeClassName',
      description: '"html" - Adds theme className to html tag for CSS variable access.',
    },
    {
      name: 'onlyAllowShorthands',
      description: 'true - Removes types for longhand versions of shorthands.',
    },
    {
      name: 'styleCompat',
      description:
        '"react-native" - Aligns flex defaults to React Native (flexBasis: 0).',
    },
  ]}
/>

---

## Media Queries

V5 includes an expanded set of media queries with height-based, max-width, and
min-width variants.

The `$sm` through `$xxl` breakpoints match Tailwind CSS exactly (640, 768, 1024,
1280, 1536), making it easy to work across both ecosystems. The smaller
breakpoints (`$xxxs`, `$xxs`, `$xs`) provide finer control below 640px, which is
especially useful for container queries where you need granularity at smaller
sizes.

### Min-Width (Mobile-First)

<PropsTable
  data={[
    { name: 'xxxs', description: 'minWidth: 260' },
    { name: 'xxs', description: 'minWidth: 340' },
    { name: 'xs', description: 'minWidth: 460' },
    { name: 'sm', description: 'minWidth: 640' },
    { name: 'md', description: 'minWidth: 768' },
    { name: 'lg', description: 'minWidth: 1024' },
    { name: 'xl', description: 'minWidth: 1280' },
    { name: 'xxl', description: 'minWidth: 1536' },
  ]}
/>

### Max-Width (Desktop-First)

<PropsTable
  data={[
    { name: 'max-xxxs', description: 'maxWidth: 260' },
    { name: 'max-xxs', description: 'maxWidth: 340' },
    { name: 'max-xs', description: 'maxWidth: 460' },
    { name: 'max-sm', description: 'maxWidth: 640' },
    { name: 'max-md', description: 'maxWidth: 768' },
    { name: 'max-lg', description: 'maxWidth: 1024' },
    { name: 'max-xl', description: 'maxWidth: 1280' },
    { name: 'max-xxl', description: 'maxWidth: 1536' },
  ]}
/>

### Height Min (Mobile-First)

<PropsTable
  data={[
    { name: 'height-sm', description: 'minHeight: 640' },
    { name: 'height-md', description: 'minHeight: 768' },
    { name: 'height-lg', description: 'minHeight: 1024' },
  ]}
/>

### Height Max (Desktop-First)

<PropsTable
  data={[
    { name: 'max-height-sm', description: 'maxHeight: 640' },
    { name: 'max-height-md', description: 'maxHeight: 768' },
    { name: 'max-height-lg', description: 'maxHeight: 1024' },
  ]}
/>

<Notice>
  Height queries have higher CSS specificity than width queries. When both match, height
  wins.
</Notice>

### Device Capability

<PropsTable
  data={[
    { name: 'touchable', description: 'pointer: coarse (touch devices)' },
    { name: 'hoverable', description: 'hover: hover (devices with hover capability)' },
  ]}
/>

These names describe intent rather than CSS implementation details — you're thinking
"is this a touch device?" not "what's the pointer media query name?" They also read
naturally in code:

```tsx
<Button
  $touchable={{ p: '$4', minH: 44 }}
  $hoverable={{ hoverStyle: { bg: '$color5' } }}
/>
```

On web, these aren't exact opposites. A laptop with a touchscreen might have
`pointer: fine` (trackpad as primary input) but still support touch. Having both
lets you target exactly what you mean.

<Notice>
  On native, `touch` is always true and `hoverable` is always false since you can't hover
  on a touchscreen.
</Notice>

---

## Shorthands

V5 includes Tailwind-aligned shorthands. With `onlyAllowShorthands: true` (the
default), only the short forms are available in types.

### Text

<PropsTable data={[{ name: 'text', description: 'textAlign' }]} />

### Layout & Spacing

<PropsTable
  data={[
    { name: 'p', description: 'padding' },
    { name: 'pt', description: 'paddingTop' },
    { name: 'pb', description: 'paddingBottom' },
    { name: 'pl', description: 'paddingLeft' },
    { name: 'pr', description: 'paddingRight' },
    { name: 'px', description: 'paddingHorizontal' },
    { name: 'py', description: 'paddingVertical' },
    { name: 'm', description: 'margin' },
    { name: 'mt', description: 'marginTop' },
    { name: 'mb', description: 'marginBottom' },
    { name: 'ml', description: 'marginLeft' },
    { name: 'mr', description: 'marginRight' },
    { name: 'mx', description: 'marginHorizontal' },
    { name: 'my', description: 'marginVertical' },
  ]}
/>

### Position & Size

<PropsTable
  data={[
    { name: 't', description: 'top' },
    { name: 'b', description: 'bottom' },
    { name: 'l', description: 'left' },
    { name: 'r', description: 'right' },
    { name: 'minW', description: 'minWidth' },
    { name: 'maxW', description: 'maxWidth' },
    { name: 'minH', description: 'minHeight' },
    { name: 'maxH', description: 'maxHeight' },
    { name: 'z', description: 'zIndex' },
  ]}
/>

### Flex & Alignment

<PropsTable
  data={[
    { name: 'grow', description: 'flexGrow' },
    { name: 'shrink', description: 'flexShrink' },
    { name: 'items', description: 'alignItems' },
    { name: 'self', description: 'alignSelf' },
    { name: 'content', description: 'alignContent' },
    { name: 'justify', description: 'justifyContent' },
  ]}
/>

### Other

<PropsTable
  data={[
    { name: 'bg', description: 'backgroundColor' },
    { name: 'rounded', description: 'borderRadius' },
    { name: 'select', description: 'userSelect' },
  ]}
/>

---

## Tree Shaking Themes

**Production Optimization** - Theme JS can grow to 20KB or more. Since Tamagui can hydrate themes from CSS variables, you can remove the themes JS from your client bundle for better Lighthouse scores.

This works because Tamagui generates CSS variables for all theme values. On the
client, it reads these from the DOM instead of needing the JS object.

### Setup

```tsx fileName="tamagui.config.ts"
import { defaultConfig, themes } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  // only load themes on server - client hydrates from CSS
  // for non-One Vite apps, use import.meta.env.SSR instead
  themes: process.env.VITE_ENVIRONMENT === 'client' ? ({} as typeof themes) : themes,
})
```

<Notice theme="green">
  This optimization requires server-side rendering. The CSS must be rendered on the server
  for the client to hydrate from it. Make sure you're using `config.getCSS()` or the
  bundler plugin's `outputCSS` option.
</Notice>

---

## Summary: v4 to v5 Migration Checklist

1. **Add animations import** - v5 doesn't bundle animations:
   ```tsx
   import { animations } from '@tamagui/config/v5-css'
   ```
2. **Update media query names** - `2xl` → `xxl`, `2xs` → `xxs`, `max2Xl` →
   `max-xxl`
3. **Review flex behavior** - v5 uses `flexBasis: 0` by default (React Native
   style)
4. **Review position** - v5 doesn't set `defaultPosition` (defaults to `static`)
5. **Review theme colors** - v5 uses Radix Colors v3 with slightly different
   values


---
title: Tokens
description: Accessing and using tokens
---

Tamagui lets you create tokens using `createTokens`, which is then passed to the `createTamagui` function as part of the [configuration](/docs/core/configuration) object.

## Getting Tokens

For example, if you define some tokens:

```tsx
const tokens = createTokens({
  size: {
    small: 10,
  },
})
```

After you pass that into `createTamagui`, you can access your tokens from anywhere using `getTokens`:

```tsx
import { getTokens } from '@tamagui/core'

getTokens().size.small
```

or

```tsx
getTokens().size['$small']
```

If you'd like just an object containing the prefixed (starting with `$`) or non-prefixed values, you can use the `prefixed` option:

```tsx
// only non-$
getTokens({ prefixed: false }).size.small
// only $
getTokens({ prefixed: true })['$size'].small
```

What is returned is of type `Variable`, which is what Tamagui turns all tokens and theme values into internally in order to give them CSS variable names, as well as other things:

```tsx
getTokens().size.small.val // returns 10
getTokens().size.small.variable // returns something like (--size-small), which matches the CSS rule inserted
```

Tamagui has some helpers that make working with variables easier, which are documented in [Exports](/docs/core/exports), namely [`getVariable`](/docs/core/exports#getvariable) which will return the CSS variable on web, but raw value on native, and `getVariableValue` which always returns the raw value.

### Color Tokens as Fallback Values for Themes

Color tokens are available as fallback values when you access a theme. So when you `useTheme()` and then access a value that isn't in the theme, it will check for a `tokens.color` with the matching name.

Think of it this way:

- Tokens are static and are your base values.
- Themes are dynamic, they can change in your React tree, and live above tokens.

If you are confused by Tamagui themes, don't be. You can avoid them altogether, or avoid learning them until later. Instead, you can just build your app using regular style props and leave out themes altogether. Or, simply use a `light` and a `dark` theme if you want light and dark mode in your app, but avoid using any nested themes.

## Using Tokens with Components

When using `styled` or any Tamagui component like `Stack`, you can access tokens directly. Just like with `useTheme`, it will first look for a theme value that matches, and if not it will fall back to a token.

Tokens are automatically applied to certain properties. For example, `size` tokens are applied to width and height. And of course `radius` to borderRadius.

Here's how they all apply:

<PropsTable
  title="How tokens apply to attributes"
  data={[
    {
      name: 'Size',
      description: 'width, height, minWidth, minHeight, maxWidth, maxHeight',
    },
    {
      name: 'zIndex',
      description: 'zIndex',
    },
    {
      name: 'Radius',
      description:
        'borderRadius, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius',
    },
    {
      name: 'Color',
      description:
        'color, backgroundColor, borderColor, borderBottomColor, borderTopColor, borderLeftColor, borderRightColor',
    },
    {
      name: 'Space',
      description: 'All properties not matched by the above.',
    },
  ]}
/>

## Specific Tokens

As of version 1.34, you can also define any custom token values you'd like:

```tsx
const tokens = createTokens({
  // ...other tokens
  icon: {
    small: 16,
    medium: 24,
    large: 32,
  },
})
```

And then access them using the new "specific tokens" syntax:

```tsx
export default () => (
  <Stack
    // access with the category first:
    width="$icon.small"
  />
)
```

This, like all token values, works the same with `styled`:

```tsx
import { styled, View } from '@tamagui/core'

export const MyView = styled(View, {
  width: '$icon.small',
})
```

When creating custom tokens, you can use the `px` helper to ensure values get proper pixel units on web while remaining as raw numbers on native:

```tsx
import { createTokens, px } from '@tamagui/core'

const tokens = createTokens({
  customSize: {
    small: px(100), // → "100px" on web, 100 on native
    medium: px(200),
    large: px(300),
  },
  opacity: {
    low: 0.25, // → 0.25 (unitless on both platforms)
    medium: 0.5,
    high: 0.75,
  },
})
```

<Notice theme="blue">
  The predefined token categories like `size`, `space`, and `radius` automatically add
  pixel units where appropriate, so you don't need to use the `px` helper for them.
</Notice>


---
title: Themes
description: Create themes and sub-themes
---

Themes map neatly to CSS variables: they are objects whose values you want to
contextually change at any point in your React tree. They are used either as the
first lookup for `$` prefixed style values, or with the `useTheme` hook
directly. Tamagui allows nesting themes - both the definition and at runtime. At
runtime Tamagui resolves theme values upwards, ultimately all the way back to
tokens.

For the recommended theme setup, see the [Config v5 docs](/docs/core/config-v5).

Once you've learned the basics here, be sure to
[check out the ThemeBuilder guide](/docs/guides/theme-builder) for generating
more interesting theme suites.

If you want to style `bento` or `tamagui` components: see
[Styling `tamagui` UI components](#styling-tamagui-components).

<Notice theme="green">
  If you want a copy-paste theme generation setup, [try this
  gist](https://gist.github.com/natew/3be503cc5990a1142d17ffadf86a134f) for a
  well-structured example.
</Notice>

You define a theme like this:

```tsx
const dark = {
  background: '#000',
  color: '#fff',
  // define any key to any string or number value
}
```

If you use tokens, you can share values from tokens down to themes. Tokens act
as fallback values for themes, like global CSS variables vs scoped ones:

```tsx
const tokens = createTokens({
  color: {
    black: '#000',
    white: '#fff',
  },
})

// theme:
const dark = {
  background: tokens.color.black,
  color: tokens.color.white,
}
```

### Sub-themes

One of the unique powers of Tamagui is theme nesting. Define a theme with a
name in the form of `parentName_subName` and Tamagui will let you nest themes,
with both `parentName` and `subName` being valid theme names.

You can do this as many times as you'd like. Here's an example of having three
levels:

- `dark_green_subtle`
- `light_green_subtle`

```tsx
<Theme name="dark">
  <Theme name="green">
    <Button theme="subtle">Hello world</Button>
  </Theme>
</Theme>
```

You can also access a specific sub-theme more specifically:

```tsx
<Theme name="dark">
  <Button theme="green_subtle">Hello world</Button>
</Theme>
```

In general you want your themes to all be the same shape - the same named keys
and typed values - but sub-themes can be sub-sets of parent themes. The
`useTheme` hook and style system will resolve missing keys upwards to parent
themes, and ultimately to tokens.

#### Component themes

Every Tamagui `styled()` component looks for its own specific theme if you pass
it the `name` property. For example:

```tsx
import { View, styled } from 'tamagui' // or '@tamagui/core'

const Circle = styled(View, {
  name: 'Circle',
  backgroundColor: '$background',
})
```

The `name` attribute will be removed from the defaultProps and used internally
by Tamagui to check for a sub-theme that ends with `_Circle`.

Now you can create the default theme for all Circle components at any level of
nesting:

```tsx
const dark_Circle = {
  background: 'darkred',
  color: 'white',
}

const light_Circle = {
  background: 'lightred',
  color: 'black',
}
```

<Notice theme="blue">Component themes must have the first letter capitalized.</Notice>

- `dark_Circle`
- `dark_green_Circle`
- `dark_green_subtle_Circle`

This is an incredibly powerful and unique feature that allows authors of UI
components control over design, while still letting users customize them
completely.

---

### Styling Tamagui UI components

Tamagui comes in two parts: a core library and a full UI kit. The core library
(`@tamagui/core`) is flexible and doesn't have many rules. But the full UI kit
(`tamagui`) has some standard ways of doing things. This helps make everything
work well together.

In the `tamagui` UI kit, all components use these main theme keys:

- `background`: for background colors
- `color`: for text colors
- `borderColor`: for border colors
- `shadowColor`: for shadow colors
- `placeholderColor`: for placeholder text colors (doesn't change when you
  interact with it)

It also uses special versions of these for when you hover, press, or focus on
something. For example, `backgroundHover` or `colorPress`.

These keys help standardize how you style components, and make for easy
re-theming. They are also optional, if you find the theme system too complex for
your use case, you can always just use plain old style props

...plus all the pseudo variants for each, eg, `backgroundHover`,
`backgroundPress`, and `backgroundFocus`.

This means that you can easily re-theme `tamagui`'s UI kit and your own
components together in both light and dark mode.

A minimal theme might look like this:

```tsx
const dark = {
  // Standard keys for all components
  background: '#000',
  backgroundHover: '#111',
  backgroundPress: '#222',
  backgroundFocus: '#333',
  backgroundStrong: '#444',
  backgroundTransparent: 'rgba(0, 0, 0, 0.5)',
  color: '#fff',
  colorHover: '#eee',
  colorPress: '#ddd',
  colorFocus: '#ccc',
  colorTransparent: 'rgba(255, 255, 255, 0.5)',
  borderColor: '#555',
  borderColorHover: '#666',
  borderColorFocus: '#777',
  borderColorPress: '#888',
  placeholderColor: '#999',
  outlineColor: '#aaa',
  // Custom tokens like "brand"
  brandBackground: '#000', // You can add your own tokens like "brand"
  brandColor: '#fff', // and use them in your components
}

const light = {
  // Standard keys for all components
  background: '#fff',
  backgroundHover: '#f5f5f5',
  backgroundPress: '#e0e0e0',
  backgroundFocus: '#d5d5d5',
  backgroundStrong: '#ccc',
  backgroundTransparent: 'rgba(255, 255, 255, 0.5)',
  color: '#000',
  colorHover: '#111',
  colorPress: '#222',
  colorFocus: '#333',
  colorTransparent: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#444',
  borderColorHover: '#555',
  borderColorFocus: '#666',
  borderColorPress: '#777',
  placeholderColor: '#888',
  outlineColor: '#999',
  // Custom tokens like "brand"
  brandBackground: '#000', // You can add your own tokens like "brand"
  brandColor: '#fff', // and use them in your components
}
```

You can of course do all of this yourself in your own design system with
`styled`:

If you are building a component with more than one sub-components, you can
follow this pattern:

```tsx
import { GetProps, View, Text, styled } from 'tamagui' // or '@tamagui/core'

const ButtonFrame = styled(View, {
  name: 'Button',
  backgroundColor: '$background',
})

const ButtonText = styled(Text, {
  name: 'ButtonText',
  color: '$color',
})

type ButtonProps = GetProps<typeof ButtonFrame>

// styleable() wraps a functional component so it can be further styled with styled()
// see /docs/core/styled#styleable for full documentation
export const Button = ButtonFrame.styleable<ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <ButtonFrame ref={ref} {...props}>
        <ButtonText>{children}</ButtonText>
      </ButtonFrame>
    )
  }
)
```

And now you can add two themes: `dark_Button` and `dark_ButtonText`, and
override their default styles.

## Full Example

Let's start with an example of inline styling with a subset of the
configuration:

```tsx
import { TamaguiProvider, createTokens, createTamagui, View, Theme } from 'tamagui'

const tokens = createTokens({
  color: {
    darkRed: '#550000',
    lightRed: '#ff0000',
  },
  // ... see configuration docs for required tokens
})

const config = createTamagui({
  tokens,
  themes: {
    dark: {
      red: tokens.color.darkRed,
    },
    light: {
      red: tokens.color.lightRed,
    },
  },
})

export const App = () => (
  <TamaguiProvider config={config} defaultTheme="light">
    <View backgroundColor="$red" />
    <Theme name="dark">
      <View backgroundColor="$red" />
    </Theme>
  </TamaguiProvider>
)
```

In this example we've set up darkRed and lightRed variables and a dark and light
theme that use those variables. Tamagui will handle defining:

```css
:root {
  --colors-dark-red: #550000;
  --colors-light-red: #ff0000;
}

.tui_dark {
  --red: var(--colors-dark-red);
}

.tui_light {
  --red: var(--colors-light-red);
}
```

Which will automatically apply at runtime, or can be gathered for use in SSR
using `Tamagui.getCSS()`.

Finally, the compiler on web will extract your views roughly as so:

```tsx
export const App = () => (
  <Provider defaultTheme="light">
    <div className="baCo-2nesi3" />
    <Theme name="dark">
      <div className="baCo-2nesi3" />
    </Theme>
  </Provider>
)

// CSS output:
//  .color-2nesi3 { background-color: var(--red); }
```

## Ensuring valid types

Here's what we've landed on which helps ensure everything is typed properly.
Keep themes in a separate `themes.ts` file, and structure it like this:

```tsx
import { tokens } from './tokens'

const light = {
  background: '#fff',
  backgroundHover: tokens.color.gray3,
  backgroundPress: tokens.color.gray4,
  backgroundFocus: tokens.color.gray5,
  borderColor: tokens.color.gray4,
  borderColorHover: tokens.color.gray6,
  color: tokens.color.gray12,
  colorHover: tokens.color.gray11,
  colorPress: tokens.color.gray10,
  colorFocus: tokens.color.gray6,
  shadowColor: tokens.color.grayA5,
  shadowColorHover: tokens.color.grayA6,
}

// note: we set up a single consistent base type to validate the rest:
type BaseTheme = typeof light

// the rest of the themes use BaseTheme
const dark: BaseTheme = {
  background: '#000',
  backgroundHover: tokens.color.gray2Dark,
  backgroundPress: tokens.color.gray3Dark,
  backgroundFocus: tokens.color.gray4Dark,
  borderColor: tokens.color.gray3Dark,
  borderColorHover: tokens.color.gray4Dark,
  color: '#ddd',
  colorHover: tokens.color.gray11Dark,
  colorPress: tokens.color.gray10Dark,
  colorFocus: tokens.color.gray6Dark,
  shadowColor: tokens.color.grayA6,
  shadowColorHover: tokens.color.grayA7,
}

const dark_translucent: BaseTheme = {
  ...dark,
  background: 'rgba(0,0,0,0.7)',
  backgroundHover: 'rgba(0,0,0,0.5)',
  backgroundPress: 'rgba(0,0,0,0.25)',
  backgroundFocus: 'rgba(0,0,0,0.1)',
}

const light_translucent: BaseTheme = {
  ...light,
  background: 'rgba(255,255,255,0.85)',
  backgroundHover: 'rgba(250,250,250,0.85)',
  backgroundPress: 'rgba(240,240,240,0.85)',
  backgroundFocus: 'rgba(240,240,240,0.7)',
}

export const allThemes = {
  dark,
  light,
  dark_translucent,
  light_translucent,
} satisfies { [key: string]: BaseTheme }
// note: `satisfies` was introduced with TypeScript 4.9
```

## Dynamic Themes

Sometimes you want to defer loading themes, or change existing theme values at
runtime. Tamagui exports three helpers for this in the package `@tamagui/theme`
which exports `addTheme`, `updateTheme`, and `replaceTheme`.

### addTheme

<HeroContainer>
  <AddThemeDemo />
</HeroContainer>

```tsx hero template=AddTheme

```

### updateTheme

<HeroContainer>
  <UpdateThemeDemo />
</HeroContainer>

```tsx hero template=UpdateTheme

```

### replaceTheme

<HeroContainer>
  <ReplaceThemeDemo />
</HeroContainer>

```tsx hero template=ReplaceTheme

```

### Notes

- Dynamic themes only work on the client side and will be ignored on the server
  side.
- The difference between `updateTheme` and `replaceTheme` is that `replaceTheme`
  will replace the entire theme, while `updateTheme` will only update the values
  that are passed in.

### Advanced Optimization

You can configure Tamagui to not send any themes JS to the client side, so long
as your are serving the resulting css file from the `getCSS` call on initial
load of your app (SSR).

To enable this you need to have your bundler tree shake away the themes object
you'd typically pass to `createTamagui` for the client bundle. Note this is a
somewhat advanced optimization and not necessary to do right away.

```tsx
import { themes as themesIn } from './your-themes-file'

// We leave this value empty for production client side bundles to save on bundle size.
// The `@tamagui/next-plugin` sets TAMAGUI_IS_SERVER automatically.
// If you pass an empty themes object Tamagui will try to hydrate by scanning CSS in browser environments.
// It typically takes low single-digit ms to scan and can save significantly on JS size.

const themes =
  process.env.TAMAGUI_IS_SERVER || process.env.NODE_ENV !== 'production'
    ? themesIn
    : ({} as typeof themesIn)

export const config = createTamagui({
  themes,
  // ...
})
```

---
title: Styling
description: Tamagui accepts a superset of React Native styles
---

Tamagui supports a superset of the React Native style properties on to any
styled component like the base
[View and Text components](/docs/core/view-and-text), or through the
[`styled()` function](/docs/core/styled) as the second argument.

Here's how that looks in practice:

```tsx
import { View, styled } from '@tamagui/core'

const StyledView = styled(View, {
  padding: 10,
})

const MyView = () => (
  <StyledView
    backgroundColor="red"
    hoverStyle={{
      backgroundColor: 'green',
    }}
  />
)
```

The types for the full set of styles accepted by styled, View and Text are
exported as `ViewStyle` and `TextStyle`.

For the full base styles, see the React Native docs (version 2 targets React
Native 0.82):

- [React Native View style props](https://reactnative.dev/docs/view-style-props)
- [React Native Text style props](https://reactnative.dev/docs/text-style-props)

The full Tamagui typed style props can be simplified to something like this,
except the values can also accept one of your design tokens:

```tsx
import { ViewStyle as RNViewStyle } from 'react-native'

type BaseViewStyle = RNViewStyle & FlatTransformStyles & CrossPlatformStyles & WebOnlyStyles

// Cross-platform styles:
type CrossPlatformStyles = {
  boxShadow?: BoxShadowValue  // string, object, or array
  filter?: FilterValue        // brightness, opacity cross-platform; blur, contrast, etc. Android 12+
  backgroundImage?: string    // linear-gradient, radial-gradient; supports $tokens
  cursor?: Properties['cursor'] // web + iOS 17+ (trackpad/stylus/gaze)
  mixBlendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | ... // blend modes
  isolation?: 'auto' | 'isolate'
  boxSizing?: 'border-box' | 'content-box'
  display?: 'flex' | 'none' | 'contents' | ...
  position?: 'absolute' | 'relative' | 'fixed' | 'static' | 'sticky'  // 'fixed' converts to 'absolute' on native
  border?: BorderValue         // shorthand: "1px solid $borderColor"; expands on native
  outline?: OutlineValue       // shorthand: "2px solid $outlineColor"; expands on native
  outlineColor?: ColorValue
  outlineOffset?: SpaceValue
  outlineStyle?: 'solid' | 'dotted' | 'dashed'
  outlineWidth?: SpaceValue
}

// these are accepted but only render on web:
type WebOnlyStyles =  {
  contain?: Properties['contain']
  touchAction?: Properties['touchAction']
  backdropFilter?: Properties['backdropFilter']
  backgroundOrigin: Properties['backgroundOrigin'],
  backgroundPosition: Properties['backgroundPosition'],
  backgroundRepeat: Properties['backgroundRepeat'],
  backgroundSize: Properties['backgroundSize']
  backgroundColor: Properties['backgroundColor']
  backgroundClip: Properties['backgroundClip']
  backgroundBlendMode: Properties['backgroundBlendMode']
  backgroundAttachment: Properties['backgroundAttachment']
  background: Properties['background']
  clipPath: Properties['clipPath'],
  caretColor: Properties['caretColor']
  transformStyle: Properties['transformStyle'],
  mask: Properties['mask'],
  maskImage: Properties['maskImage'],
  textEmphasis: Properties['textEmphasis'],
  borderImage: Properties['borderImage'],
  float: Properties['float']
  content: Properties['content']
  overflowBlock: Properties['overflowBlock']
  overflowInline: Properties['overflowInline']
  maskBorder: Properties['maskBorder']
  maskBorderMode: Properties['maskBorderMode']
  maskBorderOutset: Properties['maskBorderOutset']
  maskBorderRepeat: Properties['maskBorderRepeat']
  maskBorderSlice: Properties['maskBorderSlice']
  maskBorderSource: Properties['maskBorderSource']
  maskBorderWidth: Properties['maskBorderWidth']
  maskClip: Properties['maskClip']
  maskComposite: Properties['maskComposite']
  maskMode: Properties['maskMode']
  maskOrigin: Properties['maskOrigin']
  maskPosition: Properties['maskPosition']
  maskRepeat: Properties['maskRepeat']
  maskSize: Properties['maskSize']
  maskType: Properties['maskType']
}

// these turn into the equivalent transform style props:
type FlatTransformStyles = {
  x?: number
  y?: number
  perspective?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  skewX?: string
  skewY?: string
  matrix?: number[]
  rotate?: string
  rotateY?: string
  rotateX?: string
  rotateZ?: string
}

// add the pseudo and enter/exit style states
type WithStates = BaseViewStyle & {
  hoverStyle?: BaseViewStyle
  pressStyle?: BaseViewStyle
  focusStyle?: BaseViewStyle
  focusVisibleStyle?: BaseViewStyle
  focusWithinStyle?: BaseViewStyle
  disabledStyle?: BaseViewStyle
  enterStyle?: BaseViewStyle
  exitStyle?: BaseViewStyle
}

// final View style props
type ViewStyle = WithStates & {
  // add media queries
  $sm?: WithStates

  // add group queries
  $group-hover?: WithStates
  $group-focus?: WithStates
  $group-press?: WithStates

  // add group + container queries
  $group-sm-hover?: WithStates
  $group-sm-focus?: WithStates
  $group-sm-press?: WithStates

  // add named group queries
  $group-tabs?: WithStates
  $group-tabs-hover?: WithStates
  $group-tabs-focus?: WithStates
  $group-tabs-press?: WithStates

  // add named group + container queries
  $group-tabs-sm?: WithStates
  $group-tabs-sm-hover?: WithStates
  $group-tabs-sm-focus?: WithStates
  $group-tabs-sm-press?: WithStates

  // add theme queries
  $theme-light?: WithStates
  $theme-dark?: WithStates

  // add platform queries
  $platform-native?: WithStates
  $platform-ios?: WithStates
  $platform-android?: WithStates
  $platform-web?: WithStates
}

// Text style starts with this base but builds up the same:
type TextStyleBase = BaseViewStyle & {
  color?: string,
  fontFamily?: string,
  fontSize?: string,
  fontStyle?: string,
  fontWeight?: string,
  letterSpacing?: string,
  lineHeight?: string,
  textAlign?: string,
  textDecorationColor?: string,
  textDecorationLine?: string,
  textDecorationStyle?: string,
  textShadowColor?: string,
  textShadowOffset?: string,
  textShadowRadius?: string,
  textTransform?: string,
}
```

## Pseudo States

Tamagui supports several style states that apply based on interaction or focus:

- **`hoverStyle`** - Styles applied when hovering over the element (web only, maps to CSS `:hover`)
- **`pressStyle`** - Styles applied while the element is being pressed
- **`focusStyle`** - Styles applied when the element has focus (maps to CSS `:focus`)
- **`focusVisibleStyle`** - Styles applied when the element has keyboard focus (maps to CSS `:focus-visible`). Use this for keyboard navigation indicators.
- **`focusWithinStyle`** - Styles applied when any child element has focus (maps to CSS `:focus-within`). Useful for styling containers when an input inside them is focused.
- **`disabledStyle`** - Styles applied when `disabled={true}` is set

```tsx
<View
  backgroundColor="$background"
  hoverStyle={{ backgroundColor: '$backgroundHover' }}
  pressStyle={{ backgroundColor: '$backgroundPress', scale: 0.98 }}
  focusStyle={{ outlineColor: '$blue10', outlineWidth: 2, outlineStyle: 'solid' }}
  focusVisibleStyle={{ outlineColor: '$blue10', outlineWidth: 2 }}
  focusWithinStyle={{ borderColor: '$blue10' }}
  disabledStyle={{ opacity: 0.5 }}
/>
```

### Enter and Exit Styles

For mount/unmount animations, use:

- **`enterStyle`** - Initial styles when the component mounts (animates _from_ these values)
- **`exitStyle`** - Final styles when the component unmounts (animates _to_ these values)

See [Animations](/docs/core/animations) for more details on enter/exit animations.

## rem Units

Tamagui supports `rem` units cross-platform. On web, browsers handle rem natively. On native, Tamagui converts rem values to pixels using `PixelRatio.getFontScale()` to respect the user's font size preferences.

```tsx
// works on both web and native
<View padding="1rem" />
<Text fontSize="1.5rem" />
```

You can configure the base font size (default 16) in your config:

```tsx
createTamagui({
  settings: {
    remBaseFontSize: 16, // default
  },
})
```

On native, `1rem` with a base of 16 equals `16 * PixelRatio.getFontScale()` pixels, scaling with the user's accessibility settings.

## CSS Shorthand with Variables

Tamagui supports using `$variables` directly inside CSS shorthand string values.
This is particularly useful for `boxShadow` and `backgroundImage` where you want
to reference theme colors:

```tsx
// boxShadow with variables
<View boxShadow="0 0 10px $shadowColor" />
<View boxShadow="0 0 5px $shadowColor, 0 0 15px $color" />

// backgroundImage with linear-gradient (cross-platform, RN 0.76+)
<View backgroundImage="linear-gradient(to bottom, $background, $color)" />
<View backgroundImage="linear-gradient(45deg, $black 0%, $white 50%, $black 100%)" />

// filter with variables
<View filter="blur($2)" />

// On web: resolves to CSS custom properties
// boxShadow: "0 0 10px var(--t-shadow-shadowColor)"
// backgroundImage: "linear-gradient(to bottom, var(--background), var(--color))"

// On native: resolves to raw values
// boxShadow: "0 0 10px rgba(0,0,0,0.2)"
// backgroundImage: "linear-gradient(to bottom, #fff, #000)"
```

Supported shorthand properties with variable resolution:

- `boxShadow` - Works on both web and native
- `backgroundImage` - Works on both web and native (see below)
- `filter` - Works on both web and native
- `border` - Works on both web and native (expands to borderWidth/Style/Color on native)
- `outline` - Works on both web and native (expands to outlineWidth/Style/Color on native)
- `borderTop`, `borderRight`, `borderBottom`, `borderLeft` - Web only
- `background` - Web only

### border

The `border` shorthand now works cross-platform:

```tsx
// Works on both web and native
<View border="1px solid $borderColor" />
<View border="2px dashed red" />
<View border="none" />
```

On web, the CSS shorthand is passed through directly. On native, it expands to individual properties:
- `borderWidth` → `borderTopWidth`, `borderRightWidth`, `borderBottomWidth`, `borderLeftWidth`
- `borderStyle` → `borderStyle`
- `borderColor` → `borderTopColor`, `borderRightColor`, `borderBottomColor`, `borderLeftColor`

Note: On native, only a single border (all sides) is supported. For per-side borders on native, use individual props.

### outline

The `outline` shorthand works cross-platform, similar to `border`:

```tsx
// Works on both web and native
<View outline="2px solid $outlineColor" />
<View outline="1px dashed red" />
<View outline="none" />
```

On web, the CSS shorthand is passed through directly. On native, it expands to `outlineWidth`, `outlineStyle`, and `outlineColor`.

### backgroundImage

Supports `linear-gradient()` and `radial-gradient()` cross-platform. Does not
support `url()` on native - use `<ImageBackground>` for images.

```tsx
<View backgroundImage="linear-gradient(to bottom, $background, $color)" />
<View backgroundImage="radial-gradient(circle, $white, $black)" />
```

### textShadow

Text shadows support CSS shorthand with token resolution, just like `boxShadow`:

```tsx
import { Text } from 'tamagui'

// CSS shorthand with tokens
<Text textShadow="2px 2px 4px $shadowColor">
  Shadowed Text
</Text>

// multiple shadows (web only)
<Text textShadow="1px 1px 2px $shadowColor, 0 0 8px $color">
  Glowing Text
</Text>
```

You can also use the individual React Native props:

```tsx
<Text
  textShadowColor="$shadowColor"
  textShadowOffset={{ width: 2, height: 2 }}
  textShadowRadius={4}
>
  Shadowed Text
</Text>
```

On native, only a single text shadow is supported (React Native limitation).

## Parent based styling

Tamagui has a variety of ways to style a child based on the "parent", a parent
being one of: platform, screen size, theme, or group. All of these styles use
the same pattern, they use a `$` prefix for their styles, and they nest styles
as a sub-object.

For example you can target `$theme-light`, `$platform-ios`, or `$group-header`.
For screen size, which we call media queries, they have no prefix. Instead you
define media queries on `createTamagui`. For example, if you define a media
query named `large`, then `$large` is the prop name.

These parent style props accept all the Tamagui style props in their value
object.

#### Media query

Based on whatever media queries you define in `createTamagui`, you can now use
any of them to apply styling on native and web using the `$` prefix.

If you defined your media query like:

```tsx
createTamagui({
  media: {
    sm: { maxWidth: 800 },
  },
})
```

Then you can use it like:

```tsx
<Text color="red" $sm={{ color: 'blue' }} />
```

### Theme

Theme style props let you style a child based on a parent theme. At the moment,
they only can target your top level themes, so if you have `light`, and
`light_subtle` themes, then only `light` can be targeted.

Use them like so:

```tsx
<Text $theme-dark={{ color: 'white' }} />
```

### Platform

Platform style props let you style a child based on the platform the app is
running on. This can be one of `ios`, `android`, `web`, or `native` (iOS and
Android).

Use it like so:

```tsx
<Text $platform-ios={{ color: 'white' }} />
```

### Group

Groups are a new feature in beta that lets you define a named group, and then
style children based whether they are inside a parent that is given that group
name.

A short example:

```tsx
<View group="header">
  <Text $group-header={{ color: 'white' }} />
</View>
```

This will make the Text turn white, as it's inside a parent item with `group`
set to the matching `header` value.

Group styles also allow for targeting the parent pseudo state:

```tsx
<View group>
  <Text $group-hover={{ color: 'white' }} />
</View>
```

Now only when the parent View is hovered the Text will turn white. The allowed
pseudo modifiers are `hover` (web only), `press`, and `focus`.

For more advanced use cases you can use named groups:

```tsx
<View group="card">
  <Text>Outer</Text>
  <View group>
    <Text $group-card-hover={{ color: 'blue' }}>Inner</Text>
    <Text $group-hover={{ color: 'green' }}>Sibling</Text>
  </View>
</View>
```

Now the `Inner` Text will turn blue when the `card` group is hovered, and the
`Sibling` Text will turn green when its parent is hovered.

To make this typed, you need to set `TypeOverride` alongside the same area you
set up your Tamagui types:

```tsx
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}

  // if you want types for named group styling props (e.g. $group-card-hover),
  // define your group names here:
  interface TypeOverride {
    groupNames(): 'card' | 'header' | 'sidebar'
  }
}
```

#### Group Container

The final feature of group styles is the ability to style a child only when the
parent is of a certain size. On the web these are known as "container queries",
which is what Tamagui outputs as CSS under the hood. They look like this:

```tsx
<View group>
  <Text $group-sm={{ color: 'white' }} $group-sm-hover={{ color: 'green' }} />
</View>
```

Now the Text will be white, but only when the View matches the media query `sm`.
This uses the same media query breakpoints you defined in
`createTamagui({ media })`. You can see it also works with pseudo styles!

For more advanced use cases, you can use named groups with container queries:

```tsx
<View group="card">
  <View group>
    <Text $group-card-sm={{ color: 'white' }} $group-card-sm-hover={{ color: 'green' }} />
    <Text $group-sm={{ color: 'white' }} $group-sm-hover={{ color: 'green' }} />
  </View>
</View>
```

Now the first Text will be white when the `card` parent matches `sm`, and the
second Text will be white when no named parent matches `sm`.

_A note on group containers and native_

On Native, we don't have access to the layout of a React component as it first
renders. Only once we get the dimensions from the `onLayout` callback after the
first render are we able to apply group container styles.

Because of this, we've done two things.

First, there's a new property `untilMeasured`:

```tsx
<View group untilMeasured="hide">
  <Text
    $group-sm={{
      color: 'white',
    }}
  />
</View>
```

This takes two options, `show` or `hide`. If unset it defaults to `show`, which
means it will render before it measures. With `hide` set, the container will be
set to `opacity` 0 until it finishes measuring.

Alternatively, if you know the dimensions your container will be up-front, you
can set width and height on the container. When either of these are set, the
children will attempt to use these values on first render and if they satisfy
the media query, you'll avoid the need for a double render altogether.

## Order is important

It's important to note that the order of style properties is significant. This
is really important for two reasons:

1. You want to control which styles are overridden.
2. You have a variant that expands into multiple style properties, and you need
   to control it.

Let's see how it lets us control overriding styles:

```tsx
import { View, ViewProps } from '@tamagui/core'

export default (props: ViewProps) => <View background="red" {...props} width={200} />
```

In this case we set a default `background` to red, but it can be overridden by
props. But we set `width` _after_ the prop spread, so width is _always_ going to
be set to 200.

It also is necessary for variants to make sense. Say we have a variant `huge`
that sets `scale` to 2 and `borderRadius` to 100:

```tsx
// this will be scale = 3
export default (props: ViewProps) => <MyView huge scale={3} />

// this will be scale = 2
export default (props: ViewProps) => <MyView scale={3} huge />
```

If order wasn't important, how would you expect these two different usages to
work? You'd have to make order important _somewhere_. If you do it in the
`styled()` helper somewhere, you end up having no flexibility and would end up
with boilerplate. Making the prop order important gives us maximum
expressiveness and is easy to understand.