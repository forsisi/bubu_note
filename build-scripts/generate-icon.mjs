import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const icoPath = resolve("build/icon.ico");
const icnsPath = resolve("build/icon.icns");
const pngPath = resolve("build/icon-source.png");
const iconFramesDir = resolve("build/icon-frames");
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ${args.join(" ")} failed`);
  }

  return result;
}

function runPowerShell(script) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  run("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    encoded,
  ]);
}

async function generateWindowsIcon() {
  await rm(iconFramesDir, { recursive: true, force: true });
  await mkdir(iconFramesDir, { recursive: true });

  runPowerShell(`
Add-Type -AssemblyName System.Drawing
$sourcePath = '${pngPath.replace(/'/g, "''")}'
$framesPath = '${iconFramesDir.replace(/'/g, "''")}'
$sizes = @(${icoSizes.join(", ")})

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Missing icon source: $sourcePath"
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
foreach ($size in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($source, 0, 0, $size, $size)
  $bitmap.Save(([System.IO.Path]::Combine($framesPath, "icon-$size.png")), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}
$source.Dispose()
`);

  const entries = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      png: await readFile(join(iconFramesDir, `icon-${size}.png`)),
    }))
  );

  let offset = 6 + entries.length * 16;
  const header = Buffer.alloc(offset);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  entries.forEach(({ size, png }, index) => {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
  });

  await writeFile(icoPath, Buffer.concat([header, ...entries.map(({ png }) => png)]));
  await rm(iconFramesDir, { recursive: true, force: true });
}

async function generateMacIcon() {
  const iconsetPath = resolve("build/icon.iconset");
  const oneXIconSizes = [16, 32, 128, 256, 512];

  await rm(iconsetPath, { recursive: true, force: true });
  await mkdir(iconsetPath, { recursive: true });

  for (const size of oneXIconSizes) {
    run("sips", ["-z", String(size), String(size), pngPath, "--out", join(iconsetPath, `icon_${size}x${size}.png`)]);
    run("sips", [
      "-z",
      String(size * 2),
      String(size * 2),
      pngPath,
      "--out",
      join(iconsetPath, `icon_${size}x${size}@2x.png`),
    ]);
  }

  run("iconutil", ["-c", "icns", iconsetPath, "-o", icnsPath]);
  await rm(iconsetPath, { recursive: true, force: true });
}

await mkdir(dirname(icoPath), { recursive: true });

if (process.platform === "win32") {
  await generateWindowsIcon();
} else if (process.platform === "darwin") {
  await generateMacIcon();
} else {
  console.log(`Skipping platform icon generation on ${process.platform}; using ${pngPath} as the source asset.`);
}
