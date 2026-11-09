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

    const topScreenshotPath = path.join(outputDir, 'delhi-6-header-top-categories.png');
    const scrolledScreenshotPath = path.join(outputDir, 'delhi-6-header-scrolled-compact-pill.png');

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

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));
    const port = 9448;

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

        console.log('Configuring viewport (1440x900 @2x)...');
        await sendCommand('Page.enable');
        await sendCommand('DOM.enable');
        await sendCommand('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 900,
            deviceScaleFactor: 2,
            mobile: false
        });

        // 2. Wait 2 seconds for page load
        console.log('2. Waiting 2 seconds for page load...');
        await wait(2000);

        // Ensure at scrollY = 0
        await evaluate(`window.scrollTo(0, 0);`);
        await wait(500);

        // Inspect state at top
        const stateAtTop = await evaluate(`(() => {
            const header = document.getElementById('staynest-header');
            const modesStrip = document.getElementById('header-modes-strip');
            const compactPill = document.getElementById('compact-search-trigger');
            const bigSearchRow = document.getElementById('header-search-bar-row');
            
            function getInfo(el) {
                if (!el) return null;
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return {
                    display: style.display,
                    opacity: style.opacity,
                    visibility: style.visibility,
                    transform: style.transform,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top),
                    left: Math.round(rect.left)
                };
            }

            return {
                scrollY: window.pageYOffset || document.documentElement.scrollTop,
                headerClass: header ? header.className : null,
                modesStrip: getInfo(modesStrip),
                compactPill: getInfo(compactPill),
                bigSearchRow: getInfo(bigSearchRow)
            };
        })()`);
        console.log('--- STATE AT TOP (scrollY = 0) ---');
        console.log(JSON.stringify(stateAtTop, null, 2));

        // 3. Capture a full-screen screenshot at the top of the page (scrollY = 0)
        console.log('3. Capturing full-screen screenshot at top...');
        const topScreenshotData = await sendCommand('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false
        });
        const topBuffer = Buffer.from(topScreenshotData.data, 'base64');
        fs.writeFileSync(topScreenshotPath, topBuffer);
        console.log(`Saved top screenshot to: ${topScreenshotPath} (${topBuffer.length} bytes)`);

        // 4. Scroll down 300px on the page
        console.log('4. Scrolling down 300px on the page...');
        await evaluate(`(() => {
            window.scrollTo({ top: 300, behavior: 'smooth' });
            window.dispatchEvent(new Event('scroll'));
        })()`);

        // 5. Wait 1 second and capture another screenshot
        console.log('5. Waiting 1 second for smooth transition...');
        await wait(1000);

        // Also trigger scroll check in case smooth scroll finished
        await evaluate(`(() => {
            window.dispatchEvent(new Event('scroll'));
        })()`);
        await wait(200);

        const stateScrolled = await evaluate(`(() => {
            const header = document.getElementById('staynest-header');
            const modesStrip = document.getElementById('header-modes-strip');
            const compactPill = document.getElementById('compact-search-trigger');
            const bigSearchRow = document.getElementById('header-search-bar-row');
            
            function getInfo(el) {
                if (!el) return null;
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return {
                    display: style.display,
                    opacity: style.opacity,
                    visibility: style.visibility,
                    transform: style.transform,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top),
                    left: Math.round(rect.left)
                };
            }

            return {
                scrollY: window.pageYOffset || document.documentElement.scrollTop,
                headerClass: header ? header.className : null,
                modesStrip: getInfo(modesStrip),
                compactPill: getInfo(compactPill),
                bigSearchRow: getInfo(bigSearchRow)
            };
        })()`);
        console.log('--- STATE SCROLLED (scrollY = 300) ---');
        console.log(JSON.stringify(stateScrolled, null, 2));

        console.log('Capturing scrolled full-screen screenshot...');
        const scrolledScreenshotData = await sendCommand('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false
        });
        const scrolledBuffer = Buffer.from(scrolledScreenshotData.data, 'base64');
        fs.writeFileSync(scrolledScreenshotPath, scrolledBuffer);
        console.log(`Saved scrolled screenshot to: ${scrolledScreenshotPath} (${scrolledBuffer.length} bytes)`);

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
    console.log('Top screenshot path:', topScreenshotPath);
    console.log('Scrolled screenshot path:', scrolledScreenshotPath);
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
