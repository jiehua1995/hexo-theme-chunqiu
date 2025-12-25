(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // dropdown
  qsa('[data-dropdown]').forEach(function (dropdown) {
    var trigger = qs('[data-dropdown-trigger]', dropdown);
    var menu = qs('[data-dropdown-menu]', dropdown);
    if (!trigger || !menu) return;

    function close() {
      dropdown.classList.remove('open');
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  });
})();
