# TwoNest — Dual Deploy (GitHub Pages + Streamlit)

This repo contains:
- `web/` — React + Vite PWA that can be installed to your home screen (works offline via service worker).
- `streamlit_app.py` — Streamlit wrapper that embeds/opens the PWA.
- GitHub Actions workflow to auto-deploy `web/` to **GitHub Pages**.

## Quick start

### 1) GitHub Pages (PWA)
```bash
cd web
npm i
npm run dev   # local
npm run build
npm run preview
```
Push to GitHub. Enable **Pages** → **GitHub Actions**. The included workflow publishes the `web` build automatically.

### 2) Streamlit Cloud
- App entry: `streamlit_app.py`
- Set env var **PWA_URL** to your GitHub Pages URL, e.g. `https://<user>.github.io/<repo>/`

### Add to Home Screen
Install prompt appears on Chrome/Android automatically. On iOS, open the PWA URL in Safari → Share → Add to Home Screen.