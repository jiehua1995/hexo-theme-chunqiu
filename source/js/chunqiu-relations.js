(function () {
  var root = document.getElementById('chunqiu-relations');
  var svg = document.getElementById('relations-svg');
  var legend = document.getElementById('relations-legend');
  var stats = document.getElementById('relations-stats');
  if (!root || !svg || !legend || !stats) return;

  var texts = (window.__CHUNQIU__ && window.__CHUNQIU__.texts) || {};
  var baseRoot = (window.__CHUNQIU__ && window.__CHUNQIU__.root) || '/';
  if (!baseRoot.endsWith('/')) baseRoot += '/';

  var dragCtx = null;
  var dragging = null;
  var lastDragMovedAt = 0;
  var inertia = null;
  var inertiaRaf = 0;

  function stopInertia() {
    inertia = null;
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = 0;
    }
  }

  function startInertia(nodeId, vx, vy) {
    stopInertia();
    inertia = { id: nodeId, vx: vx, vy: vy, last: performance.now() };

    function tick(now) {
      if (!dragCtx || !inertia) { stopInertia(); return; }
      var dt = Math.max(1, now - inertia.last);
      inertia.last = now;

      var n = dragCtx.nodes.find(function (x) { return x.id === inertia.id; });
      if (!n) { stopInertia(); return; }

      n.x += inertia.vx * dt;
      n.y += inertia.vy * dt;

      // bounds with soft bounce
      var minX = 40, maxX = dragCtx.width - 40;
      var minY = 40, maxY = dragCtx.height - 40;
      if (n.x < minX) { n.x = minX; inertia.vx *= -0.35; }
      if (n.x > maxX) { n.x = maxX; inertia.vx *= -0.35; }
      if (n.y < minY) { n.y = minY; inertia.vy *= -0.35; }
      if (n.y > maxY) { n.y = maxY; inertia.vy *= -0.35; }

      // friction
      var friction = Math.pow(0.88, dt / 16);
      inertia.vx *= friction;
      inertia.vy *= friction;

      updatePositions(dragCtx);

      if (Math.hypot(inertia.vx, inertia.vy) < 0.02) {
        stopInertia();
        return;
      }
      inertiaRaf = requestAnimationFrame(tick);
    }

    inertiaRaf = requestAnimationFrame(tick);
  }

  function toSvgPoint(clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function updatePositions(ctx) {
    if (!ctx) return;
    ctx.lineEls.forEach(function (item) {
      item.el.setAttribute('x1', String(item.link.source.x));
      item.el.setAttribute('y1', String(item.link.source.y));
      item.el.setAttribute('x2', String(item.link.target.x));
      item.el.setAttribute('y2', String(item.link.target.y));
    });
    ctx.nodes.forEach(function (n) {
      var g = ctx.nodeEls.get(n.id);
      if (!g) return;
      g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
    });
  }

  svg.addEventListener('pointerdown', function (e) {
    if (!dragCtx) return;
    stopInertia();
    var target = e.target;
    if (!target) return;
    var g = target.closest ? target.closest('g') : null;
    if (!g || !g.dataset || !g.dataset.nodeId) return;

    var id = g.dataset.nodeId;
    var n = dragCtx.nodes.find(function (x) { return x.id === id; });
    if (!n) return;

    // Don't preventDefault here; some browsers will suppress the subsequent click.
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    var p = toSvgPoint(e.clientX, e.clientY);
    dragging = {
      id: id,
      dx: n.x - p.x,
      dy: n.y - p.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      downAt: Date.now(),
      lastX: n.x,
      lastY: n.y,
      lastT: performance.now(),
      vx: 0,
      vy: 0,
    };
    g.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragCtx || !dragging) return;
    var n = dragCtx.nodes.find(function (x) { return x.id === dragging.id; });
    if (!n) return;
    var p = toSvgPoint(e.clientX, e.clientY);
    var nx = p.x + dragging.dx;
    var ny = p.y + dragging.dy;
    n.x = Math.max(40, Math.min(dragCtx.width - 40, nx));
    n.y = Math.max(40, Math.min(dragCtx.height - 40, ny));

    if (!dragging.moved) {
      var dx = e.clientX - dragging.startX;
      var dy = e.clientY - dragging.startY;
      if ((dx * dx + dy * dy) > 9) dragging.moved = true;
    }

    // estimate velocity for inertial release (SVG units per ms)
    var now = performance.now();
    var dt = now - dragging.lastT;
    if (dt > 0) {
      dragging.vx = (n.x - dragging.lastX) / dt;
      dragging.vy = (n.y - dragging.lastY) / dt;
      dragging.lastX = n.x;
      dragging.lastY = n.y;
      dragging.lastT = now;
    }
    updatePositions(dragCtx);
  });

  window.addEventListener('pointerup', function () {
    if (!dragCtx || !dragging) return;
    var g = dragCtx.nodeEls.get(dragging.id);
    if (g) g.style.cursor = 'grab';

    // Treat tap/click as navigation when user didn't drag.
    if (!dragging.moved) {
      var n = dragCtx.nodes.find(function (x) { return String(x.id) === String(dragging.id); });
      if (n && n.path) {
        window.location.href = baseRoot + String(n.path).replace(/^\//, '');
      }
      dragging = null;
      return;
    }

    if (dragging.moved) {
      lastDragMovedAt = Date.now();
      if (Number.isFinite(dragging.vx) && Number.isFinite(dragging.vy)) {
        startInertia(dragging.id, dragging.vx, dragging.vy);
      }
    }
    dragging = null;
  });

  window.addEventListener('pointercancel', function () {
    if (!dragCtx || !dragging) return;
    var g = dragCtx.nodeEls.get(dragging.id);
    if (g) g.style.cursor = 'grab';
    dragging = null;
  });

  function qsParam(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) { node.innerHTML = ''; }

  function start(centerId, events) {
    if (!events || !events.length) return renderEmpty('No events.');

    var graph = buildGraph(centerId, events);
    if (!graph.nodes.length) return renderEmpty('Event not found.');
    if (graph.nodes.length === 1 || !graph.links.length) return renderEmpty('No relations.');

    renderGraph(graph, events);
    window.addEventListener('resize', function () { renderGraph(graph, events); });
  }

  function buildGraph(centerId, events) {
    var byId = new Map(events.map(function (e) { return [String(e.id), e]; }));
    var cid = centerId ? String(centerId) : '';
    var center = cid ? byId.get(cid) : null;
    if (!center) return { nodes: [], links: [], centerId: cid };

    // Build adjacency (treat relations as undirected for traversal), then BFS from center.
    var adj = new Map();
    function addAdj(a, b) {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    }

    events.forEach(function (ev) {
      if (!ev) return;
      var fromId = String(ev.id);
      (ev.relations || []).forEach(function (rel) {
        var toId = rel && rel.to ? String(rel.to) : '';
        if (!toId) return;
        if (!byId.has(toId)) return;
        addAdj(fromId, toId);
        addAdj(toId, fromId);
      });
    });

    var MAX_DEPTH = 3;
    var visited = new Set([cid]);
    var queue = [{ id: cid, depth: 0 }];

    while (queue.length) {
      var cur = queue.shift();
      if (cur.depth >= MAX_DEPTH) continue;
      var ns = adj.get(cur.id);
      if (!ns) continue;
      ns.forEach(function (nid) {
        if (visited.has(nid)) return;
        visited.add(nid);
        queue.push({ id: nid, depth: cur.depth + 1 });
      });
    }

    var nodes = Array.from(visited)
      .map(function (id) { return byId.get(id); })
      .filter(Boolean)
      .map(function (e) { return Object.assign({}, e); });

    var nodeIdSet = new Set(nodes.map(function (n) { return String(n.id); }));
    var linkSet = new Set();
    var links = [];

    nodes.forEach(function (ev) {
      var fromId = String(ev.id);
      (ev.relations || []).forEach(function (rel) {
        var toId = rel && rel.to ? String(rel.to) : '';
        if (!toId) return;
        if (!nodeIdSet.has(toId)) return;
        var a = fromId;
        var b = toId;
        var key = a < b ? (a + '||' + b) : (b + '||' + a);
        if (linkSet.has(key)) return;
        linkSet.add(key);
        links.push({ source: a, target: b });
      });
    });

    return { nodes: nodes, links: links, centerId: cid };
  }

  function wrapLines(text, maxChars) {
    var t = String(text || '').trim();
    if (!t) return [''];
    var chars = Array.from(t);
    var out = [];
    for (var i = 0; i < chars.length; i += maxChars) {
      out.push(chars.slice(i, i + maxChars).join(''));
    }
    return out.length ? out : [''];
  }

  function load() {
    var centerId = qsParam('event');

    var embedded = window.__CHUNQIU__ && Array.isArray(window.__CHUNQIU__.events)
      ? window.__CHUNQIU__.events
      : null;

    if (embedded && embedded.length) {
      start(centerId, embedded);
      return;
    }

    fetch(baseRoot + 'events-index.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var events = (data && data.events) ? data.events : [];
        start(centerId, events);
      })
      .catch(function (err) {
        renderEmpty('Failed to load events.');
        console.error(err);
      });
  }

  // Very small force layout (no deps)
  function layout(graph, width, height) {
    var nodes = graph.nodes.map(function (n) {
      return Object.assign({}, n, {
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100,
        vx: 0,
        vy: 0,
      });
    });

    var index = new Map(nodes.map(function (n) { return [n.id, n]; }));
    var links = graph.links.map(function (l) {
      return { source: index.get(l.source), target: index.get(l.target) };
    }).filter(function (l) { return l.source && l.target; });

    var center = index.get(graph.centerId);

    function step() {
      // link springs
      links.forEach(function (l) {
        var dx = l.target.x - l.source.x;
        var dy = l.target.y - l.source.y;
        var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var desired = 150;
        var k = 0.01;
        var f = (dist - desired) * k;
        var fx = (dx / dist) * f;
        var fy = (dy / dist) * f;
        l.source.vx += fx;
        l.source.vy += fy;
        l.target.vx -= fx;
        l.target.vy -= fy;
      });

      // charge
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i];
          var b = nodes[j];
          var dx2 = b.x - a.x;
          var dy2 = b.y - a.y;
          var d2 = dx2 * dx2 + dy2 * dy2;
          var dist2 = Math.max(400, d2);
          var rep = 8000 / dist2;
          var dist = Math.sqrt(dist2);
          var rx = (dx2 / dist) * rep;
          var ry = (dy2 / dist) * rep;
          a.vx -= rx;
          a.vy -= ry;
          b.vx += rx;
          b.vy += ry;
        }
      }

      // center force
      nodes.forEach(function (n) {
        var cx = width / 2;
        var cy = height / 2;
        var k2 = 0.005;
        n.vx += (cx - n.x) * k2;
        n.vy += (cy - n.y) * k2;
      });

      // keep center near center more strongly
      if (center) {
        center.vx += ((width / 2) - center.x) * 0.02;
        center.vy += ((height / 2) - center.y) * 0.02;
      }

      // integrate
      nodes.forEach(function (n) {
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;

        // bounds
        n.x = Math.max(40, Math.min(width - 40, n.x));
        n.y = Math.max(40, Math.min(height - 40, n.y));
      });
    }

    for (var t = 0; t < 300; t++) step();

    return { nodes: nodes, links: links };
  }

  function renderGraph(graph, events) {
    clear(svg);

    var width = root.clientWidth;
    var height = Math.max(520, window.innerHeight - 200);

    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));

    var laid = layout(graph, width, height);

    var lineEls = [];
    var nodeEls = new Map();

    dragCtx = {
      width: width,
      height: height,
      nodes: laid.nodes,
      links: laid.links,
      lineEls: lineEls,
      nodeEls: nodeEls,
    };

    // links
    laid.links.forEach(function (l) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', '#94a3b8');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-opacity', '0.6');
      svg.appendChild(line);
      lineEls.push({ el: line, link: l });
    });

    // nodes
    laid.nodes.forEach(function (n) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.nodeId = n.id;
      g.style.cursor = 'grab';

      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', n.id === graph.centerId ? '30' : '20');
      circle.setAttribute('fill', n.id === graph.centerId ? 'var(--primary)' : '#3b82f6');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '3');
      circle.style.cursor = 'pointer';
      circle.addEventListener('click', function () {
        if (Date.now() - lastDragMovedAt < 250) return;
        window.location.href = baseRoot + n.path.replace(/^\//, '');
      });
      g.appendChild(circle);

      // full title with wrapping
      var maxChars = (width < 720) ? 10 : 16;
      if (n.id === graph.centerId) maxChars = (width < 720) ? 12 : 20;
      var lines = wrapLines(n.title || '', maxChars);
      var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', n.id === graph.centerId ? '14' : '12');
      label.setAttribute('font-weight', n.id === graph.centerId ? '700' : '400');
      label.setAttribute('fill', '#1f2937');
      label.style.pointerEvents = 'none';

      var baseDy = n.id === graph.centerId ? 48 : 40;
      var lineDy = n.id === graph.centerId ? 16 : 14;
      lines.forEach(function (line, i) {
        var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '0');
        tspan.setAttribute('dy', String(i === 0 ? baseDy : lineDy));
        tspan.textContent = line;
        label.appendChild(tspan);
      });
      g.appendChild(label);

      var y = String(n.year < 0 ? ('前' + Math.abs(n.year)) : n.year);
      var yText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      yText.textContent = y;
      yText.setAttribute('text-anchor', 'middle');
      yText.setAttribute('dy', '-35');
      yText.setAttribute('font-size', '10');
      yText.setAttribute('fill', '#6b7280');
      yText.style.pointerEvents = 'none';
      g.appendChild(yText);

      svg.appendChild(g);
      nodeEls.set(n.id, g);
    });

    updatePositions(dragCtx);

    clear(legend);
    legend.appendChild(el('h3', 'panel-title', (texts.relationsLegendTitle || (texts.viewRelationGraph || 'Graph'))));
    var list = el('div', 'panel-list');
    list.appendChild(el('div', 'panel-item', '• ' + (texts.relationsLegendClick || 'Click node: open event details')));
    list.appendChild(el('div', 'panel-item', '• ' + (texts.relationsLegendDrag || 'Drag node: rearrange layout')));
    list.appendChild(el('div', 'panel-item', '• ' + (texts.relationsLegendEdges || 'Edges: links between related events')));
    list.appendChild(el('div', 'panel-item', '• ' + (texts.relationsLegendChronicle || 'Chronicle: events ordered from recent to ancient')));
    legend.appendChild(list);

    clear(stats);
    stats.appendChild(el('div', 'stat-num primary', String(graph.nodes.length)));
    stats.appendChild(el('div', 'stat-label', (texts.events || 'events')));
    stats.appendChild(el('div', 'stat-num blue', String(graph.links.length)));
    stats.appendChild(el('div', 'stat-label', 'links'));
  }

  function renderEmpty(msg) {
    clear(root);
    root.appendChild(el('div', 'empty', msg));
  }

  load();
})();
