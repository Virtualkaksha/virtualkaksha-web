export default function StudentBookmarksLoading() {
  return <div className="mx-auto max-w-7xl animate-pulse space-y-7"><div className="h-44 rounded-3xl bg-white" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 rounded-2xl bg-white" />)}</div></div>;
}
