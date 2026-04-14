@AGENTS.md

## Styling

Use Tailwind utility classes and the `cn()` helper (`@/lib/utils`) for all styling. Use shadcn/ui components from `components/ui/` as building blocks. Avoid `style={{}}` except for values that are genuinely dynamic and cannot be expressed as a Tailwind class (e.g., a JS-computed pixel value or hex color from a runtime function like `pickColor()`). Never use `<style>` JSX blocks.
