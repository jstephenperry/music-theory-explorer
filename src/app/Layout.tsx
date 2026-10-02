import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { audio, INSTRUMENTS, type InstrumentId } from '../audio/engine';
import { stopAllPlayback, useAudioSettings } from '../audio/usePlayer';
import { Icon } from '../components/Icon';
import { usePersistentState } from '../hooks/usePersistentState';
import { MODES, MODE_BY_ID, ROUTES, modeForPath, routesInSection, sectionsInMode, type ModeId } from './routes';
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
  const [lastMode, setLastMode] = usePersistentState<ModeId>('mode', 'theory');
  const settings = useAudioSettings();
  const location = useLocation();
  // The drawer remembers the path it was opened on, so navigating closes it without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const navOpen = openedAt === location.pathname;

  // The drawer shows the rooms of the mode the URL is in. The home page and unknown paths belong to
  // no mode, so they show the mode last visited.
  const urlMode = modeForPath(location.pathname);
  const mode = urlMode ?? MODE_BY_ID[lastMode];
  useEffect(() => {
    if (urlMode && urlMode.id !== lastMode) setLastMode(urlMode.id);
  }, [urlMode, lastMode, setLastMode]);

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

  // Fetch the chosen instrument's recordings once the page itself has finished loading.
  useEffect(() => {
    const start = () => window.setTimeout(() => audio.preload(), 600);
    if (document.readyState === 'complete') {
      const id = start();
      return () => window.clearTimeout(id);
    }
    let id: number | undefined;
    const onLoad = () => (id = start());
    window.addEventListener('load', onLoad, { once: true });
    return () => {
      window.removeEventListener('load', onLoad);
      window.clearTimeout(id);
    };
  }, []);

  // Leaving a page stops anything that is playing.
  useEffect(() => {
    stopAllPlayback();
    audio.allNotesOff();
    window.scrollTo({ top: 0 });
    const route = ROUTES.find((r) => r.path === location.pathname);
    const here = modeForPath(location.pathname);
    document.title = [route?.title, here?.title, 'Music Theory Explorer'].filter(Boolean).join(' · ');
  }, [location.pathname]);

  const nextTheme: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const themeLabel = theme === 'system' ? 'Theme: follow system' : theme === 'light' ? 'Theme: light' : 'Theme: dark';

  return (
    <div className={s.shell} data-mode={mode.id}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <aside className={`${s.sidebar} ${navOpen ? s.sidebarOpen : ''}`} aria-label={`${mode.title} rooms`}>
        <Brand />
        <nav className={s.modeSwitch} aria-label="Mode">
          {MODES.map((m) => (
            <NavLink key={m.id} to={m.path} className={`${s.modeTab} ${m.id === mode.id ? s.modeTabActive : ''}`} aria-current={m.id === mode.id ? 'true' : undefined} title={m.blurb}>
              {m.title}
            </NavLink>
          ))}
        </nav>
        <nav className={s.nav} aria-label={`${mode.title} rooms`}>
          {sectionsInMode(mode.id).map((sec) => (
            <div key={sec.id} className={s.navSection}>
              <div className={s.navHeading}>{sec.title}</div>
              <ul>
                {routesInSection(sec.id).map((r) => (
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
          <br />
          <a href="samples/CREDITS.md" target="_blank" rel="noreferrer">
            Instrument recordings
          </a>{' '}
          (Salamander Grand Piano, Musyng Kite)
        </div>
      </aside>
      {navOpen && <div className={s.scrim} onClick={() => setOpenedAt(null)} aria-hidden="true" />}

      <div className={s.main}>
        <header className={s.topbar}>
          <button className={s.menuButton} onClick={() => setOpenedAt(navOpen ? null : location.pathname)} aria-label="Open navigation" aria-expanded={navOpen}>
            <Icon name="menu" size={20} />
          </button>
          <div className={s.topbarSpacer} />
          <label className={s.control} title={settings.status === 'loading' ? 'Instrument (loading recordings)' : 'Instrument'}>
            <span className="sr-only">Instrument</span>
            <span className={`${s.instIcon} ${settings.status === 'loading' ? s.instLoading : ''}`} aria-hidden="true">
              <Icon name="sound" size={16} />
            </span>
            <select value={settings.instrument} onChange={(e) => setInstrument(e.target.value as InstrumentId)} className={s.topSelect}>
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <span className="sr-only" aria-live="polite">
              {settings.status === 'loading' ? 'Loading instrument recordings' : ''}
            </span>
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
          <Suspense fallback={<div className={s.loading}>Loading…</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
