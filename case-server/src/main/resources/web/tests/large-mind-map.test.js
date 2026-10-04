/** @jest-environment node */
const {
  countVisibleMindMapNodes,
  createProgressiveMindMapPlan,
  prepareLargeMindMap,
} = require('../src/components/react-mindmap-editor/largeMindMap');
const { runInSlices, createSpatialRenderGroups } = require('../src/components/react-mindmap-editor/progressiveRender');

const createTree = depth => {
  const node = { data: { text: `level-${depth}` }, children: [] };
  if (depth > 0) node.children.push(createTree(depth - 1));
  return node;
};

describe('大型脑图数据与调度（真实渲染另由 Chrome 脚本验证）', () => {
  test('不把相距很远的节点放进同一绘制组，且不改变树的遍历顺序', async () => {
    const nodes = Array.from({ length: 256 }, (_, i) => ({
      id: i,
      getLayoutBox: () => ({ x: 0, y: (i % 2) * 10000 + Math.floor(i / 2) }),
    }));
    expect(typeof createSpatialRenderGroups).toBe('function');
    const groups = await createSpatialRenderGroups(nodes, { cancelled: false });
    expect(groups).toHaveLength(2);
    groups.forEach(group => {
      const ys = group.map(node => node.getLayoutBox().y);
      expect(Math.max(...ys) - Math.min(...ys)).toBe(127);
    });
    expect(new Set([].concat(...groups)).size).toBe(256);
    expect(nodes.map(node => node.id)).toEqual(Array.from({ length: 256 }, (_, i) => i));
  });
  test('首次导入默认展开，保留已保存的折叠及执行结果', () => {
    const root = createTree(4);
    root.children[0].data.progress = 1;
    const data = { root, base: 7 };
    expect(prepareLargeMindMap(data, 3).visibleNodeCount).toBe(5);
    root.children[0].data.expandState = 'collapse';
    const prepared = prepareLargeMindMap(data, 3);
    expect(prepared.isLarge).toBe(true);
    expect(countVisibleMindMapNodes(data)).toBe(2);
    expect(root.children[0].data.progress).toBe(1);
    expect(data.base).toBe(7);
  });

  test('五万节点计划保留父子映射和全部内容', () => {
    const root = { data: { text: 'root' }, children: [] };
    for (let i = 0; i < 500; i++) {
      const branch = { data: { text: `branch-${i}` }, children: [] };
      for (let j = 0; j < 100; j++) branch.children.push({ data: { text: `${i}-${j}`, progress: 9 }, children: [] });
      root.children.push(branch);
    }
    const result = prepareLargeMindMap({ root });
    const plan = createProgressiveMindMapPlan({ root });
    expect(result.nodeCount).toBe(50501);
    expect(result.visibleNodeCount).toBe(50501);
    expect(plan.entries).toHaveLength(50500);
    expect(plan.initialData.root.children).toEqual([]);
    expect(plan.entries[500].parentIndex).toBe(0);
    expect(plan.entries[500].data.data).toEqual({ text: '0-0', progress: 9, expandState: 'expand' });
  });

  test('连续繁重任务之间允许其他浏览器任务执行', async () => {
    const visited = [];
    const work = Array.from({ length: 40 }, (_, i) => i);
    const pending = runInSlices(work, value => {
      visited.push(value);
      const until = Date.now() + 1;
      while (Date.now() < until) { /* 模拟每项耗时 */ }
    }, { cancelled: false });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(visited.length).toBeGreaterThan(0);
    expect(visited.length).toBeLessThan(40);
    await pending;
    expect(visited).toEqual(work);
  });

  test('离开页面后取消未完成的批次', async () => {
    const task = { cancelled: false };
    const visited = [];
    const pending = runInSlices([1, 2, 3, 4], n => visited.push(n), task, 1);
    await new Promise(resolve => setTimeout(resolve, 0));
    task.cancelled = true;
    await pending;
    expect(visited).toEqual([1]);
  });
});
