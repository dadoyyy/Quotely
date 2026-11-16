import { Card } from "@/components/ui/card";

const bar = "skeleton rounded-lg";

/** Shown at once while a page's data loads, so navigating never looks frozen. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-8 space-y-3">
        <div className={`${bar} h-8 w-48`} />
        <div className={`${bar} h-4 w-72 max-w-full`} />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3 p-4">
            <div className={`${bar} h-3 w-20`} />
            <div className={`${bar} h-6 w-32`} />
          </Card>
        ))}
      </div>
      <Card className="divide-y divide-neutral-200 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="space-y-2">
              <div className={`${bar} h-4 w-40`} />
              <div className={`${bar} h-3 w-24`} />
            </div>
            <div className={`${bar} h-6 w-20 rounded-full`} />
          </div>
        ))}
      </Card>
    </div>
  );
}
