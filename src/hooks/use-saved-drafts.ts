import { useEffect, useState } from "react";

import {
  clearSavedDrafts,
  deleteSavedDraft,
  listSavedDrafts,
  saveDraft,
  updateSavedDraft,
  type SavedDraft,
  type SavedDraftKind,
} from "@/lib/saved-drafts";

export function useSavedDrafts(kind?: SavedDraftKind) {
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);

  const refresh = () => setDrafts(listSavedDrafts(kind));

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return {
    drafts,
    refresh,
    save: (title: string, data: SavedDraft["data"]) => {
      const draft = saveDraft(kind as SavedDraftKind, title, data);
      refresh();
      return draft;
    },
    update: (id: string, data: SavedDraft["data"], title?: string) => {
      updateSavedDraft(id, data, title);
      refresh();
    },
    remove: (id: string) => {
      deleteSavedDraft(id);
      refresh();
    },
    clearAll: () => {
      clearSavedDrafts(kind);
      refresh();
    },
  };
}
