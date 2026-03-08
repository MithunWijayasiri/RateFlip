# RateFlip 💱

A minimalist, open-source currency converter for Android built with **React Native** and **Expo**.  
Type in any currency slot and all others update instantly — no buttons, no fuss.

---

## Features

- 🔄 **Live exchange rates** — fetched daily, no API key required
- ⚡ **Instant conversion** — all slots update as you type
- 🌍 **16 popular currencies** — USD, EUR, GBP, CNY, LKR, JPY, AUD, CAD, INR, SGD, AED, CHF, HKD, MYR, THB, KRW
- 🔁 **Automatic fallback** — switches to a backup API if the primary is unavailable
- 🌙 **Dark theme** — clean, minimal UI
- 📦 **Zero heavy dependencies** — no UI library bloat

---

## Tech Stack

|                   |                                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Framework         | React Native + Expo (TypeScript)                                                  |
| Exchange Rate API | [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (primary) |
| Fallback API      | [Frankfurter](https://www.frankfurter.dev/)                                       |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Expo Go](https://expo.dev/go) app on your Android device

### Run locally

```bash
git clone https://github.com/MithunWijayasiri/RateFlip.git
cd RateFlip
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.  
Make sure your phone and PC are on the **same Wi-Fi network**.

---

## Project Structure

```
src/
├── api/
│   └── exchangeApi.ts      # Rate fetching & in-memory cache
├── components/
│   └── CurrencySlot.tsx    # Reusable currency input row
├── constants/
│   └── currencies.ts       # Supported currency list
└── screens/
    └── ConverterScreen.tsx # Main screen
App.tsx                     # Entry point
```

---

## License

License will be updated soon.
