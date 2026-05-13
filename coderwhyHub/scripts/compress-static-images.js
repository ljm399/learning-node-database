const fs = require("fs");
const path = require("path");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch (err) {
    console.error(
      "Missing dependency: sharp. Install it with: npm i sharp (in coderwhyHub)."
    );
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, "..");
  const inputDir = path.resolve(projectRoot, "static");
  const outputDir = path.resolve(projectRoot, "static-webp");

  if (!fs.existsSync(inputDir)) {
    console.error(`Input dir not found: ${inputDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const entries = fs.readdirSync(inputDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /\.(jpe?g|png)$/i.test(name));

  if (!files.length) {
    console.log("No jpg/png images found in static/.");
    return;
  }

  const quality = Number(process.env.QUALITY || 75);
  const width = Number(process.env.WIDTH || 1920);

  for (const file of files) {
    const inPath = path.join(inputDir, file);
    const baseName = file.replace(/\.(jpe?g|png)$/i, "");
    const outPath = path.join(outputDir, `${baseName}.webp`);

    const inputStat = fs.statSync(inPath);

    await sharp(inPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(outPath);

    const outputStat = fs.statSync(outPath);

    console.log(
      `${file} -> ${path.relative(projectRoot, outPath)} | ${Math.round(
        inputStat.size / 1024
      )}KB -> ${Math.round(outputStat.size / 1024)}KB`
    );
  }

  console.log("Done.");
  console.log(`Output dir: ${outputDir}`);
  console.log(
    "If you want different sizes/quality, run with env vars: WIDTH=1440 QUALITY=70 node scripts/compress-static-images.js"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
