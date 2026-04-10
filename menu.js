// Builds a category-wise menu UI from embedded JSON (fallback to file).

(() => {
  'use strict';

  const statusEl = document.getElementById('status');
  const menuEl = document.getElementById('menu');
  const chipsEl = document.getElementById('chips');
  const searchEl = document.getElementById('search');

  const MENU_DATA_PATH = './menu-data.json';

  /** @type {{category: string, name: string, price: number}[]} */
  let allItems = [];
  let activeCategory = 'All';
  let query = '';

  function normalizeText(s) {
    return String(s || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatCategoryLabel(category) {
    const clean = normalizeText(category).toLowerCase();
    if (!clean) return 'Other';
    return clean
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function groupByCategory(items) {
    /** @type {Map<string, {label: string, items: typeof items}>} */
    const map = new Map();
    for (const it of items) {
      const raw = normalizeText(it.category) || 'Other';
      const key = raw.toUpperCase();
      if (!map.has(key)) map.set(key, { label: formatCategoryLabel(raw), items: [] });
      map.get(key).items.push(it);
    }
    // Stable, nice ordering: All, then alphabetical categories
    return [...map.entries()]
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([key, value]) => ({ key, label: value.label, items: value.items }));
  }

  function setStatus(html, mode = 'info') {
    if (!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.dataset.mode = mode;
    statusEl.innerHTML = html;
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.style.display = 'none';
    statusEl.innerHTML = '';
  }

  function buildChips(categories) {
    chipsEl.innerHTML = '';
    const allChip = chipButton('All', 'All');
    chipsEl.appendChild(allChip);
    for (const c of categories) {
      chipsEl.appendChild(chipButton(c.label, c.key));
    }
    syncChips();
  }

  function chipButton(label, key) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = label;
    btn.setAttribute('data-key', key);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      activeCategory = key;
      syncChips();
      render();
      menuEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return btn;
  }

  function syncChips() {
    chipsEl.querySelectorAll('.chip').forEach((chip) => {
      const key = chip.getAttribute('data-key');
      chip.setAttribute('aria-pressed', key === activeCategory ? 'true' : 'false');
    });
  }

  function filterItems() {
    const q = normalizeText(query).toLowerCase();
    return allItems.filter((it) => {
      const matchesCategory = activeCategory === 'All' || normalizeText(it.category).toUpperCase() === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const hay = `${it.name} ${it.category}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function render() {
    const items = filterItems();
    if (!items.length) {
      menuEl.innerHTML = '';
      clearStatus();
      setStatus(
        `No items found. Try clearing search or choosing <strong>All</strong>.`,
        'empty'
      );
      return;
    }

    clearStatus();

    const grouped = groupByCategory(items);
    menuEl.innerHTML = '';

    for (const group of grouped) {
      const section = document.createElement('section');
      section.className = 'menu-section';
      section.id = `cat-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      const header = document.createElement('div');
      header.className = 'menu-section-header';

      const h2 = document.createElement('h2');
      h2.textContent = group.label;

      const count = document.createElement('span');
      count.textContent = `${group.items.length} items`;

      header.appendChild(h2);
      header.appendChild(count);

      const list = document.createElement('div');
      list.className = 'menu-items';

      for (const it of group.items) {
        const card = document.createElement('article');
        card.className = 'menu-item';

        const left = document.createElement('div');

        const name = document.createElement('h3');
        name.textContent = it.name;

        const sub = document.createElement('p');
        sub.textContent = group.label;

        left.appendChild(name);
        left.appendChild(sub);

        const price = document.createElement('div');
        price.className = 'price';
        price.textContent = `₹${it.price}`;

        card.appendChild(left);
        card.appendChild(price);
        list.appendChild(card);
      }

      section.appendChild(header);
      section.appendChild(list);
      menuEl.appendChild(section);
    }
  }

  function parseMenuFromJson(data) {
    if (!data || typeof data !== 'object') return [];
    const categories = data.categories && typeof data.categories === 'object' ? data.categories : {};

    /** @type {{category: string, name: string, price: number}[]} */
    const items = [];
    for (const [category, rows] of Object.entries(categories)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const name = normalizeText(row.name);
        const price = Number(row.price);
        if (!name || !Number.isFinite(price)) continue;
        items.push({ category: String(category), name, price });
      }
    }
    return items;
  }

  async function init() {
    try {
      // Prefer embedded JSON so the menu works even when opened by double-click.
      const embedded = document.getElementById('menu-data');
      if (embedded && embedded.textContent && embedded.textContent.trim()) {
        let data;
        try {
          data = JSON.parse(embedded.textContent);
        } catch (parseErr) {
          setStatus(
            `Menu data is embedded but could not be parsed.<br /><br />
             <strong>Error:</strong> ${String(parseErr && parseErr.message ? parseErr.message : parseErr)}`,
            'error'
          );
          return;
        }
        allItems = parseMenuFromJson(data);
      } else {
        const res = await fetch(MENU_DATA_PATH, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allItems = parseMenuFromJson(data);
      }

      if (!allItems.length) {
        setStatus(
          `Menu data loaded, but no items were found. Please check <code>menu-data.json</code> (or the embedded JSON in this page).`,
          'error'
        );
        return;
      }

      setStatus(`Loaded <strong>${allItems.length}</strong> items. Rendering…`);
      const categories = groupByCategory(allItems);
      buildChips(categories);
      render();
    } catch (err) {
      menuEl.innerHTML = '';
      setStatus(
        `Could not load the menu data.<br /><br />
         <strong>Error:</strong> ${String(err && err.message ? err.message : err)}<br /><br />
         Try opening <code>Penta_hotel/menu.html</code> again, or use a local server (e.g. “Live Server”).`,
        'error'
      );
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  if (searchEl) {
    searchEl.addEventListener('input', () => {
      query = searchEl.value;
      render();
    });
  }

  init();
})();

