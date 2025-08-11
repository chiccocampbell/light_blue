import os
import streamlit as st

st.set_page_config(page_title="TwoNest — PWA Wrapper", page_icon="💚", layout="wide")

PWA_URL = os.environ.get("PWA_URL", "").strip()
if not PWA_URL:
    st.warning("Set the PWA_URL environment variable to your deployed GitHub Pages URL (e.g. https://<user>.github.io/<repo>/).")
    st.stop()

st.title("TwoNest Budget (PWA)")
st.write("This is a lightweight Streamlit wrapper that opens the full PWA. For the best experience and Add‑to‑Home‑Screen, open it in a new tab.")

col1, col2 = st.columns([1,3])
with col1:
    st.page_link(PWA_URL, label="Open PWA in new tab", icon="🌿")
with col2:
    st.caption("Tip: Add to Home Screen from the PWA page for the native-like experience.")

st.components.v1.iframe(PWA_URL, height=900, scrolling=True)