import AsyncStorage from "@react-native-async-storage/async-storage";

// Products the customer opened lately, newest first. Kept on this phone only.
const KEY = "admmis-recent-v1";
const MAX = 20;

export async function getRecentIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function addRecent(id: string): Promise<void> {
  try {
    const cur = await getRecentIds();
    await AsyncStorage.setItem(KEY, JSON.stringify([id, ...cur.filter((x) => x !== id)].slice(0, MAX)));
  } catch {
    /* not important */
  }
}

export async function clearRecent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
