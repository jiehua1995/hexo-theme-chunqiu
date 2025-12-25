# hexo-theme-chunqiu

一个面向“编年/事件”站点的 Hexo 主题：

- 首页：编年滚轮（按日期从近到远）
- 事件页：Hero + 关联事件 + 目录（TOC）
- 日历页：按年/月浏览事件
- 关系图页：以某个事件为中心，展示与之相关的事件子图（支持拖拽节点、点击跳转）
- 单语言构建：通过主题配置选择构建语言（不做运行时语言切换）

> 说明：主题会在构建时把事件数据内嵌进 HTML（`window.__CHUNQIU__.events`），避免 `file://` 或某些部署环境下的 `fetch` 失败。

---

## 1. 安装与启用

在你的 Hexo 站点根目录（例如 `Hexo-demo/`）中：

1) 将主题克隆到 `themes/` 目录：

```bash
git clone <theme-repo-url> themes/hexo-theme-chunqiu
```

> 如果你已经手动放置了主题目录，确保路径为 `themes/hexo-theme-chunqiu/`。

2) 在站点 `_config.yml` 中启用主题：

```yml
theme: hexo-theme-chunqiu
```

3) 安装依赖并启动：

```bash
npm install
npx hexo clean
npx hexo generate
npx hexo server
```

---

## 2. 主题配置（themes/hexo-theme-chunqiu/_config.yml）

当前主题支持的配置项如下：

```yml
# 单语言构建：指定生成站点所使用的语言。
# 支持：zh-CN | zh-TW | en | de
build_language: zh-CN

# 首页显示数量（0 表示全部）
home_limit: 0

# 主题主色（用于按钮、强调色、关系图中心节点等）
# 建议使用 6 位 hex（也支持 3 位 hex）
primary_color: "#f0721a"

# 主色 hover 状态（可选）
primary_hover_color: "#e15810"

# 是否显示标签
show_tags: true

# 是否显示 era 字段
show_era: true
```

### 2.1 构建语言（build_language）

- 主题通过 `themes/hexo-theme-chunqiu/scripts/set-language.js` 在构建期设置 `hexo.config.language`。
- 效果：模板里的 `__()` i18n 会使用你指定的语言输出。
- 这是“单语言构建”模式：每次构建只输出一种语言版本。

使用提示：

- 修改 `build_language` 后，需要重新生成站点才会生效：`npx hexo clean && npx hexo generate`。
- 若你在本地预览（`npx hexo server`），请重启 server，避免看到旧的生成结果。

### 2.2 主色（primary_color / primary_hover_color）

主题会把主色注入为 CSS 变量：

- `--primary`
- `--primary-hover`
- `--primary-rgb`（用于 `rgba()` 的场景）

当你想换主题风格时，优先改这两个配置项即可。

---

## 3. 事件文章的 YAML（Front-matter）规范

主题会把 **已发布** 的文章当作“事件”，并要求事件具备日期字段：

- `event_year`（必填，数字）
- `event_month`（必填，数字 1-12）
- `event_day`（必填，数字 1-31）

如果缺少这些字段，该文章不会进入编年/日历/关系图索引。

### 3.1 最小可用模板

```md
---
title: 2020：示例事件
date: 2020-01-02 00:00:00
updated: 2020-01-02 00:00:00
categories:
  - 纪年
tags:
  - 现代
summary: 一句概括（可选但推荐）。

# 事件索引用字段（必填）
event_year: 2020
event_month: 1
event_day: 2

# 可选：时代标签（用于 badge）
era: 现代

# 可选：关系（见下文）
relations:
  - to: "2019-12-31-some-event"
    type: "related"
---

正文……
```

### 3.2 事件 ID（event_id）与 relations 的匹配规则

关系图与“关联事件”需要用一个稳定的 ID 来互相引用。

主题会按以下优先级生成事件 `id`：

1. `event_id`（你显式指定的）
2. `slug`
3. Markdown 文件名（不带扩展名）
4. `post.path`

因此，推荐做法是：

- **为每篇事件都写 `event_id`**，并保持长期稳定。
- 或者直接让 `event_id` 等于文件名（不带 `.md`）。

### 3.3 relations 字段格式

`relations` 支持以下写法：

**写法 A（推荐，带 type）：**

