import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const outputDir = path.resolve(process.cwd(), 'screenshots');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-luxury-'));
    const port = 9345;

    console.log(`Starting headless Chrome on port ${port}...`);
    const chrome = spawn(chromePath, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${tempDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--window-size=1600,1000',
        'about:blank'
    ], { stdio: 'ignore' });

    // Wait for CDP
    let cdpReady = false;
    for (let i = 0; i < 20; i++) {
        await wait(500);
        try {
            const res = await fetch(`http://127.0.0.1:${port}/json/version`);
            if (res.ok) {
                cdpReady = true;
                break;
            }
        } catch {}
    }

    if (!cdpReady) {
        console.error('Failed to connect to Chrome CDP');
        chrome.kill();
        process.exit(1);
    }

    async function capturePage(targetUrl, filename, scrollY = 0) {
        const newTargetRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
        const targetInfo = await newTargetRes.json();
        const wsUrl = targetInfo.webSocketDebuggerUrl;

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            let msgId = 1;
            const callbacks = new Map();

            function send(method, params = {}) {
                return new Promise((res, rej) => {
                    const id = msgId++;
                    callbacks.set(id, { resolve: res, reject: rej });
                    ws.send(JSON.stringify({ id, method, params }));
                });
            }

            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if (data.id && callbacks.has(data.id)) {
                    const { resolve, reject } = callbacks.get(data.id);
                    callbacks.delete(data.id);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };

            ws.onerror = (err) => reject(err);

            ws.onopen = async () => {
                try {
                    await send('Page.enable');
                    await send('Runtime.enable');
                    await send('DOM.enable');
                    await wait(3500);

                    if (scrollY > 0) {
                        await send('Runtime.evaluate', {
                            expression: `window.scrollTo({ top: ${scrollY}, behavior: 'instant' });`
                        });
                        await wait(600);
                    }

                    const screenshotRes = await send('Page.captureScreenshot', {
                        format: 'png',
                        quality: 100,
                        fromSurface: true
                    });

                    const savePath = path.join(outputDir, filename);
                    fs.writeFileSync(savePath, Buffer.from(screenshotRes.data, 'base64'));
                    console.log(`Saved screenshot: ${savePath}`);

                    await send('Page.close');
                    ws.close();
                    resolve();
                } catch (e) {
                    ws.close();
                    reject(e);
                }
            };
        });
    }

    try {
        console.log('Capturing Delhi-6 top view...');
        await capturePage('http://localhost:3001/homes/delhi-6', 'luxury-theme-delhi-6-top.png', 0);

        console.log('Capturing Delhi-6 scrolled view (sticky subnav, booking card, content)...');
        await capturePage('http://localhost:3001/homes/delhi-6', 'luxury-theme-delhi-6-scrolled.png', 520);

        console.log('Capturing homepage luxury beige texture...');
        await capturePage('http://localhost:3001/', 'luxury-theme-homepage.png', 0);

        console.log('All screenshots captured successfully!');
    } catch (err) {
        console.error('Error during capture:', err);
    } finally {
        chrome.kill();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

main().catch(console.error);
