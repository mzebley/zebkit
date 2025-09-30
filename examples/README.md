# Zebkit example gallery

The `examples/` directory is a self-contained bundle that lets you preview the
core web components, adjust design tokens on the fly, and exercise the runtime
APIs exposed by `<z-button>` and `<z-checkbox>`.

## Local preview from VS Code

1. Install the **Live Server** extension (Ritwick Dey) in VS Code.
2. Right-click `examples/index.html` in the explorer and choose **Open with Live
   Server**. The extension serves the folder over HTTP and reloads the browser
   when you edit HTML, CSS, or JS.
3. Prefer a manual server? Run `npx serve examples` or `npx http-server
   examples` from the repository root. Both commands watch the copied
   `zebkit.css`, `zebkit-vars.css`, and `zebkit.js` assets in this folder.
4. Keep the VS Code terminal open while you interact with the gallery—component
   warnings (for example missing labels) surface in the console.

## Publishing to Vercel

1. Commit the contents of `examples/` and push them to your Git provider.
2. In Vercel, choose **Add New Project → Import Git Repository** and select the
   Zebkit repo.
3. Set **Framework Preset** to **Other** and leave the build command blank. The
   existing `npm run build` script runs interactive prompts, so skipping a build
   lets Vercel deploy the already-generated static files.
4. Set **Output Directory** to `examples`. Because this folder now includes the
   gallery plus `zebkit.css`, `zebkit-vars.css`, and `zebkit.js`, Vercel can
   publish the site with no additional assets.
5. Enable preview deployments so every pull request receives a unique URL for QA
   and visual regression checks.
