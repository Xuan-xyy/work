/* ============================================================
   views/applications.js — 求职管理：看板 / 表格 / 对比 / 导入导出
   ============================================================ */
window.WB = window.WB || {};
WB.views = WB.views || {};

(function (WB) {
  'use strict';

  var U = WB.util, ui = WB.ui, C = WB.charts, A = WB.analytics;

  var state = {
    q: '',
    status: 'all',
    channel: 'all',
    filter: 'all',      // all | active | followup
    sort: 'appliedAt',
    dir: 'desc',
    view: 'board',
    selected: {}
  };

  var FIELDS = [
    { key: 'company',      label: '公司名称', required: true },
    { key: 'role',         label: '岗位名称' },
    { key: 'city',         label: '城市' },
    { key: 'channel',      label: '投递渠道' },
    { key: 'appliedAt',    label: '投递日期' },
    { key: 'status',       label: '当前状态' },
    { key: 'priority',     label: '优先级' },
    { key: 'salary',       label: '薪资范围' },
    { key: 'resumeVersion', label: '简历版本' },
    { key: 'jobUrl',       label: '职位链接' },
    { key: 'nextEventType', label: '下次节点类型' },
    { key: 'nextEventAt',  label: '下次节点时间' },
    { key: 'notes',        label: '备注' }
  ];

  var HEADER_HINTS = [
    ['公司', 'company'], ['企业', 'company'], ['company', 'company'],
    ['岗位', 'role'], ['职位', 'role'], ['role'], ['position', 'role'],
    ['城市', 'city'], ['地点', 'city'], ['city', 'city'],
    ['渠道', 'channel'], ['来源', 'channel'], ['channel', 'channel'], ['途径', 'channel'],
    ['投递日期', 'appliedAt'], ['投递时间', 'appliedAt'], ['日期', 'appliedAt'], ['date', 'appliedAt'], ['time', 'appliedAt'],
    ['状态', 'status'], ['进度', 'status'], ['status', 'status'],
    ['优先级', 'priority'], ['priority', 'priority'], ['重要', 'priority'],
    ['薪资', 'salary'], ['待遇', 'salary'], ['salary', 'salary'],
    ['简历', 'resumeVersion'], ['resume', 'resumeVersion'],
    ['链接', 'jobUrl'], ['url', 'jobUrl'], ['link', 'jobUrl'],
    ['节点', 'nextEventAt'], ['面试时间', 'nextEventAt'], ['笔试时间', 'nextEventAt'], ['event', 'nextEventAt'],
    ['备注', 'notes'], ['说明', 'notes'], ['note', 'notes'], ['memo', 'notes']
  ];

  /* ---------------------------------------------------------
     解析辅助
     --------------------------------------------------------- */
  function parseDateCell(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return '';
    var m = /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + U.pad(+m[2]) + '-' + U.pad(+m[3]);
    m = /^(\d{1,2})[-/.月](\d{1,2})日?$/.exec(s);
    if (m) return new Date().getFullYear() + '-' + U.pad(+m[1]) + '-' + U.pad(+m[2]);
    if (/^\d{5}$/.test(s)) { // Excel 序列号
      var d = new Date(Date.UTC(1899, 11, 30) + (+s) * 86400000);
      return U.iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    var d2 = new Date(s.replace(/年|月/g, '-').replace(/日/g, ''));
    return isNaN(d2.getTime()) ? '' : U.iso(d2);
  }

  var STATUS_HINTS = [
    ['意向', 'wishlist'], ['待投', 'wishlist'], ['收藏', 'wishlist'], ['wish', 'wishlist'],
    ['offer', 'offer'], ['录用', 'offer'], ['通过', 'offer'],
    ['笔试', 'written'], ['测评', 'written'], ['written', 'written'],
    ['面试', 'interview'], ['一面', 'interview'], ['二面', 'interview'], ['复试', 'interview'], ['interview', 'interview'],
    ['未通过', 'rejected'], ['已拒', 'rejected'], ['拒绝', 'rejected'], ['感谢信', 'rejected'], ['挂', 'rejected'], ['reject', 'rejected'], ['结束', 'rejected'],
    ['放弃', 'withdrawn'], ['撤回', 'withdrawn'], ['withdraw', 'withdrawn'],
    ['已投', 'applied'], ['投递', 'applied'], ['已申请', 'applied'], ['applied', 'applied']
  ];

  function parseStatusCell(v) {
    var s = String(v || '').trim().toLowerCase();
    if (!s) return 'applied';
    for (var i = 0; i < STATUS_HINTS.length; i++) {
      if (s.indexOf(STATUS_HINTS[i][0]) >= 0) return STATUS_HINTS[i][1];
    }
    return 'applied';
  }

  function guessField(header) {
    var h = String(header || '').trim().toLowerCase();
    if (!h) return '';
    for (var i = 0; i < HEADER_HINTS.length; i++) {
      var hint = HEADER_HINTS[i];
      if (h.indexOf(hint[0]) >= 0) return hint[1] === undefined ? hint[0] : hint[1];
    }
    return '';
  }

  /* ---------------------------------------------------------
     过滤 / 排序
     --------------------------------------------------------- */
  function filtered() {
    var apps = (WB.Store.data.applications || []).slice();
    var q = state.q.trim().toLowerCase();

    if (state.filter === 'active') apps = apps.filter(A.isActive);
    if (state.filter === 'followup') {
      var ids = {};
      A.followUps(apps).forEach(function (f) { ids[f.app.id] = true; });
      apps = apps.filter(function (a) { return ids[a.id]; });
    }
    if (state.status !== 'all') apps = apps.filter(function (a) { return a.status === state.status; });
    if (state.channel !== 'all') apps = apps.filter(function (a) { return a.channel === state.channel; });
    if (q) {
      apps = apps.filter(function (a) {
        return [a.company, a.role, a.city, a.channel, a.notes, a.resumeVersion, a.salary]
          .join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }

    var key = state.sort, dir = state.dir;
    if (key === 'stage') {
      apps.sort(function (a, b) { return (A.maxStage(a) - A.maxStage(b)) * (dir === 'asc' ? 1 : -1); });
    } else {
      apps.sort(U.by(key, dir));
    }
    return apps;
  }

  function selectedIds() { return Object.keys(state.selected).filter(function (k) { return state.selected[k]; }); }

  /* ---------------------------------------------------------
     编辑器 / 详情
     --------------------------------------------------------- */
  function openEditor(app) {
    var isNew = !app;
    var base = app || WB.normalizeApp({
      appliedAt: U.today(), status: 'applied', channel: '官网', priority: 'mid'
    });

    var f = function (key, control, hint) {
      return ui.field(FIELDS.filter(function (x) { return x.key === key; })[0].label, control, hint);
    };

    var body = '' +
      '<div class="form-grid">' +
        f('company', '<input class="input" name="company" data-autofocus placeholder="例如：字节跳动" value="' + U.attr(base.company) + '">') +
        f('role', '<input class="input" name="role" placeholder="例如：后端开发工程师" value="' + U.attr(base.role) + '">') +
        f('city', '<input class="input" name="city" list="city-list" placeholder="北京" value="' + U.attr(base.city) + '">' +
          '<datalist id="city-list">' + WB.CITIES.map(function (c) { return '<option value="' + U.attr(c) + '">'; }).join('') + '</datalist>') +
        f('channel', '<select class="select" name="channel">' + ui.options(WB.CHANNELS, base.channel) + '</select>') +
        f('appliedAt', '<input class="input" type="date" name="appliedAt" value="' + U.attr(base.appliedAt) + '">') +
        f('status', '<select class="select" name="status">' + ui.options(WB.STATUS_ORDER.map(function (k) { return { value: k, label: WB.STATUS[k].label }; }), base.status) + '</select>') +
        f('priority', '<select class="select" name="priority">' + ui.options(WB.PRIORITIES.map(function (p) { return { value: p.key, label: p.label }; }), base.priority) + '</select>') +
        f('salary', '<input class="input" name="salary" placeholder="例如：22k × 15" value="' + U.attr(base.salary) + '">') +
        f('resumeVersion', '<input class="input" name="resumeVersion" placeholder="例如：后端-v3" value="' + U.attr(base.resumeVersion) + '">') +
        f('jobUrl', '<input class="input" name="jobUrl" placeholder="https://" value="' + U.attr(base.jobUrl) + '">') +
        f('nextEventType', '<select class="select" name="nextEventType">' + ui.options(WB.EVENT_TYPES, base.nextEventType, '未安排') + '</select>') +
        f('nextEventAt', '<input class="input" type="date" name="nextEventAt" value="' + U.attr(base.nextEventAt) + '">') +
        '<div class="span-2">' + f('notes', '<textarea class="textarea" name="notes" placeholder="记录 JD 关键词、HR 联系方式、面试官反馈等">' + U.esc(base.notes) + '</textarea>') + '</div>' +
      '</div>';

    var m = ui.drawer({
      title: isNew ? '记录一次投递' : '编辑投递',
      subtitle: isNew ? '建议只填公司 + 岗位，其余可随时补充' : (base.company + ' · ' + base.role),
      body: body,
      footer: (isNew ? '' : '<button class="btn danger" data-del>' + ui.icon('trash', 14) + '删除</button>') +
              '<div class="spacer"></div>' +
              '<button class="btn" data-cancel>取消</button>' +
              '<button class="btn primary" data-save>' + ui.icon('check', 14) + '保存</button>'
    });

    function readForm() {
      var o = {};
      m.node.querySelectorAll('[name]').forEach(function (el) { o[el.getAttribute('name')] = el.value.trim(); });
      return o;
    }

    m.node.querySelector('[data-cancel]').addEventListener('click', function () { m.close(); });
    var delBtn = m.node.querySelector('[data-del]');
    if (delBtn) delBtn.addEventListener('click', function () {
      ui.confirm({ title: '删除这条投递？', message: '「' + base.company + ' · ' + base.role + '」及其时间线将被移除。', danger: true, okText: '删除' })
        .then(function (ok) {
          if (!ok) return;
          WB.Store.removeApplication(base.id);
          m.close();
          ui.toast('已删除', 'ok');
        });
    });

    m.node.querySelector('[data-save]').addEventListener('click', function () {
      var v = readForm();
      if (!v.company) { ui.toast('请填写公司名称', 'warn'); return; }
      if (!v.appliedAt) v.appliedAt = U.today();
      if (isNew) {
        WB.Store.addApplication(v);
        ui.toast('已添加到投递看板', 'ok');
      } else {
        WB.Store.updateApplication(base.id, v, '信息更新');
        ui.toast('已保存', 'ok');
      }
      m.close();
    });
  }

  function openDetail(app) {
    var meta = [
      ['城市', app.city || '—'],
      ['渠道', app.channel || '—'],
      ['投递日期', U.fmtShort(app.appliedAt) + '（' + U.rel(app.appliedAt) + '）'],
      ['优先级', (WB.PRIORITIES.filter(function (p) { return p.key === app.priority; })[0] || { label: '常规' }).label],
      ['薪资', app.salary || '—'],
      ['简历版本', app.resumeVersion || '—'],
      ['下次节点', app.nextEventAt ? (app.nextEventType || '待办') + ' · ' + U.fmtShort(app.nextEventAt) : '未安排']
    ];

    var tl = (app.timeline || []).slice().sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    var stIdx = WB.STATUS_ORDER.map(function (k, i) { return k; });
    var currentStage = A.maxStage(app);

    var body = '' +
      '<div class="detail-top">' +
        '<div class="detail-company">' + U.esc(app.company) + '</div>' +
        '<div class="detail-role">' + U.esc(app.role || '未填写岗位') + '</div>' +
        '<div class="row wrap mt-12">' + ui.statusChip(app.status) + ui.prioChip(app.priority) +
          (app.jobUrl ? '<a class="chip outline" href="' + U.attr(app.jobUrl) + '" target="_blank" rel="noopener">' + ui.icon('external', 12) + '职位链接</a>' : '') +
        '</div>' +
      '</div>' +
      '<div class="meta-grid">' + meta.map(function (row) {
        return '<div class="meta-item"><span>' + U.esc(row[0]) + '</span><b>' + U.esc(row[1]) + '</b></div>';
      }).join('') + '</div>' +
      (app.notes ? '<div class="note-block"><div class="field-label">备注</div><p>' + U.esc(app.notes) + '</p></div>' : '') +
      '<div class="field-label mt-16">推进时间线</div>' +
      '<ul class="timeline">' + tl.map(function (t) {
        var meta2 = WB.STATUS[t.status] || WB.STATUS.applied;
        return '<li class="timeline-item">' +
          '<span class="timeline-dot ' + meta2.tone + '"></span>' +
          '<div class="timeline-body">' +
            '<div class="row between"><b>' + U.esc(meta2.label) + '</b><span class="fs-12 muted num">' + U.esc(U.fmtShort(t.at)) + '</span></div>' +
            (t.note ? '<div class="fs-12 dim">' + U.esc(t.note) + '</div>' : '') +
          '</div>' +
        '</li>';
      }).join('') + '</ul>';

    var nextStage = { wishlist: 'applied', applied: 'written', written: 'interview', interview: 'offer' }[app.status];

    var d = ui.drawer({
      title: '投递详情',
      subtitle: '最近更新 ' + U.fmtShort(app.updatedAt || app.appliedAt),
      body: body,
      footer: '<button class="btn danger" data-del>' + ui.icon('trash', 14) + '</button>' +
              '<div class="spacer"></div>' +
              (nextStage ? '<button class="btn" data-next>推进到「' + WB.STATUS[nextStage].label + '」</button>' : '') +
              '<button class="btn primary" data-edit>' + ui.icon('edit', 14) + '编辑</button>'
    });

    d.node.querySelector('[data-edit]').addEventListener('click', function () { d.close(); openEditor(app); });
    d.node.querySelector('[data-del]').addEventListener('click', function () {
      ui.confirm({ title: '删除这条投递？', message: app.company + ' · ' + app.role, danger: true, okText: '删除' }).then(function (ok) {
        if (!ok) return;
        WB.Store.removeApplication(app.id);
        d.close();
        ui.toast('已删除', 'ok');
      });
    });
    var nb = d.node.querySelector('[data-next]');
    if (nb) nb.addEventListener('click', function () {
      WB.Store.updateApplication(app.id, { status: nextStage });
      d.close();
      ui.toast('已推进到「' + WB.STATUS[nextStage].label + '」', 'ok');
    });
  }

  /* ---------------------------------------------------------
     导入
     --------------------------------------------------------- */
  function openImport() {
    var body = '' +
      '<div class="import-steps">' +
        '<div class="step-chip on">1 粘贴数据</div><span class="step-line"></span>' +
        '<div class="step-chip" data-step="2">2 字段映射</div><span class="step-line"></span>' +
        '<div class="step-chip" data-step="3">3 确认导入</div>' +
      '</div>' +
      '<div data-pane="1">' +
        '<p class="fs-13 dim" style="margin-bottom:10px">直接从 Excel / 腾讯文档里复制整块表格，粘贴到下面的框里即可（自动识别制表符或逗号），也可以选择 CSV 文件。</p>' +
        '<textarea class="textarea" data-paste data-autofocus style="min-height:170px;font-family:var(--font-mono);font-size:12.5px" placeholder="公司	岗位	投递日期	状态&#10;字节跳动	后端开发工程师	2025-09-01	已投递"></textarea>' +
        '<div class="row mt-12"><button class="btn sm" data-file>' + ui.icon('upload', 13) + '选择 CSV 文件</button>' +
        '<span class="fs-12 muted">支持 .csv / .txt，自动识别列名</span></div>' +
      '</div>' +
      '<div data-pane="2" class="hidden"></div>' +
      '<div data-pane="3" class="hidden"></div>';

    var m = ui.modal({
      title: '批量导入投递记录',
      wide: true,
      body: body,
      footer: '<span class="fs-12 muted" data-status>等待粘贴数据…</span><div class="spacer"></div>' +
              '<button class="btn" data-cancel>取消</button>' +
              '<button class="btn" data-parse disabled>下一步：字段映射</button>'
    });

    var parsed = null;
    var mapping = {};
    var step = 1;
    var pasteEl = m.node.querySelector('[data-paste]');
    var statusEl = m.node.querySelector('[data-status]');
    var parseBtn = m.node.querySelector('[data-parse]');
    var pane1 = m.node.querySelector('[data-pane="1"]');
    var pane2 = m.node.querySelector('[data-pane="2"]');
    var pane3 = m.node.querySelector('[data-pane="3"]');
    var stepEls = m.node.querySelectorAll('.step-chip');

    function setStep(n) {
      step = n;
      stepEls.forEach(function (el) {
        el.classList.toggle('on', Number(el.getAttribute('data-step') || 1) <= n);
      });
      pane1.classList.toggle('hidden', n !== 1);
      pane2.classList.toggle('hidden', n !== 2);
      pane3.classList.toggle('hidden', n !== 3);
      parseBtn.classList.toggle('hidden', n === 3);
      if (n === 1) { parseBtn.textContent = '下一步：字段映射'; parseBtn.disabled = !pasteEl.value.trim(); }
      if (n === 2) { parseBtn.textContent = '下一步：确认导入'; parseBtn.disabled = false; }
      if (n === 3) { statusEl.textContent = '确认导入方式'; }
    }

    pasteEl.addEventListener('input', function () {
      var has = pasteEl.value.trim().length > 0;
      parseBtn.disabled = !has;
      statusEl.textContent = has ? '识别到 ' + pasteEl.value.split('\n').filter(function (l) { return l.trim(); }).length + ' 行' : '等待粘贴数据…';
    });

    // 支持直接从 Excel 粘贴
    pasteEl.addEventListener('paste', function () {
      setTimeout(function () {
        parseBtn.disabled = !pasteEl.value.trim();
        statusEl.textContent = '识别到 ' + pasteEl.value.split('\n').filter(function (l) { return l.trim(); }).length + ' 行';
      }, 0);
    });

    m.node.querySelector('[data-file]').addEventListener('click', function () {
      U.pickFile('.csv,.txt,text/csv', function (text) {
        pasteEl.value = text;
        parseBtn.disabled = !text.trim();
        statusEl.textContent = '已读取文件，共 ' + text.split('\n').filter(function (l) { return l.trim(); }).length + ' 行';
      });
    });

    parseBtn.addEventListener('click', function () {
      if (step === 2) { showConfirm(); return; }
      var res = WB.csv.parse(pasteEl.value);
      if (!res.headers.length) { ui.toast('没有解析到表头', 'warn'); return; }
      parsed = res;
      mapping = {};
      res.headers.forEach(function (h) { mapping[h] = guessField(h); });

      pane2.innerHTML = '' +
        '<p class="fs-13 dim" style="margin-bottom:14px">已自动匹配 ' + res.headers.length + ' 列，共 ' + res.rows.length + ' 行数据。请确认映射关系（<b>公司名称</b>为必填）。</p>' +
        '<div class="map-table">' +
          '<div class="map-head"><span>表格列名</span><span>导入到</span><span>示例数据</span></div>' +
          res.headers.map(function (h, i) {
            return '<div class="map-row">' +
              '<span class="map-src truncate" title="' + U.attr(h) + '">' + U.esc(h) + '</span>' +
              '<select class="select" data-map="' + U.attr(h) + '">' + ui.options(
                [{ value: '', label: '不导入' }].concat(FIELDS.map(function (x) { return { value: x.key, label: x.label }; })), mapping[h]) + '</select>' +
              '<span class="fs-12 muted truncate">' + U.esc(res.rows[0] ? res.rows[0][h] : '') + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="mt-16"><div class="field-label">预览（前 5 行）</div><div class="preview-wrap"></div></div>';

      function drawPreview() {
        var keys = FIELDS.filter(function (x) { return Object.keys(mapping).some(function (h) { return mapping[h] === x.key; }); });
        var html = '<table class="tbl"><thead><tr>' + keys.map(function (k) { return '<th>' + U.esc(k.label) + '</th>'; }).join('') + '</tr></thead><tbody>';
        res.rows.slice(0, 5).forEach(function (row) {
          html += '<tr>' + keys.map(function (k) {
            var col = Object.keys(mapping).filter(function (h) { return mapping[h] === k.key; })[0];
            var raw = col ? row[col] : '';
            if (k.key === 'status') raw = WB.STATUS[parseStatusCell(raw)].label;
            if (k.key === 'appliedAt' || k.key === 'nextEventAt') raw = parseDateCell(raw);
            return '<td>' + U.esc(raw || '—') + '</td>';
          }).join('') + '</tr>';
        });
        html += '</tbody></table>';
        pane2.querySelector('.preview-wrap').innerHTML = html;
      }

      pane2.querySelectorAll('[data-map]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          mapping[sel.getAttribute('data-map')] = sel.value;
          drawPreview();
        });
      });
      drawPreview();

      setStep(2);
    });

    // 第二步 → 第三步
    m.node.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-confirm-import]');
      if (!btn) return;
      doImport(btn.getAttribute('data-confirm-import'));
    });

    function buildRows() {
      var rows = [];
      parsed.rows.forEach(function (raw) {
        var o = {};
        Object.keys(mapping).forEach(function (header) {
          var key = mapping[header];
          if (!key) return;
          var v = raw[header];
          if (key === 'appliedAt' || key === 'nextEventAt') v = parseDateCell(v);
          else if (key === 'status') v = parseStatusCell(v);
          else if (key === 'priority') {
            v = /高|急|重要/.test(v) ? 'high' : /低|保底/.test(v) ? 'low' : 'mid';
          }
          o[key] = v;
        });
        if (!o.company) return;
        if (!o.appliedAt) o.appliedAt = U.today();
        if (!o.status) o.status = 'applied';
        if (!o.channel) o.channel = '其他';
        if (!o.priority) o.priority = 'mid';
        rows.push(o);
      });
      return rows;
    }

    function showConfirm() {
      var hasCompany = Object.keys(mapping).some(function (h) { return mapping[h] === 'company'; });
      if (!hasCompany) { ui.toast('请先把其中一列映射到「公司名称」', 'warn'); return; }

      var rows = buildRows();
      if (!rows.length) { ui.toast('没有可导入的有效行（缺少公司名称）', 'warn'); return; }
      var dupes = rows.filter(function (r) { return WB.Store.findByCompanyRole(r.company, r.role); });
      var fresh = rows.filter(function (r) { return !WB.Store.findByCompanyRole(r.company, r.role); });

      pane3.innerHTML = '' +
        '<div class="import-summary">' +
          '<div class="imp-stat"><b class="num">' + rows.length + '</b><span>可导入行</span></div>' +
          '<div class="imp-stat"><b class="num">' + fresh.length + '</b><span>新增记录</span></div>' +
          '<div class="imp-stat"><b class="num">' + dupes.length + '</b><span>已存在（公司 + 岗位）</span></div>' +
        '</div>' +
        (dupes.length ? '<div class="notice small">' + ui.icon('info', 14) + '<div class="notice-body"><b>检测到 ' + dupes.length + ' 条重复</b><span>可跳过它们，或用新数据更新已有记录的状态与备注。</span></div></div>' : '') +
        '<div class="row wrap mt-16" style="gap:8px">' +
          '<button class="btn primary" data-confirm-import="skip">导入 ' + fresh.length + ' 条新记录</button>' +
          (dupes.length ? '<button class="btn" data-confirm-import="update">导入并更新 ' + dupes.length + ' 条重复</button>' : '') +
          '<button class="btn ghost" data-confirm-import="all">全部作为新记录导入</button>' +
        '</div>' +
        '<div class="mt-16"><button class="btn ghost sm" data-back>' + ui.icon('chevronLeft', 13) + '返回字段映射</button></div>';

      pane3.querySelector('[data-back]').addEventListener('click', function () { setStep(2); });
      setStep(3);
    }

    function doImport(mode) {
      var rows = buildRows();
      if (!rows.length) { ui.toast('没有可导入的有效行（缺少公司名称）', 'warn'); return; }

      var added = 0, updated = 0;
      rows.forEach(function (r) {
        var exist = WB.Store.findByCompanyRole(r.company, r.role);
        if (exist && mode === 'skip') return;
        if (exist && mode === 'update') {
          WB.Store.updateApplication(exist.id, r, 'CSV 导入更新');
          updated++;
          return;
        }
        WB.Store.addApplication(r);
        added++;
      });
      m.close();
      ui.toast('导入完成：新增 ' + added + ' 条' + (updated ? '，更新 ' + updated + ' 条' : ''), 'ok');
    }

    m.node.querySelector('[data-cancel]').addEventListener('click', function () { m.close(); });
  }

  /* ---------------------------------------------------------
     导出
     --------------------------------------------------------- */
  function exportCSV() {
    var apps = filtered();
    if (!apps.length) { ui.toast('当前筛选结果为空', 'warn'); return; }
    var headers = ['company', 'role', 'city', 'channel', 'appliedAt', 'status', 'priority', 'salary', 'resumeVersion', 'jobUrl', 'nextEventType', 'nextEventAt', 'notes'];
    var labels = { company: '公司', role: '岗位', city: '城市', channel: '渠道', appliedAt: '投递日期', status: '状态', priority: '优先级', salary: '薪资', resumeVersion: '简历版本', jobUrl: '职位链接', nextEventType: '节点类型', nextEventAt: '节点时间', notes: '备注' };
    var rows = apps.map(function (a) {
      var o = {};
      headers.forEach(function (h) {
        o[h] = h === 'status' ? WB.STATUS[a.status].label
             : h === 'priority' ? ({ high: '高', mid: '中', low: '低' }[a.priority] || '中')
             : (a[h] || '');
      });
      return o;
    });
    var csv = WB.csv.stringify(headers.map(function (h) { return labels[h]; }), rows);
    U.download('秋招投递记录_' + U.today() + '.csv', csv, 'text/csv');
    ui.toast('已导出 ' + apps.length + ' 条记录', 'ok');
  }

  function exportBackup() {
    U.download('秋招工作台备份_' + U.today() + '.json', WB.Store.exportJSON(), 'application/json');
    ui.toast('已导出完整备份', 'ok');
  }

  /* ---------------------------------------------------------
     对比
     --------------------------------------------------------- */
  function openCompare(ids) {
    var apps = WB.Store.data.applications.filter(function (a) { return ids.indexOf(a.id) >= 0; });
    if (apps.length < 2) { ui.toast('请至少选择 2 家进行对比', 'warn'); return; }

    var rows = [
      { label: '岗位', get: function (a) { return a.role || '—'; } },
      { label: '城市', get: function (a) { return a.city || '—'; } },
      { label: '投递渠道', get: function (a) { return a.channel || '—'; } },
      { label: '投递日期', get: function (a) { return U.fmtShort(a.appliedAt) + ' · ' + U.rel(a.appliedAt); } },
      { label: '推进阶段', get: function (a) { return WB.STATUS[a.status].label + '（最深：' + stageLabel(A.maxStage(a)) + '）'; } },
      { label: '最近动态', get: function (a) { return U.fmtShort(A.lastMoveAt(a)) + ' · ' + U.rel(A.lastMoveAt(a)); } },
      { label: '下次节点', get: function (a) { return a.nextEventAt ? (a.nextEventType || '待办') + ' ' + U.fmtShort(a.nextEventAt) : '—'; } },
      { label: '薪资', get: function (a) { return a.salary || '—'; } },
      { label: '简历版本', get: function (a) { return a.resumeVersion || '—'; } },
      { label: '优先级', get: function (a) { return ({ high: '高优先', mid: '常规', low: '保底' })[a.priority]; } },
      { label: '备注', get: function (a) { return a.notes || '—'; } }
    ];

    function stageLabel(m) { return ['意向', '投递', '笔试', '面试', 'Offer'][m] || '意向'; }

    var html = '<div class="compare-wrap"><table class="tbl compare"><thead><tr><th class="cmp-dim">对比维度</th>' +
      apps.map(function (a) { return '<th><div class="cmp-company">' + U.esc(a.company) + '</div><div class="cmp-status">' + ui.statusChip(a.status) + '</div></th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td class="cmp-dim">' + U.esc(r.label) + '</td>' +
          apps.map(function (a) { return '<td>' + U.esc(r.get(a)) + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>';

    return ui.modal({ title: '横向对比 · ' + apps.length + ' 家', wide: true, body: html });
  }

  /* ---------------------------------------------------------
     渲染
     --------------------------------------------------------- */
  function viewSwitch(current) {
    var opts = [['board', 'columns', '看板'], ['table', 'list', '表格'], ['compare', 'compare', '对比']];
    return '<div class="seg" data-view-switch>' + opts.map(function (o) {
      return '<button data-view="' + o[0] + '" class="' + (current === o[0] ? 'on' : '') + '">' + ui.icon(o[1], 13) + o[2] + '</button>';
    }).join('') + '</div>';
  }

  function toolbar(apps, total) {
    var statusOpts = [{ value: 'all', label: '全部状态' }].concat(WB.STATUS_ORDER.map(function (k) {
      return { value: k, label: WB.STATUS[k].label };
    }));
    var channelOpts = [{ value: 'all', label: '全部渠道' }].concat(WB.CHANNELS.map(function (c) { return { value: c, label: c }; }));
    var filters = [
      ['all', '全部'],
      ['active', '进行中'],
      ['followup', '待跟进']
    ];

    return '' +
      '<div class="toolbar">' +
        '<div class="seg" data-quick>' + filters.map(function (f) {
          return '<button data-quick-filter="' + f[0] + '" class="' + (state.filter === f[0] ? 'on' : '') + '">' + f[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="search" style="width:220px">' + ui.icon('search', 14) +
          '<input class="input" data-search placeholder="搜索公司 / 岗位 / 备注  （ / ）" value="' + U.attr(state.q) + '">' +
        '</div>' +
        '<select class="select" data-status-filter style="width:120px">' + ui.options(statusOpts, state.status) + '</select>' +
        '<select class="select" data-channel-filter style="width:118px">' + ui.options(channelOpts, state.channel) + '</select>' +
        '<div class="spacer"></div>' +
        '<span class="fs-12 muted nowrap">' + apps.length + ' / ' + total + ' 条</span>' +
        viewSwitch(state.view) +
        '<button class="btn sm" data-act="export">' + ui.icon('download', 13) + '导出</button>' +
        '<button class="btn sm" data-act="import">' + ui.icon('upload', 13) + '导入</button>' +
        '<button class="btn primary sm" data-act="new">' + ui.icon('plus', 13) + '记录投递</button>' +
      '</div>';
  }

  function boardHTML(apps) {
    var columns = WB.BOARD_COLUMNS.map(function (col) {
      var items = apps.filter(function (a) { return col.statuses.indexOf(a.status) >= 0; });
      var cards = items.map(function (a) {
        var overdue = a.nextEventAt && (U.daysFromToday(a.nextEventAt) || 0) < 0;
        var soon = a.nextEventAt && (U.daysFromToday(a.nextEventAt) || 9) <= 2 && !overdue;
        return '' +
          '<article class="kcard" draggable="true" data-id="' + U.attr(a.id) + '">' +
            '<div class="kcard-top">' +
              '<span class="kcard-company truncate">' + U.esc(a.company) + '</span>' +
              ui.prioChip(a.priority) +
            '</div>' +
            '<div class="kcard-role truncate">' + U.esc(a.role || '未填写岗位') + '</div>' +
            '<div class="kcard-tags">' +
              (a.city ? '<span class="tag">' + U.esc(a.city) + '</span>' : '') +
              (a.channel ? '<span class="tag">' + U.esc(a.channel) + '</span>' : '') +
            '</div>' +
            '<div class="kcard-foot">' +
              '<span class="fs-12 muted nowrap">' + U.esc(U.rel(a.appliedAt)) + '</span>' +
              (a.nextEventAt ? '<span class="chip ' + (overdue ? 'red' : soon ? 'amber' : 'gray') + '">' + U.esc(a.nextEventType || '节点') + ' ' + U.esc(U.fmtMd(a.nextEventAt)) + '</span>' : '') +
            '</div>' +
          '</article>';
      }).join('');

      return '' +
        '<div class="col" data-col="' + col.key + '" data-status="' + col.statuses[0] + '">' +
          '<div class="col-head">' +
            '<span class="col-title"><i class="col-dot" style="background:' + C.toneVar(col.tone) + '"></i>' + U.esc(col.label) + '</span>' +
            '<span class="col-count num">' + items.length + '</span>' +
          '</div>' +
          '<div class="col-body">' + (cards || '<div class="col-empty">拖拽卡片到这里</div>') + '</div>' +
        '</div>';
    }).join('');
    return '<div class="board">' + columns + '</div>';
  }

  function tableHTML(apps) {
    var cols = [
      { key: 'company', label: '公司', sortable: true },
      { key: 'role', label: '岗位', sortable: true },
      { key: 'city', label: '城市', sortable: true, width: 66 },
      { key: 'channel', label: '渠道', sortable: true, width: 84 },
      { key: 'appliedAt', label: '投递', sortable: true, width: 82 },
      { key: 'status', label: '状态', sortable: true, width: 104 },
      { key: 'nextEventAt', label: '下次节点', sortable: true, width: 106 },
      { key: 'priority', label: '优先级', sortable: true, width: 72 },
      { key: 'actions', label: '', width: 74 }
    ];

    var head = '<tr><th style="width:34px"><label class="checkbox"><input type="checkbox" data-select-all' +
      (apps.length && apps.every(function (a) { return state.selected[a.id]; }) ? ' checked' : '') + '></label></th>' +
      cols.map(function (c) {
        if (c.key === 'actions') return '<th style="width:' + c.width + 'px"></th>';
        var mark = state.sort === c.key ? '<span class="sort-mark">' + (state.dir === 'asc' ? '▲' : '▼') + '</span>' : '';
        return '<th class="sortable"' + (c.width ? ' style="width:' + c.width + 'px"' : '') +
          ' data-sort="' + c.key + '">' + U.esc(c.label) + mark + '</th>';
      }).join('') + '</tr>';

    var body = apps.map(function (a) {
      var overdue = a.nextEventAt && (U.daysFromToday(a.nextEventAt) || 0) < 0;
      return '' +
        '<tr data-id="' + U.attr(a.id) + '" class="' + (state.selected[a.id] ? 'selected' : '') + '">' +
          '<td><label class="checkbox"><input type="checkbox" data-select="' + U.attr(a.id) + '"' + (state.selected[a.id] ? ' checked' : '') + '></label></td>' +
          '<td><div class="cell-strong truncate">' + U.esc(a.company) + '</div>' +
            (a.resumeVersion ? '<div class="cell-sub truncate">' + U.esc(a.resumeVersion) + '</div>' : '') + '</td>' +
          '<td><div class="truncate">' + U.esc(a.role || '—') + '</div>' +
            (a.salary ? '<div class="cell-sub truncate">' + U.esc(a.salary) + '</div>' : '') + '</td>' +
          '<td class="dim nowrap">' + U.esc(a.city || '—') + '</td>' +
          '<td class="dim nowrap">' + U.esc(a.channel || '—') + '</td>' +
          '<td><div class="nowrap num">' + U.esc(U.fmtMd(a.appliedAt)) + '</div><div class="cell-sub nowrap">' + U.esc(U.rel(a.appliedAt)) + '</div></td>' +
          '<td><select class="select sm-select" data-status="' + U.attr(a.id) + '">' +
            WB.STATUS_ORDER.map(function (k) { return '<option value="' + k + '"' + (k === a.status ? ' selected' : '') + '>' + U.esc(WB.STATUS[k].label) + '</option>'; }).join('') +
          '</select></td>' +
          '<td class="nowrap">' + (a.nextEventAt
            ? '<span class="chip ' + (overdue ? 'red' : 'gray') + '">' + U.esc(a.nextEventType || '节点') + ' ' + U.esc(U.fmtMd(a.nextEventAt)) + '</span>'
            : '<span class="muted fs-12">—</span>') + '</td>' +
          '<td class="nowrap">' + ui.prioChip(a.priority) + '</td>' +
          '<td class="actions">' +
            '<button class="btn ghost icon sm" data-detail="' + U.attr(a.id) + '" title="详情">' + ui.icon('external', 13) + '</button>' +
            '<button class="btn ghost icon sm" data-edit="' + U.attr(a.id) + '" title="编辑">' + ui.icon('edit', 13) + '</button>' +
          '</td>' +
        '</tr>';
    }).join('');

    return '<div class="table-wrap"><table class="tbl fixed">' +
      '<thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="10">' + ui.empty('没有匹配的记录', '换个筛选条件，或新增一条投递。', 'inbox') + '</td></tr>') + '</tbody></table></div>';
  }

  function compareHTML(apps) {
    var ids = selectedIds();
    if (ids.length < 2) {
      return '<div class="card">' + ui.empty('选择 2–4 家公司进行横向对比',
        '切到「表格」视图勾选公司，再回来这里查看岗位、城市、进度、薪资与优先级的逐项对比。', 'compare') +
        '<div style="text-align:center"><button class="btn" data-view-jump="table">' + ui.icon('list', 13) + '去表格视图勾选</button></div></div>';
    }
    var picked = apps.filter(function (a) { return ids.indexOf(a.id) >= 0; });
    return '' +
      '<div class="row between mb-12" style="margin-bottom:12px">' +
        '<span class="fs-13 dim">已选择 <b class="num">' + picked.length + '</b> 家：' + picked.map(function (a) { return U.esc(a.company); }).join(' · ') + '</span>' +
        '<div class="row">' +
          '<button class="btn sm" data-compare-open>' + ui.icon('compare', 13) + '放大对比</button>' +
          '<button class="btn ghost sm" data-clear-sel>清空选择</button>' +
        '</div>' +
      '</div>' +
      '<div class="card flush" data-compare-inline></div>';
  }

  function render(root) {
    var q = parseHashQuery();
    if (q.view) state.view = q.view;
    if (q.filter) state.filter = q.filter;
    WB.Store.data.settings.appView = state.view;

    var all = WB.Store.data.applications || [];
    var apps = filtered();

    root.innerHTML = '' +
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">求职管理</h1>' +
          '<div class="page-sub">把零散投递沉淀成可追踪、可对比、可视化的进度看板 · 拖拽卡片即可推进状态</div>' +
        '</div>' +
        '<div class="page-actions">' +
          '<button class="btn" data-act="backup">' + ui.icon('database', 14) + '备份</button>' +
          '<button class="btn primary" data-act="new">' + ui.icon('plus', 14) + '记录投递</button>' +
        '</div>' +
      '</div>' +
      toolbar(apps, all.length) +
      '<div id="board-area"></div>' +
      '<div class="sel-bar hidden" id="sel-bar"></div>';

    var area = root.querySelector('#board-area');

    if (!all.length) {
      area.innerHTML = '<div class="card">' + ui.empty('还没有投递记录',
        '点击右上角「记录投递」手动添加，或用「导入」把 Excel 里的投递表一次性搬进来。', 'inbox') +
        '<div style="text-align:center"><button class="btn primary" data-act="new">' + ui.icon('plus', 14) + '记录第一条投递</button></div></div>';
    } else if (state.view === 'board') {
      area.innerHTML = boardHTML(apps);
    } else if (state.view === 'table') {
      area.innerHTML = tableHTML(apps);
    } else {
      area.innerHTML = compareHTML(apps);
      var inline = area.querySelector('[data-compare-inline]');
      if (inline && selectedIds().length >= 2) {
        var ids = selectedIds();
        var picked = all.filter(function (a) { return ids.indexOf(a.id) >= 0; });
        var rows = [
          ['岗位', function (a) { return a.role || '—'; }],
          ['城市', function (a) { return a.city || '—'; }],
          ['渠道', function (a) { return a.channel || '—'; }],
          ['投递日期', function (a) { return U.fmtShort(a.appliedAt); }],
          ['当前状态', function (a) { return WB.STATUS[a.status].label; }],
          ['最近动态', function (a) { return U.rel(A.lastMoveAt(a)); }],
          ['下次节点', function (a) { return a.nextEventAt ? (a.nextEventType || '节点') + ' ' + U.fmtMd(a.nextEventAt) : '—'; }],
          ['薪资', function (a) { return a.salary || '—'; }],
          ['优先级', function (a) { return ({ high: '高优先', mid: '常规', low: '保底' })[a.priority]; }]
        ];
        inline.innerHTML = '<div style="overflow:auto"><table class="tbl compare"><thead><tr><th class="cmp-dim">维度</th>' +
          picked.map(function (a) { return '<th><div class="cmp-company">' + U.esc(a.company) + '</div></th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td class="cmp-dim">' + r[0] + '</td>' + picked.map(function (a) { return '<td>' + U.esc(r[1](a)) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      }
    }

    bind(root, apps);
    renderSelBar(root);
  }

  function parseHashQuery() {
    var h = location.hash || '';
    var i = h.indexOf('?');
    var out = {};
    if (i < 0) return out;
    h.slice(i + 1).split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return out;
  }

  function renderSelBar(root) {
    var bar = root.querySelector('#sel-bar');
    if (!bar) return;
    var ids = selectedIds();
    if (ids.length < 2 || state.view !== 'table') { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    bar.innerHTML = '<span>已选 <b class="num">' + ids.length + '</b> 家</span>' +
      '<button class="btn sm primary" data-compare-open>' + ui.icon('compare', 13) + '对比选中</button>' +
      '<button class="btn sm ghost" data-clear-sel>清空</button>';
  }

  function bind(root, apps) {
    var S = WB.Store;

    root.querySelectorAll('[data-act="new"]').forEach(function (b) {
      b.addEventListener('click', function () { openEditor(null); });
    });
    root.querySelectorAll('[data-act="import"]').forEach(function (b) {
      b.addEventListener('click', function () { openImport(); });
    });
    root.querySelectorAll('[data-act="export"]').forEach(function (b) {
      b.addEventListener('click', function () { exportCSV(); });
    });
    root.querySelectorAll('[data-act="backup"]').forEach(function (b) {
      b.addEventListener('click', function () { exportBackup(); });
    });

    var search = root.querySelector('[data-search]');
    if (search) {
      search.addEventListener('input', U.debounce(function () {
        state.q = search.value;
        render(root);
        var s2 = root.querySelector('[data-search]');
        if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); }
      }, 220));
    }

    var sf = root.querySelector('[data-status-filter]');
    if (sf) sf.addEventListener('change', function () { state.status = sf.value; render(root); });
    var cf = root.querySelector('[data-channel-filter]');
    if (cf) cf.addEventListener('change', function () { state.channel = cf.value; render(root); });

    root.querySelectorAll('[data-quick-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.getAttribute('data-quick-filter');
        render(root);
      });
    });

    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        render(root);
      });
    });
    root.querySelectorAll('[data-view-jump]').forEach(function (b) {
      b.addEventListener('click', function () { state.view = b.getAttribute('data-view-jump'); render(root); });
    });

    root.querySelectorAll('[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        else { state.sort = key; state.dir = key === 'appliedAt' || key === 'nextEventAt' ? 'desc' : 'asc'; }
        render(root);
      });
    });

    root.querySelectorAll('[data-select]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-select');
        if (cb.checked) state.selected[id] = true; else delete state.selected[id];
        render(root);
      });
    });
    var sa = root.querySelector('[data-select-all]');
    if (sa) sa.addEventListener('change', function () {
      apps.forEach(function (a) { if (sa.checked) state.selected[a.id] = true; else delete state.selected[a.id]; });
      render(root);
    });

    root.querySelectorAll('[data-status]').forEach(function (sel) {
      if (sel.tagName !== 'SELECT') return;
      sel.addEventListener('change', function () {
        var id = sel.getAttribute('data-status');
        S.updateApplication(id, { status: sel.value });
        ui.toast('状态已更新为「' + WB.STATUS[sel.value].label + '」', 'ok');
      });
    });

    root.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = S.data.applications.filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0];
        if (a) openEditor(a);
      });
    });
    root.querySelectorAll('[data-detail]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = S.data.applications.filter(function (x) { return x.id === b.getAttribute('data-detail'); })[0];
        if (a) openDetail(a);
      });
    });
    root.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('button, select, input, a, label')) return;
        var a = S.data.applications.filter(function (x) { return x.id === tr.getAttribute('data-id'); })[0];
        if (a) openDetail(a);
      });
    });

    root.querySelectorAll('[data-compare-open]').forEach(function (b) {
      b.addEventListener('click', function () { openCompare(selectedIds()); });
    });
    root.querySelectorAll('[data-clear-sel]').forEach(function (b) {
      b.addEventListener('click', function () { state.selected = {}; render(root); });
    });

    /* --- 看板拖拽 --- */
    var dragId = null;
    root.querySelectorAll('.kcard').forEach(function (card) {
      card.addEventListener('click', function () {
        var a = S.data.applications.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0];
        if (a) openDetail(a);
      });
      card.addEventListener('dragstart', function (e) {
        dragId = card.getAttribute('data-id');
        card.classList.add('dragging');
        try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        root.querySelectorAll('.col').forEach(function (c) { c.classList.remove('drag-over'); });
      });
    });
    root.querySelectorAll('.col').forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drag-over');
        var id = dragId;
        try { id = e.dataTransfer.getData('text/plain') || dragId; } catch (err) {}
        if (!id) return;
        var target = col.getAttribute('data-status');
        var app = S.data.applications.filter(function (x) { return x.id === id; })[0];
        if (!app || app.status === target) return;
        S.updateApplication(id, { status: target }, '看板拖拽调整');
        ui.toast('「' + app.company + '」→ ' + WB.STATUS[target].label, 'ok');
      });
    });

    /* 键盘：/ 聚焦搜索 */
    root.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        var s3 = root.querySelector('[data-search]');
        if (s3) s3.focus();
      }
    });
  }

  WB.appActions = {
    openEditor: function (app) { openEditor(app); },
    openDetail: function (app) { openDetail(app); },
    openImport: function () { openImport(); },
    exportCSV: function () { exportCSV(); },
    exportBackup: function () { exportBackup(); }
  };

  WB.views.applications = {
    key: 'applications',
    route: '#/applications',
    label: '求职管理',
    icon: 'briefcase',
    render: render
  };
})(window.WB);
