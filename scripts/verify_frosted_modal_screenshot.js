import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isServerReady(url) {
    try {
        const res = await fetch(url);
        return res.status === 200 || res.status === 304;
    } catch {
        return false;
    }
}

async function main() {
    const targetUrl = 'http://localhost:3001/homes/delhi-6';
    const outputDir = path.resolve(process.cwd(), 'screenshots');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const screenshotPath = path.join(outputDir, 'delhi-6-frosted-modal-backdrop.png');

    // 1. Check if server is running, if not start it
    let serverProcess = null;
    console.log('Checking if server is running at', targetUrl, '...');
    const serverAlreadyRunning = await isServerReady(targetUrl);
    
    if (!serverAlreadyRunning) {
        console.log('Starting app server (node app.js)...');
        serverProcess = spawn('node', ['app.js'], {
            cwd: process.cwd(),
            stdio: 'pipe'
        });

        serverProcess.stdout.on('data', (d) => console.log('[App]', d.toString().trim()));
        serverProcess.stderr.on('data', (d) => console.error('[App Err]', d.toString().trim()));

        let ready = false;
        for (let i = 0; i < 30; i++) {
            await wait(1000);
            if (await isServerReady(targetUrl)) {
                ready = true;
                console.log('Server is online and responding to /homes/delhi-6!');
                break;
            }
        }
        if (!ready) {
            throw new Error('Server failed to start within 30 seconds');
        }
    } else {
        console.log('Server is already running.');
    }

    // 2. Launch Chrome Headless with Remote Debugging
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));
    const port = 9445;

    console.log(`Starting Chrome headless on port ${port}...`);
    const chrome = spawn(chromePath, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${tempDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1440,900',
        'about:blank'
    ], { stdio: 'ignore' });

    try {
        // Wait for Chrome CDP endpoint
        let wsUrl = null;
        for (let i = 0; i < 20; i++) {
            await wait(500);
            try {
                const res = await fetch(`http://127.0.0.1:${port}/json/version`);
                if (res.ok) {
                    const data = await res.json();
                    console.log('Chrome CDP ready:', data.Browser);
                    break;
                }
            } catch {}
        }

        // Navigate to target page
        console.log('1. Navigating to:', targetUrl);
        const newTargetRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
        const targetInfo = await newTargetRes.json();
        wsUrl = targetInfo.webSocketDebuggerUrl;
        console.log('Connected to target WebSocket:', wsUrl);

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

        async function evaluate(expression) {
            const res = await sendCommand('Runtime.evaluate', {
                expression,
                returnByValue: true,
                awaitPromise: true
            });
            if (res.exceptionDetails) {
                console.error('Eval error:', res.exceptionDetails);
            }
            return res.result?.value;
        }

        // Setup viewport
        console.log('Setting device metrics (1440x900 @2x)...');
        await sendCommand('Page.enable');
        await sendCommand('DOM.enable');
        await sendCommand('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 900,
            deviceScaleFactor: 2,
            mobile: false
        });

        // 2. Wait 2 seconds for page to load
        console.log('2. Waiting 2 seconds for page to load...');
        await wait(2000);

        // 3. Click the 'Show all 5 photos' button (.btn-show-all-photos) to open the photo modal
        console.log('3. Clicking .btn-show-all-photos button...');
        const clickResult = await evaluate(`(() => {
            const btn = document.querySelector('.btn-show-all-photos');
            if (btn) {
                btn.click();
                return 'Clicked .btn-show-all-photos successfully';
            }
            const fallback = document.querySelector('[onclick*="openPhotoModal"]');
            if (fallback) {
                fallback.click();
                return 'Clicked fallback openPhotoModal button';
            }
            if (typeof openPhotoModal === 'function') {
                openPhotoModal(0);
                return 'Invoked openPhotoModal(0)';
            }
            return 'Button not found';
        })()`);
        console.log('Click result:', clickResult);

        // 4. Wait 1.5 seconds for the frosted glass blur transparent modal and 3D DepthCarousel to render
        console.log('4. Waiting 1.5 seconds for frosted glass blur transparent modal & 3D DepthCarousel to render...');
        await wait(1500);

        // Verify modal styles and state in DOM
        const modalInfo = await evaluate(`(() => {
            const modal = document.getElementById('photo-gallery-modal');
            if (!modal) return { found: false };
            const style = window.getComputedStyle(modal);
            return {
                found: true,
                isOpen: modal.classList.contains('open'),
                display: style.display,
                background: style.backgroundColor,
                backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
                cardsCount: document.querySelectorAll('.depth-carousel__card').length
            };
        })()`);
        console.log('Modal render info:', JSON.stringify(modalInfo, null, 2));

        // 5. Capture a full-screen screenshot to verify that the previous webpage (villa, background content) is visible through the smooth frosted blur backdrop instead of pitch black
        console.log('5. Capturing full-screen screenshot...');
        const screenshotData = await sendCommand('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false
        });
        const buffer = Buffer.from(screenshotData.data, 'base64');
        fs.writeFileSync(screenshotPath, buffer);
        console.log(`Saved screenshot to: ${screenshotPath} (${buffer.length} bytes)`);

        ws.close();
    } finally {
        chrome.kill('SIGTERM');
        setTimeout(() => {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {}
        }, 1000);

        if (serverProcess) {
            console.log('Stopping server process...');
            serverProcess.kill('SIGTERM');
        }
    }

    console.log('\n--- EXECUTION COMPLETE ---');
    console.log('Screenshot path:', screenshotPath);
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
