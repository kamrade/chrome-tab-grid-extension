type Tab = chrome.tabs.Tab;

export type GroupRenderOptions = {
  groups: chrome.tabGroups.TabGroup[];
  groupedTabs: Map<number, Tab[]>;
  ungroupedTabs: Tab[];
  createTabItem: (tab: Tab) => HTMLElement;
  getGroupColor: (color?: chrome.tabGroups.ColorEnum) => string;
  bookmarksColumn?: HTMLElement | null;
  maxPerColumn?: number;
};

export function renderGroupsSection(options: GroupRenderOptions) {
  const {
    groups,
    groupedTabs,
    ungroupedTabs,
    createTabItem,
    getGroupColor,
    bookmarksColumn,
    maxPerColumn = 12
  } = options;

  const groupsSection = document.createElement("section");
  groupsSection.className = "groups";

  if (bookmarksColumn) groupsSection.appendChild(bookmarksColumn);

  for (const group of groups) {
    const list = groupedTabs.get(group.id);
    if (!list || list.length === 0) continue;

    const header = document.createElement("div");
    header.className = "group-title";
    const groupColor = getGroupColor(group.color);
    const dot = document.createElement("span");
    dot.className = "group-dot";
    dot.style.backgroundColor = groupColor;

    const label = document.createElement("span");
    label.className = "group-label";
    label.textContent = group.title?.trim() || "Group";

    header.append(dot, label);

    const chunks = chunkTabs(list, maxPerColumn);
    const groupBlock = document.createElement("div");
    groupBlock.className = "group-block";
    groupBlock.style.setProperty("--cols", String(chunks.length));
    groupBlock.appendChild(header);

    for (const chunk of chunks) {
      const column = document.createElement("div");
      column.className = "group-column";
      for (const tab of chunk) {
        column.appendChild(createTabItem(tab));
      }
      groupBlock.appendChild(column);
    }

    groupsSection.appendChild(groupBlock);
  }

  if (ungroupedTabs.length > 0) {
    const header = document.createElement("div");
    header.className = "group-title";
    header.textContent = "Без группы";

    const chunks = chunkTabs(ungroupedTabs, maxPerColumn);
    const groupBlock = document.createElement("div");
    groupBlock.className = "group-block ungrouped-block";
    groupBlock.style.setProperty("--cols", String(chunks.length));
    groupBlock.appendChild(header);

    for (const chunk of chunks) {
      const column = document.createElement("div");
      column.className = "group-column";
      for (const tab of chunk) {
        column.appendChild(createTabItem(tab));
      }
      groupBlock.appendChild(column);
    }

    groupsSection.appendChild(groupBlock);
  }

  return groupsSection;
}

function chunkTabs<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
