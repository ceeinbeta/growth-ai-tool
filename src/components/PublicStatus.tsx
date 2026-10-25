export function PublicStatus({ upcoming = false }: { upcoming?: boolean }) {
  return <span className={`status-chip ${upcoming ? 'status-coming' : 'status-live'}`}>{upcoming ? 'Soon' : 'Live'}</span>;
}
