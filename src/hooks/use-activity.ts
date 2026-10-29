import { useCallback, useEffect, useState } from "react";

import { activityCounts, clearActivity, getActivity, recordActivity, type ActivityEntry } from "@/lib/activity";

export function useActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(() => {
    setEntries(getActivity());
    setCounts(activityCounts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    entries,
    counts,
    refresh,
    record: recordActivity,
    clear: useCallback(() => {
      clearActivity();
      refresh();
    }, [refresh]),
  };
}
