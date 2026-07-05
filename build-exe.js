const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = __dirname;
const assetsDir = path.join(projectDir, 'assets');
const coverJpg = path.join(assetsDir, 'cover.jpg');
const iconPng = path.join(assetsDir, 'icon.png');
const iconIco = path.join(assetsDir, 'icon.ico');
const outDir = path.join(projectDir, 'dist');

async function main() {
  console.log('=== Building 影子kwh Desktop App ===\n');

  // Step 1: Convert JPG to PNG using jimp 0.22
  console.log('Step 1: Converting cover image to PNG...');
  try {
    const Jimp = require('jimp');
    const image = await Jimp.read(coverJpg);
    await image.resize(256, 256).writeAsync(iconPng);
    console.log('  PNG created:', iconPng);
  } catch (e) {
    console.log('  jimp error:', e.message);
    process.exit(1);
  }

  // Step 2: Convert PNG to ICO
  console.log('Step 2: Creating .ico file...');
  try {
    const { default: toIco } = require('png-to-ico');
    const buf = await toIco(iconPng);
    fs.writeFileSync(iconIco, buf);
    console.log('  ICO created:', iconIco, `(${buf.length} bytes)`);
  } catch (e) {
    console.log('  png-to-ico error:', e.message);
    process.exit(1);
  }

  // Step 3: Build exe with pkg
  console.log('\nStep 3: Packaging with pkg...');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const exeName = '影子kwh.exe';
  const exePath = path.join(outDir, exeName);

  try {
    execSync(`npx pkg . --target node18-win-x64 --output "${exePath}"`, {
      cwd: projectDir,
      stdio: 'inherit',
      timeout: 300000
    });
    console.log('  EXE created:', exePath);
  } catch (e) {
    console.log('  pkg error:', e.message);
    process.exit(1);
  }

  // Step 4: Apply icon with rcedit
  console.log('\nStep 4: Applying custom icon...');
  if (fs.existsSync(iconIco) && fs.existsSync(exePath)) {
    try {
      const rcedit = require('rcedit');
      await rcedit(exePath, { icon: iconIco });
      console.log('  Icon applied successfully!');
    } catch (e) {
      console.log('  rcedit error:', e.message);
    }
  } else {
    console.log('  Skipping icon (files missing)');
  }

  // Step 5: Copy to desktop
  console.log('\nStep 5: Copying to desktop...');
  try {
    const desktop = require('os').homedir() + '\\Desktop';
    const desktopExe = path.join(desktop, exeName);
    fs.copyFileSync(exePath, desktopExe);
    console.log('  Copied to:', desktopExe);
  } catch (e) {
    console.log('  Desktop copy failed:', e.message);
  }

  console.log('\n=== Build Complete ===');
  console.log('EXE:', exePath);
  console.log('Icon:', iconIco);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
