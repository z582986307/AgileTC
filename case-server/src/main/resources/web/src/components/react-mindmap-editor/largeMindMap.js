export const LARGE_MIND_MAP_NODE_THRESHOLD = 1500;

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
  if (isLarge) {
    nodes.forEach((node, index) => {
      if (
        index > 0 &&
        node.children &&
        node.children.length &&
        node.data
      ) {
        node.data.expandState = 'collapse';
      }
    });
  }

  return { data, isLarge, nodeCount: nodes.length };
};
