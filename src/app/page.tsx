import { Suspense } from "react";
import { DayView } from "@/components/day-view";

export default function DayPage() {
  return (
    <Suspense>
      <DayView />
    </Suspense>
  );
}
