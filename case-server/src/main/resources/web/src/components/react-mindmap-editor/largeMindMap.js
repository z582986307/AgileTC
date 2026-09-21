export const LARGE_MIND_MAP_NODE_THRESHOLD = 1500;

export const countVisibleMindMapNodes = data => {
  if (!data || !data.root) return 0;

  let visibleNodeCount = 0;
  const pending = [{ node: data.root, visible: true }];
  while (pending.length) {
    const { node, visible } = pending.pop();
    if (visible) visibleNodeCount++;
    const childrenVisible =
      visible && (!node.data || node.data.expandState !== 'collapse');
    if (node.children && node.children.length) {
      node.children.forEach(child => {
        pending.push({ node: child, visible: childrenVisible });
      });
    }
  }

  return visibleNodeCount;
};

export const prepareLargeMindMap = (
  data,
  threshold = LARGE_MIND_MAP_NODE_THRESHOLD,
) => {
  if (!data || !data.root)
    return {
      data,
      isLarge: false,
      nodeCount: 0,
      visibleNodeCount: 0,
      optimized: false,
    };

  const nodes = [];
  const pending = [data.root];
  while (pending.length) {
    const node = pending.pop();
    nodes.push(node);
    if (node.children && node.children.length) {
      pending.push(...node.children);
    }
  }

  const isLarge = nodes.length > threshold;
  nodes.forEach(node => {
    node.data = node.data || {};
    if (node.data.expandState == null) node.data.expandState = 'expand';
  });

  return {
    data,
    isLarge,
    nodeCount: nodes.length,
    visibleNodeCount: countVisibleMindMapNodes(data),
    optimized: false,
  };
};

export const createProgressiveMindMapPlan = data => {
  if (!data || !data.root) return { initialData: data, entries: [] };
  const entries = [];
  const pending = [];
  const rootChildren = data.root.children || [];
  rootChildren.forEach(child => pending.push({ node: child, parentIndex: -1 }));
  for (let cursor = 0; cursor < pending.length; cursor += 1) {
    const { node, parentIndex } = pending[cursor];
    const entryIndex = entries.length;
    entries.push({
      parentIndex,
      data: { data: node.data, children: [] },
    });
    const children = node.children || [];
    children.forEach(child => pending.push({ node: child, parentIndex: entryIndex }));
  }
  return {
    initialData: {
      ...data,
      root: { data: data.root.data, children: [] },
    },
    entries,
  };
};

const scheduleIdle = callback => {
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    return window.requestIdleCallback(callback, { timeout: 50 });
  }
  return setTimeout(
    () => callback({ didTimeout: true, timeRemaining: () => 8 }),
    0,
  );
};

export const importMindMapProgressively = (minder, data, batchSize = 240) => {
  const prepared = prepareLargeMindMap(data);
  if (!prepared.isLarge) {
    minder.importJson(prepared.data);
    return Promise.resolve(prepared);
  }

  const plan = createProgressiveMindMapPlan(prepared.data);
  const importedNodes = [];
  let cursor = 0;
  minder._progressiveImporting = true;
  minder.importJson(plan.initialData);

  return new Promise((resolve, reject) => {
    const runBatch = deadline => {
      try {
        let processed = 0;
        while (
          cursor < plan.entries.length &&
          processed < batchSize &&
          (processed < 24 || deadline.didTimeout || deadline.timeRemaining() > 1)
        ) {
          const entry = plan.entries[cursor];
          const parent =
            entry.parentIndex === -1
              ? minder.getRoot()
              : importedNodes[entry.parentIndex];
          const node = minder.createNode(null, parent);
          minder.importNode(node, entry.data);
          importedNodes[cursor] = node;
          cursor += 1;
          processed += 1;
        }
        if (cursor < plan.entries.length) {
          scheduleIdle(runBatch);
          return;
        }
        minder.refresh(0);
        minder._progressiveImporting = false;
        minder.fire('progressiveimportdone');
        resolve(prepared);
      } catch (error) {
        minder._progressiveImporting = false;
        reject(error);
      }
    };
    scheduleIdle(runBatch);
  });
};
