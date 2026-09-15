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
    f.src = 'https://www.youtube-nocookie.com/embed/' + wrap.getAttribute('data-yt') + '?autoplay=1&rel=0';
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

  // ---------- 6) メニューの下層（ドロップダウン） ----------
  // 本物の Wix はマウスを乗せた時に下層を JS で組み立てる。組み立て後の構造と位置を本物から写し取ったもの。
  // スマホ・タブレット（Wix が端末判定で縮小表示にする端末）では、1回目のタップで下層を開き、2回目で移動する（本物と同じ）。
  (function () {
    var DROP = {"2": {"left": "-8px", "html": "<li id=\"comp-kep43s1bmoreContainer0\" data-direction=\"ltr\" data-listposition=\"top\" data-data-id=\"dataItem-ki1aqmmx\" data-state=\"drop false  link\" data-index=\"0\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/社会活動への学生参加1\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer0label\" style=\"min-width: 0px; line-height: 29px;\">社会活動への学生参加(1)―― AHI (アジア保健研修所) と学ぶ会</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer1\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-lual964y\" data-state=\"drop false  link\" data-index=\"1\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/社会活動への学生参加-2多文化共生プロジェクト\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer1label\" style=\"min-width: 0px; line-height: 29px;\">社会活動への学生参加(2)――多文化共生プロジェクト</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer2\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-l0bynr89\" data-state=\"drop false  link\" data-index=\"2\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/社会活動への学生参加3\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer2label\" style=\"min-width: 0px; line-height: 29px;\">社会活動への学生参加(3)――徳林寺、福慧寺</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer3\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-kvdeh32w\" data-state=\"drop false  link\" data-index=\"3\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/社会活動への学生参加4\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer3label\" style=\"min-width: 0px; line-height: 29px;\">社会活動への学生参加(4)――四日市とのかかわり</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer4\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-kvdehdzh\" data-state=\"drop false  link\" data-index=\"4\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/社会活動への学生参加5\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer4label\" style=\"min-width: 0px; line-height: 29px;\">社会活動への学生参加(5)――その他</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer5\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-ki1an4qr\" data-state=\"drop false  link\" data-index=\"5\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/out-of-class-lesson-copy\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer5label\" style=\"min-width: 0px; line-height: 29px;\">Out-of-Class Lesson</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer6\" data-direction=\"ltr\" data-listposition=\"bottom\" data-data-id=\"dataItem-kepaevpj\" data-state=\"drop false  link\" data-index=\"6\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 420px;\"><a data-testid=\"linkElement\" href=\"/out-of-class-lesson-2\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer6label\" style=\"min-width: 0px; line-height: 29px;\">Out-of-Class Lesson 2</p></div></div></a></li>"}, "3": {"left": "152.5px", "html": "<li id=\"comp-kep43s1bmoreContainer0\" data-direction=\"ltr\" data-listposition=\"top\" data-data-id=\"dataItem-lg0sdff0\" data-state=\"drop false  link\" data-index=\"0\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/平山ゼミ卒業論文\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer0label\" style=\"min-width: 0px; line-height: 29px;\">平山ゼミ卒業論文</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer1\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-lualrf0z\" data-state=\"drop false  link\" data-index=\"1\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2023年度creative-presentation\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer1label\" style=\"min-width: 0px; line-height: 29px;\">「2023年度Creative Presentation」</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer2\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-lc79v7bj\" data-state=\"drop false  link\" data-index=\"2\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2022年度creativepresentation\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer2label\" style=\"min-width: 0px; line-height: 29px;\">「2022年度Creative Presentation」</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer3\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-l0bzloz2\" data-state=\"drop false  link\" data-index=\"3\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2021年度英語研修sdgsworkshop\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer3label\" style=\"min-width: 0px; line-height: 29px;\">「2021年度英語研修 SDGs Workshop」</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer4\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-kepclg3l\" data-state=\"drop false  link\" data-index=\"4\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2019年度-海外研修-iii-a-中止後の特別授業\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer4label\" style=\"min-width: 0px; line-height: 29px;\">「2019年度 海外研修 III A 」\n中止後の特別授業</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer5\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-kepcm63k\" data-state=\"drop false  link\" data-index=\"5\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2018年度-海外研修-iii-a-訪問先\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer5label\" style=\"min-width: 0px; line-height: 29px;\">「2018年度 海外研修 III A 」訪問先</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer6\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-kepcms9b\" data-state=\"drop false  link\" data-index=\"6\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2018年度-海外研修-iii-a-事前学習\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer6label\" style=\"min-width: 0px; line-height: 29px;\">「2018年度 海外研修 III A 」事前学習</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer7\" data-direction=\"ltr\" data-listposition=\"dropCenter\" data-data-id=\"dataItem-kepcnaeg\" data-state=\"drop false  link\" data-index=\"7\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2017年度-地域研究-国際研修プログラム-フィリピン-訪問先\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer7label\" style=\"min-width: 0px; line-height: 29px;\">「2017年度 地域研究・国際研修プログラム(フィリピン)」訪問先</p></div></div></a></li><li id=\"comp-kep43s1bmoreContainer8\" data-direction=\"ltr\" data-listposition=\"bottom\" data-data-id=\"dataItem-kepcntnu\" data-state=\"drop false  link\" data-index=\"8\" data-dropdown=\"true\" class=\"NV2Ozs CUYeWp\" style=\"min-width: 447px;\"><a data-testid=\"linkElement\" href=\"/2017年度-地域研究-国際研修プログラム-フィリピン-事前学習\" target=\"_self\" class=\"qMvpu5\"><div class=\"EWeavx\"><div class=\"\"><p class=\"wGxoBM\" id=\"comp-kep43s1bmoreContainer8label\" style=\"min-width: 0px; line-height: 29px;\">「2017年度 地域研究・国際研修プログラム(フィリピン)」事前学習</p></div></div></a></li>"}};
    var menu = document.getElementById('comp-kep43s1b');
    var wrap = document.getElementById('comp-kep43s1bdropWrapper');
    var ul = document.getElementById('comp-kep43s1bmoreContainer');
    if (!menu || !wrap || !ul) return;
    var touchUA = /iPhone|iPod|iPad|Android|Silk|Kindle|Mobile/i.test(navigator.userAgent);
    var openIdx = null, timer = null;
    function topItem(i) { return menu.querySelector('li[data-index="' + i + '"]:not([data-dropdown])'); }
    function open(i) {
      clearTimeout(timer);
      if (openIdx === i) return;
      close();
      var d = DROP[i], li = topItem(i); if (!d || !li) return;
      ul.innerHTML = d.html; ul.setAttribute('data-hover', i);
      // 今いるページの項目は本物と同じく「選択中」の状態にする
      [].forEach.call(ul.querySelectorAll('li'), function (x) {
        var h = x.querySelector('a'); if (!h) return;
        var here = decodeURIComponent(location.pathname).replace(/\.html$/, '').replace(/\/$/, '');
        var to = decodeURIComponent(h.getAttribute('href')).replace(/\.html$/, '').replace(/\/$/, '');
        if (here.slice(-to.length) === to) x.setAttribute('data-state', 'drop selected  link');
      }); ul.style.left = d.left; ul.style.right = 'auto';
      wrap.classList.add('mmODQd'); wrap.setAttribute('data-dropdown-shown', 'true'); wrap.setAttribute('data-drophposition', 'center');
      wrap.style.inset = '30px auto auto ' + d.left;
      menu.setAttribute('data-hovered-item', i);
      var a = li.querySelector('a[aria-haspopup]'); if (a) a.setAttribute('aria-expanded', 'true');
      var b = li.querySelector('button'); if (b) b.classList.add('Ln3X5V');
      openIdx = i;
    }
    function close() {
      clearTimeout(timer);
      if (openIdx === null) return;
      var li = openIdx === 'more' ? null : topItem(openIdx);
      if (li) { var a = li.querySelector('a[aria-haspopup]'); if (a) a.setAttribute('aria-expanded', 'false'); var b = li.querySelector('button'); if (b) b.classList.remove('Ln3X5V'); }
      ul.innerHTML = ''; ul.removeAttribute('data-hover'); ul.removeAttribute('style');
      wrap.classList.remove('mmODQd'); wrap.setAttribute('data-dropdown-shown', 'false'); wrap.removeAttribute('data-drophposition'); wrap.removeAttribute('style');
      menu.removeAttribute('data-hovered-item');
      openIdx = null;
    }
    function later() { clearTimeout(timer); timer = setTimeout(close, 150); }
    Object.keys(DROP).forEach(function (i) {
      var li = topItem(i); if (!li) return;
      // スマホ・タブレットではタップの直前に疑似的な「マウスが乗った」合図が来るため、乗せて開く動きはPCだけにする
      if (!touchUA) { li.addEventListener('mouseenter', function () { open(i); }); li.addEventListener('mouseleave', later); }
      var a = li.querySelector('a[aria-haspopup]');
      if (a && touchUA) a.addEventListener('click', function (e) { if (openIdx !== i) { e.preventDefault(); open(i); } });
      var b = li.querySelector('button');
      if (b) b.addEventListener('click', function (e) { e.preventDefault(); if (openIdx === i) close(); else open(i); });
    });
    // 他のメニュー項目に移ったら閉じる
    [].forEach.call(menu.querySelectorAll('li[data-index]:not([data-dropdown])'), function (li) {
      if (!DROP[li.getAttribute('data-index')] && !touchUA) li.addEventListener('mouseenter', close);
    });
    if (!touchUA) { wrap.addEventListener('mouseenter', function () { clearTimeout(timer); }); wrap.addEventListener('mouseleave', later); }

    // 画面が狭くてメニューが一列に収まらない時、本物と同じく後ろの項目を「その他」へたたむ
    // （iPad のデスクトップ表示モードなど、表示幅が980pxより狭くなる端末で起きる）
    var more = menu.querySelector('li[data-index]:not([data-dropdown]) [id$="__more__label"]');
    var moreLi = more ? more.closest('li') : menu.querySelector('#comp-kep43s1b__more__') || menu.querySelector('li:last-child');
    var nav = document.getElementById('comp-kep43s1bnavContainer');
    var tops = [].slice.call(menu.querySelectorAll('li[data-index]:not([data-dropdown])'));
    var natural = null;
    function fit() {
      if (!moreLi || !nav) return;
      if (openIdx !== null) close();
      // 各項目の「本来の幅」を一度だけ測る
      if (!natural) {
        // 幅が足りない時、項目の枠は縮んで文字だけがはみ出す。だから「文字が必要とする幅」で測る
        natural = tops.map(function (li) {
          var p = li.querySelector('p') || li;
          var pad = li.getBoundingClientRect().width - p.getBoundingClientRect().width;
          return Math.ceil(Math.max(p.scrollWidth, p.getBoundingClientRect().width) + Math.max(0, pad));
        });
        natural.moreW = Math.ceil(moreLi.getBoundingClientRect().width) || 62;
        if (natural.moreW < 40) natural.moreW = 62;
      }
      var avail = nav.getBoundingClientRect().width;
      var hidden = [];
      var total = natural.reduce(function (a, b) { return a + b; }, 0);
      var i = tops.length - 1;
      while (total > avail && i > 0) {
        // 「その他」の分の幅も要る
        if (!hidden.length) total += natural.moreW;
        hidden.unshift(tops[i]); total -= natural[i]; i--;
      }
      tops.forEach(function (li) { li.style.display = hidden.indexOf(li) >= 0 ? 'none' : ''; });
      if (hidden.length) {
        // 本物は「その他」を高さ0・位置絶対で隠している。出す時はその指定を外す
        moreLi.style.visibility = 'visible'; moreLi.setAttribute('aria-hidden', 'false');
        moreLi.style.display = ''; moreLi.style.height = ''; moreLi.style.overflow = 'visible'; moreLi.style.position = 'relative';
        MORE_ITEMS = hidden.map(function (li) { var a = li.querySelector('a'); return { href: a ? a.getAttribute('href') : '#', text: (li.textContent || '').trim(), idx: li.getAttribute('data-index') }; });
      } else {
        moreLi.style.visibility = 'hidden'; moreLi.setAttribute('aria-hidden', 'true');
        moreLi.style.display = ''; moreLi.style.height = '0px'; moreLi.style.overflow = 'hidden'; moreLi.style.position = 'absolute';
        MORE_ITEMS = null;
      }
    }
    var MORE_ITEMS = null;
    // 「その他」を開いた時の中身を、下層メニューと同じ作りで組み立てる
    function moreHtml() {
      if (!MORE_ITEMS) return '';
      var w = Math.max.apply(null, MORE_ITEMS.map(function (m) { return m.text.length * 14 + 40; }).concat([180]));
      return MORE_ITEMS.map(function (m, n) {
        var pos = MORE_ITEMS.length === 1 ? 'top' : (n === 0 ? 'top' : (n === MORE_ITEMS.length - 1 ? 'bottom' : 'dropCenter'));
        return '<li id="comp-kep43s1bmoreContainer' + n + '" data-direction="ltr" data-listposition="' + pos + '" data-state="drop false  link" data-index="' + n + '" data-dropdown="true" class="NV2Ozs CUYeWp" style="min-width: ' + w + 'px;">' +
          '<a data-testid="linkElement" href="' + m.href + '" target="_self" class="qMvpu5"><div class="EWeavx"><div class="">' +
          '<p class="wGxoBM" id="comp-kep43s1bmoreContainer' + n + 'label" style="min-width: 0px; line-height: 29px;">' + m.text + '</p></div></div></a></li>';
      }).join('');
    }
    if (moreLi) {
      var openMore = function () {
        if (!MORE_ITEMS) return;
        close();
        var r = moreLi.getBoundingClientRect(), nr = nav.getBoundingClientRect();
        var left = Math.round(r.left - nr.left) + 'px';
        ul.innerHTML = moreHtml(); ul.setAttribute('data-hover', 'more'); ul.style.left = left; ul.style.right = 'auto';
        wrap.classList.add('mmODQd'); wrap.setAttribute('data-dropdown-shown', 'true'); wrap.setAttribute('data-drophposition', 'center');
        wrap.style.inset = '30px auto auto ' + left;
        openIdx = 'more';
      };
      if (!touchUA) { moreLi.addEventListener('mouseenter', openMore); moreLi.addEventListener('mouseleave', later); }
      moreLi.addEventListener('click', function (e) { e.preventDefault(); if (openIdx === 'more') close(); else openMore(); });
    }
    fit();
    window.addEventListener('resize', function () { natural = null; fit(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { natural = null; fit(); });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();
})();
