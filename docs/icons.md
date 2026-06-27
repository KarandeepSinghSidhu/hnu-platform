# Favicon & PWA icon set

The launch icon set (B32) is **committed as binaries** under `public/`, so
production / CI / `next build` never need an image toolchain:

| File | Size | Used by |
|---|---|---|
| `public/favicon.ico` | 16/32/48 (PNG-in-ICO) | legacy browser tab (`icons.shortcut`) |
| `public/apple-icon.png` | 180×180 | iOS home screen (`icons.apple`) |
| `public/icon-192.png` | 192×192 | web manifest (PWA) |
| `public/icon-512.png` | 512×512 | web manifest (PWA) + Organization JSON-LD logo |
| `public/icon-512-maskable.png` | 512×512 | web manifest (PWA, `purpose: maskable`) |

The browser-tab favicon proper is the **admin-overridable** one
(`SiteSettings.faviconPath`, default the HNU SVG) emitted via `icons.icon` in
`src/app/layout.tsx`; the files above complement it. The manifest is
`src/app/manifest.ts`; `theme-color` is the `viewport` export in the layout.

## Regenerating

Each icon is the HNU wordmark (`public/images/logos/hnu-logo.svg`, a wide
white-on-dark mark) centred on a brand-navy (`#0c0c48`) square tile. To
regenerate (e.g. after a logo change), save the script below and run it with
Node — it needs [`sharp`](https://sharp.pixelplumbing.com/) (present via the
Next toolchain; install with `npm i -D sharp` if absent):

```bash
node generate-icons.mjs
```

```js
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SVG = "public/images/logos/hnu-logo.svg";
const OUT = "public";
const NAVY = { r: 12, g: 12, b: 72, alpha: 1 }; // #0c0c48

const master = await sharp(SVG, { density: 600 }).resize({ width: 1600 }).png().toBuffer();

async function squareIcon(size, padRatio) {
  const logoWidth = Math.round(size * (1 - padRatio * 2));
  const logo = await sharp(master).resize({ width: logoWidth }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

// Pack PNG payloads into a PNG-in-ICO container.
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  const payloads = [];
  let offset = 6 + images.length * 16;
  for (const { size, buffer } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    payloads.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...payloads]);
}

writeFileSync(`${OUT}/apple-icon.png`, await squareIcon(180, 0.16));
writeFileSync(`${OUT}/icon-192.png`, await squareIcon(192, 0.16));
writeFileSync(`${OUT}/icon-512.png`, await squareIcon(512, 0.16));
writeFileSync(`${OUT}/icon-512-maskable.png`, await squareIcon(512, 0.24)); // extra safe-zone padding
const ico = [];
for (const s of [16, 32, 48]) ico.push({ size: s, buffer: await squareIcon(s, 0.12) });
writeFileSync(`${OUT}/favicon.ico`, packIco(ico));
```
