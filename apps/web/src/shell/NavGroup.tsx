import type { JSX } from 'solid-js';

/**
 * NavGroup — labelled section inside the sidebar. Renders a small
 * uppercase eyebrow + an unordered list of nav items.
 */
export function NavGroup(props: { label: string; children: JSX.Element }) {
  return (
    <div class="mb-4">
      <div class="px-3 mb-1 text-xs uppercase tracking-wider text-ink-3 font-medium">
        {props.label}
      </div>
      <ul class="space-y-0.5">{props.children}</ul>
    </div>
  );
}

export default NavGroup;
