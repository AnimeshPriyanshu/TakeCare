"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export function useApi(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (options = {}) => {
      if (!path || !enabled) return;
      const id = ++requestId.current;
      if (!options.silent) setLoading(true);
      setError(null);
      try {
        const result = await api.get(path);
        if (id === requestId.current) setData(result);
      } catch (err) {
        if (id === requestId.current) setError(err);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [path, enabled],
  );

  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false);
      return;
    }
    load();
  }, [load, path, enabled]);

  return { data, loading, error, refresh: load, setData };
}
