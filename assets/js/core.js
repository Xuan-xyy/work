/* ============================================================
   core.js — 数据模型 / 本地持久化 / 统计算法 / 示例数据
   无任何外部依赖，file:// 直接可用
   ============================================================ */
window.WB = window.WB || {};

(function (WB) {
  'use strict';

  var STORAGE_KEY = 'qiuzhao.workbench.v1';
  var SCHEMA_VERSION = 1;

  /* ---------------------------------------------------------
     常量：投递状态流水线
     意向中 → 已投递 → 笔试 → 面试 → Offer ；未通过 / 已放弃 为终止态
     --------------------------------------------------------- */
  var STATUS = {
    wishlist:  { key: 'wishlist',  label: '意向中', short: '意向',  tone: 'gray',   stage: 0 },
    applied:   { key: 'applied',   label: '已投递', short: '投递',  tone: 'blue',   stage: 1 },
    written:   { key: 'written',   label: '笔试中', short: '笔试',  tone: 'purple', stage: 2 },
    interview: { key: 'interview', label: '面试中', short: '面试',  tone: 'amber',  stage: 3 },
    offer:     { key: 'offer',     label: '已 Offer', short: 'Offer', tone: 'green', stage: 4 },
    rejected:  { key: 'rejected',  label: '未通过', short: '未过',  tone: 'red',    stage: -1 },
    withdrawn: { key: 'withdrawn', label: '已放弃', short: '放弃',  tone: 'gray',   stage: -1 }
  };
  var STATUS_ORDER = ['wishlist', 'applied', 'written', 'interview', 'offer', 'rejected', 'withdrawn'];

  // 看板列（已结束 = 未通过 + 已放弃）
  var BOARD_COLUMNS = [
    { key: 'wishlist',  label: '意向中', tone: 'gray',   statuses: ['wishlist'] },
    { key: 'applied',   label: '已投递', tone: 'blue',   statuses: ['applied'] },
    { key: 'written',   label: '笔试中', tone: 'purple', statuses: ['written'] },
    { key: 'interview', label: '面试中', tone: 'amber',  statuses: ['interview'] },
    { key: 'offer',     label: 'Offer',  tone: 'green',  statuses: ['offer'] },
    { key: 'closed',    label: '已结束', tone: 'gray',   statuses: ['rejected', 'withdrawn'] }
  ];

  var PRIORITIES = [
    { key: 'high', label: '高优先' },
    { key: 'mid',  label: '常规' },
    { key: 'low',  label: '保底' }
  ];

  var CHANNELS = ['官网', 'BOSS直聘', '牛客网', '实习僧', '内推', '猎聘', '智联招聘', '校园宣讲', '其他'];
  var CITIES   = ['北京', '上海', '深圳', '杭州', '广州', '成都', '南京', '武汉', '西安', '苏州', '远程', '其他'];
  var EVENT_TYPES = ['笔试', '一面', '二面', '三面', 'HR面', '群面', '开放日', 'Offer沟通', '其他'];

  var QUOTES = [
    '每一次准备，都会成为下一次机会的积累',
    '把焦虑写成清单，它就不再是焦虑',
    '秋招是概率游戏，坚持投递本身就是策略',
    '你不需要每一步都正确，只需要不停止',
    '慢一点没关系，但不要停下来'
  ];

  /* 对外暴露常量（视图层统一从这里取） */
  WB.STATUS = STATUS;
  WB.STATUS_ORDER = STATUS_ORDER;
  WB.BOARD_COLUMNS = BOARD_COLUMNS;
  WB.PRIORITIES = PRIORITIES;
  WB.CHANNELS = CHANNELS;
  WB.CITIES = CITIES;
  WB.EVENT_TYPES = EVENT_TYPES;
  WB.QUOTES = QUOTES;

  /* ---------------------------------------------------------
     工具函数
     --------------------------------------------------------- */
  var U = {};

  U.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };

  U.iso = function (date) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };

  U.today = function () { return U.iso(new Date()); };

  U.addDays = function (base, n) {
    var d = base instanceof Date ? new Date(base.getTime()) : new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  };

  U.parseISO = function (s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s).trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  };

  /** 从今天到该日期的天数：正数=未来，负数=过去 */
  U.daysFromToday = function (s) {
    var d = U.parseISO(s);
    if (!d) return null;
    var t = U.parseISO(U.today());
    return Math.round((d - t) / 86400000);
  };

  var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  U.fmtFull = function (s) {
    var d = U.parseISO(s);
    if (!d) return '—';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEKDAYS[d.getDay()];
  };

  U.fmtShort = function (s) {
    var d = U.parseISO(s);
    if (!d) return '—';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };

  U.fmtMd = function (s) {
    var d = U.parseISO(s);
    if (!d) return '—';
    return U.pad(d.getMonth() + 1) + '/' + U.pad(d.getDate());
  };

  U.rel = function (s) {
    var n = U.daysFromToday(s);
    if (n === null) return '—';
    if (n === 0) return '今天';
    if (n === 1) return '明天';
    if (n === 2) return '后天';
    if (n === -1) return '昨天';
    if (n > 0) return n + ' 天后';
    return Math.abs(n) + ' 天前';
  };

  U.esc = function (v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.attr = function (v) { return U.esc(v); };

  U.clamp = function (n, min, max) { return Math.max(min, Math.min(max, n)); };

  U.pct = function (a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; };

  U.debounce = function (fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 200);
    };
  };

  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  U.by = function (key, dir) {
    var sign = dir === 'asc' ? 1 : -1;
    return function (a, b) {
      var x = a[key], y = b[key];
      if (x === undefined || x === null || x === '') return 1;
      if (y === undefined || y === null || y === '') return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
      return String(x).localeCompare(String(y), 'zh-CN') * sign;
    };
  };

  U.download = function (filename, text, mime) {
    try {
      var blob = new Blob(['\ufeff' + text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
      return true;
    } catch (e) { return false; }
  };

  U.pickFile = function (accept, onText) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || '';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { onText(String(reader.result || ''), f); input.remove(); };
      reader.onerror = function () { onText('', f); input.remove(); };
      reader.readAsText(f, 'utf-8');
    });
    document.body.appendChild(input);
    input.click();
  };

  WB.util = U;

  /* ---------------------------------------------------------
     CSV / TSV 解析（兼容 Excel 粘贴的制表符与逗号）
     --------------------------------------------------------- */
  var csv = {};

  csv.detectDelimiter = function (text) {
    var head = String(text).split(/\r?\n/).slice(0, 3).join('\n');
    var counts = { '\t': (head.match(/\t/g) || []).length, ',': (head.match(/,/g) || []).length, ';': (head.match(/;/g) || []).length };
    var best = '\t', n = -1;
    Object.keys(counts).forEach(function (k) { if (counts[k] > n) { n = counts[k]; best = k; } });
    return n <= 0 ? ',' : best;
  };

  csv.parse = function (text, delimiter) {
    var d = delimiter || csv.detectDelimiter(text);
    var rows = [], row = [], field = '', inQuotes = false, i = 0;
    var s = String(text).replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < s.length) {
      var c = s[i];
      if (inQuotes) {
        if (c === '"') {
          if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === d) { row.push(field); field = ''; i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
    if (!rows.length) return { headers: [], rows: [] };
    var headers = rows.shift().map(function (h) { return String(h).trim(); });
    var data = rows.map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) { o[h] = (r[idx] === undefined ? '' : String(r[idx]).trim()); });
      return o;
    });
    return { headers: headers, rows: data };
  };

  csv.stringify = function (headers, rows) {
    var q = function (v) {
      var s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var out = [headers.map(q).join(',')];
    rows.forEach(function (r) { out.push(headers.map(function (h) { return q(r[h]); }).join(',')); });
    return out.join('\n');
  };

  WB.csv = csv;

  /* ---------------------------------------------------------
     存储层
     --------------------------------------------------------- */
  function defaultData() {
    return {
      version: SCHEMA_VERSION,
      profile: {
        nickname: 'User',
        targetRole: '后端开发工程师',
        targetCity: '北京 / 杭州',
        graduateYear: '2026 届',
        weeklyGoal: 8,
        startDate: U.iso(U.addDays(new Date(), -46))
      },
      settings: { theme: 'light', quoteIndex: 0, appView: 'board', demo: true },
      applications: [],
      interviews: [],
      starStories: [],
      internshipLogs: [],
      skills: [],
      careerGoals: []
    };
  }

  function withDefaults(raw) {
    var base = defaultData();
    if (!raw || typeof raw !== 'object') return base;
    var out = base;
    out.version = SCHEMA_VERSION;
    ['profile', 'settings'].forEach(function (k) {
      out[k] = Object.assign({}, base[k], raw[k] || {});
    });
    ['applications', 'interviews', 'starStories', 'internshipLogs', 'skills', 'careerGoals'].forEach(function (k) {
      out[k] = Array.isArray(raw[k]) ? raw[k] : [];
    });
    out.applications = out.applications.map(normalizeApp);
    return out;
  }

  function normalizeApp(a) {
    var o = Object.assign({
      id: U.uid('app'),
      company: '', role: '', city: '', channel: '官网',
      appliedAt: U.today(), status: 'applied', priority: 'mid',
      salary: '', jobUrl: '', resumeVersion: '', contact: '',
      nextEventAt: '', nextEventType: '', notes: '',
      timeline: [], createdAt: U.today(), updatedAt: U.today()
    }, a || {});
    if (!STATUS[o.status]) o.status = 'applied';
    if (!Array.isArray(o.timeline) || !o.timeline.length) {
      o.timeline = [{ at: o.appliedAt, status: o.status, note: '创建记录' }];
    }
    return o;
  }
  WB.normalizeApp = normalizeApp;

  var Store = {
    data: null,
    _subs: [],
    _memoryOnly: false,
    _available: true,

    init: function () {
      var raw = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        this._available = false;
      }
      if (raw) {
        try {
          this.data = withDefaults(JSON.parse(raw));
        } catch (e) {
          this.data = defaultData();
          this.data.applications = seedApplications();
        }
      } else {
        this.data = defaultData();
        this.data.applications = seedApplications();
        this.data.settings.demo = true;
        this.save(true);
      }
      return this.data;
    },

    save: function (immediate) {
      if (!this._available) { this._memoryOnly = true; return; }
      var run = function () {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Store.data));
          Store._memoryOnly = false;
        } catch (e) {
          Store._memoryOnly = true;
        }
      };
      if (immediate) run();
      else this._debouncedSave();
    },

    subscribe: function (fn) {
      this._subs.push(fn);
      var self = this;
      return function () { self._subs = self._subs.filter(function (f) { return f !== fn; }); };
    },

    emit: function (reason) {
      this._subs.forEach(function (fn) {
        try { fn(reason, Store.data); } catch (e) { /* 单个订阅异常不影响其他 */ }
      });
    },

    /** 修改数据：mutator 直接改 data，然后持久化并广播 */
    commit: function (reason, mutator) {
      if (typeof mutator === 'function') mutator(this.data);
      this.save();
      this.emit(reason || 'update');
    },

    /* ---- 投递记录 CRUD ---- */
    addApplication: function (payload) {
      var app = normalizeApp(payload);
      app.createdAt = U.today();
      app.updatedAt = U.today();
      if (!app.timeline.length || app.timeline[0].note === '创建记录') {
        app.timeline = [{ at: app.appliedAt || U.today(), status: app.status, note: '创建记录' }];
      }
      this.data.applications.unshift(app);
      this.save(); this.emit('applications');
      return app;
    },

    updateApplication: function (id, patch, timelineNote) {
      var app = this.data.applications.filter(function (a) { return a.id === id; })[0];
      if (!app) return null;
      var prevStatus = app.status;
      Object.assign(app, patch);
      app.updatedAt = U.today();
      if (patch.status && patch.status !== prevStatus) {
        app.timeline = app.timeline || [];
        app.timeline.push({ at: U.today(), status: patch.status, note: timelineNote || ('状态更新为「' + STATUS[patch.status].label + '」') });
      } else if (timelineNote) {
        app.timeline = app.timeline || [];
        app.timeline.push({ at: U.today(), status: app.status, note: timelineNote });
      }
      this.save(); this.emit('applications');
      return app;
    },

    removeApplication: function (id) {
      this.data.applications = this.data.applications.filter(function (a) { return a.id !== id; });
      this.save(); this.emit('applications');
    },

    bulkRemove: function (ids) {
      var set = {};
      ids.forEach(function (i) { set[i] = true; });
      this.data.applications = this.data.applications.filter(function (a) { return !set[a.id]; });
      this.save(); this.emit('applications');
    },

    findByCompanyRole: function (company, role) {
      return this.data.applications.filter(function (a) {
        return String(a.company).trim() === String(company).trim() &&
               String(a.role).trim() === String(role).trim();
      })[0] || null;
    },

    /* ---- 数据管理 ---- */
    exportJSON: function () {
      return JSON.stringify(this.data, null, 2);
    },

    importJSON: function (text) {
      var parsed = JSON.parse(text);
      this.data = withDefaults(parsed);
      this.save(true); this.emit('import');
      return this.data;
    },

    clearAll: function () {
      this.data = defaultData();
      this.data.applications = [];
      this.data.settings.demo = false;
      this.save(true); this.emit('clear');
    },

    loadDemo: function () {
      this.data.applications = seedApplications();
      this.data.settings.demo = true;
      this.data.profile = withDefaults({}).profile;
      this.save(true); this.emit('demo');
    },

    setTheme: function (theme) {
      this.data.settings.theme = theme;
      this.save(); this.emit('theme');
    },

    isDemoOnly: function () {
      return !!this.data.settings.demo;
    }
  };

  Store._debouncedSave = U.debounce(function () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Store.data)); }
    catch (e) { Store._memoryOnly = true; }
  }, 260);

  WB.Store = Store;

  /* ---------------------------------------------------------
     统计 / 分析
     --------------------------------------------------------- */
  var A = {};

  var STAGE_INDEX = { wishlist: 0, applied: 1, written: 2, interview: 3, offer: 4 };

  /** 该投递曾经到达过的最深阶段（用于漏斗，含被拒前到达的深度） */
  A.maxStage = function (app) {
    var m = STAGE_INDEX[app.status];
    if (m === undefined) m = 0;
    (app.timeline || []).forEach(function (t) {
      var s = STAGE_INDEX[t.status];
      if (s !== undefined && s > m) m = s;
    });
    return m;
  };

  A.isActive = function (app) {
    return ['applied', 'written', 'interview'].indexOf(app.status) >= 0;
  };

  /** 最近一次状态变更日期 */
  A.lastMoveAt = function (app) {
    var tl = (app.timeline || []).slice().sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    return tl.length ? tl[tl.length - 1].at : app.appliedAt;
  };

  /** 需要跟进的事项 */
  A.followUps = function (apps) {
    var out = [];
    var today = U.today();
    apps.forEach(function (app) {
      if (['offer', 'rejected', 'withdrawn'].indexOf(app.status) >= 0) return;
      if (app.status === 'applied') {
        var d = U.daysFromToday(app.appliedAt);
        var since = d === null ? 0 : -d;
        if (since >= 7) {
          out.push({
            app: app, level: since >= 14 ? 'high' : 'mid',
            reason: '投递后 ' + since + ' 天无进展，建议主动查询/联系 HR',
            days: since
          });
        }
      } else if (app.status === 'written') {
        var dw = U.daysFromToday(A.lastMoveAt(app));
        var sw = dw === null ? 0 : -dw;
        if (sw >= 10) {
          out.push({ app: app, level: 'mid', reason: '笔试后 ' + sw + ' 天未收到反馈', days: sw });
        }
      } else if (app.status === 'interview') {
        var di = U.daysFromToday(A.lastMoveAt(app));
        var si = di === null ? 0 : -di;
        if (si >= 8) {
          out.push({ app: app, level: 'mid', reason: '面试后 ' + si + ' 天未收到反馈', days: si });
        }
      }
      if (app.nextEventAt) {
        var dn = U.daysFromToday(app.nextEventAt);
        if (dn !== null && dn < 0) {
          out.push({ app: app, level: 'high', reason: (app.nextEventType || '待办') + ' 时间已过（' + U.rel(app.nextEventAt) + '），记得更新状态', days: -dn });
        }
      }
    });
    return out.sort(function (a, b) { return (a.level === 'high' ? 0 : 1) - (b.level === 'high' ? 0 : 1) || b.days - a.days; });
  };

  /** 未来 14 天的时间节点（笔试/面试） */
  A.upcoming = function (apps, days) {
    var limit = days || 14;
    var out = [];
    apps.forEach(function (app) {
      if (!app.nextEventAt) return;
      if (['offer', 'rejected', 'withdrawn', 'wishlist'].indexOf(app.status) >= 0) return;
      var n = U.daysFromToday(app.nextEventAt);
      if (n === null || n < 0 || n > limit) return;
      out.push({ app: app, date: app.nextEventAt, type: app.nextEventType || '待办', days: n });
    });
    return out.sort(function (a, b) { return a.days - b.days; });
  };

  A.funnel = function (apps) {
    var reached = { applied: 0, written: 0, interview: 0, offer: 0 };
    apps.forEach(function (app) {
      var m = A.maxStage(app);
      if (m >= 1) reached.applied++;
      if (m >= 2) reached.written++;
      if (m >= 3) reached.interview++;
      if (m >= 4) reached.offer++;
    });
    return [
      { key: 'applied',   label: '已投递', value: reached.applied,   tone: 'blue' },
      { key: 'written',   label: '进入笔试', value: reached.written,  tone: 'purple' },
      { key: 'interview', label: '进入面试', value: reached.interview, tone: 'amber' },
      { key: 'offer',     label: '拿到 Offer', value: reached.offer,  tone: 'green' }
    ];
  };

  A.byStatus = function (apps) {
    var map = {};
    STATUS_ORDER.forEach(function (k) { map[k] = 0; });
    apps.forEach(function (a) { if (map[a.status] !== undefined) map[a.status]++; });
    return map;
  };

  A.channels = function (apps) {
    var map = {};
    apps.forEach(function (app) {
      var key = app.channel || '未填写';
      if (!map[key]) map[key] = { channel: key, total: 0, advance: 0, interview: 0, offer: 0 };
      var m = A.maxStage(app);
      map[key].total++;
      if (m >= 2) map[key].advance++;
      if (m >= 3) map[key].interview++;
      if (m >= 4) map[key].offer++;
    });
    return Object.keys(map).map(function (k) {
      var c = map[k];
      c.rate = U.pct(c.interview, c.total);
      c.advanceRate = U.pct(c.advance, c.total);
      return c;
    }).sort(function (a, b) { return b.total - a.total || b.rate - a.rate; });
  };

  A.trend = function (apps, days) {
    var n = days || 30;
    var buckets = [];
    var index = {};
    for (var i = n - 1; i >= 0; i--) {
      var iso = U.iso(U.addDays(new Date(), -i));
      var item = { date: iso, label: U.fmtMd(iso), value: 0 };
      buckets.push(item);
      index[iso] = item;
    }
    apps.forEach(function (app) {
      var iso = (app.appliedAt || '').slice(0, 10);
      if (index[iso]) index[iso].value++;
    });
    return buckets;
  };

  A.weekCount = function (apps) {
    var now = new Date();
    var start = U.addDays(now, -((now.getDay() + 6) % 7)); // 周一
    var startIso = U.iso(start);
    var count = apps.filter(function (a) {
      var iso = (a.appliedAt || '').slice(0, 10);
      return iso >= startIso;
    }).length;
    return { count: count, startIso: startIso };
  };

  A.summary = function (data) {
    var apps = data.applications || [];
    var st = A.byStatus(apps);
    var funnel = A.funnel(apps);
    var applied = funnel[0].value;
    var interview = funnel[2].value;
    var offer = funnel[3].value;
    var week = A.weekCount(apps);
    var goal = Math.max(1, Number(data.profile.weeklyGoal) || 8);

    return {
      total: apps.length,
      active: st.applied + st.written + st.interview,
      byStatus: st,
      funnel: funnel,
      offers: st.offer,
      interviews: st.interview,
      followUps: A.followUps(apps),
      upcoming: A.upcoming(apps, 14),
      channels: A.channels(apps),
      trend: A.trend(apps, 30),
      rates: {
        screen: U.pct(funnel[1].value, applied),
        interview: U.pct(interview, applied),
        offer: U.pct(offer, applied)
      },
      week: { count: week.count, goal: goal, pct: U.clamp(Math.round((week.count / goal) * 100), 0, 100) },
      daysSince: (function () {
        var d = U.daysFromToday(data.profile.startDate);
        return d === null ? 0 : Math.max(0, -d);
      })()
    };
  };

  WB.analytics = A;

  /* ---------------------------------------------------------
     示例数据（首次打开即可看到完整效果）
     --------------------------------------------------------- */
  function D(offset) { return U.iso(U.addDays(new Date(), offset)); }

  function mk(company, role, city, channel, appliedOffset, status, extra) {
    var o = Object.assign({
      company: company, role: role, city: city, channel: channel,
      appliedAt: D(appliedOffset), status: status, priority: 'mid'
    }, extra || {});
    var tl = [{ at: D(appliedOffset), status: 'applied', note: '已投递' }];
    if (o.timeline) { tl = tl.concat(o.timeline); delete o.timeline; }
    o.timeline = tl;
    return o;
  }

  function seedApplications() {
    var list = [
      mk('字节跳动', '后端开发工程师', '北京', '内推', -42, 'offer', {
        priority: 'high', salary: '25k × 15', resumeVersion: '后端-v3',
        jobUrl: 'https://jobs.bytedance.com', nextEventType: 'Offer沟通', nextEventAt: D(2),
        notes: '三面聊了分布式缓存与项目落地，面试官对实习的订单系统很感兴趣。',
        timeline: [
          { at: D(-40), status: 'written', note: '完成在线笔试（3 题 AC 2.5）' },
          { at: D(-31), status: 'interview', note: '一面：项目 + 算法' },
          { at: D(-24), status: 'interview', note: '二面：系统设计（短链服务）' },
          { at: D(-17), status: 'interview', note: '三面：主管面，聊职业规划' },
          { at: D(-9),  status: 'offer', note: 'HR 口头通知通过，等待正式 offer letter' }
        ]
      }),
      mk('腾讯', '后台开发工程师', '深圳', '官网', -38, 'offer', {
        priority: 'high', salary: '24k × 16', resumeVersion: '后端-v2',
        jobUrl: 'https://join.qq.com', notes: '复试通过，等意向书。部门是 PCG 后台。',
        timeline: [
          { at: D(-35), status: 'written', note: '笔试通过' },
          { at: D(-28), status: 'interview', note: '初试：C++/网络/项目' },
          { at: D(-13), status: 'offer', note: '复试通过' }
        ]
      }),
      mk('阿里巴巴', 'Java 开发工程师', '杭州', '官网', -33, 'interview', {
        priority: 'high', salary: '23k × 16', resumeVersion: '后端-v3',
        nextEventType: '二面', nextEventAt: D(1),
        notes: '一面问了 JVM 调优和索引优化，二面准备讲清楚实习做的对账系统。',
        timeline: [
          { at: D(-30), status: 'written', note: '笔试通过' },
          { at: D(-12), status: 'interview', note: '一面通过，等二面' }
        ]
      }),
      mk('美团', '后端研发工程师', '北京', '内推', -29, 'interview', {
        priority: 'high', resumeVersion: '后端-v3',
        nextEventType: 'HR面', nextEventAt: D(3),
        notes: '两轮技术面已过，HR 面主要确认到岗时间与地点意向。',
        timeline: [
          { at: D(-26), status: 'written', note: '笔试通过' },
          { at: D(-18), status: 'interview', note: '一面通过' },
          { at: D(-6),  status: 'interview', note: '二面通过' }
        ]
      }),
      mk('快手', '推荐算法工程师', '北京', 'BOSS直聘', -26, 'interview', {
        priority: 'mid', resumeVersion: '算法-v1',
        nextEventType: '一面', nextEventAt: D(4),
        notes: '简历偏向工程，需要补一下召回/排序的基础表达。',
        timeline: [{ at: D(-14), status: 'interview', note: '简历通过，约面中' }]
      }),
      mk('小红书', '数据分析师', '上海', '官网', -24, 'written', {
        priority: 'mid', resumeVersion: '数据-v1',
        notes: '笔试含 SQL 大题 + AB 实验设计，SQL 窗口函数要再练。',
        timeline: [{ at: D(-9), status: 'written', note: '收到笔试邀请并完成作答' }]
      }),
      mk('蚂蚁集团', 'Java 研发工程师', '杭州', '官网', -21, 'written', {
        priority: 'high', resumeVersion: '后端-v3',
        notes: '笔试时间 90 分钟，算法题偏中等。',
        timeline: [{ at: D(-8), status: 'written', note: '完成笔试，等待结果' }]
      }),
      mk('京东', '数据开发工程师', '北京', '智联招聘', -19, 'written', {
        priority: 'mid', resumeVersion: '数据-v1',
        timeline: [{ at: D(-5), status: 'written', note: '笔试已完成' }]
      }),
      mk('百度', '机器学习算法工程师', '北京', '官网', -17, 'applied', {
        priority: 'mid', resumeVersion: '算法-v1',
        notes: '投递后一直没反馈，有内推码可以再追一下。'
      }),
      mk('网易', '游戏服务端开发', '杭州', '实习僧', -16, 'applied', {
        priority: 'mid', resumeVersion: '后端-v2'
      }),
      mk('华为', '软件开发工程师', '西安', '校园宣讲', -15, 'applied', {
        priority: 'low', resumeVersion: '后端-v2', notes: '宣讲会现场投递，流程较慢。'
      }),
      mk('拼多多', '服务端研发工程师', '上海', 'BOSS直聘', -14, 'applied', {
        priority: 'high', resumeVersion: '后端-v3', notes: 'HR 说一周内安排笔试。'
      }),
      mk('蔚来', '智能座舱软件工程师', '上海', 'BOSS直聘', -12, 'applied', {
        priority: 'low', resumeVersion: '嵌入式-v1'
      }),
      mk('SHEIN', '数据分析工程师', '广州', '实习僧', -11, 'applied', {
        priority: 'mid', resumeVersion: '数据-v1'
      }),
      mk('哔哩哔哩', '后端开发工程师', '上海', '官网', -10, 'applied', {
        priority: 'mid', resumeVersion: '后端-v3'
      }),
      mk('米哈游', '游戏客户端开发', '上海', '牛客网', -34, 'rejected', {
        priority: 'low', resumeVersion: '嵌入式-v1',
        notes: '笔试挂，C++ 模板与图形学确实不熟，先放下。',
        timeline: [
          { at: D(-30), status: 'written', note: '笔试未通过' },
          { at: D(-28), status: 'rejected', note: '流程结束' }
        ]
      }),
      mk('商汤科技', '算法工程师', '深圳', '牛客网', -31, 'rejected', {
        priority: 'low', resumeVersion: '算法-v1',
        notes: '一面算法题没写出来，事后复盘的题已进题库。',
        timeline: [
          { at: D(-25), status: 'interview', note: '一面未通过' },
          { at: D(-24), status: 'rejected', note: '流程结束' }
        ]
      }),
      mk('中金公司', '信息技术岗', '北京', '官网', -28, 'rejected', {
        priority: 'low', resumeVersion: '后端-v2',
        timeline: [
          { at: D(-20), status: 'written', note: '笔试通过' },
          { at: D(-15), status: 'rejected', note: '复试后未通过' }
        ]
      }),
      mk('大疆创新', '嵌入式软件工程师', '深圳', '官网', -9, 'wishlist', {
        priority: 'low', resumeVersion: '嵌入式-v1', notes: '截止日期将近，等手上项目理清再投。'
      }),
      mk('理想汽车', '自动驾驶算法工程师', '北京', '内推', -6, 'wishlist', {
        priority: 'mid', resumeVersion: '算法-v1', notes: '需要先补一篇论文阅读笔记。'
      })
    ];
    return list.map(normalizeApp);
  }

  WB.seedApplications = seedApplications;

  /* 供后续模块使用的预留数据结构（模块二~五） */
  WB.blankInterview = function () {
    return { id: U.uid('itv'), company: '', role: '', round: '一面', date: U.today(), questions: [], rating: 3, reflection: '', todo: '' };
  };
  WB.blankStory = function () {
    return { id: U.uid('star'), title: '', role: '', situation: '', task: '', action: '', result: '', tags: [] };
  };
  WB.blankLog = function () {
    return { id: U.uid('log'), date: U.today(), type: 'daily', content: '', gain: '', highlight: '', tags: [] };
  };

})(window.WB);
