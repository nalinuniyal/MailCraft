import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9" />
      <div className="grid gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
    </div>
  );
}
