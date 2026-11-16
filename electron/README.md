# BlameTV Desktop

The BlameTV desktop app is an Electron wrapper around the BlameTV website.
It loads the live site, so everything (accounts, videos, comments, subscriptions)
syncs automatically with the website and the phone app.

## Download the ready-made .exe (no building needed)

GitHub builds the Windows app for you, for free:

1. Open https://github.com/NotAVortex/BlameTV/actions
2. Click **Build desktop app** in the workflow list on the left.
3. Click **Run workflow**, then **Run workflow** again to start a build.
4. Wait about 5 minutes and click the finished run.
5. Scroll to the **Artifacts** section and download **BlameTV-Windows**.
6. Unzip it and run the installer .exe (a portable .exe is included too).

You need to be logged in to GitHub to download artifacts.

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
