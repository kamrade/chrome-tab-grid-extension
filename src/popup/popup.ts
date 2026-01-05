import "./popup.css";
type Tab = chrome.tabs.Tab;

const grid = document.querySelector<HTMLDivElement>("#grid")!;
const q = document.querySelector<HTMLInputElement>("#q")!;

let allTabs: Tab[] = [];
let allGroups: chrome.tabGroups.TabGroup[] = [];

function render(tabs: Tab[]) {
  grid.innerHTML = "";

  const groupedTabs = new Map<number, Tab[]>();
  const ungroupedTabs: Tab[] = [];

  for (const tab of tabs) {
    if (tab.groupId != null && tab.groupId >= 0) {
      const list = groupedTabs.get(tab.groupId) ?? [];
      list.push(tab);
      groupedTabs.set(tab.groupId, list);
    } else {
      ungroupedTabs.push(tab);
    }
  }

  const groupsSection = document.createElement("section");
  groupsSection.className = "groups";

  for (const group of allGroups) {
    const list = groupedTabs.get(group.id);
    if (!list || list.length === 0) continue;

    const column = document.createElement("div");
    column.className = "group-column";

    const header = document.createElement("div");
    header.className = "group-title";
    header.textContent = group.title?.trim() || "Group";
    const groupColor = getGroupColor(group.color);
    header.style.borderColor = groupColor;
    header.style.backgroundColor = groupColor;
    header.style.color = "#fff";

    column.appendChild(header);
    for (const tab of list) {
      column.appendChild(createTabItem(tab));
    }
    groupsSection.appendChild(column);
  }

  if (groupsSection.childElementCount > 0) {
    grid.appendChild(groupsSection);
  }

  if (ungroupedTabs.length > 0) {
    const column = document.createElement("div");
    column.className = "group-column ungrouped-column";

    const header = document.createElement("div");
    header.className = "group-title";
    header.textContent = "Без группы";

    column.appendChild(header);
    for (const tab of ungroupedTabs) {
      column.appendChild(createTabItem(tab));
    }

    groupsSection.appendChild(column);
  }
}

function createTabItem(tab: Tab) {
  const item = document.createElement("button");
  item.className = "item";
  item.type = "button";
  item.title = tab.url ?? "";

  const title = tab.title?.trim() || "(untitled)";
  const url = tab.url || "";
  const displayUrl = formatUrl(url);
  const faviconUrl = tab.favIconUrl || (url ? `chrome://favicon/size/16@2x/${url}` : "");

  const titleRow = document.createElement("div");
  titleRow.className = "title-row";

  const favicon = document.createElement("img");
  favicon.className = "favicon";
  favicon.alt = "";
  if (faviconUrl) {
    favicon.src = faviconUrl;
  } else {
    favicon.classList.add("is-empty");
  }

  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.textContent = title;

  const urlEl = document.createElement("div");
  urlEl.className = "url";
  urlEl.textContent = displayUrl;

  titleRow.append(favicon, titleEl);
  item.append(titleRow, urlEl);

  item.addEventListener("click", async () => {
    if (tab.id != null) await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
    await closeCurrentTab();
  });

  return item;
}

async function closeCurrentTab() {
  try {
    const current = await chrome.tabs.getCurrent();
    if (current?.id != null) {
      await chrome.tabs.remove(current.id);
    }
  } catch (err) {
    console.error(err);
  }
}

function formatUrl(raw: string) {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.host;
  } catch {
    const schemeIndex = raw.indexOf("://");
    if (schemeIndex >= 0) {
      const rest = raw.slice(schemeIndex + 3);
      const slashIndex = rest.indexOf("/");
      return slashIndex >= 0 ? rest.slice(0, slashIndex) : rest;
    }
    return raw;
  }
}

function getGroupColor(color?: chrome.tabGroups.ColorEnum) {
  switch (color) {
    case "blue": return "#1a73e8";
    case "cyan": return "#12b5cb";
    case "green": return "#1e8e3e";
    case "orange": return "#f9ab00";
    case "pink": return "#d93025";
    case "purple": return "#a142f4";
    case "red": return "#d93025";
    case "yellow": return "#fbbc04";
    default: return "#6a6a6aff";
  }
}

async function loadTabs() {
  // только текущее окно (обычно удобнее)
  allTabs = await chrome.tabs.query({ currentWindow: true });
  allGroups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  render(allTabs);
}

let refreshTimer: number | null = null;

function scheduleRefresh() {
  if (refreshTimer != null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    loadTabs().catch(console.error);
  }, 50);
}

function setupReactiveListeners() {
  chrome.tabs.onCreated.addListener(scheduleRefresh);
  chrome.tabs.onRemoved.addListener(scheduleRefresh);
  chrome.tabs.onUpdated.addListener(scheduleRefresh);
  chrome.tabs.onMoved.addListener(scheduleRefresh);
  chrome.tabs.onDetached.addListener(scheduleRefresh);
  chrome.tabs.onAttached.addListener(scheduleRefresh);
  chrome.tabGroups.onCreated.addListener(scheduleRefresh);
  chrome.tabGroups.onUpdated.addListener(scheduleRefresh);
  chrome.tabGroups.onRemoved.addListener(scheduleRefresh);
  chrome.tabGroups.onMoved.addListener(scheduleRefresh);
}

function focusSearch() {
  window.setTimeout(() => {
    q.focus();
    q.select();
  }, 0);
}

function setupFocusShortcuts() {
  document.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.closest("input, textarea") || target.isContentEditable)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key.length === 1) {
      focusSearch();
      if (q.value.length === 0) {
        q.value = event.key;
      } else {
        q.value += event.key;
      }
      q.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.closest("input, textarea, button")) return;
    focusSearch();
  });
}

q.addEventListener("input", () => {
  const needle = q.value.trim().toLowerCase();
  if (!needle) return render(allTabs);

  const filtered = allTabs.filter(t => {
    const hay = `${t.title ?? ""} ${t.url ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
  render(filtered);
});

loadTabs()
  .then(() => {
    focusSearch();
  })
  .catch(console.error);
setupReactiveListeners();
setupFocusShortcuts();

window.addEventListener("focus", focusSearch);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) focusSearch();
});
