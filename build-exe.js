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

  // Step 1: Convert JPG to PNG using jimp 1.x
  console.log('Step 1: Converting cover image to PNG...');
  try {
    const { Jimp } = require('jimp');
    const image = await Jimp.read(coverJpg);
    image.resize({ w: 256, h: 256 });
    await image.write(iconPng);
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

  // Step 3: Build exe with @yao-pkg/pkg (pkg 的维护分支，支持现代 Node 版本)
  console.log('\nStep 3: Packaging with @yao-pkg/pkg...');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const exeName = '影子kwh.exe';
  const exePath = path.join(outDir, exeName);

  try {
    try {
      execSync(`npx @yao-pkg/pkg . --target node24-win-x64 --output "${exePath}"`, {
        cwd: projectDir,
        stdio: 'inherit',
        timeout: 300000
      });
    } catch (first) {
      // 受限环境下可能无法执行下载的 node 基线做字节码预编译，退回无字节码模式（功能一致，启动略慢）
      console.log('  bytecode build failed, retrying with --no-bytecode...');
      execSync(`npx @yao-pkg/pkg . --target node24-win-x64 --no-bytecode --output "${exePath}"`, {
        cwd: projectDir,
        stdio: 'inherit',
        timeout: 300000
      });
    }
    console.log('  EXE created:', exePath);
  } catch (e) {
    console.log('  pkg error:', e.message);
    process.exit(1);
  }

  // Step 4: Apply icon with resedit (纯 JS，无需外部 exe)
  console.log('\nStep 4: Applying custom icon...');
  if (fs.existsSync(iconIco) && fs.existsSync(exePath)) {
    try {
      const ResEdit = require('resedit');
      const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath));
      const res = ResEdit.NtExecutableResource.from(exe);
      const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconIco));
      const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
      const iconGroupId = groups.length ? groups[0].id : 1;
      ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        iconGroupId,
        1033,
        iconFile.icons.map((item) => item.data)
      );
      res.outputResource(exe);
      fs.writeFileSync(exePath, Buffer.from(exe.generate()));
      console.log('  Icon applied successfully!');
    } catch (e) {
      console.log('  resedit error:', e.message);
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
