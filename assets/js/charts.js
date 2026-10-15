/* ============================================================
   charts.js — 纯 SVG 轻量图表（无第三方依赖，离线可用）
   ============================================================ */
window.WB = window.WB || {};

(function (WB) {
  'use strict';

  var U = WB.util;
  var C = {};

  var TONE_VAR = {
    blue:   'var(--accent)',
    purple: 'var(--purple)',
    amber:  'var(--warn)',
    green:  'var(--success)',
    red:    'var(--danger)',
    gray:   'var(--text-3)'
  };

  C.toneVar = function (t) { return TONE_VAR[t] || TONE_VAR.blue; };

  /* ---------------- 转化漏斗（HTML 条形，清晰易读） ---------------- */
  C.funnel = function (items) {
    if (!items || !items.length) return '<div class="empty">暂无数据</div>';
    var max = Math.max(1, items[0].value);
    var rows = items.map(function (it, i) {
      var w = it.value > 0 ? Math.max(3, Math.round((it.value / max) * 100)) : 0;
      var prev = i === 0 ? null : items[i - 1].value;
      var rate = prev === null ? null : U.pct(it.value, prev);
      var overall = U.pct(it.value, max);
      var color = C.toneVar(it.tone);
      return '' +
        '<div class="fn-row">' +
          '<div class="fn-label">' + U.esc(it.label) + '</div>' +
          '<div class="fn-track">' +
            '<div class="fn-fill" style="width:' + w + '%;background:' + color + '"></div>' +
          '</div>' +
          '<div class="fn-value num">' + it.value + '</div>' +
          '<div class="fn-rate num">' + (rate === null ? '—' : '↘ ' + rate + '%') + '</div>' +
          '<div class="fn-overall num muted">' + (i === 0 ? '起点' : '累计 ' + overall + '%') + '</div>' +
        '</div>';
    }).join('');
    return '<div class="funnel">' + rows + '</div>';
  };

  /* ---------------- 环形图 ---------------- */
  C.donut = function (items, opts) {
    opts = opts || {};
    var size = opts.size || 172;
    var stroke = opts.stroke || 15;
    var r = (size - stroke) / 2 - 2;
    var cx = size / 2, cy = size / 2;
    var circ = 2 * Math.PI * r;
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);

    var body = '';
    if (total === 0) {
      body = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--bg-sunken)" stroke-width="' + stroke + '"/>';
    } else {
      var offset = 0;
      body = items.filter(function (i) { return i.value > 0; }).map(function (it) {
        var len = (it.value / total) * circ;
        var gap = items.length > 1 ? 2 : 0;
        var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
          'stroke="' + C.toneVar(it.tone) + '" stroke-width="' + stroke + '" ' +
          'stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (circ - Math.max(0, len - gap)) + '" ' +
          'stroke-dashoffset="' + (-offset) + '" stroke-linecap="butt"/>';
        offset += len;
        return seg;
      }).join('');
    }

    var center = opts.centerValue !== undefined ? opts.centerValue : total;
    var centerLabel = opts.centerLabel || '';

    return '' +
      '<div class="donut-wrap">' +
        '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img">' +
          '<g transform="rotate(-90 ' + cx + ' ' + cy + ')">' + body + '</g>' +
        '</svg>' +
        '<div class="donut-center">' +
          '<b class="num">' + U.esc(center) + '</b>' +
          (centerLabel ? '<small>' + U.esc(centerLabel) + '</small>' : '') +
        '</div>' +
      '</div>';
  };

  C.legend = function (items, total) {
    var sum = total || items.reduce(function (s, i) { return s + i.value; }, 0) || 1;
    return '<ul class="legend">' + items.map(function (it) {
      var p = U.pct(it.value, sum);
      return '<li>' +
        '<span class="legend-dot" style="background:' + C.toneVar(it.tone) + '"></span>' +
        '<span class="legend-label">' + U.esc(it.label) + '</span>' +
        '<span class="legend-value num">' + it.value + '</span>' +
        '<span class="legend-pct num">' + p + '%</span>' +
      '</li>';
    }).join('') + '</ul>';
  };

  /* ---------------- 面积 / 折线趋势图 ---------------- */
  C.area = function (series, opts) {
    opts = opts || {};
    var w = opts.width || 760, h = opts.height || 200;
    var pad = { l: 34, r: 14, t: 16, b: 26 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var n = series.length;
    if (!n) return '<div class="empty">暂无数据</div>';

    var max = Math.max.apply(null, series.map(function (d) { return d.value; }).concat([1]));
    var niceMax = max <= 4 ? 4 : Math.ceil(max / 2) * 2;

    var x = function (i) { return pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw); };
    var y = function (v) { return pad.t + ih - (v / niceMax) * ih; };

    var pts = series.map(function (d, i) { return [x(i), y(d.value)]; });

    // Catmull-Rom → 三次贝塞尔，得到平滑曲线
    var line = '';
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) { line += 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1); continue; }
      var p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      line += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) +
              ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    var area = line + ' L' + x(n - 1).toFixed(1) + ',' + (pad.t + ih) + ' L' + x(0).toFixed(1) + ',' + (pad.t + ih) + ' Z';

    // 横向网格
    var grid = '';
    var steps = 4;
    for (var g = 0; g <= steps; g++) {
      var val = (niceMax / steps) * g;
      var gy = y(val);
      grid += '<line x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + gy.toFixed(1) +
              '" stroke="var(--border)" stroke-width="1" stroke-dasharray="' + (g === 0 ? '0' : '3 4') + '"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end" ' +
              'font-size="10" fill="var(--text-3)">' + Math.round(val) + '</text>';
    }

    // 有值的点
    var dots = series.map(function (d, i) {
      if (!d.value) return '';
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(d.value).toFixed(1) + '" r="3" ' +
             'fill="var(--surface)" stroke="var(--accent)" stroke-width="2"><title>' + U.esc(d.label + ' · ' + d.value) + '</title></circle>';
    }).join('');

    // 横轴标签（每 5 天一个）
    var labels = series.map(function (d, i) {
      if (i % 5 !== 0 && i !== n - 1) return '';
      return '<text x="' + x(i).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" ' +
             'font-size="10" fill="var(--text-3)">' + U.esc(d.label) + '</text>';
    }).join('');

    var gid = 'grad_' + Math.random().toString(36).slice(2, 8);

    return '' +
      '<svg class="chart-area" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" role="img">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"/>' +
          '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        grid +
        '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
        '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        dots + labels +
      '</svg>';
  };

  /* ---------------- 纵向柱状图（适合稀疏的每日计数） ---------------- */
  C.barsV = function (series, opts) {
    opts = opts || {};
    var w = opts.width || 820, h = opts.height || 200;
    var pad = { l: 30, r: 12, t: 14, b: 26 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var n = series.length;
    if (!n) return '<div class="empty">暂无数据</div>';

    var max = Math.max.apply(null, series.map(function (d) { return d.value; }).concat([1]));
    var niceMax = max <= 4 ? 4 : Math.ceil(max / 2) * 2;
    var step = iw / n;
    var bw = Math.max(3, Math.min(16, step - 5));
    var y = function (v) { return pad.t + ih - (v / niceMax) * ih; };

    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var val = (niceMax / 4) * g;
      var gy = y(val);
      grid += '<line x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + gy.toFixed(1) +
              '" stroke="var(--border)" stroke-width="1" stroke-dasharray="' + (g === 0 ? '0' : '3 4') + '"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end" ' +
              'font-size="10" fill="var(--text-3)">' + Math.round(val) + '</text>';
    }

    var bars = series.map(function (d, i) {
      var cx = pad.l + step * i + step / 2;
      var bh = d.value ? Math.max(3, (d.value / niceMax) * ih) : 0;
      if (!bh) {
        return '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + (pad.t + ih - 2) + '" width="' + bw +
               '" height="2" rx="1" fill="var(--bg-sunken)"/>';
      }
      return '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + (pad.t + ih - bh).toFixed(1) + '" width="' + bw +
             '" height="' + bh.toFixed(1) + '" rx="2" fill="var(--accent)" fill-opacity="' + (opts.opacity || 0.9) + '">' +
             '<title>' + U.esc(d.label + ' · ' + d.value + ' 家') + '</title></rect>';
    }).join('');

    var labels = series.map(function (d, i) {
      if (i % 5 !== 0 && i !== n - 1) return '';
      return '<text x="' + (pad.l + step * i + step / 2).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" ' +
             'font-size="10" fill="var(--text-3)">' + U.esc(d.label) + '</text>';
    }).join('');

    return '<svg class="chart-bars" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" role="img">' +
      grid + bars + labels + '</svg>';
  };

  /* ---------------- 横向条形列表 ---------------- */
  C.barsH = function (items, opts) {
    opts = opts || {};
    if (!items.length) return '<div class="empty">暂无数据</div>';
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<ul class="bars">' + items.map(function (it) {
      var w = Math.max(2, Math.round((it.value / max) * 100));
      return '<li class="bar-row">' +
        '<span class="bar-label truncate" title="' + U.attr(it.label) + '">' + U.esc(it.label) + '</span>' +
        '<span class="bar-track"><i style="width:' + w + '%;background:' + C.toneVar(it.tone || 'blue') + '"></i></span>' +
        '<span class="bar-value num">' + U.esc(it.display !== undefined ? it.display : it.value) + '</span>' +
      '</li>';
    }).join('') + '</ul>';
  };

  /* ---------------- 环形进度 ---------------- */
  C.ring = function (pct, opts) {
    opts = opts || {};
    var size = opts.size || 84, stroke = opts.stroke || 7;
    var r = (size - stroke) / 2;
    var circ = 2 * Math.PI * r;
    var v = U.clamp(pct, 0, 100);
    var dash = (v / 100) * circ;
    return '' +
      '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img">' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--bg-sunken)" stroke-width="' + stroke + '"/>' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (opts.color || 'var(--accent)') +
          '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
          'stroke-dasharray="' + dash.toFixed(1) + ' ' + (circ - dash).toFixed(1) + '" ' +
          'transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '</svg>';
  };

  WB.charts = C;
})(window.WB);
