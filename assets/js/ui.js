/* ============================================================
   ui.js — 线性图标 / 弹层 / 提示 / 通用表单片段
   ============================================================ */
window.WB = window.WB || {};

(function (WB) {
  'use strict';

  var U = WB.util;
  var ui = {};

  /* ---------------------------------------------------------
     图标（线性，1.75 描边，与文字基线对齐）
     --------------------------------------------------------- */
  var PATHS = {
    home:       '<path d="M3.6 10.3 12 3.6l8.4 6.7"/><path d="M5.9 9.5V20a.9.9 0 0 0 .9.9h3.1v-5.5h4.2v5.5h3.1a.9.9 0 0 0 .9-.9V9.5"/>',
    briefcase:  '<rect x="2.8" y="7.2" width="18.4" height="12.6" rx="2.2"/><path d="M8.6 7.2V5.6a1.6 1.6 0 0 1 1.6-1.6h3.6a1.6 1.6 0 0 1 1.6 1.6v1.6"/><path d="M2.8 12.4h18.4"/>',
    chat:       '<path d="M20.4 12.3c0 4.05-3.76 7.33-8.4 7.33a9.9 9.9 0 0 1-2.86-.42L4.6 20.9l1.2-3.32a6.86 6.86 0 0 1-2.2-5.28c0-4.05 3.76-7.33 8.4-7.33s8.4 3.28 8.4 7.33Z"/><path d="M8.6 11h6.8M8.6 14.4h4.4"/>',
    file:       '<path d="M13.6 3.6H7.2a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2V8.8z"/><path d="M13.6 3.6v5.2h5.2"/><path d="M9 13.2h6M9 16.4h4"/>',
    notebook:   '<rect x="4.6" y="3.6" width="14.8" height="16.8" rx="2"/><path d="M8.6 3.6v16.8"/><path d="M12 8.4h4.2M12 12h4.2"/>',
    compass:    '<circle cx="12" cy="12" r="8.6"/><path d="m15 9-1.6 4.4L9 15l1.6-4.4z"/>',
    plus:       '<path d="M12 5v14M5 12h14"/>',
    search:     '<circle cx="11" cy="11" r="6.4"/><path d="m20 20-3.6-3.6"/>',
    download:   '<path d="M12 3.8v10.4"/><path d="m7.8 10.4 4.2 4.2 4.2-4.2"/><path d="M4.6 19.4h14.8"/>',
    upload:     '<path d="M12 20.2V9.8"/><path d="m7.8 13.6 4.2-4.2 4.2 4.2"/><path d="M4.6 4.6h14.8"/>',
    trash:      '<path d="M4.8 7.4h14.4"/><path d="M9.4 7.4V5.6a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v1.8"/><path d="M6.6 7.4 7.5 19a1.2 1.2 0 0 0 1.2 1.1h6.6a1.2 1.2 0 0 0 1.2-1.1l.9-11.6"/>',
    edit:       '<path d="M4.8 19.2h3.6L19 8.6a1.9 1.9 0 0 0 0-2.7l-.9-.9a1.9 1.9 0 0 0-2.7 0L4.8 15.6z"/><path d="m14.4 6.6 3 3"/>',
    check:      '<path d="M20 6.5 9.4 17.1 4 11.7"/>',
    x:          '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronDown:'<path d="m6 9.5 6 6 6-6"/>',
    chevronRight:'<path d="m9.5 6 6 6-6 6"/>',
    chevronLeft:'<path d="m14.5 6-6 6 6 6"/>',
    calendar:   '<rect x="3.6" y="5.4" width="16.8" height="15" rx="2.2"/><path d="M3.6 10.2h16.8"/><path d="M8.4 3.6v3.4M15.6 3.6v3.4"/>',
    clock:      '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.2 1.9"/>',
    sun:        '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
    moon:       '<path d="M20 14.4A8.4 8.4 0 1 1 9.6 4a6.9 6.9 0 0 0 10.4 10.4Z"/>',
    database:   '<ellipse cx="12" cy="6.4" rx="7.4" ry="2.8"/><path d="M4.6 6.4v11.2c0 1.55 3.31 2.8 7.4 2.8s7.4-1.25 7.4-2.8V6.4"/><path d="M4.6 12c0 1.55 3.31 2.8 7.4 2.8s7.4-1.25 7.4-2.8"/>',
    sparkles:   '<path d="m12 3.6 1.9 4.9 4.9 1.9-4.9 1.9L12 17.2l-1.9-4.9L5.2 10.4l4.9-1.9z"/><path d="M18.6 16.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    filter:     '<path d="M3.8 5.6h16.4l-6.4 7.4v5.4l-3.6 2v-7.4z"/>',
    columns:    '<rect x="3.6" y="4.6" width="6" height="14.8" rx="1.6"/><rect x="14.4" y="4.6" width="6" height="9.4" rx="1.6"/>',
    list:       '<path d="M8.4 6.6h11.2M8.4 12h11.2M8.4 17.4h11.2"/><circle cx="4.8" cy="6.6" r="1.1"/><circle cx="4.8" cy="12" r="1.1"/><circle cx="4.8" cy="17.4" r="1.1"/>',
    compare:    '<path d="M7 4.6v14.8M17 4.6v14.8"/><path d="m3.8 8.2 3.2-3.6 3.2 3.6"/><path d="m13.8 15.8 3.2 3.6 3.2-3.6"/>',
    more:       '<circle cx="5.4" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.6" cy="12" r="1.2"/>',
    external:   '<path d="M14 4.6h5.4V10"/><path d="M19.4 4.6 11.6 12.4"/><path d="M18 14.4v3.4a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6V7.6A1.6 1.6 0 0 1 6.2 6h3.4"/>',
    arrowRight: '<path d="M4.6 12h14.8"/><path d="m13.8 6.4 5.6 5.6-5.6 5.6"/>',
    alert:      '<path d="M12 4.4 20.8 19.6H3.2z"/><path d="M12 9.6v4.2M12 16.6v.01"/>',
    info:       '<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.2M12 7.9v.01"/>',
    bell:       '<path d="M18 9.4a6 6 0 1 0-12 0c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4Z"/><path d="M13.6 19.2a1.9 1.9 0 0 1-3.2 0"/>',
    target:     '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
    trending:   '<path d="M3.6 16.4 9 11l3.4 3.4L20.4 6.4"/><path d="M15.4 6.4h5v5"/>',
    zap:        '<path d="M13.4 3.6 5.6 13.4h5.2l-.6 7 7.8-9.8h-5.2z"/>',
    refresh:    '<path d="M20 11.6A8 8 0 0 0 6.5 6.9L4 9.4"/><path d="M4 5.2v4.2h4.2"/><path d="M4 12.4A8 8 0 0 0 17.5 17.1L20 14.6"/><path d="M20 18.8v-4.2h-4.2"/>',
    copy:       '<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="2"/><path d="M15.4 8.6V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.4a2 2 0 0 0 2 2h2.6"/>',
    star:       '<path d="m12 3.8 2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 17.1l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"/>',
    map:        '<path d="M9.2 4.6 3.8 6.8v12.6l5.4-2.2 5.6 2.2 5.4-2.2V4.6l-5.4 2.2z"/><path d="M9.2 4.6v12.6M14.8 6.8v12.6"/>',
    inbox:      '<path d="M3.8 12.6 6.4 5h11.2l2.6 7.6v5.2a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M3.8 12.6h4.4l1 2.2h5.6l1-2.2h4.4"/>',
    filter2:    '<path d="M4 6.6h16M7 12h10M10 17.4h4"/>',
    book:       '<path d="M4.6 5.2A1.6 1.6 0 0 1 6.2 3.6h12.2v14.6H6.2a1.6 1.6 0 0 0-1.6 1.6z"/><path d="M4.6 5.2v14.6"/>',
    route:      '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.4 6h5.2a3.4 3.4 0 0 1 0 6.8H9.4a3.4 3.4 0 0 0 0 6.8h6.2"/>'
  };

  ui.icon = function (name, size, cls) {
    var p = PATHS[name] || PATHS.info;
    var s = size || 16;
    return '<svg class="' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };

  ui.hasIcon = function (name) { return !!PATHS[name]; };

  /* ---------------------------------------------------------
     Toast
     --------------------------------------------------------- */
  var ICON_FOR = { ok: 'check', warn: 'alert', err: 'alert', info: 'info' };

  ui.toast = function (message, type) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var t = (type || 'info');
    var el = document.createElement('div');
    el.className = 'toast ' + t;
    el.innerHTML = ui.icon(ICON_FOR[t] || 'info', 14) + '<span>' + U.esc(message) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 240);
    }, type === 'err' ? 3600 : 2400);
  };

  /* ---------------------------------------------------------
     弹层：模态 / 抽屉
     --------------------------------------------------------- */
  var stack = [];

  function mount(node, onClose, opts) {
    var root = document.getElementById('overlay-root');
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    root.appendChild(scrim);
    root.appendChild(node);

    var entry = { node: node, scrim: scrim, onClose: onClose || function () {} };
    stack.push(entry);

    function destroy() {
      entry.closed = true;
      node.remove();
      scrim.remove();
      stack = stack.filter(function (s) { return s !== entry; });
      if (entry.onClose) entry.onClose();
    }
    entry.close = destroy;

    scrim.addEventListener('click', function () {
      if (opts && opts.scrimClose === false) return;
      destroy();
    });
    node.addEventListener('mousedown', function (e) { e.stopPropagation(); });

    var lastFocus = document.activeElement;
    var focusTarget = node.querySelector('[data-autofocus]') || node.querySelector('input, textarea, select, button');
    if (focusTarget) setTimeout(function () { try { focusTarget.focus(); } catch (e) {} }, 30);
    entry.restore = function () { try { lastFocus && lastFocus.focus(); } catch (e) {} };

    return entry;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !stack.length) return;
    var top = stack[stack.length - 1];
    e.stopPropagation();
    top.close();
    if (top.restore) top.restore();
  }, true);

  /**
   * ui.modal({ title, body, footer, wide, onMount })
   * body/footer 可以是 HTML 字符串或 DOM 节点
   */
  ui.modal = function (opts) {
    var node = document.createElement('div');
    node.className = 'modal' + (opts.wide ? ' wide' : '');
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');

    var head = '' +
      '<div class="modal-head">' +
        '<div class="modal-title">' + U.esc(opts.title || '') + '</div>' +
        '<button class="btn ghost icon sm" data-close aria-label="关闭">' + ui.icon('x', 15) + '</button>' +
      '</div>';
    node.innerHTML = head + '<div class="modal-body"></div>' +
      (opts.footer ? '<div class="modal-foot"></div>' : '');

    var body = node.querySelector('.modal-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    if (opts.footer) {
      var foot = node.querySelector('.modal-foot');
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else foot.appendChild(opts.footer);
    }

    var entry = mount(node, opts.onClose, opts);
    entry.body = body;
    entry.node = node;
    node.querySelector('[data-close]').addEventListener('click', function () { entry.close(); });
    if (opts.onMount) opts.onMount(entry);
    return entry;
  };

  ui.drawer = function (opts) {
    var node = document.createElement('div');
    node.className = 'drawer';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.innerHTML = '' +
      '<div class="drawer-head">' +
        '<div>' +
          '<div class="modal-title">' + U.esc(opts.title || '') + '</div>' +
          (opts.subtitle ? '<div class="page-sub">' + U.esc(opts.subtitle) + '</div>' : '') +
        '</div>' +
        '<button class="btn ghost icon sm" data-close aria-label="关闭">' + ui.icon('x', 15) + '</button>' +
      '</div>' +
      '<div class="drawer-body"></div>' +
      (opts.footer ? '<div class="drawer-foot"></div>' : '');

    var body = node.querySelector('.drawer-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    if (opts.footer) {
      var foot = node.querySelector('.drawer-foot');
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else foot.appendChild(opts.footer);
    }

    var entry = mount(node, opts.onClose, opts);
    entry.body = body;
    entry.node = node;
    node.querySelector('[data-close]').addEventListener('click', function () { entry.close(); });
    if (opts.onMount) opts.onMount(entry);
    return entry;
  };

  /** 确认框 → Promise<boolean> */
  ui.confirm = function (opts) {
    opts = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise(function (resolve) {
      var done = false;
      var m = ui.modal({
        title: opts.title || '请确认',
        body: '<p style="font-size:13.5px;color:var(--text-2);line-height:1.75">' + U.esc(opts.message || '') + '</p>' +
              (opts.hint ? '<p class="fs-12 muted mt-12">' + U.esc(opts.hint) + '</p>' : ''),
        footer: '<button class="btn" data-no>取消</button>' +
                '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-yes>' + U.esc(opts.okText || '确定') + '</button>',
        onClose: function () { if (!done) { done = true; resolve(false); } }
      });
      m.node.querySelector('[data-no]').addEventListener('click', function () { done = true; m.close(); resolve(false); });
      m.node.querySelector('[data-yes]').addEventListener('click', function () { done = true; m.close(); resolve(true); });
    });
  };

  /* ---------------------------------------------------------
     表单片段
     --------------------------------------------------------- */
  ui.options = function (list, selected, placeholder) {
    var out = placeholder ? '<option value="">' + U.esc(placeholder) + '</option>' : '';
    list.forEach(function (item) {
      var value = typeof item === 'string' ? item : item.value;
      var label = typeof item === 'string' ? item : item.label;
      out += '<option value="' + U.attr(value) + '"' + (String(value) === String(selected == null ? '' : selected) ? ' selected' : '') + '>' +
             U.esc(label) + '</option>';
    });
    return out;
  };

  ui.field = function (label, control, hint, cls) {
    return '<label class="field ' + (cls || '') + '">' +
      '<span class="field-label">' + U.esc(label) + '</span>' +
      control +
      (hint ? '<span class="field-hint">' + U.esc(hint) + '</span>' : '') +
      '</label>';
  };

  ui.statusChip = function (status, withDot) {
    var meta = WB.STATUS[status] || WB.STATUS.applied;
    return '<span class="chip ' + meta.tone + '">' +
      (withDot === false ? '' : '<i class="dot"></i>') + U.esc(meta.label) + '</span>';
  };

  ui.statusSelect = function (status, attrs) {
    var opts = WB.STATUS_ORDER.map(function (k) {
      return '<option value="' + k + '"' + (k === status ? ' selected' : '') + '>' + U.esc(WB.STATUS[k].label) + '</option>';
    }).join('');
    return '<select class="select" ' + (attrs || '') + '>' + opts + '</select>';
  };

  ui.prioChip = function (p) {
    var map = { high: '高优先', mid: '常规', low: '保底' };
    return '<span class="prio ' + p + '"><i></i>' + U.esc(map[p] || '常规') + '</span>';
  };

  ui.empty = function (title, text, iconName) {
    return '<div class="empty">' + ui.icon(iconName || 'inbox', 30) +
      '<div class="empty-title">' + U.esc(title) + '</div>' +
      (text ? '<div class="empty-text">' + U.esc(text) + '</div>' : '') + '</div>';
  };

  WB.ui = ui;
})(window.WB);
