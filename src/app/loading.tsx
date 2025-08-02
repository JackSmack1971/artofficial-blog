export default function Loading() {
  // Engagement-preserving skeleton: minimal CPU/GPU, avoids layout shift
  return (
    <main className="py-10 animate-pulse">
      <section className="mx-auto max-w-3xl">
        <div className="h-6 w-40 rounded-full bg-gray-200" />
        <div className="mt-4 h-8 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-full rounded bg-gray-200" />
        <div className="mt-2 h-4 w-5/6 rounded bg-gray-200" />
        <div className="mt-8 flex gap-3">
          <div className="h-10 w-2/3 rounded-md bg-gray-200" />
          <div className="hidden h-10 w-40 rounded-md bg-gray-200 sm:block" />
          <div className="hidden h-10 w-28 rounded-md bg-gray-200 sm:block" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-lg bg-gray-200" />
          <div className="h-24 rounded-lg bg-gray-200" />
          <div className="h-24 rounded-lg bg-gray-200" />
        </div>
      </section>
    </main>
  )
}