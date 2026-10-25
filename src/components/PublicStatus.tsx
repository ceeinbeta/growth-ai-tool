export function PublicStatus({ upcoming = false }: { upcoming?: boolean }) {
  return <span className={`status-chip ${upcoming ? 'status-coming' : 'status-live'}`}>{upcoming ? 'Coming next' : 'Live'}</span>;
}
