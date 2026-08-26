import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

function runAgy(prompt) {
  return new Promise((resolve) => {
    const AGY_BIN = '/Users/sh0rk/.local/bin/agy';
    const safePrompt = prompt.replace(/"/g, '\\"');
    const command = `${AGY_BIN} -p "Please call tool generate_image with prompt: ${safePrompt}" --dangerously-skip-permissions`;
    console.log('Running command:', command);

    const startTime = Date.now();
    const proc = exec(command, { timeout: 180000 });

    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', chunk => {
      stdoutData += chunk;
      console.log('[stdout]', chunk.toString());
    });

    proc.stderr.on('data', chunk => {
      stderrData += chunk;
      console.log('[stderr]', chunk.toString());
    });

    proc.on('close', (code) => {
      console.log('Process closed with code:', code, 'in', (Date.now() - startTime) / 1000, 's');
      
      // 1. Direct Regex match from stdout
      const match = stdoutData.match(/Generated image is saved at\s+([^\s]+\.(?:jpg|png|webp|jpeg))/i);
      if (match && fs.existsSync(match[1])) {
        console.log('✅ Matched image path from stdout:', match[1]);
        const buf = fs.readFileSync(match[1]);
        return resolve({ success: true, imagePath: match[1], base64: `data:image/jpeg;base64,${buf.toString('base64')}` });
      }

      // 2. Scan recent brain folder as backup
      const BRAIN_DIR = '/Users/sh0rk/.gemini/antigravity-cli/brain';
      const beforeTime = startTime - 5000;
      const convs = fs.readdirSync(BRAIN_DIR).map(name => {
        const fullPath = path.join(BRAIN_DIR, name);
        try {
          return { name, path: fullPath, stat: fs.statSync(fullPath) };
        } catch {
          return null;
        }
      }).filter(item => item !== null && item.stat.isDirectory() && item.stat.mtimeMs >= beforeTime)
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

      for (const conv of convs) {
        const files = fs.readdirSync(conv.path);
        for (const file of files) {
          if (file.endsWith('.jpg') || file.endsWith('.png')) {
            const filePath = path.join(conv.path, file);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs >= beforeTime) {
              console.log('✅ Found image by directory scan:', filePath);
              const buf = fs.readFileSync(filePath);
              return resolve({ success: true, imagePath: filePath, base64: `data:image/jpeg;base64,${buf.toString('base64')}` });
            }
          }
        }
      }

      console.log('❌ Failed to find image.');
      resolve({ success: false, stdout: stdoutData, stderr: stderrData });
    });
  });
}

runAgy('a cute 3d clay red apple on wooden table').then(res => console.log('Result:', res.success, res.imagePath));
