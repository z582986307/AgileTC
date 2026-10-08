const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const root = path.resolve(__dirname, '../../../../../..');
const deps = path.join(root, '项目依赖/AgileTC-Web/node_modules');
const puppeteer = require(path.join(deps, 'puppeteer-core'));
const core = path.resolve(__dirname, '../src/components/react-mindmap-editor/assets/kityminder-core/kityminder.core.js');
const output = path.join(root, '运行日志/脑图性能');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    if (request.url === '/kity.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(fs.readFileSync(path.join(deps, 'kity/dist/kity.js')));
    } else if (request.url === '/core.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(fs.readFileSync(core));
    } else if (request.url === '/editor.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(fs.readFileSync(path.join(output, 'editor-build/editor.js')));
    } else if (request.url === '/linked-target') {
      response.end('linked target');
    } else if (request.url === '/editor') {
      response.end('<!doctype html><div id="map"></div><script src="/editor.js"></script>');
    } else {
      response.end('<!doctype html><div id="map" style="width:1000px;height:600px"></div><script src="/kity.js"></script><script src="/core.js"></script>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      userDataDir: path.join(output, `chrome-link-${process.pid}`),
      args: ['--disable-extensions', '--no-first-run'],
    });
    const page = await browser.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${origin}/`);
    const result = await page.evaluate(target => {
      const minder = new window.kityminder.Minder({ renderTo: '#map' });
      minder.importJson({ template: 'right', root: { data: { text: '用例' }, children: [
        { data: { text: '链接节点', hyperlink: `  ${target}  ` }, children: [] },
        { data: { text: '旧链接', hyperlink: 'www.example.com/path' }, children: [] },
        { data: { text: '不安全链接', hyperlink: 'javascript:alert(1)' }, children: [] },
      ] } });
      const link = minder.getRoot().children[0].getRenderer('hyperlinkrender').getRenderShape().node.querySelector('a');
      const oldLink = minder.getRoot().children[1].getRenderer('hyperlinkrender').getRenderShape().node.querySelector('a');
      const unsafeLink = minder.getRoot().children[2].getRenderer('hyperlinkrender').getRenderShape().node.querySelector('a');
      const href = node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      const result = { href: href(link), target: link.getAttribute('target'), oldHref: href(oldLink), unsafeHref: href(unsafeLink) };
      minder.importJson({ template: 'right', root: { data: { text: '用例' }, children: [
        { data: { text: '链接节点', hyperlink: target }, children: [] },
      ] } });
      minder.setOption('viewAnimationDuration', 0);
      minder.execCommand('camera', minder.getRoot().children[0], 0);
      return result;
    }, `${origin}/linked-target`);
    assert.strictEqual(result.href, `${origin}/linked-target`, '链接应使用插入的地址，而不是当前页面的 #');
    assert.strictEqual(result.target, '_blank', '点击链接应新开页面');
    assert.strictEqual(result.oldHref, 'https://www.example.com/path', '已保存的无协议链接应补全协议');
    assert.strictEqual(result.unsafeHref, null, '不安全协议不应打开当前页面或外部页面');
    await page.waitForTimeout(350);
    const linkPoint = await page.evaluate(target => {
      const node = [...window.document.querySelectorAll('svg a')].find(item =>
        item.getAttributeNS('http://www.w3.org/1999/xlink', 'href') === target);
      const rect = node.getBoundingClientRect();
      for (let y = 2; y < rect.height; y += 2) {
        for (let x = 2; x < rect.width; x += 2) {
          const hit = document.elementFromPoint(rect.x + x, rect.y + y);
          if (hit && hit.closest('a') === node) return { x: rect.x + x, y: rect.y + y };
        }
      }
      return null;
    }, `${origin}/linked-target`);
    assert(linkPoint, '节点链接图标应具有可点击区域');
    const popup = browser.waitForTarget(target => target.url() === `${origin}/linked-target`, { timeout: 5000 });
    await page.mouse.click(linkPoint.x, linkPoint.y);
    await popup;
    assert.strictEqual(page.url(), `${origin}/`, '原用例管理页面应保持不变');
    const editorPage = await browser.newPage();
    await editorPage.goto(`${origin}/editor`);
    await editorPage.evaluate(async target => {
      window.testEditor = await window.mountTestEditor({ template: 'right', root: {
        data: { text: '用例' }, children: [{ data: { text: '链接节点', hyperlink: target }, children: [] }],
      } }, true);
    }, `${origin}/linked-target`);
    await editorPage.waitForFunction(() => {
      const instance = window.testEditor;
      const child = instance && instance.minder.getRoot().children[0];
      return child && child._renderers;
    }, { timeout: 10000 });
    const hover = await editorPage.evaluate(() => {
      const node = window.testEditor.minder.getRoot().children[0];
      const shape = node.getRenderer('hyperlinkrender').getRenderShape().node;
      const link = shape.querySelector('a');
      const remove = shape.querySelector('[data-link-remove="true"]');
      return { link: Boolean(link), remove: Boolean(remove), hidden: remove && getComputedStyle(remove).display === 'none' };
    });
    assert(hover.link && hover.remove && hover.hidden, `节点链接右侧应有默认隐藏的删除按钮: ${JSON.stringify(hover)}`);
    await editorPage.evaluate(() => {
      const shape = window.testEditor.minder.getRoot().children[0].getRenderer('hyperlinkrender').getRenderShape().node;
      shape.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    });
    const shown = await editorPage.evaluate(() => {
      const shape = window.testEditor.minder.getRoot().children[0].getRenderer('hyperlinkrender').getRenderShape().node;
      return getComputedStyle(shape.querySelector('[data-link-remove="true"]')).display !== 'none';
    });
    assert(shown, '悬浮节点链接时应显示删除按钮');
    await editorPage.evaluate(() => {
      const shape = window.testEditor.minder.getRoot().children[0].getRenderer('hyperlinkrender').getRenderShape().node;
      shape.querySelector('[data-link-remove="true"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    const deleted = await editorPage.evaluate(() => {
      const node = window.testEditor.minder.getRoot().children[0];
      const renderer = node.getRenderer('hyperlinkrender');
      return { url: node.getData('hyperlink'), visible: Boolean(renderer.getRenderShape() &&
        getComputedStyle(renderer.getRenderShape().node).display !== 'none') };
    });
    assert.strictEqual(deleted.url, null, '删除后节点应清除链接数据');
    assert.strictEqual(deleted.visible, false, '删除后节点不应继续显示链接图标');
    const layout = await editorPage.evaluate(() => {
      const outer = document.querySelector('.kityminder-editor-container').getBoundingClientRect();
      const canvas = document.querySelector('.kityminder-core-container').getBoundingClientRect();
      const navigation = document.querySelector('.nav-bar').getBoundingClientRect();
      let trackNode = document.querySelector('.mindmap-scroll-track.horizontal');
      if (!trackNode) {
        trackNode = document.createElement('div');
        trackNode.className = 'mindmap-scroll-track horizontal';
        document.querySelector('.mindmap-scrollbars').appendChild(trackNode);
      }
      const track = trackNode.getBoundingClientRect();
      return { outerBottom: outer.bottom, canvasBottom: canvas.bottom, navigationBottom: navigation.bottom, trackTop: track.top };
    });
    assert(Math.abs(layout.canvasBottom - layout.outerBottom) <= 1, '普通模式画布应延伸到编辑器底部');
    assert(layout.navigationBottom < layout.trackTop, '横向滚动条应在缩放工具条下方');
    await editorPage.evaluate(() => window.testEditor.setState({ fullScreen: true }));
    const fullScreen = await editorPage.evaluate(() => {
      const outer = document.querySelector('.kityminder-editor-container').getBoundingClientRect();
      const canvas = document.querySelector('.kityminder-core-container').getBoundingClientRect();
      return { outerBottom: outer.bottom, canvasBottom: canvas.bottom, viewportBottom: window.innerHeight };
    });
    assert(Math.abs(fullScreen.outerBottom - fullScreen.viewportBottom) <= 1, '全屏编辑器应到达视口底部');
    assert(Math.abs(fullScreen.canvasBottom - fullScreen.viewportBottom) <= 1, '全屏画布底部不应留灰色空白');
    console.log(JSON.stringify(result));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
