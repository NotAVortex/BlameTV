# BlameTV Desktop

The BlameTV desktop app is an Electron wrapper around the BlameTV website.
It loads the live site, so everything (accounts, videos, comments, subscriptions)
syncs automatically with the website and the phone app.

## Run in development

```
cd electron
npm install
npm start
```

By default it opens https://blametv.vercel.app. To point it somewhere else:

```
BLAMETV_URL=https://your-domain.example npm start
```

## Build installers

```
cd electron
npm run dist-win    # Windows installer + portable exe
npm run dist-linux  # AppImage + deb
npm run dist-mac    # macOS dmg
```

Output lands in `electron/dist`.