```yml
relations:
  - to: "2008-09-15-global-financial-crisis-lehman"
    type: "context"
```

**写法 B（简写，只有字符串）：**

```yml
relations:
  - "2008-09-15-global-financial-crisis-lehman"
  - "2020-03-11-covid-19-pandemic-declared"
```

其中：

- `to` 是目标事件的 ID（即对方的 `event_id/slug/文件名` 之一）
- `type` 目前主要用于你自己标注关系语义（主题展示不强依赖它）

### 3.4 排序规则

主题的编年/索引 **永远按从近到远（降序）** 排序：

1) 年（大 → 小）
2) 月（大 → 小）
3) 日（大 → 小）

---

## 4. 图片与视频的写法

### 4.1 图片

推荐把图片放在站点的 `source/images/` 下：

- 文件：`source/images/example.jpg`
- 引用：

```md
![说明文字](/images/example.jpg)
```

主题样式会对文章里的媒体做自适应：`img/video/iframe` 默认 `max-width: 100%`。

### 4.2 视频

文章中可以使用 iframe（例如 YouTube 的 nocookie 域名）：

```html
<iframe
  width="100%"
  height="360"
  style="border:0;border-radius:12px;"
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
  title="Video"
  loading="lazy"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
></iframe>
```

> 注意：某些平台可能有 CSP/跨站限制；这属于外部站点策略，与主题无关。

---

## 5. 站点页面与使用方式

主题提供三个核心入口：

- 首页：`/`（编年滚轮）
- 日历：`/calendar/`
- 关系图：`/relations/`

### 5.1 关系图：以某个事件为中心

事件页右侧的“关系图”按钮会跳转到：

- `/relations/?event=<当前事件ID>`

关系图会：

- 以该事件为中心
- 展示与其相关的事件子图
- 支持拖拽节点
- 点击节点进入对应事件页面

> 当前“链式展开深度”在前端脚本中有上限（用于避免图过大）。如需扩大/改为可配置，可在 `source/js/chunqiu-relations.js` 中调整。

当前默认值：`MAX_DEPTH = 3`。

---

## 6. 常用命令

在站点根目录：

```bash
npx hexo clean
npx hexo generate
npx hexo server
```

---

## 7. 常见问题（FAQ）

### 7.1 新写的文章没有出现在首页/日历/关系图

请检查该文章 front-matter：

- 是否有 `event_year/event_month/event_day`（且为数字）
- 是否 `published: false`（如果是则不会入索引）

### 7.2 relations 写了，但关系图找不到目标事件

请确认：

- `relations.to` 是否等于对方事件的 ID（建议统一用 `event_id`）
- 对方事件是否也具备 `event_year/event_month/event_day`（否则不会被收集进 events）

### 7.3 本地直接打开 public 里的 HTML（file://）某些功能不正常

- 主题已把事件数据内嵌到页面，避免依赖 fetch。
- 但外部 iframe 视频是否可播放取决于浏览器与站点策略；建议用 `npx hexo server` 预览。

### 7.4 主题设置 `build_language: en`，但界面仍是中文

这是构建期单语言模式下最常见的“旧输出未刷新”问题。按以下顺序排查：

- 确认你改的是主题配置：`themes/hexo-theme-chunqiu/_config.yml` 的 `build_language`。
- 执行 `npx hexo clean && npx hexo generate`，然后重启 `npx hexo server`。
- 确认主题已启用：站点 `_config.yml` 中 `theme: hexo-theme-chunqiu`。
- 确认语言包存在：`themes/hexo-theme-chunqiu/languages/en.yml`。

### 7.5 PowerShell 下 `npx hexo server` 显示 Exit Code = 1

如果日志里已经提示服务启动并输出了 `http://localhost:4000/`，但终端仍显示退出码 1，这通常是终端/进程控制导致的现象（不一定影响访问）。
如需彻底确认，以浏览器实际访问结果为准。

---

## 8. 开发说明（主题内部结构）

- `layout/`：EJS 模板
- `source/css/style.css`：主题样式
- `source/js/`：前端脚本（编年/日历/关系图/事件页）
- `languages/`：多语言文案（由 `build_language` 决定使用哪一个）
- `scripts/set-language.js`：构建期设置 Hexo 语言

---

## License

请遵循仓库根目录的 LICENSE。