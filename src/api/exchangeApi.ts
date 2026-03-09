import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys
const KEY_RATES = 'rateflip_rates';
const KEY_LAST_DATE = 'rateflip_last_date';
const KEY_FETCH_COUNT = 'rateflip_fetch_count';
const KEY_LAST_FETCH_TIME = 'rateflip_last_fetch_time';

// Max automatic fetches allowed per calendar day
const MAX_DAILY_AUTO_FETCHES = 2;
// Minimum time between automatic fetches (6 hours)
const FETCH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const PRIMARY_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

const FALLBACK_URL =
  'https://api.frankfurter.dev/latest?base=USD';

export type Rates = Record<string, number>;

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function normalizeFawaz(data: any): Rates {
  const raw = data?.usd ?? {};
  const result: Rates = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key.toUpperCase()] = val as number;
  }
  return result;
}

function normalizeFrankfurter(data: any): Rates {
  const raw = data?.rates ?? {};
  const result: Rates = { USD: 1 };
  for (const [key, val] of Object.entries(raw)) {
    result[key.toUpperCase()] = val as number;
  }
  return result;
}

async function fetchFresh(): Promise<Rates> {
  try {
    const res = await fetch(PRIMARY_URL);
    if (!res.ok) throw new Error('Primary API failed');
    const data = await res.json();
    return normalizeFawaz(data);
  } catch {
    const res = await fetch(FALLBACK_URL);
    if (!res.ok) throw new Error('Fallback API also failed');
    const data = await res.json();
    return normalizeFrankfurter(data);
  }
}

async function loadPersistedRates(): Promise<Rates | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_RATES);
    return raw ? (JSON.parse(raw) as Rates) : null;
  } catch {
    return null;
  }
}

async function persistRates(rates: Rates): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_RATES, JSON.stringify(rates));
  } catch {
    // Non-critical: in-memory will still work for the session
  }
}

async function getTodayFetchCount(): Promise<number> {
  try {
    const savedDate = await AsyncStorage.getItem(KEY_LAST_DATE);
    const today = getTodayString();
    if (savedDate !== today) {
      // New day — reset count
      await AsyncStorage.setItem(KEY_LAST_DATE, today);
      await AsyncStorage.setItem(KEY_FETCH_COUNT, '0');
      return 0;
    }
    const count = await AsyncStorage.getItem(KEY_FETCH_COUNT);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

async function getLastFetchTime(): Promise<number> {
  try {
    const time = await AsyncStorage.getItem(KEY_LAST_FETCH_TIME);
    return time ? parseInt(time, 10) : 0;
  } catch {
    return 0;
  }
}

async function recordFetchEvent(): Promise<void> {
  try {
    const count = await getTodayFetchCount();
    await AsyncStorage.setItem(KEY_FETCH_COUNT, String(count + 1));
    await AsyncStorage.setItem(KEY_LAST_FETCH_TIME, String(Date.now()));
  } catch {
    // Non-critical
  }
}

export type RatesResult = { rates: Rates; fromCache: boolean };

// Normal app-open fetch — respects the 2-per-day limit and cooldown
export async function getRates(): Promise<RatesResult> {
  const count = await getTodayFetchCount();
  const lastFetchTime = await getLastFetchTime();
  const cached = await loadPersistedRates();

  const isCooldownActive = (Date.now() - lastFetchTime) < FETCH_COOLDOWN_MS;

  if (cached && (count >= MAX_DAILY_AUTO_FETCHES || isCooldownActive)) {
    // Quota used up or still cooling down, serve cached rates
    return { rates: cached, fromCache: true };
  }

  const fresh = await fetchFresh();
  await persistRates(fresh);
  await recordFetchEvent();
  return { rates: fresh, fromCache: false };
}

// Manual refresh — always fetches and resets the daily count to 1
export async function forceRefreshRates(): Promise<Rates> {
  const fresh = await fetchFresh();
  await persistRates(fresh);
  // Reset count to 1 so the next auto-fetch is still possible today
  const today = getTodayString();
  await AsyncStorage.setItem(KEY_LAST_DATE, today);
  await AsyncStorage.setItem(KEY_FETCH_COUNT, '1');
  await AsyncStorage.setItem(KEY_LAST_FETCH_TIME, String(Date.now()));
  return fresh;
}

export function convert(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Rates
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? 1;
  // Convert via USD as base
  const inUSD = amount / fromRate;
  return inUSD * toRate;
}
