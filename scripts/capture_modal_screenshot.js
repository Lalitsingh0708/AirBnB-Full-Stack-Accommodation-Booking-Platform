import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function main() {
    const targetUrl = process.argv[2] || 'http://localhost:3001/homes/delhi-6';
    const outputFilename = process.argv[3] || 'delhi-6-ultra-transparent.png';
    const outputDir = path.resolve(process.cwd(), 'screenshots');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, outputFilename);

    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    ];

    const chromePath = chromePaths.find(p => fs.existsSync(p));
    if (!chromePath) {
        console.error('Google Chrome not found.');
        process.exit(1);
    }

    const userDataDir = path.join(os.tmpdir(), `staynest_chrome_${Date.now()}`);
    const port = 9333;

    const chromeProcess = spawn(chromePath, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--window-size=1920,1080',
        targetUrl
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 1500));

    try {
        const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
        const versionData = await versionRes.json();
        console.log('Chrome CDP ready:', versionData['Browser']);

        const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
        const pages = await listRes.json();
        const page = pages.find(p => p.type === 'page');

        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        let id = 1;
        const send = (method, params = {}) => new Promise((resolve) => {
            const reqId = id++;
            const handler = (evt) => {
                const msg = JSON.parse(evt.data);
                if (msg.id === reqId) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: reqId, method, params }));
        });

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', {
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            mobile: false
        });

        console.log('Waiting for page and clicking Show all photos...');
        await new Promise(r => setTimeout(r, 2000));

        // Click show all photos
        await send('Runtime.evaluate', {
            expression: `
                const btn = document.querySelector('.btn-show-all-photos');
                if (btn) btn.click();
            `
        });

        await new Promise(r => setTimeout(r, 1500));

        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
        console.log(`Screenshot saved to: ${outputPath}`);

        ws.close();
    } catch (err) {
        console.error('Error during capture:', err);
    } finally {
        chromeProcess.kill();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (_) {}
    }
}

main();

