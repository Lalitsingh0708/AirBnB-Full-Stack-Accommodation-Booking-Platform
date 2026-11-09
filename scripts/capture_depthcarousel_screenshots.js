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

    const screenshot1Path = path.join(outputDir, 'depth-carousel-view-1.png');
    const screenshot2Path = path.join(outputDir, 'depth-carousel-view-2.png');

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
    const port = 9335;

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

    // Create target page
    console.log('Navigating to:', targetUrl);
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

    // Step 2: Wait 2 seconds for images and styles to load
    console.log('Step 2: Waiting 2 seconds for images and styles to load...');
    await wait(2000);

    // Step 3: Click the 'Show all 5 photos' button (or any gallery tile) to trigger the openPhotoModal modal
    console.log('Step 3: Triggering openPhotoModal...');
    const modalTriggered = await evaluate(`(() => {
        const btn = document.querySelector('.btn-show-all-photos') ||
                    document.querySelector('.gallery-tile-main') ||
                    document.querySelector('[onclick*="openPhotoModal"]');
        if (btn) {
            btn.click();
            return 'clicked: ' + (btn.className || btn.tagName);
        } else if (typeof openPhotoModal === 'function') {
            openPhotoModal(0);
            return 'called openPhotoModal(0)';
        }
        return 'not found';
    })()`);
    console.log('Modal trigger result:', modalTriggered);

    // Step 4: Wait 1.5 seconds for the ReactBits DepthCarousel 3D carousel animation to open and stabilize
    console.log('Step 4: Waiting 1.5 seconds for DepthCarousel 3D animation to stabilize...');
    await wait(1500);

    // Check modal state
    const modalState = await evaluate(`(() => {
        const modal = document.getElementById('photo-gallery-modal');
        const cards = document.querySelectorAll('.depth-carousel__card');
        return {
            modalOpen: modal ? modal.classList.contains('open') : false,
            cardCount: cards.length,
            title: document.title
        };
    })()`);
    console.log('Modal state:', JSON.stringify(modalState));

    // Step 5: Capture a full-page high-res screenshot of the DepthCarousel 3D view
    console.log('Step 5: Capturing screenshot 1 (DepthCarousel 3D view)...');
    const screenshot1Data = await sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
    });
    const buffer1 = Buffer.from(screenshot1Data.data, 'base64');
    fs.writeFileSync(screenshot1Path, buffer1);
    console.log(`Saved screenshot 1 to: ${screenshot1Path} (${buffer1.length} bytes)`);

    // Step 6: Click the next arrow button (.depth-carousel__arrow--next) to advance the card in 3D
    console.log('Step 6: Clicking next arrow button (.depth-carousel__arrow--next)...');
    const nextClicked = await evaluate(`(() => {
        const nextBtn = document.querySelector('.depth-carousel__arrow--next') || document.getElementById('dc-next-btn');
        if (nextBtn) {
            nextBtn.click();
            return 'clicked next';
        }
        if (window.globalDepthCarousel) {
            window.globalDepthCarousel.next();
            return 'called globalDepthCarousel.next()';
        }
        return 'next button not found';
    })()`);
    console.log('Next arrow click result:', nextClicked);

    // Step 7: Wait 1 second and take another screenshot
    console.log('Step 7: Waiting 1 second and capturing screenshot 2...');
    await wait(1000);

    const screenshot2Data = await sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
    });
    const buffer2 = Buffer.from(screenshot2Data.data, 'base64');
    fs.writeFileSync(screenshot2Path, buffer2);
    console.log(`Saved screenshot 2 to: ${screenshot2Path} (${buffer2.length} bytes)`);

    // Clean up Chrome
    ws.close();
    chrome.kill('SIGTERM');

    setTimeout(() => {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
    }, 1000);

    // Leave the server running if started, or clean up if needed
    console.log('\n--- SUCCESS ---');
    console.log('Screenshot 1:', screenshot1Path);
    console.log('Screenshot 2:', screenshot2Path);
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
