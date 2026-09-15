/* 旧Wixサイトの動く部品を、Wixに依存せず再現する。
   1) ギャラリーの写真クリックで拡大表示（前後送り・Esc/背景クリックで閉じる）
   2) 横スクロール型ギャラリーの矢印送り */
(function () {
  'use strict';

  // ---------- 1) 拡大表示 ----------
  var box, img, cap, list = [], idx = 0;
  function build() {
    box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(255,255,255,.96);display:none;align-items:center;justify-content:center';
    img = document.createElement('img');
    img.style.cssText = 'max-width:calc(100vw - 160px);max-height:calc(100vh - 80px);object-fit:contain;box-shadow:0 2px 20px rgba(0,0,0,.15)';
    cap = document.createElement('div');
    cap.style.cssText = 'position:absolute;left:0;right:0;bottom:14px;text-align:center;font:13px/1.4 sans-serif;color:#555';
    function btn(label, css, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label);
      b.style.cssText = 'position:absolute;background:none;border:0;cursor:pointer;color:#333;font:300 44px/1 sans-serif;padding:12px 18px;' + css;
      b.textContent = label === '閉じる' ? '×' : (label === '前へ' ? '‹' : '›');
      b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
      box.appendChild(b); return b;
    }
    btn('閉じる', 'top:6px;right:10px', close);
    btn('前へ', 'left:10px;top:50%;transform:translateY(-50%)', function () { show(idx - 1); });
    btn('次へ', 'right:10px;top:50%;transform:translateY(-50%)', function () { show(idx + 1); });
    box.appendChild(img); box.appendChild(cap);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.body.appendChild(box);
  }
  function show(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    img.src = list[idx].src; img.alt = list[idx].alt || '';
    cap.textContent = list[idx].alt && !/\.(jpe?g|png)$/i.test(list[idx].alt) ? list[idx].alt : '';
  }
  function openList(imgs, start) {
    if (!box) build();
    list = imgs.map(function (el) { return { src: el.currentSrc || el.src, alt: el.alt }; });
    show(Math.max(0, start));
    box.style.display = 'flex'; document.documentElement.style.overflow = 'hidden';
  }
  function open(gallery, target) {
    var all = [].slice.call(gallery.querySelectorAll('img[data-hook="gallery-item-image-img"]'));
    openList(all, all.indexOf(target));
  }
  function close() { box.style.display = 'none'; document.documentElement.style.overflow = ''; }
  document.addEventListener('keydown', function (e) {
    if (!box || box.style.display !== 'flex') return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
  document.addEventListener('click', function (e) {
    var item = e.target.closest && e.target.closest('[data-hook="item-container"].clickable');
    if (!item) return;
    var target = item.querySelector('img[data-hook="gallery-item-image-img"]');
    var gallery = item.closest('.pro-gallery') || document;
    if (!target) return;
    e.preventDefault(); open(gallery, target);
  });

  // ---------- 4) スライドショー: 約3.5秒ごとに自動で切り替え（本物の実測 3.43〜3.64秒）、クリックで拡大 ----------
  [].forEach.call(document.querySelectorAll('[data-testid="slide-show-gallery"]'), function (g) {
    var ghosts = [].slice.call(g.querySelectorAll('[data-testid="gallery-item-ghost"] img'));
    var cur = g.querySelector('[data-testid="slide-show-gallery-items"] img');
    if (!cur || ghosts.length < 2) return;
    var i = Math.max(0, ghosts.map(function (x) { return x.getAttribute('src'); }).indexOf(cur.getAttribute('src')));
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % ghosts.length;
      cur.setAttribute('src', ghosts[i].getAttribute('src'));
    }, 3500);
    g.addEventListener('click', function (e) {
      if (!e.target.closest('[data-testid="gallery-item-click-action-image-zoom"]')) return;
      e.preventDefault(); openList(ghosts, i);
    });
  });

  // ---------- 3) Wix動画ウィジェット: 再生ボタンで同じ枠にYouTubeを再生 ----------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-hook="overlay-play-button"]');
    if (!btn) return;
    var wrap = btn.closest('[data-yt]'); if (!wrap || !wrap.getAttribute('data-yt')) return;
    e.preventDefault();
    var box = wrap.querySelector('[data-hook="thumbnail-cover"]') || wrap;
    var r = box.getBoundingClientRect();
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube.com/embed/' + wrap.getAttribute('data-yt') + '?autoplay=1&rel=0';
    f.title = (wrap.querySelector('[data-hook="title"]') || {}).textContent || 'YouTube';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.setAttribute('allowfullscreen', '');
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:5;background:#000';
    var host = box; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (r.height < 20) host.style.minHeight = '240px';
    host.appendChild(f);
  });


  // ---------- 5) 「▲」ページ上部へ戻る／「メインコンテンツにスキップ」 ----------
  document.addEventListener('click', function (e) {
    var top = e.target.closest && e.target.closest('[data-anchor="SCROLL_TO_TOP"]');
    if (top) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // なめらかなスクロールが進まない環境（非表示のタブ等）でも確実に最上部へ戻す
      setTimeout(function () { if (window.scrollY > 0) window.scrollTo(0, 0); }, 900);
      return;
    }
    var skip = e.target.closest && e.target.closest('#SKIP_TO_CONTENT_BTN');
    if (skip) {
      e.preventDefault();
      var t = document.getElementById('PAGES_CONTAINER') || document.querySelector('main,[role="main"]');
      if (t) { if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); t.scrollIntoView({ block: 'start' }); }
    }
  });

  // ---------- 2) 横スクロール型ギャラリーの矢印 ----------
  [].forEach.call(document.querySelectorAll('.gallery-horizontal-scroll'), function (sc) {
    var root = sc.closest('.pro-gallery') || sc.parentNode;
    var next = root.querySelector('[data-hook="nav-arrow-next"]');
    var prev = root.querySelector('[data-hook="nav-arrow-prev"]');
    if (next && !prev) {
      prev = next.cloneNode(true);
      prev.setAttribute('data-hook', 'nav-arrow-prev'); prev.setAttribute('aria-label', 'Previous Item');
      prev.style.right = ''; prev.style.left = next.style.right || '33px';
      var svg = prev.querySelector('svg'); if (svg) svg.style.transform = 'scaleX(-1)';
      next.parentNode.insertBefore(prev, next);
    }
    function step() {
      var g = sc.querySelector('[data-hook="group-view"]');
      return g ? g.getBoundingClientRect().width : sc.clientWidth;
    }
    function update() {
      var max = sc.scrollWidth - sc.clientWidth - 2;
      if (prev) prev.style.visibility = sc.scrollLeft > 2 ? 'visible' : 'hidden';
      if (next) next.style.visibility = sc.scrollLeft < max ? 'visible' : 'hidden';
    }
    sc.style.overflowX = 'auto';
    if (next) next.addEventListener('click', function (e) { e.preventDefault(); sc.scrollBy({ left: step(), behavior: 'smooth' }); });
    if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); sc.scrollBy({ left: -step(), behavior: 'smooth' }); });
    sc.addEventListener('scroll', update, { passive: true });
    update();
  });
})();
