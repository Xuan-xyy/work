/* ============================================================
   app.js — 启动 / 路由 / 侧边导航 / 顶栏 / 主题 / 数据管理
   ============================================================ */
(function (WB) {
  'use strict';

  var U = WB.util, ui = WB.ui;

  var NAV_GROUPS = [
    { label: '核心', keys: ['dashboard', 'applications'] },
    { label: '成长模块', keys: ['interview', 'stories', 'internship', 'career'] }
  ];

  var els = {};
  var current = 'dashboard';

  /* ---------------------------------------------------------
     主题
     --------------------------------------------------------- */
  function resolveTheme(theme) {
    if (theme === 'system') {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  }

  function applyTheme() {
    var t = resolveTheme(WB.Store.data.settings.theme);
    document.documentElement.setAttribute('data-theme', t);
  }

  /* ---------------------------------------------------------
     侧边导航
     --------------------------------------------------------- */
  function renderSidebar() {
    var data = WB.Store.data;
    var nickname = data.profile.nickname || 'User';
    var activeCount = WB.analytics.summary(data).active;

    var html = '' +
      '<div class="brand">' +
        '<div class="brand-mark">' + ui.icon('zap', 17) + '</div>' +
        '<div class="brand-text">' +
          '<div class="brand-name">秋招 × 实习成长工作台</div>' +
          '<div class="brand-sub">' + U.esc((data.profile.graduateYear || '') + ' · ' + nickname) + '</div>' +
        '</div>' +
      '</div>';

    NAV_GROUPS.forEach(function (g) {
      html += '<div class="nav-group-label"><span class="nav-label-text">' + U.esc(g.label) + '</span></div>';
      g.keys.forEach(function (key) {
        var v = WB.views[key];
        if (!v) return;
        var badge = '';
        if (key === 'applications' && activeCount) badge = '<span class="nav-badge num">' + activeCount + '</span>';
        html += '<div class="nav-item" data-nav="' + key + '" title="' + U.attr(v.label) + '">' +
          '<span class="nav-icon">' + ui.icon(v.icon, 17) + '</span>' +
          '<span class="nav-label-text">' + U.esc(v.label) + '</span>' +
          badge +
        '</div>';
      });
    });

    html += '' +
      '<div class="sidebar-foot">' +
        '<div class="nav-item" data-act="settings" title="设置与数据">' +
          '<span class="nav-icon">' + ui.icon('filter2', 17) + '</span>' +
          '<span class="nav-label-text">设置与数据</span>' +
        '</div>' +
        '<div class="nav-item" data-act="theme" title="切换主题">' +
          '<span class="nav-icon">' + ui.icon(resolveTheme(data.settings.theme) === 'dark' ? 'sun' : 'moon', 17) + '</span>' +
          '<span class="nav-label-text">' + (resolveTheme(data.settings.theme) === 'dark' ? '浅色模式' : '深色模式') + '</span>' +
        '</div>' +
        '<div class="side-note">数据仅保存在本机浏览器，不上传任何服务器。建议每周导出一次备份。</div>' +
      '</div>';

    els.sidebar.innerHTML = html;

    els.sidebar.querySelectorAll('[data-nav]').forEach(function (item) {
      item.addEventListener('click', function () { location.hash = WB.views[item.getAttribute('data-nav')].route; });
    });
    els.sidebar.querySelector('[data-act="settings"]').addEventListener('click', openSettings);
    els.sidebar.querySelector('[data-act="theme"]').addEventListener('click', toggleTheme);

    setActiveNav();
  }

  function setActiveNav() {
    els.sidebar.querySelectorAll('[data-nav]').forEach(function (item) {
      item.classList.toggle('active', item.getAttribute('data-nav') === current);
    });
  }

  function toggleTheme() {
    var cur = resolveTheme(WB.Store.data.settings.theme);
    WB.Store.setTheme(cur === 'dark' ? 'light' : 'dark');
  }

  /* ---------------------------------------------------------
     顶栏：图标 + 招呼语 ｜ 日期 + 名言
     --------------------------------------------------------- */
  function renderTopbar() {
    var data = WB.Store.data;
    var nickname = data.profile.nickname || 'User';
    var quotes = WB.QUOTES;
    var qi = Number(data.settings.quoteIndex) || 0;
    var quote = quotes[qi % quotes.length];

    els.topbar.innerHTML = '' +
      '<div class="topbar-left">' +
        '<span class="hello-mark">' + ui.icon('zap', 15) + '</span>' +
        '<span class="hello-text">Hello, ' + U.esc(nickname) + '</span>' +
        '<span class="hello-meta">' + U.esc(data.profile.targetRole || '未设置目标岗位') +
          (data.profile.targetCity ? ' · ' + U.esc(data.profile.targetCity) : '') + '</span>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<span class="topbar-date">' + U.esc(U.fmtFull(U.today())) + '</span>' +
        '<div class="topbar-quote" title="点击换一句">' + ui.icon('sparkles', 13) + '<span>' + U.esc(quote) + '</span></div>' +
        '<button class="btn ghost icon sm" data-act="theme" title="切换深浅色">' +
          ui.icon(resolveTheme(data.settings.theme) === 'dark' ? 'sun' : 'moon', 15) + '</button>' +
      '</div>';

    els.topbar.querySelector('[data-act="theme"]').addEventListener('click', toggleTheme);
    els.topbar.querySelector('.topbar-quote').addEventListener('click', function () {
      WB.Store.commit('quote', function (d) { d.settings.quoteIndex = (Number(d.settings.quoteIndex) + 1) % WB.QUOTES.length; });
    });
  }

  /* ---------------------------------------------------------
     设置与数据
     --------------------------------------------------------- */
  function openSettings() {
    var p = WB.Store.data.profile;
    var theme = WB.Store.data.settings.theme || 'light';

    var body = '' +
      '<div class="field-label" style="margin-bottom:10px">个人信息</div>' +
      '<div class="form-grid">' +
        ui.field('昵称', '<input class="input" name="nickname" value="' + U.attr(p.nickname) + '">') +
        ui.field('届别', '<input class="input" name="graduateYear" placeholder="例如：2026 届" value="' + U.attr(p.graduateYear) + '">') +
        ui.field('目标岗位', '<input class="input" name="targetRole" placeholder="例如：后端开发工程师" value="' + U.attr(p.targetRole) + '">') +
        ui.field('目标城市', '<input class="input" name="targetCity" placeholder="例如：北京 / 杭州" value="' + U.attr(p.targetCity) + '">') +
        ui.field('每周投递目标', '<input class="input" type="number" min="1" max="99" name="weeklyGoal" value="' + U.attr(p.weeklyGoal) + '">', '用于 Dashboard 的节奏环') +
        ui.field('秋招起始日', '<input class="input" type="date" name="startDate" value="' + U.attr(p.startDate) + '">', '用于计算冲刺天数') +
      '</div>' +

      '<div class="field-label" style="margin:22px 0 10px">外观</div>' +
      '<div class="seg" data-theme-seg>' +
        ['light', 'dark', 'system'].map(function (t) {
          var label = { light: '浅色', dark: '深色', system: '跟随系统' }[t];
          return '<button data-theme-set="' + t + '" class="' + (theme === t ? 'on' : '') + '">' + label + '</button>';
        }).join('') +
      '</div>' +

      '<div class="field-label" style="margin:22px 0 10px">数据管理</div>' +
      '<div class="row wrap" style="gap:8px">' +
        '<button class="btn sm" data-settings-act="backup">' + ui.icon('database', 13) + '导出完整备份 (JSON)</button>' +
        '<button class="btn sm" data-settings-act="restore">' + ui.icon('upload', 13) + '从备份恢复</button>' +
        '<button class="btn sm" data-settings-act="csv">' + ui.icon('download', 13) + '导出投递表 (CSV)</button>' +
        '<button class="btn sm" data-settings-act="demo">' + ui.icon('refresh', 13) + '载入示例数据</button>' +
        '<button class="btn sm danger" data-settings-act="clear">' + ui.icon('trash', 13) + '清空全部数据</button>' +
      '</div>' +
      '<p class="fs-12 muted mt-12">' +
        (WB.Store._available
          ? '数据保存在本机浏览器 localStorage 中（键名 qiuzhao.workbench.v1），清理浏览器数据会一并清除，请定期备份。'
          : '当前环境无法使用 localStorage（可能以隐私模式打开），本次记录只在页面存活期间有效，请及时导出备份。') +
      '</p>';

    var m = ui.modal({
      title: '设置与数据',
      wide: true,
      body: body,
      footer: '<button class="btn" data-cancel>关闭</button><button class="btn primary" data-save>保存设置</button>'
    });

    m.node.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-theme-set');
        WB.Store.setTheme(t);
        m.node.querySelectorAll('[data-theme-set]').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });

    m.node.querySelector('[data-cancel]').addEventListener('click', function () { m.close(); });

    m.node.querySelector('[data-save]').addEventListener('click', function () {
      var v = {};
      m.node.querySelectorAll('[name]').forEach(function (el) { v[el.getAttribute('name')] = el.value.trim(); });
      v.weeklyGoal = Math.max(1, Number(v.weeklyGoal) || 8);
      WB.Store.commit('profile', function (d) { Object.assign(d.profile, v); });
      m.close();
      ui.toast('设置已保存', 'ok');
    });

    m.node.querySelectorAll('[data-settings-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-settings-act');
        if (act === 'backup') {
          U.download('秋招工作台备份_' + U.today() + '.json', WB.Store.exportJSON(), 'application/json');
          ui.toast('已导出完整备份', 'ok');
        } else if (act === 'csv') {
          WB.appActions.exportCSV();
        } else if (act === 'restore') {
          U.pickFile('.json,application/json', function (text) {
            try {
              WB.Store.importJSON(text);
              ui.toast('备份已恢复', 'ok');
              m.close();
            } catch (e) { ui.toast('文件格式无法解析', 'err'); }
          });
        } else if (act === 'demo') {
          WB.Store.loadDemo();
          ui.toast('已载入示例数据', 'ok');
          m.close();
        } else if (act === 'clear') {
          ui.confirm({
            title: '清空全部数据',
            message: '投递、面试、素材等全部本地记录都会被删除，且无法撤销。建议先导出备份。',
            danger: true, okText: '确认清空'
          }).then(function (ok) {
            if (!ok) return;
            WB.Store.clearAll();
            ui.toast('已清空全部数据', 'ok');
            m.close();
          });
        }
      });
    });
  }

  /* ---------------------------------------------------------
     路由
     --------------------------------------------------------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    return h.split('?')[0] || 'dashboard';
  }

  function routeView() {
    var key = parseHash();
    if (!WB.views[key]) key = 'dashboard';
    current = key;
    setActiveNav();

    var view = WB.views[key];
    document.title = view.label + ' · 秋招 × 实习成长工作台';
    els.content.scrollTop = 0;
    try { view.render(els.content); } catch (e) {
      els.content.innerHTML = '<div class="card">' + ui.empty('页面渲染出错', String(e && e.message || e), 'alert') + '</div>';
      if (window.console) console.error(e);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------------------------------------------------
     全局键盘
     --------------------------------------------------------- */
  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (typing) return;
      if (document.getElementById('overlay-root').children.length) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        WB.appActions.openEditor(null);
      } else if (e.key === '/') {
        e.preventDefault();
        if (current === 'applications') {
          var s = els.content.querySelector('[data-search]');
          if (s) s.focus();
        } else { location.hash = '#/applications'; }
      } else if (e.key === 'g') {
        e.preventDefault();
        location.hash = '#/dashboard';
      }
    });
  }

  /* ---------------------------------------------------------
     启动
     --------------------------------------------------------- */
  function boot() {
    els.sidebar = document.getElementById('sidebar');
    els.topbar = document.getElementById('topbar');
    els.content = document.getElementById('content');

    WB.Store.init();
    applyTheme();
    renderSidebar();
    renderTopbar();
    routeView();
    bindKeys();

    window.addEventListener('hashchange', routeView);

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (WB.Store.data.settings.theme === 'system') {
          applyTheme();
          renderSidebar();
          renderTopbar();
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    // 数据变化 → 局部刷新（顶栏 + 当前页）
    var refresh = U.debounce(function () {
      renderSidebar();
      renderTopbar();
      routeView();
    }, 40);
    WB.Store.subscribe(function (reason) {
      if (reason === 'theme' || reason === 'quote') {
        applyTheme();
        renderSidebar();
        renderTopbar();
        return;
      }
      refresh();
    });

    if (WB.Store._memoryOnly || !WB.Store._available) {
      setTimeout(function () {
        ui.toast('当前无法写入本地存储，请及时导出备份', 'warn');
      }, 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  WB.go = function (hash) { location.hash = hash; };
})(window.WB);
