import { Link } from 'react-router';
import { MODES, routesInMode, type ModeDef } from '../../app/routes';
import { PageHeader } from '../../components/ui';
import { RoomList } from './RoomList';
import s from './HomePage.module.css';

/** Landing page of a mode: what it covers and the list of its rooms. */
export default function ModePage({ mode }: { mode: ModeDef }) {
  const other = MODES.find((m) => m.id !== mode.id)!;
  const rooms = routesInMode(mode.id);
  return (
    <div className={s.home}>
      <PageHeader eyebrow={`${rooms.length} rooms`} title={mode.title} lede={mode.blurb} />
      <RoomList mode={mode.id} />
      <p className={s.otherMode}>
        The other mode is <Link to={other.path}>{other.title}</Link>: {other.blurb}
      </p>
    </div>
  );
}
