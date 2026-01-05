type ActivePos = { col: number; row: number };

export type NavigationState = {
  activePos: ActivePos | null;
  activeButton: HTMLButtonElement | null;
};

export function createNavigationState(): NavigationState {
  return { activePos: null, activeButton: null };
}

export function syncActiveAfterRender(state: NavigationState, grid: HTMLElement) {
  const columns = getColumns(grid);
  if (columns.length === 0) {
    if (state.activeButton) state.activeButton.classList.remove("is-active");
    state.activePos = null;
    state.activeButton = null;
    return;
  }

  setActive(state, grid, 0, 0);
}

export function setActiveFromElement(
  state: NavigationState,
  grid: HTMLElement,
  item: HTMLButtonElement
) {
  const columns = getColumns(grid);
  for (let c = 0; c < columns.length; c++) {
    const r = columns[c].indexOf(item);
    if (r >= 0) {
      setActive(state, grid, c, r);
      return;
    }
  }
}

export function setupKeyboardNavigation(
  state: NavigationState,
  grid: HTMLElement,
  searchInput: HTMLInputElement,
  focusSearch: () => void
) {
  document.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    const inInput = !!target && (target.closest("input, textarea") || target.isContentEditable);

    if (inInput) {
      if (event.key === "Escape") {
        event.preventDefault();
        searchInput.blur();
        if (!state.activePos) setActive(state, grid, 0, 0);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(state, grid, 0, -1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(state, grid, 0, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveActive(state, grid, -1, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveActive(state, grid, 1, 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      state.activeButton?.click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      focusSearch();
    }
  });
}

function getColumns(grid: HTMLElement) {
  const columns: HTMLButtonElement[][] = [];
  const columnEls = grid.querySelectorAll<HTMLElement>(".group-column");
  for (const columnEl of columnEls) {
    const items = Array.from(columnEl.querySelectorAll<HTMLButtonElement>(".item"));
    if (items.length > 0) columns.push(items);
  }
  return columns;
}

function setActive(state: NavigationState, grid: HTMLElement, col: number, row: number) {
  const columns = getColumns(grid);
  if (columns.length === 0) return;
  const safeCol = Math.max(0, Math.min(col, columns.length - 1));
  const safeRow = Math.max(0, Math.min(row, columns[safeCol].length - 1));
  const next = columns[safeCol][safeRow];

  if (state.activeButton) state.activeButton.classList.remove("is-active");
  state.activeButton = next;
  state.activePos = { col: safeCol, row: safeRow };
  state.activeButton.classList.add("is-active");
  state.activeButton.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function moveActive(state: NavigationState, grid: HTMLElement, deltaCol: number, deltaRow: number) {
  const columns = getColumns(grid);
  if (columns.length === 0) return;
  if (!state.activePos) return setActive(state, grid, 0, 0);

  const targetCol = Math.max(0, Math.min(state.activePos.col + deltaCol, columns.length - 1));
  const targetRow = Math.max(0, Math.min(state.activePos.row + deltaRow, columns[targetCol].length - 1));
  setActive(state, grid, targetCol, targetRow);
}
