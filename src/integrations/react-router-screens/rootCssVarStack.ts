/**
 * Shared ownership of a CSS custom property on <html>.
 *
 * Two mounted owners can overlap (during a screen transition the old and new
 * layout briefly coexist). With a plain "save previous, restore on cleanup"
 * effect, the old owner's late cleanup would erase the value the new owner
 * just set. Here the most recent owner wins, and removing any owner falls back
 * to the newest remaining one, or to the inline value from before any owner.
 */

interface Entry {
  id: symbol;
  value: string;
}

interface VarStack {
  base: string;
  entries: Entry[];
}

const stacks = new Map<string, VarStack>();

function apply(name: string, value: string) {
  const root = document.documentElement;
  if (value) root.style.setProperty(name, value);
  else root.style.removeProperty(name);
}

/** Set `name` to `value` on <html> until the returned release function runs. */
export function pushRootCssVar(name: string, value: string): () => void {
  let stack = stacks.get(name);
  if (!stack) {
    stack = { base: document.documentElement.style.getPropertyValue(name), entries: [] };
    stacks.set(name, stack);
  }
  const entry: Entry = { id: Symbol(name), value };
  stack.entries.push(entry);
  apply(name, value);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = stacks.get(name);
    if (!current) return;
    const index = current.entries.findIndex((item) => item.id === entry.id);
    if (index === -1) return;
    const wasTop = index === current.entries.length - 1;
    current.entries.splice(index, 1);
    const top = current.entries[current.entries.length - 1];
    if (!top) {
      stacks.delete(name);
      apply(name, current.base);
    } else if (wasTop) {
      apply(name, top.value);
    }
  };
}

export function __resetRootCssVarStacksForTests() {
  stacks.clear();
}
