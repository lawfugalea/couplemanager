import { useEffect, useState } from "react";

/** useMedia("(max-width: 640px)") -> true on phones */
export default function useMedia(query) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatch(m.matches);
    onChange(); m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);
  return match;
}
