// clapp-navbar.jsx
// Shared CLApp NavBar component + CSS — single source of truth across all pages.
// Load BEFORE the page's own Babel script tag, e.g.:
//   <script type="text/babel" data-presets="react" src="clapp-navbar.jsx"></script>
//
// Usage from page JSX:
//   <CLAppNavBar active="Absensi" />
//
// Customizable via globals (set on window before this file loads):
//   window.PERLU_TINDAKAN_COUNT  – number of pending action items (default 3)

(function() {
  // ─── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [
    ["Absensi",         "Absensi.html"],
    ["Jama'ah",         "Jamaah.html"],
    ["Rekap Absensi",   "Rekap Absensi.html"],
    ["Laporan Bulanan", "Laporan Bulanan.html"],
    ["Catatan Peristiwa",   "Catatan Peristiwa.html"],
    ["Musyawarah",      "Musyawarah.html"],
    ["Serkiler",        "Serkiler.html"],
    ["Pengaturan",      "Pengaturan.html"],
    ["Qurban",          null], // disabled (Coming Soon)
  ];
  const DISABLED_TABS = new Set(["Qurban"]);

  // ─── CSS — inject once if not already on page ──────────────────────────────
  if (!document.getElementById("clapp-navbar-style")) {
    const css = `
.app-top{display:flex;align-items:stretch;background:var(--surface);border-bottom:1px solid var(--rule-strong);position:relative}
.app-brand{padding:10px 20px;border-right:1px solid var(--rule) !important;min-width:160px;background:transparent;
  border-top:0;border-bottom:0;border-left:0;text-align:left;font-family:inherit;color:inherit;cursor:default;
  display:flex;flex-direction:row;align-items:center;gap:10px;transition:background .12s}
.app-brand:hover{background:var(--surface-2)}
.app-brand .logo-mark{position:relative;width:32px;height:32px;
  display:inline-flex;align-items:center;justify-content:center;
  flex-shrink:0}
.app-brand .logo-mark svg{display:block}
.app-brand .logo-mark img{display:block;width:100%;height:100%;object-fit:contain;
  border-radius:3px;border:1px solid var(--ink-200);background:var(--surface)}
.app-brand:hover .logo-mark img{border-color:var(--ink-700)}
.app-brand .brand-badge{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;
  padding:0 4px;border-radius:8px;background:var(--izin);color:#FCFAF5;
  font-family:"IBM Plex Mono",monospace;font-size:9.5px;font-weight:700;letter-spacing:0;
  display:inline-flex;align-items:center;justify-content:center;line-height:1;
  border:1.5px solid var(--surface);pointer-events:none}
.app-brand:hover .brand-badge{border-color:var(--surface-2)}
.app-brand .title{font-size:18px;font-weight:600;margin-top:0;letter-spacing:-.005em;display:flex;align-items:center;gap:6px}
.app-brand .title .home-mark{font-size:13px;color:var(--ink-400);transition:color .12s,transform .12s}
.app-brand:hover .title .home-mark{color:var(--ink-700);transform:translateX(2px)}
.app-brand.is-home .title .home-mark{color:var(--ink-900);transform:rotate(90deg)}

.app-nav{display:flex;align-items:stretch;flex:1;min-width:0;position:relative}
.app-nav .tab{padding:0 18px;display:flex;align-items:center;justify-content:center;
  font-size:13.5px;color:var(--ink-700);border-right:1px solid var(--rule);cursor:default;
  font-weight:500;white-space:nowrap;flex:1 1 auto;min-width:0;text-decoration:none}
.app-nav .tab:hover{background:var(--surface-2);color:var(--ink-900)}
.app-nav .tab.active{background:var(--paper);color:var(--ink-900);position:relative}
.app-nav .tab.active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--hadir)}
.app-nav .tab.disabled{color:var(--ink-400);cursor:not-allowed}
.app-nav .tab.disabled:hover{background:transparent;color:var(--ink-400)}

.nav-measure{position:absolute;visibility:hidden;pointer-events:none;white-space:nowrap;
  left:0;top:0;display:flex;height:100%}
.nav-measure .tab,.nav-measure .lainnya-trigger{flex:0 0 auto !important}

.lainnya-wrap{position:relative;display:flex;align-items:stretch;flex:0 0 auto}
.lainnya-trigger{padding:0 16px;display:flex;align-items:center;gap:6px;color:var(--ink-700);
  border-right:1px solid var(--rule);cursor:default;font-weight:600;
  font-family:"IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;font-size:11px;
  background:var(--surface-2);flex:0 0 auto;white-space:nowrap;position:relative}
.lainnya-trigger:hover{background:var(--paper-2);color:var(--ink-900)}
.lainnya-trigger.open{background:var(--paper);color:var(--ink-900)}
.lainnya-trigger svg{transition:transform .15s ease;color:var(--ink-500)}
.lainnya-trigger.open svg{transform:rotate(180deg);color:var(--ink-900)}
.lainnya-trigger.has-active{color:var(--ink-900)}
.lainnya-trigger.has-active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--hadir)}

.lainnya-menu{position:absolute;top:100%;right:0;min-width:220px;background:var(--surface);
  border:1px solid var(--rule-strong);border-top:1px solid var(--rule);
  box-shadow:0 14px 32px -8px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.06);z-index:50;padding:6px 0}
.lainnya-menu .menu-eyebrow{font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-500);padding:8px 16px 6px}
.lainnya-menu .menu-item{padding:9px 16px;font-size:13.5px;color:var(--ink-700);cursor:default;
  display:flex;align-items:center;gap:10px;border-left:2px solid transparent;text-decoration:none}
.lainnya-menu .menu-item:hover{background:var(--surface-2);color:var(--ink-900);border-left-color:var(--hadir)}
.lainnya-menu .menu-item.active{background:var(--paper);color:var(--ink-900);border-left-color:var(--hadir);font-weight:600}
.lainnya-menu .menu-item.disabled{color:var(--ink-400);cursor:not-allowed}
.lainnya-menu .menu-item.disabled:hover{background:transparent;color:var(--ink-400);border-left-color:transparent}

.coming-badge{display:inline-flex;align-items:center;padding:1px 5px;
  font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;color:var(--ink-500);background:var(--ink-200);
  border-radius:2px;margin-left:6px;line-height:1;white-space:nowrap;flex-shrink:0}
`;
    const style = document.createElement("style");
    style.id = "clapp-navbar-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── Helper components ─────────────────────────────────────────────────────
  function TabLabel({ name }) {
    return DISABLED_TABS.has(name)
      ? <><span>{name}</span><span className="coming-badge">Coming Soon</span></>
      : name;
  }

  const LogoMark = (perluCount) => (
    <span className="logo-mark">
      <img src="clapp-icon.jpg" alt="CLApp" />
      {perluCount > 0 && <span className="brand-badge">{perluCount}</span>}
    </span>
  );

  const Caret = (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // ─── Main NavBar component ─────────────────────────────────────────────────
  function CLAppNavBar({ active, isHome }) {
    const perluCount = typeof window.PERLU_TINDAKAN_COUNT === "number"
      ? window.PERLU_TINDAKAN_COUNT : 3;

    const navRef = React.useRef(null);
    const measureRef = React.useRef(null);
    const wrapRef = React.useRef(null);
    const [vCount, setVCount] = React.useState(TABS.length);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      if (!open) return;
      const onDown = (e) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    React.useLayoutEffect(() => {
      const nav = navRef.current, measure = measureRef.current;
      if (!nav || !measure) return;
      const compute = () => {
        const avail = nav.clientWidth;
        const widths = Array.from(measure.querySelectorAll('[data-mtab]'))
          .map(el => el.getBoundingClientRect().width);
        const lEl = measure.querySelector('[data-mlainnya]');
        const lW = lEl ? lEl.getBoundingClientRect().width : 110;
        const total = widths.reduce((a, b) => a + b, 0);
        if (total <= avail + 0.5) { setVCount(TABS.length); return; }
        let used = lW, count = 0;
        for (const w of widths) {
          if (used + w > avail) break;
          used += w; count++;
        }
        setVCount(Math.max(1, count));
      };
      compute();
      const ro = new ResizeObserver(compute);
      ro.observe(nav);
      return () => ro.disconnect();
    }, []);

    const visible = TABS.slice(0, vCount);
    const overflow = TABS.slice(vCount);
    const showLainnya = overflow.length > 0;
    const activeIsHidden = showLainnya && overflow.some(([n]) => n === active);

    const renderTab = (key, isMeasure = false) => {
      const [name, href] = key;
      const isDis = DISABLED_TABS.has(name);
      const isActive = name === active;
      const cls = `tab${isActive ? " active" : ""}${isDis ? " disabled" : ""}`;
      const content = <TabLabel name={name} />;
      if (isMeasure || isDis || !href) {
        return <div key={name} className={cls} {...(isMeasure ? { "data-mtab": true } : {})}>{content}</div>;
      }
      return <a key={name} className={cls} href={href}>{content}</a>;
    };

    return (
      <div className="app-top">
        <button className={`app-brand${isHome ? " is-home" : ""}`}
                title={isHome ? "Dashboard (di sini)" : "Kembali ke Dashboard"}
                onClick={() => { if (!isHome) window.location.href = "Dashboard.html"; }}>
          {LogoMark(perluCount)}
          <div className="title">CLApp<span className="home-mark">›</span></div>
        </button>
        <div className="app-nav" ref={navRef}>
          <div className="nav-measure" ref={measureRef} aria-hidden="true">
            {TABS.map(t => renderTab(t, true))}
            <div className="lainnya-trigger" data-mlainnya>Lainnya{Caret}</div>
          </div>
          {visible.map(t => renderTab(t))}
          {showLainnya && (
            <div className="lainnya-wrap" ref={wrapRef}>
              <div className={`lainnya-trigger${open ? " open" : ""}${activeIsHidden ? " has-active" : ""}`}
                   onClick={() => setOpen(o => !o)}>Lainnya{Caret}</div>
              {open && (
                <div className="lainnya-menu" role="menu">
                  <div className="menu-eyebrow">Modul Lain</div>
                  {overflow.map(([name, href]) => {
                    const isDis = DISABLED_TABS.has(name);
                    const isActive = name === active;
                    const cls = `menu-item${isActive ? " active" : ""}${isDis ? " disabled" : ""}`;
                    if (isDis || !href) return <div key={name} className={cls}><TabLabel name={name} /></div>;
                    return <a key={name} className={cls} href={href} onClick={() => setOpen(false)}><TabLabel name={name} /></a>;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expose globally
  window.CLAppNavBar = CLAppNavBar;
})();
