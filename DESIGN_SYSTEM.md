# Hari Charnamm POS - Design System & UI Architecture

This document outlines the standard UI primitives, token usage, and architectural patterns established during the Tamagui v5 migration. Adhere to these guidelines to maintain a production-grade, type-safe, and cross-platform UI.

## 1. Unified Token System

We've removed platform-specific styling forks (e.g., desktop/mobile ternary logic) in favor of a unified set of semantic tokens provided by `tamagui.config.ts`.

### Standard Color Vocabulary
- **Backgrounds (OLED Black)**: `$background` (main), `$color2` (surface), `$color3` (elevated).
- **Overlays & Nav**: `$overlayNav` (replaces hardcoded rgba).
- **Borders**: `$borderColor` (standard), `$borderColorHover` (interactive).
- **Text**: `$color12` (primary text), `$color11` (secondary text), `$color10` (muted/detail), `$color8` (subtle labels).
- **Accent**: `$accentBackground` (call-to-action), `$accentColor` (accent text).
- **Alerts/Status**: `$red10` (danger), `$blue10` (info), `$yellow10` (warning), `$green10` (success).

> **Important**: Do not use hardcoded hex coordinates or rgba colors. Always use the semantic `$color...` tokens defined above to support themes universally.

## 2. Type Safety Hardening

We strictly avoid the `as any` type-escaping hatch to guarantee stable runtime performance.

### Guidelines
- **Convex Database IDs**: Always explicitly type IDs from Convex using `Id<"table">`. Example: `saleId as Id<'sales'>`.
- **Query & Mutation Typing**: Always construct and pass expected parameter objects inline or with strict payload typing `Parameters<typeof myMutation>[0]`. Do not use `as any`.
- **TAMAGUI Constants**: For tamagui spacing sizes or CSS constants, do not use `as any`.
- **Web-Only Styles**: For properties like `position: 'sticky'` or `position: 'fixed'` which aren't fully standard in React Native's Web types, type the style object using the project helper type: `style={{ position: 'sticky' } as import('types/tamagui').WebAwareViewStyle}`. 

## 3. Standardized UI Primitives

Use the composable structural primitives within `components/ui/` instead of implementing raw Tamagui primitives to ensure padding/margin consistency:

- **SurfaceCard**: The root container wrapper element for sections. Contains border and `$color2` base background logic.
- **SectionCard**: An inner container to group metadata, typically with a `$color3` fill.
- **ResponsiveDialog**: A sheet/dialog unification wrapper that handles cross-platform presentation cleanly.
- **SelectionField**: Avoid re-implementing Select logic; simply wire in unified options and typed onChange handlers.

## 4. Mobile & Desktop Layout Patterns

We target a native-feeling experience across both platforms:
- On desktop, interactions span horizontally, with sidebars and absolute/sticky panels for high density detail viewing.
- On mobile, interactions collapse into vertical scrolling areas paired with Action Sheets (e.g., `MobileFilterSheet`) or floating headers.
- Media queries like `useMedia().maxMd` or `desktop` evaluate these structures correctly—but structural routing is prioritized. Do *not* conditionally render distinct background colors using ternaries (e.g., `desktop ? '$color1' : '$color2'`).

## 5. Next Steps for Contributors

When implementing new screens or modifying existing functionality:
1. Always start by pulling standard `useQuery` schemas.
2. Structure your markup using `SurfaceCard` > `SectionCard` > `XStack/YStack`.
3. Test layout shifts using both mobile and desktop browser tools.
4. Pass zero type errors locally via `bunx tsc --noEmit` before opening pull requests.
