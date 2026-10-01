import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { audio, INSTRUMENTS, type InstrumentId } from '../audio/engine';
import { stopAllPlayback, useAudioSettings } from '../audio/usePlayer';
import { Icon } from '../components/Icon';
import { usePersistentState } from '../hooks/usePersistentState';
import { ROUTES, SECTIONS } from './routes';
import s from './Layout.module.css';

type ThemePref = 'system' | 'light' | 'dark';

function Brand() {
  return (
    <NavLink to="/" className={s.brand} aria-label="Music Theory Explorer, home">
      <svg className={s.brandMark} viewBox="0 0 40 40" aria-hidden="true">
        {/* Proscenium arch with stave lines */}
        <path d="M5 37V17a15 15 0 0 1 30 0v20" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10 37V18a10 10 0 0 1 20 0v19" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        {[22, 25, 28, 31, 34].map((y) => (
          <line key={y} x1="12" x2="28" y1={y} y2={y} stroke="currentColor" strokeWidth="0.7" opacity="0.75" />
        ))}
        <ellipse cx="17" cy="28" rx="2.4" ry="1.7" transform="rotate(-20 17 28)" fill="currentColor" />
        <line x1="19.2" y1="27.4" x2="19.2" y2="19" stroke="currentColor" strokeWidth="0.9" />
      </svg>
      <span>
        <span className={s.brandTitle}>Music Theory</span>
        <span className={s.brandSub}>Explorer</span>
      </span>
    </NavLink>
  );
}

export function Layout() {
  const [theme, setTheme] = usePersistentState<ThemePref>('theme', 'system');
  const [instrument, setInstrument] = usePersistentState<InstrumentId>('instrument', 'piano');
  const [volume, setVolume] = usePersistentState<number>('volume', 0.8);
  const [navOpen, setNavOpen] = useState(false);
  const settings = useAudioSettings();
  const location = useLocation();

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    audio.setInstrument(instrument);
  }, [instrument]);

  useEffect(() => {
    audio.setVolume(volume);
  }, [volume]);

  // Leaving a page stops anything that is playing and closes the mobile menu.
  useEffect(() => {
    stopAllPlayback();
    audio.allNotesOff();
    setNavOpen(false);
    window.scrollTo({ top: 0 });
    const route = ROUTES.find((r) => r.path === location.pathname);
    document.title = route ? `${route.title} · Music Theory Explorer` : 'Music Theory Explorer';
  }, [location.pathname]);

  const nextTheme: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const themeLabel = theme === 'system' ? 'Theme: follow system' : theme === 'light' ? 'Theme: Matinee (light)' : 'Theme: Evening (dark)';

  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <aside className={`${s.sidebar} ${navOpen ? s.sidebarOpen : ''}`} aria-label="Sections">
        <Brand />
        <nav className={s.nav}>
          {SECTIONS.map((sec) => (
            <div key={sec.id} className={s.navSection}>
              <div className={s.navHeading}>{sec.title}</div>
              <ul>
                {ROUTES.filter((r) => r.section === sec.id).map((r) => (
                  <li key={r.path}>
                    <NavLink to={r.path} className={({ isActive }) => `${s.navLink} ${isActive ? s.navLinkActive : ''}`} title={r.blurb}>
                      {r.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={s.sidebarFoot}>
          Free and open source.
          <br />
          <a href="https://github.com/jstephenperry/music-theory-explorer" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </aside>
      {navOpen && <div className={s.scrim} onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <div className={s.main}>
        <header className={s.topbar}>
          <button className={s.menuButton} onClick={() => setNavOpen((o) => !o)} aria-label="Open navigation" aria-expanded={navOpen}>
            <Icon name="menu" size={20} />
          </button>
          <div className={s.topbarSpacer} />
          <label className={s.control} title="Instrument">
            <span className="sr-only">Instrument</span>
            <Icon name="sound" size={16} />
            <select value={settings.instrument} onChange={(e) => setInstrument(e.target.value as InstrumentId)} className={s.topSelect}>
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label className={s.control} title="Volume">
            <span className="sr-only">Volume</span>
            <Icon name={volume === 0 ? 'mute' : 'sound'} size={16} />
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className={s.volume} />
          </label>
          <button className={s.iconButton} onClick={() => setTheme(nextTheme[theme])} title={themeLabel} aria-label={themeLabel}>
            <Icon name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'sparkle'} size={18} />
          </button>
        </header>
        <main id="main" className={s.content}>
          <Suspense fallback={<div className={s.loading}>Raising the curtain…</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
