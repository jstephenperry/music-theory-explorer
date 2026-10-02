import { Link } from 'react-router';
import { routesInSection, sectionsInMode, type ModeId } from '../../app/routes';
import s from './HomePage.module.css';

/** The rooms of one mode, grouped by section, each with its one-line description. */
export function RoomList({ mode }: { mode: ModeId }) {
  return (
    <div className={s.program}>
      {sectionsInMode(mode).map((sec) => (
        <div key={sec.id} className={s.movement}>
          <h3 className={s.movementTitle}>{sec.title}</h3>
          <ol className={s.entries}>
            {routesInSection(sec.id).map((r) => (
              <li key={r.path}>
                <Link to={r.path} className={s.entry}>
                  <span className={s.entryTitle}>{r.title}</span>
                  <span className={s.entryLeader} aria-hidden="true" />
                  <span className={s.entryArrow} aria-hidden="true">
                    →
                  </span>
                  <span className={s.entryBlurb}>{r.blurb}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
