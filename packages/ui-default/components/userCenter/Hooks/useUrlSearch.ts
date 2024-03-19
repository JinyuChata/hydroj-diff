import { useEffect, useState } from "react";

export default function useUrlSearch(
  key: string,
  options?: {
    defaultValue?: string;
    validator?: (val: string) => boolean;
    fallback?: (val: string) => void;
  },
) {
  const { defaultValue, validator, fallback } = options ?? {};

  const [search, setSearch] = useState<string>(defaultValue);

  const handleChange = (val: string, isInit = false) => {
    setSearch(val);
    const search = new URLSearchParams(window.location.search);
    search.set(key, val);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${search.toString()}`,
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    try {
      const queryItem = params.get(key);
      if (queryItem && (validator ? validator(queryItem) : true)) {
        handleChange(queryItem, true);
      } else {
        throw new Error();
      }
    } catch {
      handleChange(defaultValue ?? "", true);
      fallback?.(search);
    }

    return () => {
      const search = new URLSearchParams(window.location.search);
      search.delete(key);
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${search.toString()}`,
      );
    };
  }, []);

  return [search, handleChange] as const;
}

export const setSearch = (...queries: { key: string; val: string }[]) => {
  const search = new URLSearchParams(window.location.search);
  queries.forEach((query) => {
    search.set(query.key, query.val);
  });
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}?${search.toString()}`,
  );
  window.location.reload();
};
