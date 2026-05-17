/**
 * WGER Exercise API client — fetches ~1400 exercises from wger.de
 * Public API, no auth required. Free & open source.
 */

const WGER_API = "https://wger.de/api/v2";

export interface WgerExercise {
  id: number;
  name: string;
  equipment: number[];
  muscles: number[];
  muscles_secondary: number[];
  category: number;
  description: string;
  images: Array<{ image: string }>;
}

export interface WgerEquipment {
  id: number;
  name: string;
}

export interface WgerMuscle {
  id: number;
  name: string;
}

/**
 * Fetch all exercises from WGER (paginated, ~1400 total).
 * Takes ~5-10 seconds depending on connection.
 */
export async function fetchWgerExercises(limit = 100): Promise<WgerExercise[]> {
  const exercises: WgerExercise[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${WGER_API}/exercise?limit=${limit}&offset=${offset}&language=2`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) break;

      const data = await res.json();
      exercises.push(...(data.results ?? []));
      hasMore = !!data.next;
      offset += limit;

      // Rate limit: don't hammer WGER
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      break;
    }
  }

  return exercises;
}

export async function fetchWgerEquipment(): Promise<WgerEquipment[]> {
  try {
    const res = await fetch(`${WGER_API}/equipment?limit=100`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function fetchWgerMuscles(): Promise<WgerMuscle[]> {
  try {
    const res = await fetch(`${WGER_API}/muscle?limit=100`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
