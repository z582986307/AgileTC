/** @jest-environment node */

const {
  countVisibleMindMapNodes,
  prepareLargeMindMap,
} = require('../src/components/react-mindmap-editor/largeMindMap');

const createTree = depth => {
  const node = { data: { text: `level-${depth}` }, children: [] };
  if (depth > 0) node.children.push(createTree(depth - 1));
  return node;
};

describe('大型脑图首次加载', () => {
  test('超过阈值时保留全部节点并逐层收起分支', () => {
    const data = { root: createTree(4), base: 7 };

    const result = prepareLargeMindMap(data, 3);

    expect(result.isLarge).toBe(true);
    expect(result.nodeCount).toBe(5);
    expect(data.root.children[0].data.expandState).toBe('collapse');
    expect(data.root.children[0].children[0].data.expandState).toBe('collapse');
    expect(data.root.children[0].children[0].children[0].children[0].data.expandState).toBeUndefined();
    expect(countVisibleMindMapNodes(data)).toBe(2);
    expect(data.base).toBe(7);
  });

  test('未超过阈值时保持原有展开状态', () => {
    const data = { root: createTree(2) };

    const result = prepareLargeMindMap(data, 10);

    expect(result.isLarge).toBe(false);
    expect(result.nodeCount).toBe(3);
    expect(data.root.children[0].data.expandState).toBeUndefined();
  });
});
