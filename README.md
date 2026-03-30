# RateFlip

A minimalist, open-source currency converter for Android built with **React Native** and **Expo**.  
Type in any currency slot and all others update instantly.

---

## Features

- **Live exchange rates** — fetched daily, no API key required
- **Instant conversion** — all slots update as you type
- **Custom in-app numpad** — no system keyboard; clean numeric input
- **Major fiat & crypto currencies** — dynamically fetched and cached locally
- **Automatic fallback** — switches to a backup API if the primary is unavailable
- **Duplicate slot indicator** — highlights slots sharing the same currency
- **Theming** — switch between Device, Light, and Dark modes
- **Zero UI library bloat** — no heavy third-party component libraries

---

## Tech Stack

| | |
| --- | --- |
| Framework | React Native + Expo (TypeScript) |
| Exchange Rate API | [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (primary) |
| Fallback API | [Frankfurter](https://www.frankfurter.dev/) |
| Build | EAS Build (local, Universal APK) |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Expo Go](https://expo.dev/go) on your Android device

### Run locally

```bash
git clone https://github.com/MithunWijayasiri/RateFlip.git
cd RateFlip
npm install
npx expo start
```

Scan the QR code with **Expo Go**. Your phone and PC must be on the same Wi-Fi network.

---

## Project Structure

```
src/
├── api/
│   └── exchangeApi.ts       # Rate fetching & in-memory cache with fallback
├── components/
│   ├── CurrencySlot.tsx     # Currency input row with custom numpad integration
│   └── NumPad.tsx           # Custom in-app numeric keypad
├── constants/
│   ├── currencies.ts        # Default fallback & popular shortcuts
│   └── iso_currencies.json  # Whitelist for fiat and major crypto codes
├── context/
│   └── ThemeContext.tsx     # Theme state and persistence
├── screens/
│   ├── ConverterScreen.tsx  # Main app screen
│   └── SettingsScreen.tsx   # App configurations (Theme, Defaults)
├── theme/
│   └── colors.ts            # Light & Dark color palettes
└── utils/
    └── format.ts            # Formatting utilities
App.tsx                      # Entry point
```

---

## Release

Releases are built and published via a **manual** GitHub Actions workflow (`release.yml`).  
It produces a signed Universal APK using EAS Build (local) and attaches it to a GitHub Release.

To trigger: go to **Actions → Release — Build & Publish APK → Run workflow** and provide the version tag, source branch, and optional release notes.

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

### Key Terms:
- **Attribution:** You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- **Non-Commercial:** You may not use the material for commercial purposes (e.g., you cannot release a paid version or a version with ads).
- **ShareAlike:** If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

See the [LICENSE](LICENSE) file for the full legal text.
