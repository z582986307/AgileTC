/** @jest-environment node */

const {
  countVisibleMindMapNodes,
  createProgressiveMindMapPlan,
  prepareLargeMindMap,
} = require('../src/components/react-mindmap-editor/largeMindMap');

const createTree = depth => {
  const node = { data: { text: `level-${depth}` }, children: [] };
  if (depth > 0) node.children.push(createTree(depth - 1));
  return node;
};

describe('大型脑图首次加载', () => {
  test('超过阈值时不自动折叠任何分支', () => {
    const data = { root: createTree(4), base: 7 };

    const result = prepareLargeMindMap(data, 3);

    expect(result.isLarge).toBe(true);
    expect(result.nodeCount).toBe(5);
    expect(data.root.children[0].data.expandState).toBe('expand');
    expect(data.root.children[0].children[0].data.expandState).toBe('expand');
    expect(countVisibleMindMapNodes(data)).toBe(5);
    expect(result.optimized).toBe(false);
    expect(data.base).toBe(7);
  });

  test('未超过阈值时保留历史折叠状态', () => {
    const data = { root: createTree(2) };
    data.root.children[0].data.expandState = 'collapse';

    const result = prepareLargeMindMap(data, 10);

    expect(result.isLarge).toBe(false);
    expect(result.nodeCount).toBe(3);
    expect(data.root.children[0].data.expandState).toBe('collapse');
    expect(result.optimized).toBe(false);
  });

  test('五倍客户管理规模保持全部展开并可生成分片导入计划', () => {
    const root = { data: { text: 'root' }, children: [] };
    for (let index = 0; index < 250; index += 1) {
      const branch = createTree(346);
      branch.data.text = `branch-${index}`;
      root.children.push(branch);
    }
    const data = { root };
    const startedAt = Date.now();

    const result = prepareLargeMindMap(data, 1500);
    const plan = createProgressiveMindMapPlan(data);

    expect(result.nodeCount).toBe(86751);
    expect(result.optimized).toBe(false);
    expect(result.visibleNodeCount).toBe(86751);
    expect(plan.entries).toHaveLength(86750);
    expect(plan.initialData.root.children).toEqual([]);
    expect(Date.now() - startedAt).toBeLessThan(1500);
  });
});
