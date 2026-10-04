import { createPaintGroups } from './paintGroups';

// 每个阶段都让出主线程；不能在最后再调用一次同步 refresh。
const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

export const yieldToBrowser = () => {
  // 后台优先级让输入/绘制先运行；不用高优先级 continuation 连续抢占。
  if (typeof scheduler !== 'undefined' && scheduler.postTask) {
    return scheduler.postTask(() => {}, { priority: 'background' });
  }
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const runInSlices = async (items, visit, task, maxBatch = 64) => {
  let cursor = 0;
  while (cursor < items.length) {
    await yieldToBrowser();
    if (task.cancelled) return;
    const started = now();
    let processed = 0;
    do {
      visit(items[cursor], cursor);
      cursor++;
      processed++;
    } while (cursor < items.length && processed < maxBatch && now() - started < 6);
  }
};

export const renderMindMapProgressively = async (minder, nodes, task) => {
  const visible = [];
  const visibleSet = new Set();
  await runInSlices(nodes, node => {
    node.setLayoutTransform(null);
    if (!node.parent || (visibleSet.has(node.parent) && node.parent.isExpanded())) {
      visible.push(node);
      visibleSet.add(node);
    }
  }, task);
  if (task.cancelled) return;

  // renderNodeBatch 保留原有渲染器顺序；限制一次 SVG 测量/写入的规模。
  const batches = [];
  for (let i = 0; i < visible.length; i += 32) batches.push(visible.slice(i, i + 32));
  const container = minder.getRenderContainer();
  await runInSlices(batches, batch => {
    // 只将本批放进 SVG 测量。已测量节点暂存，避免每次测量都重排持续增长的整图。
    batch.forEach(node => container.addShape(node.getRenderContainer()));
    minder.renderNodeBatch(batch);
    batch.forEach(node => container.removeShape(node.getRenderContainer()));
  }, task, 1);
  if (task.cancelled) return;

  const bottomUp = visible.slice().reverse();
  for (let round = 1; round <= 2; round++) {
    await runInSlices(bottomUp, node => {
      node.getLayoutInstance().doLayout(node, node.isExpanded() ? node.children : [], round);
    }, task);
    if (task.cancelled) return;
  }

  const Matrix = window.kity.Matrix;
  // 尺寸已经测量完毕。挂载期间不反复让浏览器重排越来越大的 SVG。
  minder._progressiveApplying = true;
  await runInSlices(visible, node => {
    const parentMatrix = node.parent ? node.parent.getGlobalLayoutTransform() : new Matrix();
    const matrix = node.getLayoutTransform().merge(parentMatrix.clone());
    const offset = node.getLayoutOffset();
    matrix.translate(offset.x, offset.y);
    matrix.m.e = Math.round(matrix.m.e);
    matrix.m.f = Math.round(matrix.m.f);
    if (node._layoutTimeline) {
      node._layoutTimeline.stop();
      node._layoutTimeline = null;
    }
    node.setGlobalLayoutTransform(matrix);
    minder.fire('layoutapply', { node, matrix });
    minder.fire('layoutfinish', { node, matrix });
  }, task, 256);
  if (task.cancelled) return;
  // 已有最终坐标后才分批挂载，避免所有节点重叠在原点，也避免一次显示整张 SVG。
  const groups = [];
  for (let i = 0; i < visible.length; i += 128) groups.push(visible.slice(i, i + 128));
  minder._progressiveGroups = [];
  minder._paintGroups = createPaintGroups(minder);
  await runInSlices(groups, batch => minder._paintGroups.mount(batch), task, 1);
  if (task.cancelled) return;
  minder._progressiveApplying = false;
  minder.fire('layout');
  minder.fire('layoutallfinish');
  minder.fire('contentchange');
  minder._interactChange();
};
