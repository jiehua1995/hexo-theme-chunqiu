(function () {
  var root = document.getElementById('chunqiu-calendar');
  var controlsRoot = document.getElementById('chunqiu-calendar-controls');
  if (!root || !controlsRoot) return;

  var texts = (window.__CHUNQIU__ && window.__CHUNQIU__.texts) || {};
  var lang = (window.__CHUNQIU__ && window.__CHUNQIU__.lang) || 'en';
  var baseRoot = (window.__CHUNQIU__ && window.__CHUNQIU__.root) || '/';
  if (!baseRoot.endsWith('/')) baseRoot += '/';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function monthName(m) {
    var month = Number(m);
    if (!(month >= 1 && month <= 12)) return '';
    var l = String(lang).toLowerCase();
    if (l.startsWith('zh')) {
      var cn = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
      return cn[month - 1];
    }
    if (l.startsWith('de')) {
      var de = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
      return de[month - 1];
    }
    var en = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return en[month - 1];
  }

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
      if (String(lang).toLowerCase().startsWith('zh')) return '前' + Math.abs(year);
      return Math.abs(year) + (String(lang).toLowerCase().startsWith('en') ? ' BCE' : '');
    }
    return String(year);
  }

  function getDaysInMonth(year, month) {
    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var y = Number(year);
    var isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    if (isLeap) daysInMonth[1] = 29;
    return daysInMonth[month - 1];
  }

  // Weekday helpers
  // JS Date uses proleptic Gregorian calendar; use UTC to avoid timezone shifts.
  function weekdaySun0(year, month, day) {
    var y = Number(year);
    var m = Number(month);
    var d = Number(day);
    var dt = new Date(Date.UTC(2000, 0, 1));
    dt.setUTCFullYear(y);
    dt.setUTCMonth(m - 1, d);
    return dt.getUTCDay(); // 0=Sun..6=Sat
  }

  // Calendar grid is Monday-first (Mon..Sun), so return 0=Mon..6=Sun
  function firstDayOfMonth(year, month) {
    var sun0 = weekdaySun0(year, month, 1);
    return (sun0 + 6) % 7;
  }

  function qs(sel, r) { return (r || document).querySelector(sel); }

  var state = { years: [], year: null, events: [] };

  function startWithEvents(events) {
    state.events = (events || []).slice();
    // Always order from more recent to more ancient.
    state.years = Array.from(new Set(state.events.map(function (e) { return e.year; }))).sort(function (a, b) { return b - a; });
    state.year = state.years.length ? state.years[0] : null;
    render();
  }

  function eventsForDate(year, month, day) {
    return state.events.filter(function (e) {
      return e.year === year && e.month === month && e.day === day;
    });
  }

  function renderControls() {
    controlsRoot.innerHTML = '';

    var left = el('button', 'btn btn-sm btn-outline', texts.prevYear || 'Previous');
    var right = el('button', 'btn btn-sm btn-outline', texts.nextYear || 'Next');

    var select = el('select', 'select select-bordered select-md mono');
    state.years.forEach(function (y) {
      var opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = formatYear(y);
      if (y === state.year) opt.selected = true;
      select.appendChild(opt);
    });

    left.disabled = state.years.indexOf(state.year) === 0;
    right.disabled = state.years.indexOf(state.year) === state.years.length - 1;

    left.addEventListener('click', function () {
      var idx = state.years.indexOf(state.year);
      if (idx > 0) { state.year = state.years[idx - 1]; render(); }
    });
    right.addEventListener('click', function () {
      var idx = state.years.indexOf(state.year);
      if (idx < state.years.length - 1) { state.year = state.years[idx + 1]; render(); }
    });

    select.addEventListener('change', function () {
      state.year = Number(select.value);
      render();
    });

    var stat = el('div', 'calendar-stat');
    var yearEvents = state.events.filter(function (e) { return e.year === state.year; });
    stat.innerHTML = (texts.thisYear || 'This year') + ' <span class="text-primary font-bold">' + yearEvents.length + '</span> ' + (texts.events || 'events');

    var row = el('div', 'calendar-controls-row');
    row.appendChild(left);
    row.appendChild(select);
    row.appendChild(right);
    row.appendChild(stat);
    controlsRoot.appendChild(row);
  }

  function load() {
    var embedded = window.__CHUNQIU__ && Array.isArray(window.__CHUNQIU__.events)
      ? window.__CHUNQIU__.events
      : null;

    if (embedded && embedded.length) {
      startWithEvents(embedded);
      return;
    }

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
  }

  function render() {
    renderControls();

    root.innerHTML = '';

    var yearEvents = state.events.filter(function (e) { return e.year === state.year; });
    var months = Array.from(new Set(yearEvents.map(function (e) { return e.month; }))).sort(function (a, b) { return a - b; });

    if (!months.length) {
      root.appendChild(el('div', 'empty', 'No events.'));
      return;
    }

    var container = el('div', 'container calendar-container');
    var grid = el('div', 'calendar-grid');

    months.forEach(function (month) {
      var monthCard = el('div', 'card bg-base-100 shadow-md border border-base-300');
      var body = el('div', 'card-body');

      var monthCount = yearEvents.filter(function (e) { return e.month === month; }).length;
      var title = el('h3', 'month-title', monthName(month) + ' ');
      var count = el('span', 'month-count', '(' + monthCount + (texts.events || '') + ')');
      title.appendChild(count);
      body.appendChild(title);

      var weekdays = el('div', 'weekdays');
      var wd = (String(lang).toLowerCase().startsWith('zh'))
        ? ['一','二','三','四','五','六','日']
        : (String(lang).toLowerCase().startsWith('de') ? ['Mo','Di','Mi','Do','Fr','Sa','So'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
      wd.forEach(function (d) { weekdays.appendChild(el('div', 'weekday', d)); });
      body.appendChild(weekdays);

      var daysIn = getDaysInMonth(state.year, month);
      var first = firstDayOfMonth(state.year, month);

      var daysGrid = el('div', 'days-grid');
      for (var b = 0; b < first; b++) {
        daysGrid.appendChild(el('div', 'day-blank'));
      }

      for (var day = 1; day <= daysIn; day++) {
        var dayEvents = eventsForDate(state.year, month, day);
        var has = dayEvents.length > 0;
        var btn = el('button', has ? 'day-btn has' : 'day-btn', String(day));
        btn.disabled = !has;
        if (has) {
          btn.addEventListener('click', function (evs) {
            return function () { window.location.href = baseRoot + evs[0].path.replace(/^\//, ''); };
          }(dayEvents));
          if (dayEvents.length > 1) {
            btn.appendChild(el('span', 'multi-dot'));
          }
          // tooltip
          var tip = el('div', 'tooltip');
          tip.innerHTML = dayEvents.map(function (e) { return '<div class="tooltip-item">' + e.title + '</div>'; }).join('');
          var wrap = el('div', 'day-wrap');
          wrap.appendChild(btn);
          wrap.appendChild(tip);
          daysGrid.appendChild(wrap);
        } else {
          daysGrid.appendChild(btn);
        }
      }

      body.appendChild(daysGrid);
      monthCard.appendChild(body);
      grid.appendChild(monthCard);
    });

    container.appendChild(grid);
    root.appendChild(container);
  }

  load();
})();
