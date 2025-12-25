/*
 * Apply theme-selected build language to Hexo at build time.
 *
 * IMPORTANT:
 * - Hexo loads site config after it loads scripts.
 * - If we set hexo.config.language too early, it can be overwritten by site _config.yml.
 *
 * So we register a filter and apply the language right before generating pages.
 */

function normalizeLang(value) {
  if (!value) return '';
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value);
}

function getThemeLanguage() {
  var themeConfig = (hexo && hexo.theme && hexo.theme.config) ? hexo.theme.config : {};
  return normalizeLang(themeConfig.build_language || themeConfig.language);
}

function applyThemeLanguage() {
  var themeLang = getThemeLanguage();

  if (themeLang) {
    // Ensure downstream i18n helper __() uses the theme-selected language.
    hexo.config.language = themeLang;
  }
}

// Apply on initial load (best-effort).
applyThemeLanguage();

// Apply again at generation time so site config can't override it.
hexo.extend.filter.register('before_generate', function () {
  applyThemeLanguage();
});

// Also force template locals language so theme helper __() picks the correct locale.
hexo.extend.filter.register('template_locals', function (locals) {
  var themeLang = getThemeLanguage();
  if (!themeLang) return locals;

  locals = locals || {};
  locals.page = locals.page || {};
  locals.config = locals.config || {};

  locals.page.lang = themeLang;
  locals.page.language = themeLang;
  locals.config.language = themeLang;
  return locals;
}, 5);
