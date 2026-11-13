# panopticOS

A Three.js poster preview of the Panoptics Eye Center logo in beveled chrome on an orange background. Both the outer mark and recessed center star use the original SVG paths. The poster has no text, so typography can be added in Photoshop.

## Run locally

Clone this repository, open its directory, and start a static server:

```sh
git clone https://github.com/tiagohierath/panopticOS.git
cd panopticOS
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000) in a browser with WebGL 2 support. The Three.js modules and lighting assets are included locally; no package installation or build step is needed.

## Use the preview

- Drag the logo to change its angle.
- Press **S** to download the current view as a 2480 × 3508 PNG.
- Reload the page to restore the saved angle.

The saved composition is also included as [panoptics-chrome-orange-a4.png](panoptics-chrome-orange-a4.png).

## Files

- `index.html`: poster layout and module imports.
- `poster.js`: SVG extrusion, bevels, chrome materials, studio reflections, rotation, and PNG export.
- `panoptics-eye-center.svg`: the original logo geometry.
- `assets/`: the studio HDR environment and source credits.
- `vendor/three/`: the required Three.js 0.181.2 modules and MIT license.

Third-party asset credits and licensing are listed in [assets/SOURCES.md](assets/SOURCES.md).

## Saved render

![Beveled chrome Panoptics Eye Center logo on orange](panoptics-chrome-orange-a4.png)
