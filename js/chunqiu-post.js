(function () {
  var host = window.__CHUNQIU__ || {};
  var events = Array.isArray(host.events) ? host.events : [];
  var currentId = host.currentEventId ? String(host.currentEventId) : '';
  var root = document.getElementById('chunqiu-related');
  if (!root) return;

  var tocRoot = document.getElementById('chunqiu-toc');

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) { node.innerHTML = ''; }

  function slugify(text) {
    var t = String(text || '').trim().toLowerCase();
    t = t.replace(/\s+/g, '-');
    t = t.replace(/[^\w\u4e00-\u9fa5\-]+/g, '');
    t = t.replace(/-+/g, '-');
    return t || 'section';
  }

  function buildToc() {
    if (!tocRoot) return;
    var md = document.querySelector('.markdown');
    if (!md) return;

    var headings = Array.from(md.querySelectorAll('h2, h3'));
    if (!headings.length) {
      clear(tocRoot);
      tocRoot.appendChild(el('div', 'muted', '—'));
      return;
    }

    // ensure unique ids
    var used = new Set();
    headings.forEach(function (h) {
      var base = h.id ? String(h.id) : slugify(h.textContent);
      var id = base;
      var n = 2;
      while (used.has(id) || document.getElementById(id)) {
        id = base + '-' + n;
        n++;
      }
      h.id = id;
      used.add(id);
    });

    var list = el('div', 'toc-items');
    headings.forEach(function (h) {
      var level = h.tagName === 'H3' ? 3 : 2;
      var item = el('div', level === 3 ? 'toc-item toc-item--h3' : 'toc-item');
      var a = el('a', 'toc-link', h.textContent || '');
      a.href = '#' + h.id;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(h.id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + h.id);
      });
      item.appendChild(a);
      list.appendChild(item);
    });

    clear(tocRoot);
    tocRoot.appendChild(list);
  }

  if (!events.length || !currentId) {
    clear(root);
    root.appendChild(el('div', 'muted', ''));
    buildToc();
    return;
  }

  var byId = new Map(events.map(function (e) { return [String(e.id), e]; }));
  var current = byId.get(currentId);
  if (!current || !current.relations || !current.relations.length) {
    clear(root);
    root.appendChild(el('div', 'muted', '—'));
    buildToc();
    return;
  }

  var list = el('div', 'related-items');

  current.relations.forEach(function (rel) {
    var toId = rel && rel.to ? String(rel.to) : '';
    var target = toId ? byId.get(toId) : null;

    var row = el('div', 'related-item');
    var right = el('div', 'related-item__right');

    if (target) {
      var a = el('a', 'related-link', target.title || toId);
      a.href = (host.root || '/') + String(target.path || '').replace(/^\//, '');
      right.appendChild(a);

      var meta = el('div', 'related-meta', '');
      if (Number.isFinite(target.year) && Number.isFinite(target.month) && Number.isFinite(target.day)) {
        meta.textContent = String(target.year) + '-' + String(target.month) + '-' + String(target.day);
      }
      if (meta.textContent) right.appendChild(meta);
    } else {
      right.appendChild(el('span', 'muted', toId));
    }

    row.appendChild(right);
    list.appendChild(row);
  });

  clear(root);
  root.appendChild(list);

  buildToc();
})();
