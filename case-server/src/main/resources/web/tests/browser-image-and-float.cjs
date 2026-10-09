const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../..');
const deps = path.join(root, '项目依赖/AgileTC-Web/node_modules');
const puppeteer = require(path.join(deps, 'puppeteer-core'));
const editor = path.resolve(__dirname, '../src/components/react-mindmap-editor');
const output = path.join(root, '运行日志/脑图性能/editor-build/editor.js');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#3370ff"/></svg>';

async function main() {
  let uploadCount = 0;
  const server = http.createServer((request, response) => {
    if (request.url === '/editor.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(fs.readFileSync(output));
    } else if (request.url === '/sample.svg' || /^\/upload-\d+\.svg$/.test(request.url)) {
      response.setHeader('Content-Type', 'image/svg+xml');
      response.end(svg);
    } else if (request.url === '/api/file/uploadAttachment') {
      uploadCount += 1;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ success: 1, data: [{ url: `http://127.0.0.1:${server.address().port}/upload-${uploadCount}.svg` }] }));
    } else {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end('<!doctype html><meta charset="utf-8"><style>body{margin:0}#map{height:900px}</style><div id="map"></div><script src="/editor.js"></script>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const browserData = path.join(root, '运行日志/脑图性能', `chrome-image-${process.pid}`);
    fs.mkdirSync(path.dirname(browserData), { recursive: true });
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      userDataDir: browserData,
      defaultViewport: { width: 1280, height: 900 },
      args: ['--disable-extensions', '--no-first-run'],
    });
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('页面异常：', error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.evaluate(async () => {
      const data = { template: 'right', root: { data: { text: '根节点' }, children: [{ data: { text: '待插图用例' }, children: [] }] } };
      const instance = await window.mountTestEditor(data, true);
      window.testMinder = instance.minder;
    });
    await page.waitForFunction(() => window.testMinder && window.testMinder.getRoot().children.length === 1, { timeout: 15000 });
    await page.evaluate(() => window.testMinder.select(window.testMinder.getRoot().children[0], true));
    const gap = await page.evaluate(() => {
      const core = document.querySelector('.kityminder-core-container').getBoundingClientRect();
      const panel = document.querySelector('.execution-filter-panel').getBoundingClientRect();
      return Math.round(panel.top - core.top);
    });
    assert.strictEqual(gap, 16, `筛选悬浮框距画布顶部 ${gap}px`);

    await page.click('button[aria-label="插入图片"]');
    await page.waitForSelector('.testcasemanage-modal [aria-label="上传图片"]');
    assert.strictEqual(await page.$('.testcasemanage-modal input[placeholder^="必填"]'), null);
    const input = await page.$('.testcasemanage-modal input[type="file"]');
    await input.uploadFile(path.join(root, 'case-server/src/main/resources/web/dist/favicon.svg'));
    await page.waitForFunction(url => document.querySelector('.testcasemanage-modal [aria-label="图片预览"]')?.src === url, {}, `${origin}/upload-1.svg`);
    await page.waitForSelector('.testcasemanage-modal [aria-label="图片预览"]');
    await page.waitForSelector('.testcasemanage-modal [aria-label="删除已选图片"]:not([disabled])');
    await page.click('.testcasemanage-modal [aria-label="删除已选图片"]');
    await page.waitForSelector('.testcasemanage-modal [aria-label="图片预览"]', { hidden: true });
    const retryInput = await page.$('.testcasemanage-modal input[type="file"]');
    await retryInput.uploadFile(path.join(root, 'case-server/src/main/resources/web/dist/favicon.svg'));
    await page.waitForSelector('.testcasemanage-modal [aria-label="图片预览"]');
    await page.waitForSelector('.testcasemanage-modal .ant-modal-footer .ant-btn-primary:not([disabled])');
    await page.waitForTimeout(400);
    await page.click('.testcasemanage-modal .ant-modal-footer .ant-btn-primary');
    await page.waitForFunction(url => window.testMinder.getRoot().children[0].getData('image') === url, {}, `${origin}/upload-2.svg`);
    await page.waitForSelector('.testcasemanage-modal', { hidden: true });

    await page.click('button[aria-label="插入图片"]');
    await page.waitForSelector('.testcasemanage-modal [aria-label="粘贴图片"]');
    await page.evaluate(source => {
      const file = new File([source], 'pasted.svg', { type: 'image/svg+xml' });
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      document.querySelector('[aria-label="粘贴图片"]').dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
    }, svg);
    await page.waitForFunction(url => document.querySelector('.testcasemanage-modal [aria-label="图片预览"]')?.src === url, {}, `${origin}/upload-3.svg`);
    await page.waitForSelector('.testcasemanage-modal [aria-label="图片预览"]');
    await page.waitForSelector('.testcasemanage-modal [aria-label="删除已选图片"]:not([disabled])');
    await page.click('.testcasemanage-modal [aria-label="删除已选图片"]');
    await page.waitForSelector('.testcasemanage-modal [aria-label="图片预览"]', { hidden: true });
    await page.evaluate(source => {
      const file = new File([source], 'pasted-again.svg', { type: 'image/svg+xml' });
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      document.querySelector('[aria-label="粘贴图片"]').dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
    }, svg);
    await page.waitForFunction(url => document.querySelector('.testcasemanage-modal [aria-label="图片预览"]')?.src === url, {}, `${origin}/upload-4.svg`);
    await page.waitForSelector('.testcasemanage-modal [aria-label="图片预览"]');
    await page.waitForSelector('.testcasemanage-modal .ant-modal-footer .ant-btn-primary:not([disabled])');
    await page.waitForTimeout(400);
    await page.click('.testcasemanage-modal .ant-modal-footer .ant-btn-primary');
    await page.waitForFunction(url => window.testMinder.getRoot().children[0].getData('image') === url, {}, `${origin}/upload-4.svg`);
    assert.strictEqual(uploadCount, 4);
    console.log(JSON.stringify({ floatingGapPx: gap, localUpload: true, clipboardPaste: true, deleteAndRetry: true }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
