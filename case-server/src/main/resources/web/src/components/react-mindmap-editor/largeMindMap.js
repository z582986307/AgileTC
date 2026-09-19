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
  if (!data || !data.root) return { data, isLarge: false, nodeCount: 0 };

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

  return { data, isLarge, nodeCount: nodes.length };
};
