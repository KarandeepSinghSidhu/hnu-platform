"use client";

import { useEffect, useState } from "react";
import { parseMediaRef } from "@/lib/media-refs";

// Shared, module-level cache of the media library so image-field previews can
// turn a "media:{id}" reference into a real path. Fetched once; the MediaPicker
// primes/refreshes it (e.g. after an upload) so previews stay current.
type Lite = { id: number; filePath: string };

let cache: Lite[] | null = null;
let inflight: Promise<Lite[]> | null = null;
const subscribers = new Set<(assets: Lite[]) => void>();

export function primeMediaCache(assets: Lite[]) {
  cache = assets;
  for (const notify of subscribers) notify(assets);
}

function ensureLoaded(): Promise<Lite[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/admin/media")
      .then((res) => (res.ok ? res.json() : []))
      .then((assets: Lite[]) => {
        cache = assets;
        for (const notify of subscribers) notify(assets);
        return assets;
      })
      .catch(() => {
        cache = [];
        return [];
      });
  }
  return inflight;
}

export function useMediaResolver() {
  const [assets, setAssets] = useState<Lite[]>(cache ?? []);

  useEffect(() => {
    const sub = (next: Lite[]) => setAssets(next);
    subscribers.add(sub);
    void ensureLoaded().then(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  // Turn a stored field value into a displayable path: media refs resolve via
  // the cache; raw paths (and empty) pass through unchanged.
  const resolve = (value: string): string => {
    const id = parseMediaRef(value);
    if (id === null) return value;
    return assets.find((a) => a.id === id)?.filePath ?? "";
  };

  return { resolve };
}
