/* ============================================================
   views/dashboard.js — 个人 Dashboard：安静、自律、治愈
   ============================================================ */
window.WB = window.WB || {};
WB.views = WB.views || {};

(function (WB) {
  'use strict';

  var U = WB.util, ui = WB.ui, C = WB.charts, A = WB.analytics;

  /* ---------------- 本地智能：规则型建议（不联网） ---------------- */
  function insights(data, s) {
    var out = [];
    var today = U.today();

    var hot = s.upcoming.filter(function (u) { return u.days <= 1; });
    if (hot.length) {
      var u = hot[0];
      out.push({
        tone: 'blue', icon: 'calendar', tag: '日程',
        title: (u.days === 0 ? '今天' : '明天') + '有' + (u.type || '安排'),
        text: u.app.company + ' · ' + u.app.role,
        cta: { label: '查看投递', hash: '#/applications' }
      });
    }

    if (s.followUps.length) {
      out.push({
        tone: 'amber', icon: 'bell', tag: '跟进',
        title: s.followUps.length + ' 个投递需要主动跟进',
        text: s.followUps[0].app.company + '：' + s.followUps[0].reason,
        cta: { label: '去处理', hash: '#/applications?filter=followup' }
      });
    }

    if (s.week.count < s.week.goal) {
      out.push({
        tone: 'gray', icon: 'target', tag: '节奏',
        title: '本周投递 ' + s.week.count + ' / ' + s.week.goal + ' 家',
        text: '还差 ' + (s.week.goal - s.week.count) + ' 家达成目标，保持稳定节奏比冲量更重要。',
        cta: { label: '记录投递', action: 'new' }
      });
    } else {
      out.push({
        tone: 'green', icon: 'check', tag: '节奏',
        title: '本周目标已达成',
        text: '已投递 ' + s.week.count + ' 家，超出目标 ' + (s.week.count - s.week.goal) + ' 家。留出时间做复盘与素材沉淀。',
        cta: { label: '去沉淀', hash: '#/internship' }
      });
    }

    var staleWishlist = (data.applications || []).filter(function (a) {
      return a.status === 'wishlist' && (U.daysFromToday(a.appliedAt) || 0) < -5;
    });
    if (staleWishlist.length) {
      out.push({
        tone: 'purple', icon: 'clock', tag: '提醒',
        title: staleWishlist.length + ' 家意向岗位还没投',
        text: staleWishlist[0].company + ' · ' + staleWishlist[0].role + ' — 意向躺太久容易错过批次。',
        cta: { label: '查看意向', hash: '#/applications' }
      });
    }

    if (s.total >= 6 && s.rates.interview < 30) {
      out.push({
        tone: 'amber', icon: 'trending', tag: '诊断',
        title: '面试转化率 ' + s.rates.interview + '%',
        text: '简历关通过、面试关偏弱。复盘已记录的面试，把高频问题整理进题库。',
        cta: { label: '面试训练', hash: '#/interview' }
      });
    }

    if (s.offers > 0) {
      out.push({
        tone: 'green', icon: 'star', tag: '进展',
        title: '已拿到 ' + s.offers + ' 个 Offer',
        text: '别忘了同步比较城市、薪资与成长空间，再决定手里的优先级。',
        cta: { label: '对比 Offer', hash: '#/applications?view=compare' }
      });
    }

    return out.slice(0, 3);
  }

  function kpi(label, value, foot, iconName, tone) {
    return '' +
      '<div class="kpi">' +
        '<div class="k-stat">' +
          '<span class="k-label">' + U.esc(label) + '</span>' +
          '<span class="k-icon" style="color:' + C.toneVar(tone) + '">' + ui.icon(iconName, 14) + '</span>' +
        '</div>' +
        '<div class="k-value">' + U.esc(value) + '</div>' +
        '<div class="k-foot">' + foot + '</div>' +
      '</div>';
  }

  function render(root) {
    var data = WB.Store.data;
    var s = A.summary(data);
    var apps = data.applications || [];

    /* --------- 顶部标题 --------- */
    var sub = '秋招冲刺第 ' + s.daysSince + ' 天 · 目标岗位 ' + (data.profile.targetRole || '待填写') +
              ' · 目标城市 ' + (data.profile.targetCity || '待填写');

    var demoBanner = data.settings.demo ? '' +
      '<div class="notice">' +
        ui.icon('sparkles', 15) +
        '<div class="notice-body">' +
          '<b>当前展示的是示例数据</b>' +
          '<span>共 ' + apps.length + ' 条，方便你先感受看板与可视化效果。开始记录自己的投递时，一键清空即可。</span>' +
        '</div>' +
        '<button class="btn sm" data-act="clear-demo">清空并开始记录</button>' +
        '<button class="btn ghost sm" data-act="dismiss-demo">知道了</button>' +
      '</div>' : '';

    /* --------- KPI --------- */
    var kpis = '' +
      kpi('累计投递', s.funnel[0].value, '近 30 天投递 <b class="num">' + s.trend.reduce(function (a, b) { return a + b.value; }, 0) + '</b> 家', 'inbox', 'blue') +
      kpi('进行中', s.active, '投递 <b class="num">' + s.byStatus.applied + '</b> · 笔试 <b class="num">' + s.byStatus.written + '</b> · 面试 <b class="num">' + s.byStatus.interview + '</b>', 'refresh', 'purple') +
      kpi('面试邀约', s.funnel[2].value, '面试转化率 <b class="num">' + s.rates.interview + '%</b>', 'chat', 'amber') +
      kpi('Offer', s.offers, 'Offer 率 <b class="num">' + s.rates.offer + '%</b>', 'star', 'green') +
      kpi('待跟进', s.followUps.length, s.followUps.length ? '<span class="warn-text">需要今天处理</span>' : '暂无积压，节奏很稳', 'bell', s.followUps.length ? 'red' : 'gray');

    /* --------- 今日聚焦 --------- */
    var ins = insights(data, s);
    var focus = ins.map(function (it) {
      return '' +
        '<div class="focus-card" data-hash="' + U.attr(it.cta.hash || '') + '" data-action="' + U.attr(it.cta.action || '') + '">' +
          '<div class="focus-head">' +
            '<span class="chip ' + it.tone + '">' + ui.icon(it.icon, 12) + U.esc(it.tag) + '</span>' +
          '</div>' +
          '<div class="focus-title">' + U.esc(it.title) + '</div>' +
          '<div class="focus-text">' + U.esc(it.text) + '</div>' +
          '<div class="focus-cta">' + U.esc(it.cta.label) + ui.icon('arrowRight', 13) + '</div>' +
        '</div>';
    }).join('');

    /* --------- 漏斗 --------- */
    var funnelCard = '' +
      '<section class="card">' +
        '<div class="card-head">' +
          '<div>' +
            '<div class="card-title">' + ui.icon('filter', 15) + '投递转化漏斗</div>' +
            '<div class="card-sub">按「曾经到达的最深阶段」统计，被拒前到达的环节同样计入</div>' +
          '</div>' +
        '</div>' +
        C.funnel(s.funnel) +
        '<div class="rate-strip">' +
          '<div class="rate-item"><span>简历 → 笔试</span><b class="num">' + s.rates.screen + '%</b></div>' +
          '<div class="rate-item"><span>简历 → 面试</span><b class="num">' + s.rates.interview + '%</b></div>' +
          '<div class="rate-item"><span>简历 → Offer</span><b class="num">' + s.rates.offer + '%</b></div>' +
        '</div>' +
      '</section>';

    /* --------- 本周节奏 --------- */
    var rhythm = '' +
      '<section class="card">' +
        '<div class="card-head"><div class="card-title">' + ui.icon('target', 15) + '本周节奏</div></div>' +
        '<div class="rhythm">' +
          '<div class="ring">' +
            C.ring(s.week.pct, { size: 96, stroke: 8 }) +
            '<div class="ring-label"><b class="num">' + s.week.count + '<span style="font-size:12px;color:var(--text-3)">/' + s.week.goal + '</span></b><small>本周投递</small></div>' +
          '</div>' +
          '<div class="rhythm-list">' +
            '<div class="mini-row"><span>已投递</span><b class="num">' + s.funnel[0].value + ' 家</b></div>' +
            '<div class="mini-row"><span>进行中</span><b class="num">' + s.active + ' 家</b></div>' +
            '<div class="mini-row"><span>平均每周</span><b class="num">' + (s.daysSince > 0 ? (s.funnel[0].value / Math.max(1, s.daysSince / 7)).toFixed(1) : '0') + ' 家</b></div>' +
            '<div class="mini-row"><span>目标完成度</span><b class="num">' + s.week.pct + '%</b></div>' +
          '</div>' +
        '</div>' +
        '<div class="quote-mini">' + ui.icon('sparkles', 13) + '<span>稳定投递 + 及时复盘，是这个阶段最有效的两件事。</span></div>' +
      '</section>';

    /* --------- 趋势 --------- */
    var trendTotal = s.trend.reduce(function (a, b) { return a + b.value; }, 0);
    var trendCard = '' +
      '<section class="card">' +
        '<div class="card-head">' +
          '<div>' +
            '<div class="card-title">' + ui.icon('trending', 15) + '近 30 天投递趋势</div>' +
            '<div class="card-sub">合计 <b class="num">' + trendTotal + '</b> 次投递 · 峰值 <b class="num">' +
              Math.max.apply(null, s.trend.map(function (d) { return d.value; }).concat([0])) + '</b> 次/天</div>' +
          '</div>' +
        '</div>' +
        C.barsV(s.trend, { width: 820, height: 200 }) +
      '</section>';

    /* --------- 状态分布 --------- */
    var donutItems = WB.STATUS_ORDER.filter(function (k) { return s.byStatus[k] > 0; }).map(function (k) {
      return { label: WB.STATUS[k].label, value: s.byStatus[k], tone: WB.STATUS[k].tone };
    });
    var statusCard = '' +
      '<section class="card">' +
        '<div class="card-head"><div class="card-title">' + ui.icon('columns', 15) + '状态分布</div></div>' +
        (donutItems.length
          ? '<div class="donut-row">' + C.donut(donutItems, { centerLabel: '条记录' }) + C.legend(donutItems, apps.length) + '</div>'
          : ui.empty('还没有投递记录', '从「求职管理」添加第一条投递开始。', 'inbox')) +
      '</section>';

    /* --------- 近期日程 --------- */
    var up = s.upcoming.slice(0, 5);
    var upcomingCard = '' +
      '<section class="card">' +
        '<div class="card-head">' +
          '<div class="card-title">' + ui.icon('calendar', 15) + '近期日程</div>' +
          '<span class="chip gray">未来 14 天</span>' +
        '</div>' +
        (up.length ? '<ul class="tl-list">' + up.map(function (u) {
          var d = U.parseISO(u.date);
          return '' +
            '<li class="tl-item">' +
              '<div class="tl-date' + (u.days <= 1 ? ' hot' : '') + '">' +
                '<b>' + (d.getMonth() + 1) + '/' + d.getDate() + '</b>' +
                '<span>' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()] + '</span>' +
              '</div>' +
              '<div class="tl-main">' +
                '<div class="tl-title truncate">' + U.esc(u.app.company) + '</div>' +
                '<div class="tl-sub truncate">' + U.esc(u.app.role) + '</div>' +
              '</div>' +
              '<div class="tl-side">' +
                '<span class="chip ' + (u.type.indexOf('面') >= 0 ? 'amber' : u.type.indexOf('笔试') >= 0 ? 'purple' : 'blue') + '">' + U.esc(u.type) + '</span>' +
                '<span class="fs-12 muted nowrap">' + U.esc(U.rel(u.date)) + '</span>' +
              '</div>' +
            '</li>';
        }).join('') + '</ul>' : ui.empty('近期没有安排', '笔试 / 面试时间会在这里集中提醒你。', 'calendar')) +
      '</section>';

    /* --------- 待跟进 --------- */
    var fu = s.followUps.slice(0, 5);
    var followCard = '' +
      '<section class="card">' +
        '<div class="card-head">' +
          '<div class="card-title">' + ui.icon('bell', 15) + '待跟进</div>' +
          (fu.length ? '<span class="chip ' + (s.followUps.some(function (f) { return f.level === 'high'; }) ? 'red' : 'amber') + '">' + s.followUps.length + ' 项</span>' : '') +
        '</div>' +
        (fu.length ? '<ul class="fu-list">' + fu.map(function (f) {
          return '' +
            '<li class="fu-item" data-id="' + U.attr(f.app.id) + '">' +
              '<span class="fu-dot ' + f.level + '"></span>' +
              '<div class="fu-main">' +
                '<div class="tl-title truncate">' + U.esc(f.app.company) + ' · <span class="muted">' + U.esc(f.app.role) + '</span></div>' +
                '<div class="tl-sub">' + U.esc(f.reason) + '</div>' +
              '</div>' +
              '<button class="btn ghost sm" data-open="' + U.attr(f.app.id) + '">处理</button>' +
            '</li>';
        }).join('') + '</ul>' : ui.empty('没有积压事项', '所有投递都在正常推进中。', 'check')) +
      '</section>';

    /* --------- 渠道效果 --------- */
    var ch = s.channels.slice(0, 5);
    var channelCard = '' +
      '<section class="card">' +
        '<div class="card-head">' +
          '<div class="card-title">' + ui.icon('route', 15) + '渠道效果</div>' +
          '<div class="card-sub">按面试转化率参考</div>' +
        '</div>' +
        (ch.length ? C.barsH(ch.map(function (c) {
          return { label: c.channel, value: c.total, tone: 'blue', display: c.total + ' 家 · ' + c.rate + '%' };
        })) : ui.empty('暂无渠道数据', '填写投递来源后即可比较各渠道效果。', 'route')) +
      '</section>';

    root.innerHTML = '' +
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">秋招总览</h1>' +
          '<div class="page-sub">' + U.esc(sub) + '</div>' +
        '</div>' +
        '<div class="page-actions">' +
          '<button class="btn" data-act="import">' + ui.icon('upload', 14) + '导入 CSV</button>' +
          '<button class="btn primary" data-act="new">' + ui.icon('plus', 14) + '记录投递</button>' +
        '</div>' +
      '</div>' +
      demoBanner +
      '<div class="kpi-grid">' + kpis + '</div>' +
      (focus ? '<div class="focus-grid">' + focus + '</div>' : '') +
      '<div class="grid g-2-1 mt-16">' + funnelCard + rhythm + '</div>' +
      '<div class="grid g-2-1 mt-16">' + trendCard + statusCard + '</div>' +
      '<div class="grid g-3 mt-16">' + upcomingCard + followCard + channelCard + '</div>' +
      '<div class="page-foot">数据保存在本机浏览器（localStorage）· 建议每周在左下角导出一次 JSON 备份</div>';

    /* --------- 事件 --------- */
    root.querySelectorAll('[data-act="new"]').forEach(function (b) {
      b.addEventListener('click', function () { WB.appActions && WB.appActions.openEditor(null); });
    });
    root.querySelectorAll('[data-act="import"]').forEach(function (b) {
      b.addEventListener('click', function () { WB.appActions && WB.appActions.openImport(); });
    });
    var clearBtn = root.querySelector('[data-act="clear-demo"]');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      ui.confirm({
        title: '清空示例数据',
        message: '将移除全部示例投递记录，你会得到一个干净的看板，之后可以随时重新载入示例。',
        okText: '清空并开始'
      }).then(function (ok) {
        if (!ok) return;
        WB.Store.clearAll();
        ui.toast('已清空，开始记录你的秋招吧', 'ok');
      });
    });
    var dismissBtn = root.querySelector('[data-act="dismiss-demo"]');
    if (dismissBtn) dismissBtn.addEventListener('click', function () {
      WB.Store.commit('settings', function (d) { d.settings.demo = false; });
    });

    root.querySelectorAll('.focus-card').forEach(function (el) {
      el.addEventListener('click', function () {
        var action = el.getAttribute('data-action');
        var hash = el.getAttribute('data-hash');
        if (action === 'new') { WB.appActions && WB.appActions.openEditor(null); return; }
        if (hash) location.hash = hash;
      });
    });

    root.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-open');
        var app = WB.Store.data.applications.filter(function (a) { return a.id === id; })[0];
        if (app) WB.appActions && WB.appActions.openEditor(app);
      });
    });

    root.querySelectorAll('.fu-item').forEach(function (li) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', function () {
        var id = li.getAttribute('data-id');
        var app = WB.Store.data.applications.filter(function (a) { return a.id === id; })[0];
        if (app) WB.appActions && WB.appActions.openDetail(app);
      });
    });
  }

  WB.views.dashboard = {
    key: 'dashboard',
    route: '#/dashboard',
    label: 'Dashboard',
    icon: 'home',
    render: render
  };
})(window.WB);
