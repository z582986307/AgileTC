// 全量数据、布局和 SVG 节点保留；仅跳过屏幕外分组的原生绘制。
// 平移/缩放事件内同步更新，不等待网络或异步补建节点。
export const createPaintGroups = minder => {
  const groups = [];
  const nodeGroups = new WeakMap();
  const connectionGroups = new WeakMap();
  const dirty = new Set();
  let frame = null;
  let disposed = false;
  let exportsInProgress = 0;

  const getView = () => {
    const box = minder.getViewDragger().getView();
    const paddingX = Math.max(300, box.width / 2);
    const paddingY = Math.max(300, box.height);
    return { left: box.left - paddingX, right: box.right + paddingX, top: box.top - paddingY, bottom: box.bottom + paddingY };
  };

  const measure = entry => {
    const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    entry.nodes.forEach(node => {
      if (!node.attached) return;
      let b = node.getLayoutBox();
      if (entry.connections && node.parent) {
        const from = node.parent.getLayoutVertexOut();
        const to = node.getLayoutVertexIn();
        b = { left: Math.min(from.x, to.x), right: Math.max(from.x, to.x), top: Math.min(from.y, to.y), bottom: Math.max(from.y, to.y) };
      }
      // 包含边框、展开按钮以及连接线拐角，避免边缘被提前裁掉。
      box.left = Math.min(box.left, b.left - 24);
      box.right = Math.max(box.right, b.right + 24);
      box.top = Math.min(box.top, b.top - 24);
      box.bottom = Math.max(box.bottom, b.bottom + 24);
    });
    entry.box = box;
  };

  const apply = (entry, view) => {
    const b = entry.box;
    const visible = exportsInProgress || (b.right >= view.left && b.left <= view.right && b.bottom >= view.top && b.top <= view.bottom);
    const display = visible ? '' : 'none';
    if (entry.shape.node.style.display !== display) entry.shape.node.style.display = display;
  };

  const update = () => {
    if (disposed) return;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    dirty.forEach(measure);
    dirty.clear();
    const view = getView();
    groups.forEach(entry => apply(entry, view));
  };

  const changed = event => {
    if (minder._progressiveImporting || disposed) return;
    const node = event.node;
    if (!node) return;
    const mark = entry => { if (entry) dirty.add(entry); };
    mark(nodeGroups.get(node));
    mark(connectionGroups.get(node));
    node.children.forEach(child => mark(connectionGroups.get(child)));
    if (frame === null) frame = requestAnimationFrame(update);
  };

  const beforeCommand = event => {
    if (event.commandName !== 'camera') return;
    const target = event.commandArgs[0] || minder.getRoot();
    const entry = nodeGroups.get(target);
    // Camera 沿用原有 SVG 包围盒算法，读取前先恢复目标分组。
    if (entry) entry.shape.node.style.display = '';
  };

  const removed = event => {
    const deleted = new Set();
    const affected = new Set();
    event.node.traverse(node => {
      deleted.add(node);
      [nodeGroups, connectionGroups].forEach(index => {
        const entry = index.get(node);
        if (entry) affected.add(entry);
        index.delete(node);
      });
    });
    affected.forEach(entry => {
      entry.nodes = entry.nodes.filter(node => !deleted.has(node));
      dirty.add(entry);
    });
    if (frame === null) frame = requestAnimationFrame(update);
  };

  minder.on('viewchange layout layoutallfinish resize', update);
  minder.on('layoutapply noderender', changed);
  minder.on('beforeExecCommand', beforeCommand);
  minder.on('noderemove', removed);

  return {
    mount(nodes) {
      const view = getView();
      [false, true].forEach(connections => {
        const shape = new window.kity.Group();
        const entry = { shape, nodes, connections };
        const index = connections ? connectionGroups : nodeGroups;
        nodes.forEach(node => {
          const child = connections ? node.getConnection() : node.getRenderContainer();
          if (child) shape.addShape(child);
          index.set(node, entry);
        });
        measure(entry);
        apply(entry, view);
        groups.push(entry);
        (connections ? minder.getConnectContainer() : minder.getRenderContainer()).addShape(shape);
        minder._progressiveGroups.push(shape);
      });
    },
    revealForExport() {
      exportsInProgress++;
      update();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        exportsInProgress--;
        update();
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      minder.off('viewchange layout layoutallfinish resize', update);
      minder.off('layoutapply noderender', changed);
      minder.off('beforeExecCommand', beforeCommand);
      minder.off('noderemove', removed);
      dirty.clear();
      groups.length = 0;
    },
  };
};
