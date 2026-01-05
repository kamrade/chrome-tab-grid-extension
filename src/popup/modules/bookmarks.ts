type BookmarkNode = chrome.bookmarks.BookmarkTreeNode;

export type BookmarksState = {
  tree: BookmarkNode[];
  collapsed: Set<string>;
};

export function createBookmarksState(): BookmarksState {
  return { tree: [], collapsed: new Set() };
}

export async function loadBookmarks(state: BookmarksState) {
  state.tree = await chrome.bookmarks.getTree();
  if (state.collapsed.size === 0) {
    collapseAllBookmarks(state.tree, state.collapsed);
  }
}

export function setupBookmarkListeners(onChange: () => void) {
  chrome.bookmarks.onCreated.addListener(onChange);
  chrome.bookmarks.onRemoved.addListener(onChange);
  chrome.bookmarks.onChanged.addListener(onChange);
  chrome.bookmarks.onMoved.addListener(onChange);
  chrome.bookmarks.onChildrenReordered.addListener(onChange);
}

export function createBookmarksColumn(
  state: BookmarksState,
  formatUrl: (raw: string) => string,
  onChange: () => void
) {
  const roots = state.tree[0]?.children ?? [];
  if (roots.length === 0) return null;

  const groupBlock = document.createElement("div");
  groupBlock.className = "group-block bookmarks-block";
  groupBlock.style.setProperty("--cols", "1");

  const header = document.createElement("div");
  header.className = "group-title";
  header.textContent = "Bookmarks";

  const column = document.createElement("div");
  column.className = "group-column bookmarks-column";

  for (const node of roots) {
    renderBookmarkNode(node, 0, column, state, formatUrl, onChange);
  }

  groupBlock.append(header, column);
  return groupBlock;
}

function renderBookmarkNode(
  node: BookmarkNode,
  depth: number,
  container: HTMLElement,
  state: BookmarksState,
  formatUrl: (raw: string) => string,
  onChange: () => void
) {
  const isFolder = Array.isArray(node.children);
  const hasChildren = isFolder && node.children.length > 0;
  const collapsed = hasChildren && state.collapsed.has(node.id);

  const row = document.createElement("button");
  row.className = "item bookmark-item";
  row.type = "button";
  row.style.setProperty("--indent", String(depth));

  if (hasChildren) {
    row.classList.add("is-folder");
    if (collapsed) row.classList.add("is-collapsed");
  }

  const caret = document.createElement("span");
  caret.className = "bookmark-caret";
  caret.textContent = hasChildren ? (collapsed ? "▸" : "▾") : "";

  const label = document.createElement("span");
  label.className = "bookmark-label";
  label.textContent = node.title?.trim() || (node.url ? formatUrl(node.url) : "(untitled)");

  row.append(caret, label);
  container.appendChild(row);

  row.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (hasChildren) {
      if (collapsed) {
        state.collapsed.delete(node.id);
      } else {
        state.collapsed.add(node.id);
      }
      onChange();
      return;
    }

    if (node.url) {
      await chrome.tabs.create({ url: node.url, active: true });
    }
  });

  if (hasChildren && !collapsed) {
    for (const child of node.children) {
      renderBookmarkNode(child, depth + 1, container, state, formatUrl, onChange);
    }
  }
}

function collapseAllBookmarks(nodes: BookmarkNode[], collapsed: Set<string>) {
  for (const node of nodes) {
    if (Array.isArray(node.children) && node.children.length > 0) {
      collapsed.add(node.id);
      collapseAllBookmarks(node.children, collapsed);
    }
  }
}
