import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function main() {
    const targetUrl = 'http://localhost:3001/auth/verify-email?email=lalitbaghel0708@gmail.com';
    const outputDir = path.resolve(process.cwd(), 'screenshots');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'verify-email-otp.png');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));
    const port = 9333;

    console.log(`Starting Chrome headless on port ${port}...`);
    const chrome = spawn(chromePath, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${tempDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--window-size=1440,900',
        'about:blank'
    ], { stdio: 'ignore' });

    // Wait for Chrome to be ready
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
            const res = await fetch(`http://127.0.0.1:${port}/json/version`);
            if (res.ok) {
                const data = await res.json();
                console.log('Chrome CDP ready:', data.Browser);
                break;
            }
        } catch (e) {}
    }

    // Create a new target page
    const newTargetRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    const targetInfo = await newTargetRes.json();
    wsUrl = targetInfo.webSocketDebuggerUrl;
    console.log('Connecting to page WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    let id = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
        }
    };

    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    function sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            pending.set(cmdId, { resolve, reject });
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    console.log('Configuring viewport...');
    await sendCommand('Page.enable');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 2,
        mobile: false
    });

    console.log('Waiting 2.5 seconds for fonts, styles and animations to load...');
    await new Promise(r => setTimeout(r, 2500));

    console.log('Capturing screenshot...');
    const result = await sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
    });

    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Screenshot saved to: ${outputPath} (${buffer.length} bytes)`);

    ws.close();
    chrome.kill('SIGTERM');

    // Clean up temp dir after delay
    setTimeout(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
    }, 1000);
}

main().catch(err => {
    console.error('Error taking screenshot:', err);
    process.exit(1);
});
