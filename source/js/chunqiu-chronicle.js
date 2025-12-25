(function () {
  var root = document.getElementById('chunqiu-chronicle');
  if (!root) return;

  function qs(sel, r) { return (r || document).querySelector(sel); }
  function qsa(sel, r) { return Array.from((r || document).querySelectorAll(sel)); }

  var ITEM_HEIGHT = 80;

  var texts = (window.__CHUNQIU__ && window.__CHUNQIU__.texts) || {};
  var lang = (window.__CHUNQIU__ && window.__CHUNQIU__.lang) || 'en';
  var baseRoot = (window.__CHUNQIU__ && window.__CHUNQIU__.root) || '/';
  if (!baseRoot.endsWith('/')) baseRoot += '/';

  function monthShort(m) {
    var month = Number(m);
    if (!(month >= 1 && month <= 12)) return '';
    var l = String(lang).toLowerCase();
    if (l.startsWith('zh')) {
      var zh = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
      return zh[month - 1];
    }
    var isDe = l.startsWith('de');
    var en = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var de = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    return (isDe ? de : en)[month - 1];
  }

  function formatYear(y) {
    var year = Number(y);
    if (!Number.isFinite(year)) return '';
    if (year < 0) {
      // keep close to original: 前xxx
      if (String(lang).toLowerCase().startsWith('zh')) return '前' + Math.abs(year);
      return (String(lang).toLowerCase().startsWith('de') ? 'v. ' : '') + Math.abs(year) + (String(lang).toLowerCase().startsWith('en') ? ' BCE' : '');
    }
    return String(year);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildColumn(key, widthClass, visibleItems, centerIndex) {
    var col = el('div', 'wheel-col ' + (widthClass || ''));

    var mask = el('div', 'wheel-mask');
    mask.innerHTML = '<div class="wheel-fade wheel-fade-top"></div><div class="wheel-fade wheel-fade-bot"></div>';

    var highlight = el('div', 'wheel-highlight');
    highlight.style.top = (centerIndex * ITEM_HEIGHT) + 'px';
    highlight.style.height = ITEM_HEIGHT + 'px';

    var list = el('div', 'wheel-list hide-scrollbar');
    list.style.height = (visibleItems * ITEM_HEIGHT) + 'px';
    list.dataset.colKey = key;

    // pad top
    var padTop = el('div');
    padTop.style.height = (centerIndex * ITEM_HEIGHT) + 'px';
    list.appendChild(padTop);

    col.appendChild(mask);
    col.appendChild(highlight);
    col.appendChild(list);
    return { col: col, list: list, highlight: highlight };
  }

  function scrollAll(index) {
    qsa('.wheel-list', root).forEach(function (list) {
      list.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
    });
  }

  function render(events) {
    var state = { index: 0, events: events };

    var frame = el('div', 'chronicle-frame');
    var wheelWrap = el('div', 'chronicle-wheel');
    var wheel = el('div', 'wheel');

    var isMobile = false;
    try { isMobile = window.matchMedia && window.matchMedia('(max-width: 720px)').matches; } catch (_) {}
    if (isMobile) wheel.classList.add('is-mobile');

    var cYear, cMonth, cDay, cTitle, cEra, cAct, cMobile;
    var visibleItems = 7;
    var centerIndex = Math.floor(visibleItems / 2);

    function computeVisibleItems() {
      var h = wheelWrap.clientHeight || 0;
      var next = Math.floor(h / ITEM_HEIGHT);
      if (!Number.isFinite(next) || next < 5) next = 5;
      if (next > 11) next = 11;
      if (next % 2 === 0) next -= 1;
      visibleItems = next;
      centerIndex = Math.floor(visibleItems / 2);
    }

    function buildColumns() {
      wheel.innerHTML = '';
      if (isMobile) {
        cMobile = buildColumn('mobile', 'flex-1 min-w-0', visibleItems, centerIndex);
        wheel.appendChild(cMobile.col);
      } else {
        cYear = buildColumn('year', 'w-32', visibleItems, centerIndex);
        cMonth = buildColumn('month', 'w-20', visibleItems, centerIndex);
        cDay = buildColumn('day', 'w-20', visibleItems, centerIndex);
        cTitle = buildColumn('title', 'flex-1 min-w-0', visibleItems, centerIndex);
        cEra = buildColumn('era', 'w-28', visibleItems, centerIndex);
        cAct = buildColumn('actions', 'w-32', visibleItems, centerIndex);

        [cYear, cMonth, cDay, cTitle, cEra, cAct].forEach(function (c) {
          wheel.appendChild(c.col);
        });
      }
    }

    function itemBox(isCurrent) {
      return 'wheel-item' + (isCurrent ? ' is-current' : '');
    }

    function addItems(colKey, list, renderFn) {
      events.forEach(function (ev, idx) {
        var isCurrent = idx === state.index;
        var distance = Math.abs(idx - state.index);
        var opacity = Math.max(0.3, 1 - distance * 0.2);
        var scale = Math.max(0.7, 1 - distance * 0.1);

        var wrap = el('div', itemBox(isCurrent));
        wrap.style.height = ITEM_HEIGHT + 'px';
        wrap.style.opacity = String(opacity);
        wrap.style.transform = 'scale(' + scale + ')';

        wrap.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (idx === state.index) {
            window.location.href = baseRoot + ev.path.replace(/^\//, '');
          } else {
            state.index = idx;
            rerender();
          }
        });

        wrap.appendChild(renderFn(ev, isCurrent));
        list.appendChild(wrap);
      });

      var padBot = el('div');
      padBot.style.height = (centerIndex * ITEM_HEIGHT) + 'px';
      list.appendChild(padBot);
    }

    function rerender() {
      // clear lists (keep mask/highlight)
      qsa('.wheel-list', root).forEach(function (list) {
        list.innerHTML = '';
        var padTop = el('div');
        padTop.style.height = (centerIndex * ITEM_HEIGHT) + 'px';
        list.appendChild(padTop);
      });

      if (isMobile) {
        addItems('mobile', cMobile.list, function (ev, isCurrent) {
          var row = el('div', 'mrow');

          var top = el('div', 'mrow-top');
          var meta = el('div', 'mrow-meta');

          var dateText = formatYear(ev.year) + ' ' + monthShort(ev.month) + ' ' + String(ev.day);
          meta.appendChild(el('div', 'mrow-date', dateText));

          if (ev.era) {
            meta.appendChild(el('span', isCurrent ? 'badge badge-primary badge-sm' : 'badge badge-ghost badge-sm', ev.era));
          }

          var actions = el('div', 'mrow-actions');
          var viewBtn = el('a', isCurrent ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs', texts.view || 'View');
          viewBtn.href = baseRoot + ev.path.replace(/^\//, '');
          viewBtn.addEventListener('click', function (e) { e.stopPropagation(); });
          actions.appendChild(viewBtn);

          if (ev.relations && ev.relations.length) {
            var relBtn = el('a', isCurrent ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs', texts.relations || 'Relations');
            relBtn.href = baseRoot + 'relations/?event=' + encodeURIComponent(ev.id);
            relBtn.addEventListener('click', function (e) { e.stopPropagation(); });
            actions.appendChild(relBtn);
          }

          top.appendChild(meta);
          top.appendChild(actions);
          row.appendChild(top);

          row.appendChild(el('div', 'mrow-title', ev.title || ''));
          if (isCurrent && ev.summary) row.appendChild(el('div', 'summary', ev.summary));
          return row;
        });
      } else {
        addItems('year', cYear.list, function (ev, isCurrent) {
          return el('span', isCurrent ? 'mono year current' : 'mono year', formatYear(ev.year));
        });

        addItems('month', cMonth.list, function (ev, isCurrent) {
          return el('span', isCurrent ? 'month current' : 'month', monthShort(ev.month));
        });

        addItems('day', cDay.list, function (ev, isCurrent) {
          return el('span', isCurrent ? 'day current' : 'day', String(ev.day));
        });

        addItems('title', cTitle.list, function (ev, isCurrent) {
          var box = el('div', 'titlebox');
          var t = el('div', isCurrent ? 'title current' : 'title', ev.title);
          box.appendChild(t);
          if (isCurrent && ev.summary) {
            box.appendChild(el('div', 'summary', ev.summary));
          }
          return box;
        });

        addItems('era', cEra.list, function (ev, isCurrent) {
          var badge = el('span', isCurrent ? 'badge badge-primary badge-lg' : 'badge badge-ghost badge-sm', ev.era || '');
          return badge;
        });

        addItems('actions', cAct.list, function (ev, isCurrent) {
          var box = el('div', 'actions');

          var viewBtn2 = el('a', isCurrent ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-xs', texts.view || 'View');
          viewBtn2.href = baseRoot + ev.path.replace(/^\//, '');
          viewBtn2.addEventListener('click', function (e) { e.stopPropagation(); });
          box.appendChild(viewBtn2);

          if (ev.relations && ev.relations.length) {
            var relBtn2 = el('a', isCurrent ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-xs', texts.relations || 'Relations');
            relBtn2.href = baseRoot + 'relations/?event=' + encodeURIComponent(ev.id);
            relBtn2.addEventListener('click', function (e) { e.stopPropagation(); });
            box.appendChild(relBtn2);
          }

          return box;
        });
      }

      scrollAll(state.index);
      updateCounter();
    }

    function updateCounter() {
      var counter = qs('[data-event-counter]', root);
      if (!counter) return;
      counter.textContent = String(state.index + 1);

      var total = qs('[data-event-total]', root);
      if (total) total.textContent = String(events.length);

      var prefix = qs('[data-event-prefix]', root);
      var suffix = qs('[data-event-suffix]', root);
      if (prefix || suffix) {
        var l = String(lang).toLowerCase();
        if (l.startsWith('zh')) {
          if (prefix) prefix.textContent = (texts.eventCounter || '第') + ' ';
          if (suffix) suffix.textContent = ' ' + (texts.events || '个事件');
        } else {
          if (prefix) prefix.textContent = '';
          if (suffix) suffix.textContent = ' ' + (texts.events || 'events');
        }
      }
    }

    function clampIndex(next) {
      if (next < 0) return 0;
      if (next > events.length - 1) return events.length - 1;
      return next;
    }

    function move(delta) {
      state.index = clampIndex(state.index + delta);
      rerender();
    }

    function onWheel(e) {
      e.preventDefault();
      e.stopPropagation();
      var delta = e.deltaY > 0 ? 1 : -1;
      move(delta);
    }

    function onKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter') {
        var ev = events[state.index];
        if (ev) window.location.href = baseRoot + ev.path.replace(/^\//, '');
      }
    }

    wheelWrap.appendChild(wheel);
    frame.appendChild(wheelWrap);

    var tips = el('div', 'tips');
    tips.innerHTML = '<div class="tips-text"><span class="kbd kbd-sm">↑</span> <span class="kbd kbd-sm">↓</span> ' + (texts.tips || '') + '</div>' +
      '<div class="counter"><span class="muted" data-event-prefix></span><span class="primary" data-event-counter></span> <span class="muted">/</span> <span data-event-total></span><span class="muted" data-event-suffix></span></div>';
    frame.appendChild(tips);

    root.appendChild(frame);

    // compute layout after DOM is in place
    computeVisibleItems();
    buildColumns();

    root.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);

    rerender();

    window.addEventListener('resize', function () {
      var prev = visibleItems;
      computeVisibleItems();
      if (visibleItems !== prev) {
        buildColumns();
      }
      rerender();
    });
  }

  function startWithEvents(events) {
    if (!events || !events.length) {
      root.innerHTML = '<div class="empty">No events.</div>';
      return;
    }
    render(events);
  }

  var embedded = window.__CHUNQIU__ && Array.isArray(window.__CHUNQIU__.events)
    ? window.__CHUNQIU__.events
    : null;

  if (embedded && embedded.length) {
    startWithEvents(embedded);
    return;
  }

  // Fallback: try loading generated index (for very large sites or older builds)
  fetch(baseRoot + 'events-index.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var events = (data && data.events) ? data.events : [];
      startWithEvents(events);
    })
    .catch(function (err) {
      root.innerHTML = '<div class="empty">Failed to load events.</div>';
      console.error(err);
    });
})();
