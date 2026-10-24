// Elemen 3D (globe): Three.js dimuat saat elemen mendekati layar.
/* owd-shared:owd3d */
var OWD3D = (typeof window !== "undefined" && window.OWD3D) || (function () {
  "use strict";
  var VERSION = "0.186.1";
  var BASE = "https://cdn.jsdelivr.net/npm/three@" + VERSION;
  var URLS = { core: BASE + "/+esm", gltf: BASE + "/examples/jsm/loaders/GLTFLoader.js/+esm" };
  // Peta daratan 128×64 (1 bit per sel) dari Natural Earth 110m (domain publik) lewat world-atlas (ISC).
  var LAND = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+AH/AAAAAAAAAAAAAAAAwH///wHAAwAABgAAAAAAYAAO//8BIAAAADAAAAAAAAAAA/D/AQAAEIB/AAAAAADYdz/w/wAAAAz//z8cAOD/P8nlwH8AwB9A+////+/v////weMHBvCv////////yP///8DBAQB4/////////+D3/z9wAAEAPP//////fxwAA/9/4AMAQDD+/////wMDAAD8//cHAOCI//////+AAwAA+P/3DwDA////////BwAAAPj//xgAgP///////wcAAADw//8HAID/3/n///8FAAAA8P9/AACg18P9////DAAAAPD/PwAA4KD/+///PwAAAADw/x8AAOAQ//n//zMCAAAA4P8fAADAD+D///+jAwAAAMD/BwAA4J/w////RwAAAAAAvwQAAPD///3//wcAAAAAAB4YAAD4/+/7//8HAAAAAAAcAAAA/P/fD///AwAAAAAAGBEAAPz/3x9+PgAAAAAAALhRAQD8/78PPDwAAAAAAACAAwAA/P+/Awx4AAAAAAAAAAIAAPz//wAIeAAAAAAAAACkAwD4//8DCCAAAAAAAAAA8AcA8P//AxAIEAAAAAAAAPA/AAD4/wEAFAIAAAAAAADwPwAA+P8AAIgzAAAAAAAA+P8AAPh/AACQjQAAAAAAAPj/BwDwPwAAMAgPAAAAAADw/w8A4D8AAMAADgAAAAAA8P8HAOA/AAAABBAAAAAAAOD/AwDgPwIAAMAFAAAAAADg/wMA8D8CAADwDAAAAAAAgP8DAPAfAwAA+A8AAAAAAID/AQDgDwEAAP4fAAAAAACA/wAA4B8BAAD/PwAAAAAAgH8AAOAPAAAA/z8AAAAAAIA/AADABwAAAP5/AAAAAACAHwAAwAMAAAAePwAAAAAAwA8AAAAAAAAAAD4AAAAAAMAPAAAAAAAAAAAUQAAAAADAAwAAAAAAAAAACEAAAAAAwAEAAAAAAAAAAAAQAAAAAOAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAQAAAAAAAAAA4AQAAAAAAAAAAAAAAAAAAIABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAIABABAAAAAAAAAAEAAACQ//H//38AAAAAAOADAPD////+////HwCA//H/AwD8/////////wcA////HwDg//////////8DAPD//x/kwP//////////AQD8////9////////////wf//////////////////////////////////////////w==";
  var dynImport = function (u) { return import(/* @vite-ignore */ u); };
  var noop = function () {};

  function loadThree() {
    if (!window.__owdThree) window.__owdThree = dynImport(URLS.core);
    return window.__owdThree;
  }
  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function cssVar(host, name) {
    try {
      return getComputedStyle(host).getPropertyValue(name).trim();
    } catch (e) {
      return "";
    }
  }
  /** Warna: hex/rgb biasa atau var(--x) dari variabel global. */
  function color(host, v, d) {
    if (!v) return d;
    var m = /^var\((--[\w-]+)\)$/.exec(String(v).trim());
    if (m) return cssVar(host, m[1]) || d;
    return v;
  }
  /** Pengaturan efektif: nilai elemen, atau Pengaturan Global (--owd-3d-*). */
  function settings(host, cfg) {
    var g = function (n) { return cssVar(host, "--owd-3d-" + n); };
    var q = cfg.quality && cfg.quality !== "global" ? cfg.quality : g("quality") || "auto";
    if (q === "auto") {
      var small = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
      var weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
      q = small || weak ? "low" : "mid";
    }
    var pick = function (v, name, d) { return v === "on" ? true : v === "off" ? false : g(name) ? g(name) !== "0" : d; };
    var speed = typeof cfg.speed === "number" && cfg.speed > 0 ? cfg.speed : parseFloat(g("speed")) || 1;
    var dpr = parseFloat(g("dpr")) || 1.5;
    if (q === "low") dpr = Math.min(dpr, 1);
    return { q: q, rotate: pick(cfg.autoRotate, "autorotate", true), interactive: pick(cfg.interactive, "interactive", true), speed: speed, dpr: dpr, reduced: reducedMotion() };
  }

  /* ---------------- kerangka WebGL ---------------- */

  function context(T, host, s) {
    var stage = host.querySelector(".owd3d-stage") || host;
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;outline:none";
    stage.appendChild(canvas);
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: s.q !== "low", alpha: true, powerPreference: s.q === "high" ? "high-performance" : "default" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.dpr));
    renderer.outputColorSpace = T.SRGBColorSpace;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 6);
    return { T: T, host: host, canvas: canvas, renderer: renderer, scene: scene, camera: camera, s: s, disposables: [] };
  }
  function track(ctx, o) {
    ctx.disposables.push(o);
    return o;
  }
  function disposeAll(ctx) {
    ctx.scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      var m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach(function (x) { if (x.map) x.map.dispose(); x.dispose(); });
    });
    ctx.disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
    ctx.renderer.dispose();
    if (ctx.renderer.forceContextLoss) ctx.renderer.forceContextLoss();
    if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
  }
  /** Tekstur titik bulat lembut (tanpa berkas gambar). */
  function dotTexture(T) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.85)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }
  function shadowPlane(T, ctx, y, size, opacity) {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(15,23,42," + opacity + ")");
    grd.addColorStop(1, "rgba(15,23,42,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var tex = track(ctx, new T.CanvasTexture(c));
    var m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    return m;
  }
  function lights(T, scene, tint) {
    scene.add(new T.HemisphereLight(0xffffff, tint || 0x334155, 1.6));
    var key = new T.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    var rim = new T.DirectionalLight(0x9fb7ff, 1.2);
    rim.position.set(-4, 2, -3);
    scene.add(rim);
  }

  /** Seret untuk memutar (horizontal), gulir vertikal tetap jalan di HP. */
  function dragControl(ctx, onDrag) {
    var el = ctx.canvas, down = false, lx = 0, ly = 0;
    var start = function (e) { down = true; lx = e.clientX; ly = e.clientY; ctx.dragging = true; };
    var move = function (e) {
      if (!down) return;
      onDrag((e.clientX - lx) / el.clientWidth, (e.clientY - ly) / el.clientHeight);
      lx = e.clientX;
      ly = e.clientY;
      ctx.wake();
    };
    var end = function () { down = false; ctx.dragging = false; };
    el.addEventListener("pointerdown", start);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return function () {
      el.removeEventListener("pointerdown", start);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }
  /** Posisi kursor relatif host (-1..1), untuk efek "mengikuti kursor". */
  function hoverControl(ctx, target) {
    var host = ctx.host;
    var move = function (e) {
      var r = host.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      ctx.wake();
    };
    var leave = function () { target.x = 0; target.y = 0; ctx.wake(); };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return function () {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }
  function fitObject(T, obj, height) {
    var box = new T.Box3().setFromObject(obj);
    var size = box.getSize(new T.Vector3());
    var center = box.getCenter(new T.Vector3());
    var k = height / Math.max(size.y, size.x * 0.8, size.z * 0.8, 0.0001);
    obj.scale.multiplyScalar(k);
    obj.position.sub(center.multiplyScalar(k));
  }

  /* ---------------- 1. Produk berputar ---------------- */

  var PROFILES = {
    bottle: [[0, 0], [0.4, 0], [0.46, 0.06], [0.46, 1.05], [0.42, 1.22], [0.2, 1.42], [0.17, 1.6], [0, 1.6]],
    can: [[0, 0], [0.36, 0], [0.42, 0.05], [0.42, 1.18], [0.37, 1.25], [0.34, 1.27], [0, 1.27]],
    jar: [[0, 0], [0.62, 0], [0.68, 0.06], [0.68, 0.62], [0.64, 0.68], [0, 0.68]],
    cup: [[0, 0], [0.34, 0], [0.38, 0.04], [0.5, 1.05], [0.52, 1.1], [0.48, 1.1], [0.36, 0.1], [0, 0.1]]
  };
  function productScene(ctx, cfg) {
    var T = ctx.T, s = ctx.s, host = ctx.host;
    lights(T, ctx.scene);
    var pivot = new T.Group();
    ctx.scene.add(pivot);
    var body = color(host, cfg.color, "#2563eb"), accent = color(host, cfg.accent, "#f8fafc");
    var finish = cfg.finish || "glossy";
    var mat = function (c, rough) {
      return new T.MeshStandardMaterial({ color: new T.Color(c), roughness: finish === "matte" ? 0.7 : rough, metalness: finish === "metal" ? 0.85 : 0.05 });
    };
    var seg = s.q === "low" ? 40 : 96;
    function procedural() {
      var g = new T.Group();
      var model = PROFILES[cfg.model] ? cfg.model : "bottle";
      var pts = PROFILES[model].map(function (p) { return new T.Vector2(p[0], p[1]); });
      g.add(new T.Mesh(new T.LatheGeometry(pts, seg), mat(body, 0.25)));
      if (model === "bottle") {
        var cap = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 0.28, seg), mat(accent, 0.4));
        cap.position.y = 1.72;
        g.add(cap);
      }
      if (model === "jar") {
        var lid = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 0.22, seg), mat(accent, 0.35));
        lid.position.y = 0.79;
        g.add(lid);
      }
      if (model === "bottle" || model === "can") {
        var r = model === "bottle" ? 0.463 : 0.423, h = model === "bottle" ? 0.62 : 0.7;
        var label = new T.Mesh(new T.CylinderGeometry(r, r, h, seg, 1, true), new T.MeshStandardMaterial({ color: new T.Color(accent), roughness: 0.6, side: T.DoubleSide }));
        label.position.y = model === "bottle" ? 0.6 : 0.6;
        g.add(label);
      }
      fitObject(T, g, 2.1);
      return g;
    }
    var obj = procedural();
    pivot.add(obj);
    ctx.scene.add(shadowPlane(T, ctx, -1.15, 2.6, 0.35));
    ctx.camera.position.set(0, 0.35, 5.6);
    ctx.camera.lookAt(0, 0, 0);
    if (cfg.glb && /^(https?:)?\/\//.test(cfg.glb) || /^\/[^/]/.test(cfg.glb || "")) {
      dynImport(URLS.gltf)
        .then(function (mod) {
          new mod.GLTFLoader().load(cfg.glb, function (gltf) {
            if (ctx.dead) return;
            var m = gltf.scene;
            fitObject(T, m, 2.1);
            pivot.remove(obj);
            obj.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
            obj = m;
            pivot.add(m);
            ctx.wake();
          }, undefined, function () { /* model gagal dimuat: tetap pakai bentuk bawaan */ });
        })
        .catch(noop);
    }
    var rotY = 0, rotX = 0.08, vel = 0;
    var stop = s.interactive ? dragControl(ctx, function (dx, dy) { vel = dx * 6; rotY += dx * 6; rotX = Math.max(-0.5, Math.min(0.6, rotX + dy * 2)); }) : noop;
    return {
      animate: s.rotate && !s.reduced,
      update: function (dt) {
        if (!ctx.dragging) {
          if (s.rotate && !s.reduced) rotY += dt * 0.6 * s.speed;
          rotY += vel;
          vel *= 0.92;
        }
        pivot.rotation.y = rotY;
        pivot.rotation.x = rotX;
        return Math.abs(vel) > 0.0005;
      },
      dispose: stop
    };
  }

  /* ---------------- 2. Bentuk geometris interaktif ---------------- */

  function shapeScene(ctx, cfg) {
    var T = ctx.T, s = ctx.s, host = ctx.host;
    lights(T, ctx.scene, 0x1e1b4b);
    var detail = s.q === "low" ? 0 : 1;
    var geo;
    switch (cfg.shape) {
      case "icosahedron": geo = new T.IcosahedronGeometry(1.25, detail); break;
      case "torus": geo = new T.TorusGeometry(1, 0.38, s.q === "low" ? 24 : 48, s.q === "low" ? 64 : 140); break;
      case "octahedron": geo = new T.OctahedronGeometry(1.35, 0); break;
      case "dodecahedron": geo = new T.DodecahedronGeometry(1.25, 0); break;
      default: geo = new T.TorusKnotGeometry(0.85, 0.28, s.q === "low" ? 96 : 220, s.q === "low" ? 12 : 28);
    }
    var c = new T.Color(color(host, cfg.color, "#6366f1"));
    var mat;
    if (cfg.material === "glass") mat = new T.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transmission: s.q === "low" ? 0 : 0.85, thickness: 1.2, transparent: true, opacity: s.q === "low" ? 0.75 : 1, clearcoat: 1 });
    else if (cfg.material === "wire") mat = new T.MeshBasicMaterial({ color: c, wireframe: true });
    else if (cfg.material === "matte") mat = new T.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 });
    else mat = new T.MeshStandardMaterial({ color: c, roughness: 0.22, metalness: 0.85 });
    var mesh = new T.Mesh(geo, mat);
    ctx.scene.add(mesh);
    if (cfg.material !== "wire" && cfg.outline) {
      var edges = new T.LineSegments(new T.EdgesGeometry(geo, 25), new T.LineBasicMaterial({ color: color(host, cfg.accent, "#ffffff"), transparent: true, opacity: 0.35 }));
      mesh.add(edges);
    }
    ctx.camera.position.set(0, 0, 5.4);
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, spin = 0;
    var stop = s.interactive ? hoverControl(ctx, target) : noop;
    var t = 0;
    return {
      animate: !s.reduced,
      update: function (dt) {
        t += dt;
        cur.x += (target.x - cur.x) * Math.min(1, dt * 4);
        cur.y += (target.y - cur.y) * Math.min(1, dt * 4);
        if (s.rotate && !s.reduced) spin += dt * 0.35 * s.speed;
        mesh.rotation.y = spin + cur.x * 0.9;
        mesh.rotation.x = spin * 0.6 + cur.y * 0.7;
        mesh.position.y = s.reduced ? 0 : Math.sin(t * 1.2) * 0.08;
        return Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.001;
      },
      dispose: stop
    };
  }

  /* ---------------- 3. Globe interaktif ---------------- */

  var landBits = null;
  function isLand(lat, lon) {
    if (!landBits) {
      var bin = atob(LAND);
      landBits = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) landBits[i] = bin.charCodeAt(i);
    }
    var x = Math.min(127, Math.max(0, Math.floor(((lon + 180) / 360) * 128)));
    var y = Math.min(63, Math.max(0, Math.floor(((90 - lat) / 180) * 64)));
    var k = y * 128 + x;
    return (landBits[k >> 3] & (1 << (k & 7))) !== 0;
  }
  function latLon(T, lat, lon, r) {
    var phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180;
    return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  }
  function globeScene(ctx, cfg) {
    var T = ctx.T, s = ctx.s, host = ctx.host;
    var R = 1.5;
    var globe = new T.Group();
    ctx.scene.add(globe);
    var dotC = new T.Color(color(host, cfg.color, "#60a5fa"));
    var oceanC = new T.Color(color(host, cfg.ocean, "#0b1220"));
    var glowC = new T.Color(color(host, cfg.glow, "#3b82f6"));
    globe.add(new T.Mesh(new T.SphereGeometry(R * 0.985, s.q === "low" ? 32 : 64, s.q === "low" ? 24 : 48), new T.MeshBasicMaterial({ color: oceanC })));
    var N = s.q === "low" ? 7000 : s.q === "high" ? 22000 : 14000;
    var pos = [], golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
      var lat = (Math.asin(y) * 180) / Math.PI;
      var lon = ((((Math.atan2(Math.sin(th) * rad, -Math.cos(th) * rad) * 180) / Math.PI) + 540) % 360) - 180;
      if (isLand(lat, lon)) {
        var v = latLon(T, lat, lon, R);
        pos.push(v.x, v.y, v.z);
      }
    }
    var dots = new T.BufferGeometry();
    dots.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    var dotTex = track(ctx, dotTexture(T));
    var land = new T.Points(dots, new T.PointsMaterial({ color: dotC, size: s.q === "low" ? 0.065 : 0.055, map: dotTex, transparent: true, alphaTest: 0.05, depthWrite: false, sizeAttenuation: true }));
    land.renderOrder = 1;
    globe.add(land);
    // Atmosfer: cahaya tepi (fresnel) di belakang bola.
    var atmo = new T.ShaderMaterial({
      uniforms: { c: { value: glowC } },
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      // 0 di tepi luar → 1 di tepi bola; warna premultiplied supaya rapi di latar terang maupun gelap.
      fragmentShader: "uniform vec3 c; varying vec3 vN; void main(){ float d = clamp(-dot(vN, vec3(0.0, 0.0, 1.0)) / 0.53, 0.0, 1.0); float i = pow(d, 1.6); gl_FragColor = vec4(c * i, i); }",
      side: T.BackSide,
      premultipliedAlpha: true,
      transparent: true,
      depthWrite: false
    });
    var atm = new T.Mesh(new T.SphereGeometry(R * 1.18, 48, 32), atmo);
    ctx.scene.add(atm);
    // Penanda lokasi + garis lengkung antar penanda.
    var markC = new T.Color(color(host, cfg.marker, "#f59e0b"));
    var markers = (cfg.markers || []).slice(0, 24);
    var rings = [];
    markers.forEach(function (m) {
      var p = latLon(T, m.lat, m.lon, R * 1.005);
      var dot = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), new T.MeshBasicMaterial({ color: markC }));
      dot.position.copy(p);
      globe.add(dot);
      var ring = new T.Mesh(new T.RingGeometry(0.04, 0.06, 32), new T.MeshBasicMaterial({ color: markC, transparent: true, side: T.DoubleSide, depthWrite: false }));
      ring.position.copy(p);
      ring.lookAt(p.clone().multiplyScalar(2));
      globe.add(ring);
      rings.push(ring);
    });
    if (cfg.arcs && markers.length > 1) {
      for (var j = 0; j < markers.length - 1; j++) {
        var a = latLon(T, markers[j].lat, markers[j].lon, R), b = latLon(T, markers[j + 1].lat, markers[j + 1].lon, R);
        var mid = a.clone().add(b).multiplyScalar(0.5);
        mid.setLength(R + a.distanceTo(b) * 0.35);
        var curve = new T.QuadraticBezierCurve3(a, mid, b);
        globe.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(48)), new T.LineBasicMaterial({ color: markC, transparent: true, opacity: 0.7 })));
      }
    }
    globe.rotation.y = (((cfg.startLon || 0) + 90) * Math.PI) / -180;
    globe.rotation.x = 0.35;
    ctx.camera.position.set(0, 0, 6.2);
    var vel = 0, t = 0;
    var stop = s.interactive ? dragControl(ctx, function (dx, dy) { vel = dx * 5; globe.rotation.y += dx * 5; globe.rotation.x = Math.max(-1, Math.min(1, globe.rotation.x + dy * 2)); }) : noop;
    return {
      animate: !s.reduced,
      update: function (dt) {
        t += dt;
        if (!ctx.dragging) {
          if (s.rotate && !s.reduced) globe.rotation.y += dt * 0.12 * s.speed;
          globe.rotation.y += vel;
          vel *= 0.93;
        }
        for (var k = 0; k < rings.length; k++) {
          var ph = (t * 0.8 + k * 0.37) % 1;
          rings[k].scale.setScalar(1 + ph * 3);
          rings[k].material.opacity = 1 - ph;
        }
        return Math.abs(vel) > 0.0005;
      },
      dispose: stop
    };
  }

  /* ---------------- 4. Latar partikel 3D ---------------- */

  function particleScene(ctx, cfg) {
    var T = ctx.T, s = ctx.s, host = ctx.host;
    var base = cfg.density === "low" ? 0.5 : cfg.density === "high" ? 1.6 : 1;
    var N = Math.round((s.q === "low" ? 1800 : s.q === "high" ? 9000 : 5000) * base);
    var pos = new Float32Array(N * 3), mix = new Float32Array(N), seed = new Float32Array(N);
    var shape = cfg.shape || "wave";
    for (var i = 0; i < N; i++) {
      var x, y, z;
      if (shape === "galaxy") {
        var arm = i % 3, r = Math.pow(Math.random(), 0.7) * 3.2, ang = r * 1.6 + (arm * Math.PI * 2) / 3;
        x = Math.cos(ang) * r + (Math.random() - 0.5) * 0.35;
        z = Math.sin(ang) * r + (Math.random() - 0.5) * 0.35;
        y = (Math.random() - 0.5) * 0.25 * (3.2 - r);
        mix[i] = r / 3.2;
      } else if (shape === "sphere") {
        var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = 1.9 + (Math.random() - 0.5) * 0.25;
        x = Math.sqrt(1 - u * u) * Math.cos(th) * rr;
        y = u * rr;
        z = Math.sqrt(1 - u * u) * Math.sin(th) * rr;
        mix[i] = (u + 1) / 2;
      } else {
        x = (Math.random() - 0.5) * 9;
        z = (Math.random() - 0.5) * 6;
        y = 0;
        mix[i] = (x + 4.5) / 9;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      seed[i] = Math.random();
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("aMix", new T.BufferAttribute(mix, 1));
    geo.setAttribute("aSeed", new T.BufferAttribute(seed, 1));
    var uni = {
      uTime: { value: 0 },
      uA: { value: new T.Color(color(host, cfg.color, "#60a5fa")) },
      uB: { value: new T.Color(color(host, cfg.accent, "#c084fc")) },
      uSize: { value: (cfg.size || 3) * Math.min(window.devicePixelRatio || 1, s.dpr) },
      uWave: { value: shape === "wave" ? 1 : 0 },
      uOpacity: { value: 0.9 }
    };
    var mat = new T.ShaderMaterial({
      uniforms: uni,
      transparent: true,
      depthWrite: false,
      blending: cfg.glow === false ? T.NormalBlending : T.AdditiveBlending,
      vertexShader:
        "uniform float uTime; uniform float uSize; uniform float uWave; attribute float aMix; attribute float aSeed; varying float vMix; varying float vA;" +
        "void main(){ vec3 p = position; p.y += uWave * (sin(p.x * 1.1 + uTime) * 0.35 + cos(p.z * 1.4 + uTime * 0.8) * 0.25);" +
        " p += (1.0 - uWave) * vec3(0.0, sin(uTime * 0.6 + aSeed * 6.28) * 0.06, 0.0);" +
        " vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * (0.6 + aSeed * 0.8) * (6.0 / -mv.z); vMix = aMix; vA = 0.45 + aSeed * 0.55; }",
      fragmentShader:
        "uniform vec3 uA; uniform vec3 uB; uniform float uOpacity; varying float vMix; varying float vA;" +
        "void main(){ float d = length(gl_PointCoord - vec2(0.5)); if (d > 0.5) discard; float a = (1.0 - smoothstep(0.15, 0.5, d)) * vA * uOpacity; gl_FragColor = vec4(mix(uA, uB, vMix), a); }"
    });
    var pts = new T.Points(geo, mat);
    ctx.scene.add(pts);
    ctx.camera.position.set(0, shape === "wave" ? 2.2 : 1.2, shape === "wave" ? 5.2 : 6);
    ctx.camera.lookAt(0, 0, 0);
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    var stop = s.interactive ? hoverControl(ctx, target) : noop;
    var camBase = ctx.camera.position.clone();
    return {
      animate: !s.reduced,
      update: function (dt) {
        if (!s.reduced) uni.uTime.value += dt * s.speed;
        if (shape !== "wave" && s.rotate && !s.reduced) pts.rotation.y += dt * 0.08 * s.speed;
        cur.x += (target.x - cur.x) * Math.min(1, dt * 2);
        cur.y += (target.y - cur.y) * Math.min(1, dt * 2);
        ctx.camera.position.set(camBase.x + cur.x * 0.8, camBase.y - cur.y * 0.4, camBase.z);
        ctx.camera.lookAt(0, 0, 0);
        return false;
      },
      dispose: stop
    };
  }

  /* ---------------- 5. Kartu 3D (CSS, tanpa WebGL) ---------------- */

  function mountTilt(host, cfg) {
    var card = host.querySelector(".owd3d-card") || host;
    if (reducedMotion()) return noop;
    var max = typeof cfg.max === "number" ? cfg.max : 12, raf = 0, nx = 0, ny = 0;
    var apply = function () {
      raf = 0;
      card.style.setProperty("--owd-rx", (-ny * max).toFixed(2) + "deg");
      card.style.setProperty("--owd-ry", (nx * max).toFixed(2) + "deg");
      card.style.setProperty("--owd-gx", ((nx + 1) * 50).toFixed(1) + "%");
      card.style.setProperty("--owd-gy", ((ny + 1) * 50).toFixed(1) + "%");
    };
    var move = function (e) {
      var r = host.getBoundingClientRect();
      nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      host.classList.add("is-tilting");
      if (!raf) raf = requestAnimationFrame(apply);
    };
    var leave = function () {
      nx = ny = 0;
      host.classList.remove("is-tilting");
      if (!raf) raf = requestAnimationFrame(apply);
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return function () {
      if (raf) cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }

  /* ---------------- siklus hidup ---------------- */

  var SCENES = { product: productScene, shape: shapeScene, globe: globeScene, particles: particleScene };

  /**
   * Pasang satu elemen 3D. Three.js dimuat saat elemen mendekati layar,
   * render berhenti saat elemen tidak terlihat / tab disembunyikan, dan
   * gambar statis tetap tampil bila WebGL tidak tersedia atau gagal.
   * Mengembalikan fungsi pembersih (dipanggil saat komponen dilepas).
   */
  // Elemen yang dilepas dari DOM (mis. pratinjau dirender ulang) dibersihkan
  // pada pemasangan berikutnya supaya konteks WebGL tidak menumpuk.
  var live = [];
  function sweep() {
    live = live.filter(function (m) {
      if (m.host.isConnected) return true;
      m.destroy();
      return false;
    });
  }
  function mount(host, kind, cfg) {
    sweep();
    if (!host || host.__owd3d) return noop;
    cfg = cfg || {};
    if (kind === "tilt") return mountTilt(host, cfg);
    var build = SCENES[kind];
    if (!build) return noop;
    if (!hasWebGL()) {
      host.classList.add("is-3d-fallback");
      return noop;
    }
    var state = { dead: false, visible: false, ctx: null, raf: 0, last: 0, scene: null, io: null, ro: null };
    host.__owd3d = true;
    function fail(err) {
      host.classList.add("is-3d-fallback");
      if (err && window.console) console.warn("[3D] memakai gambar statis:", err);
    }
    function resize() {
      var c = state.ctx;
      if (!c) return;
      var w = host.clientWidth || 1, h = host.clientHeight || 1;
      c.renderer.setSize(w, h, false);
      c.camera.aspect = w / h;
      c.camera.updateProjectionMatrix();
      c.wake();
    }
    function frame(now) {
      state.raf = 0;
      var c = state.ctx;
      if (state.dead || !c) return;
      if (!host.isConnected) return destroy();
      var dt = Math.min(0.05, state.last ? (now - state.last) / 1000 : 0.016);
      state.last = now;
      var moving = state.scene.update(dt);
      c.renderer.render(c.scene, c.camera);
      if ((state.scene.animate || moving || c.dragging) && state.visible && !document.hidden) state.raf = requestAnimationFrame(frame);
      else state.last = 0;
    }
    function wake() {
      if (!state.raf && !state.dead && state.ctx) state.raf = requestAnimationFrame(frame);
    }
    function start() {
      loadThree()
        .then(function (T) {
          if (state.dead) return;
          var c = context(T, host, settings(host, cfg));
          c.wake = wake;
          state.ctx = c;
          state.scene = build(c, cfg);
          c.dead = false;
          resize();
          host.classList.add("is-3d-ready");
          if (window.ResizeObserver) {
            state.ro = new ResizeObserver(resize);
            state.ro.observe(host);
          }
          wake();
        })
        .catch(fail);
    }
    var started = false;
    function onVis() { if (!document.hidden) wake(); }
    if ("IntersectionObserver" in window) {
      state.io = new IntersectionObserver(function (entries) {
        state.visible = entries[entries.length - 1].isIntersecting;
        if (state.visible && !started) {
          started = true;
          start();
        }
        if (state.visible) wake();
      }, { rootMargin: "200px" });
      state.io.observe(host);
    } else {
      state.visible = true;
      started = true;
      start();
    }
    document.addEventListener("visibilitychange", onVis);
    live.push({ host: host, destroy: destroy });
    function destroy() {
      if (state.dead) return;
      state.dead = true;
      host.__owd3d = false;
      if (state.raf) cancelAnimationFrame(state.raf);
      if (state.io) state.io.disconnect();
      if (state.ro) state.ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (state.ctx) {
        state.ctx.dead = true;
        try {
          if (state.scene && state.scene.dispose) state.scene.dispose();
          disposeAll(state.ctx);
        } catch (e) { /* abaikan */ }
      }
      host.classList.remove("is-3d-ready");
    }
    return destroy;
  }

  var api = { mount: mount, version: VERSION };
  if (typeof window !== "undefined") window.OWD3D = api;
  return api;
})();
/* /owd-shared:owd3d */
(function () {
  var CONFIG = {"color":"#dbeafe","ocean":"#0b1324","glow":"#2f80ed","marker":"#fbbf24","markers":[{"name":"Jakarta","lat":-6.2,"lon":106.8},{"name":"Singapura","lat":1.35,"lon":103.8},{"name":"Shanghai","lat":31.2,"lon":121.5},{"name":"Rotterdam","lat":51.9,"lon":4.5},{"name":"Los Angeles","lat":34.05,"lon":-118.25},{"name":"Dubai","lat":25.2,"lon":55.3}],"arcs":true,"startLon":100};
  document.querySelectorAll(".page-jaringan__three-globe-1").forEach(function (el) {
    OWD3D.mount(el, "globe", CONFIG);
  });
})();

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

  run("Mega Menu “Mega Menu”", ".page-jaringan__mega-menu-1", function (element, elements, on, onCleanup, root) {
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

  run("Kembali ke Atas “Kembali ke Atas”", ".page-jaringan__back-to-top-1", function (element, elements, on, onCleanup, root) {
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

  run("Animasi CSS", ".page-jaringan", function (element, elements, on, onCleanup, root) {
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
