import { runInSlices, renderMindMapProgressively } from './progressiveRender';

export const LARGE_MIND_MAP_NODE_THRESHOLD = 500;

export const isMindMapReady = minder => !minder._mindMapImport ||
  (minder._mindMapImport.completed && !minder._mindMapImport.cancelled);

export const cancelMindMapImport = minder => {
  if (minder && minder._mindMapImport && !minder._mindMapImport.completed) {
    minder._mindMapImport.cancelled = true;
  }
};

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
      node.children.forEach(child => pending.push(child));
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

export const importMindMapProgressively = async (minder, data, batchSize = 64) => {
  cancelMindMapImport(minder);
  const task = { cancelled: false };
  minder._mindMapImport = task;
  minder._mindMapImportFailed = false;
  minder._progressiveApplying = false;
  try {
    const prepared = prepareLargeMindMap(data);
    minder._largeMindMap = prepared.isLarge;
    if (!prepared.isLarge) {
      minder._progressiveImporting = false;
      minder.importJson(prepared.data);
      task.completed = true;
      return prepared;
    }

    const plan = createProgressiveMindMapPlan(prepared.data);
    const importedNodes = [];
    minder._progressiveImporting = true;
    minder.fire('progressiveimportstart');
    minder.importJson(plan.initialData);
    await runInSlices(plan.entries, (entry, cursor) => {
      const parent = entry.parentIndex === -1 ? minder.getRoot() : importedNodes[entry.parentIndex];
      const node = minder.createNode(null, parent);
      minder.importNode(node, entry.data);
      importedNodes[cursor] = node;
    }, task, batchSize);
    if (task.cancelled) return { ...prepared, cancelled: true };
    await renderMindMapProgressively(minder, [minder.getRoot(), ...importedNodes], task);
    if (task.cancelled) return { ...prepared, cancelled: true };
    minder._progressiveImporting = false;
    task.completed = true;
    minder.fire('progressiveimportdone');
    return prepared;
  } catch (error) {
    if (minder._mindMapImport === task && !task.cancelled) {
      minder._mindMapImportFailed = true;
      minder.fire('progressiveimporterror');
    }
    throw error;
  } finally {
    if (minder._mindMapImport === task) {
      minder._progressiveImporting = false;
      minder._progressiveApplying = false;
    }
  }
};
