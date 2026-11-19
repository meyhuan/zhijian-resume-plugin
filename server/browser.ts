import { accessSync, constants, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function findPdfBrowser(): string {
  const candidates = [process.env.CHROME_PATH];
  if (process.platform === 'darwin') {
    for (const directory of ['/Applications', join(homedir(), 'Applications')]) {
      candidates.push(join(directory, 'Google Chrome.app/Contents/MacOS/Google Chrome'));
      candidates.push(join(directory, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'));
    }
  } else if (process.platform === 'win32') {
    candidates.push(
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    );
    if (process.env.LOCALAPPDATA) {
      candidates.push(join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'));
      candidates.push(join(process.env.LOCALAPPDATA, 'Microsoft/Edge/Application/msedge.exe'));
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      accessSync(candidate, constants.X_OK);
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next browser when this path is missing or inaccessible.
    }
  }
  throw new Error('未找到 Chrome 或 Edge，请安装浏览器或将 CHROME_PATH 设置为浏览器可执行文件的绝对路径');
}
