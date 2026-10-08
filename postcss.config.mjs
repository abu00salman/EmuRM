// Android System WebView / older Chromium builds (anything before ~111) silently drop
// Tailwind v4's `@layer` blocks, so the page renders completely unstyled. These plugins
// lower the CSS to something Chrome 79+ / Safari 13+ understands. Logical-property
// handling is done by our own direction-aware plugin below because preset-env's version
// assumes LTR and breaks the Arabic (RTL) layout.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      browsers: ["chrome >= 79", "ios_saf >= 13", "safari >= 13", "firefox >= 78"],
      stage: 2,
      autoprefixer: false,
      features: { "logical-properties-and-values": false },
    },
    "./postcss-logical.cjs": {},
  },
};
