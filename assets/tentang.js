function initCustomCode(root) {
  root = root || document;
  if (root.__pmCustomDestroy) root.__pmCustomDestroy();
  var cleanups = [];
  function on(target, type, handler, options) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, handler, options);
    cleanups.push(function () { target.removeEventListener(type, handler, options); });
  }
  function onCleanup(fn) {
    if (typeof fn === "function") cleanups.push(fn);
  }
  function run(label, selector, fn) {
    var list = Array.prototype.slice.call(root.querySelectorAll(selector));
    if (root.matches && root.matches(selector)) list.unshift(root);
    if (!list.length) return;
    try {
      fn.call(list[0], list[0], list, on, onCleanup, root);
    } catch (err) {
      console.error("[Custom JS] " + label + ":", err);
    }
  }

  run("Mega Menu “Mega Menu”", ".page-tentang__mega-menu-1", function (element, elements, on, onCleanup, root) {
    var items = element.querySelectorAll("li");
    function closeAll(except) {
      Array.prototype.forEach.call(items, function (li) {
        if (li === except) return;
        li.classList.remove("is-open");
        var b = li.querySelector("button[aria-expanded]");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
    Array.prototype.forEach.call(items, function (li) {
      var btn = li.querySelector("button[aria-expanded]");
      if (!btn) return;
      on(btn, "click", function () {
        var open = !li.classList.contains("is-open");
        closeAll(li);
        li.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
    });
    var burger = element.querySelector("button[aria-controls$='-drawer']");
    function setMenu(open) {
      element.classList.toggle("is-menu-open", open);
      if (burger) burger.setAttribute("aria-expanded", String(open));
    }
    if (burger) on(burger, "click", function () {
      setMenu(!element.classList.contains("is-menu-open"));
    });
    on(document, "click", function (e) {
      if (!element.contains(e.target)) { closeAll(null); setMenu(false); }
    });
    on(document, "keydown", function (e) {
      if (e.key === "Escape") { closeAll(null); setMenu(false); }
    });
  });

  run("Kembali ke Atas “Kembali ke Atas”", ".page-tentang__back-to-top-1", function (element, elements, on, onCleanup, root) {
    var offset = +element.getAttribute("data-offset") || 0;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.setAttribute("data-ready", "");
    function check() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var visible = y > offset;
      element.classList.toggle("is-visible", visible);
      if (visible) element.removeAttribute("tabindex");
      else element.setAttribute("tabindex", "-1");
    }
    check();
    on(window, "scroll", check, { passive: true });
    on(element, "click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    onCleanup(function () {
      element.removeAttribute("data-ready");
      element.classList.remove("is-visible");
      element.removeAttribute("tabindex");
    });
  });

  run("Animasi CSS", ".page-tentang", function (element, elements, on, onCleanup, root) {
    // Animasi CSS: putar animasi "saat terlihat" ketika elemen masuk layar.
    var doc = element.ownerDocument || document;
    var list = element.querySelectorAll('[data-owd-trigger="scroll"]');
    if (!list.length) return;
    var showAll = function () { list.forEach(function (el) { el.classList.add("owd-in"); }); };
    if (!("IntersectionObserver" in window)) return showAll();
    var onceAll = getComputedStyle(doc.documentElement).getPropertyValue("--owd-anim-once").trim() !== "0";
    doc.documentElement.classList.add("owd-motion");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        var once = el.hasAttribute("data-owd-once") ? el.getAttribute("data-owd-once") !== "false" : onceAll;
        if (en.isIntersecting) {
          el.classList.add("owd-in");
          if (once) io.unobserve(el);
        } else if (!once) el.classList.remove("owd-in");
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    list.forEach(function (el) { io.observe(el); });
    onCleanup(function () { io.disconnect(); });
  });

  function destroy() {
    while (cleanups.length) {
      try { cleanups.pop()(); } catch (err) { console.error("[Custom JS] cleanup:", err); }
    }
    if (root.__pmCustomDestroy === destroy) root.__pmCustomDestroy = null;
  }
  root.__pmCustomDestroy = destroy;
  return destroy;
}

initCustomCode(document);
