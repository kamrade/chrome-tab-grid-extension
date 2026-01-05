type Tab = chrome.tabs.Tab;

export type TabActivateHandler = (item: HTMLButtonElement, tab: Tab) => void | Promise<void>;

export function createTabItem(
  tab: Tab,
  formatUrl: (raw: string) => string,
  onActivate: TabActivateHandler
) {
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

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-tab";
  closeBtn.type = "button";
  closeBtn.title = "Close tab";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (tab.id != null) {
      await chrome.tabs.remove(tab.id);
    }
  });

  const urlEl = document.createElement("div");
  urlEl.className = "url";
  urlEl.textContent = displayUrl;

  titleRow.append(favicon, titleEl, closeBtn);
  item.append(titleRow, urlEl);

  item.addEventListener("click", async () => {
    await onActivate(item, tab);
  });

  return item;
}
