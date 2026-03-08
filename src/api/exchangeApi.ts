// In-memory cache (Expo Go compatible — no native modules needed)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedRates: Rates | null = null;
let cacheTimestamp: number | null = null;

const PRIMARY_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

const FALLBACK_URL =
  'https://api.frankfurter.dev/latest?base=USD';

export type Rates = Record<string, number>;

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
    console.warn('Primary API failed, trying fallback...');
    const res = await fetch(FALLBACK_URL);
    if (!res.ok) throw new Error('Fallback API also failed');
    const data = await res.json();
    return normalizeFrankfurter(data);
  }
}

export async function getRates(): Promise<Rates> {
  // Return in-memory cache if still fresh
  if (cachedRates && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION_MS) {
      return cachedRates;
    }
  }

  const fresh = await fetchFresh();
  cachedRates = fresh;
  cacheTimestamp = Date.now();
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
