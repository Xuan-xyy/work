/* ============================================================
   views/soon.js — 模块二~五：结构与规划已就绪，待下一阶段实现
   ============================================================ */
window.WB = window.WB || {};
WB.views = WB.views || {};

(function (WB) {
  'use strict';

  var U = WB.util, ui = WB.ui;

  var MODULES = {
    interview: {
      key: 'interview',
      route: '#/interview',
      label: '面试训练',
      icon: 'chat',
      title: '面试训练体系',
      desc: '把每一次面试变成可复用的资产：沉淀个人专属题库、记录每题表现、形成面试成长曲线，让同类问题不再第二次答砸。',
      groups: [
        { icon: 'book', title: '个人专属题库', items: ['按岗位 / 公司 / 题型分类（八股、算法、项目、行为面）', '记录每次被问到的原题与自己的回答要点', '标记「答砸 / 一般 / 答得好」，自动生成高频待复习清单'] },
        { icon: 'edit', title: '面试复盘记录', items: ['每场面试的结构化复盘：问了什么 → 我答得如何 → 下次怎么改', '面试官反馈、氛围、岗位真实信息随手记', '面试时长 / 轮次 / 结果可视化，定位卡在哪一轮'] },
        { icon: 'trending', title: '成长数据库', items: ['同题多次作答对比，直观看到表达进步', '按公司时间轴回顾整条流程', '导出复盘合集，作为下一阶段的训练材料'] }
      ]
    },
    stories: {
      key: 'stories',
      route: '#/stories',
      label: '简历素材',
      icon: 'file',
      title: '简历素材体系（STAR）',
      desc: '实习和项目经历不再散落在各个文档里。用 STAR 结构化沉淀素材，投不同岗位时按标签一键调取、组合成新简历。',
      groups: [
        { icon: 'columns', title: 'STAR 素材卡', items: ['Situation / Task / Action / Result 四段式引导填写', '量化结果字段：指标、涨幅、规模、影响范围', '自动提示「缺少量化结果」等常见问题'] },
        { icon: 'filter2', title: '标签与检索', items: ['按技能标签（Java / SQL / 推荐系统…）、项目类型、角色打标', '搜索即调取，投递时直接复制对应 bullet', '同一段经历生成「一句话版 / 详细版 / 面试讲述版」'] },
        { icon: 'briefcase', title: '岗位匹配', items: ['按目标 JD 关键词筛选最相关素材', '为每个岗位保存一份简历版本，与投递记录自动关联', '素材覆盖率提示：还有哪些能力没有对应经历支撑'] }
      ]
    },
    internship: {
      key: 'internship',
      route: '#/internship',
      label: '实习成长',
      icon: 'notebook',
      title: '实习成长记录',
      desc: '每天 2 分钟记下做了什么、学到什么。系统按周聚合，把琐碎的工作内容提炼成能写进简历的亮点。',
      groups: [
        { icon: 'calendar', title: '日报 / 周报', items: ['极简输入：今天做了什么 + 一个收获 + 一个卡点', '支持草稿与补记，忘了也不怕断更', '按周自动汇总，生成一段周报文字'] },
        { icon: 'zap', title: '琐事 → 亮点', items: ['关键词识别：性能优化、数据提升、协作推进自动高亮', '引导补充量化结果，把「改了接口」变成「接口耗时下降 60%」', '一键转为 STAR 素材卡，直接进简历库'] },
        { icon: 'trending', title: '成长轨迹', items: ['连续记录天数、累计条目、本周活跃度', '能力雷达：从记录中沉淀技能关键词', '实习结束自动生成一份可复用的经历总结'] }
      ]
    },
    career: {
      key: 'career',
      route: '#/career',
      label: '职业成长',
      icon: 'compass',
      title: '职业成长地图',
      desc: '把长期目标拆成看得见的进度条：技能等级、阶段里程碑、每周投入，让「我到底进步了没有」有据可查。',
      groups: [
        { icon: 'target', title: '技能进度条', items: ['自评等级 1–5，记录证据来源（项目 / 课程 / 面试反馈）', '按目标岗位维护必备技能清单，缺口一目了然', '技能雷达图 + 增长曲线'] },
        { icon: 'map', title: '长期目标地图', items: ['3 个月 / 1 年 / 3 年目标拆解为可执行里程碑', '目标与技能、投递、面试数据联动', '阶段回顾：做到了什么，下一步做什么'] },
        { icon: 'clock', title: '投入记录', items: ['每周学习 / 刷题 / 复盘时长打卡', '与投递、面试节奏对照，找到自己的最优配比', '连续投入热力图'] }
      ]
    }
  };

  function renderModule(mod) {
    return function (root) {
      var groups = mod.groups.map(function (g) {
        return '' +
          '<div class="soon-card">' +
            '<h3>' + ui.icon(g.icon, 15) + U.esc(g.title) + '</h3>' +
            '<ul>' + g.items.map(function (i) { return '<li>' + U.esc(i) + '</li>'; }).join('') + '</ul>' +
          '</div>';
      }).join('');

      root.innerHTML = '' +
        '<div class="page-head">' +
          '<div>' +
            '<h1 class="page-title">' + U.esc(mod.label) + '</h1>' +
            '<div class="page-sub">模块已排期 · 当前版本先交付 Dashboard 与求职管理，确认风格后按此结构实现</div>' +
          '</div>' +
          '<div class="page-actions">' +
            '<span class="chip purple">' + ui.icon('clock', 12) + '下一阶段</span>' +
            '<button class="btn" data-goto="#/applications">' + ui.icon('briefcase', 13) + '先用求职管理</button>' +
          '</div>' +
        '</div>' +
        '<div class="soon-hero">' +
          '<div class="soon-mark">' + ui.icon(mod.icon, 20) + '</div>' +
          '<div>' +
            '<h2>' + U.esc(mod.title) + '</h2>' +
            '<p>' + U.esc(mod.desc) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="soon-grid">' + groups + '</div>' +
        '<div class="soon-skeleton">' +
          '<div class="row between" style="margin-bottom:14px">' +
            '<span class="fs-12 muted">页面结构预览（示意）</span>' +
            '<span class="chip gray">' + ui.icon('sparkles', 11) + '纯本地智能 · 不联网</span>' +
          '</div>' +
          '<div class="sk-row w40"></div><div class="sk-row w80"></div><div class="sk-row w60"></div><div class="sk-row w80"></div><div class="sk-row w40"></div>' +
        '</div>' +
        '<div class="page-foot">你希望这个模块先做哪一块？告诉我优先级，我会按你的实际使用顺序实现。</div>';

      root.querySelectorAll('[data-goto]').forEach(function (b) {
        b.addEventListener('click', function () { location.hash = b.getAttribute('data-goto'); });
      });
    };
  }

  ['interview', 'stories', 'internship', 'career'].forEach(function (k) {
    var mod = MODULES[k];
    WB.views[k] = {
      key: mod.key,
      route: mod.route,
      label: mod.label,
      icon: mod.icon,
      soon: true,
      render: renderModule(mod)
    };
  });

  WB.MODULES = MODULES;
})(window.WB);
