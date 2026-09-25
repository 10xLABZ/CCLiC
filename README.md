# Capital Clash web app starter

This is the clean foundation for the game. The fixed game shell is separate from each screen and uses mock data only.

Open `index.html` in a browser, or serve this folder with any static web server.

## Structure

- `src/shell` — persistent HUD, chat bar, and navigation
- `src/screens` — Profile, Map, Trade, Shop, Alliance, and Settings screens
- `src/data` — mock player state; replace this layer with Supabase later
- `assets` — game artwork

## Next production steps

1. Put this repository on GitHub.
2. Replace mock data with Supabase authentication and database calls.
3. Package the web app with Capacitor for Android / Google Play.
