# WeStride Mobile

This app is a React Native app for the WeStride platform, built with [Expo](https://docs.expo.dev/) (SDK 58).

## Getting started

Install dependencies from the repo root:

```sh
bun install
```

Then start the Metro dev server from `apps/mobile`:

```sh
bun run start
```

Scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone, or press `a` to open an Android emulator (or `i` for the iOS simulator on macOS).

The home screen loads academy tracks from the WeStride API, so run it too (`bun run dev:api` from the repo root). In development the app calls port 3001 on the machine running Metro; production builds call `https://api.westride.org`. Set `EXPO_PUBLIC_API_URL` to override either (see `.env.example`). On a physical phone, your firewall must allow inbound connections to port 3001.

## Notes

- Add packages with `bunx expo install <package>` so versions stay compatible with the Expo SDK.
- This app uses React 19.3 (required by React Native 0.88), while `apps/web` uses React 19.2. Expo's monorepo resolution keeps a single copy in the mobile bundle, so `expo-doctor` will report the duplicate `react` install; that warning is expected.
- `ios/` and `android/` are generated on demand (Continuous Native Generation) and are gitignored. Configure native behavior in `app.json`.
