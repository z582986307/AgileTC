/** @jest-environment node */

const {
  countVisibleMindMapNodes,
  createProgressiveMindMapPlan,
  importMindMapProgressively,
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

  test('中等规模脑图也走分片导入，避免同步创建数百个图形节点', async () => {
    const root = { data: { text: 'root' }, children: [] };
    for (let index = 0; index < 501; index += 1) {
      root.children.push({ data: { text: `case-${index}` }, children: [] });
    }
    const fakeRoot = { children: [] };
    let imported = 0;
    const minder = {
      importJson: data => {
        fakeRoot.children = [];
        imported += data.root.children.length;
      },
      getRoot: () => fakeRoot,
      createNode: (unused, parent) => {
        const node = { children: [] };
        parent.children.push(node);
        return node;
      },
      importNode: () => { imported += 1; },
      refresh: () => {},
      fire: () => {},
    };

    const finished = importMindMapProgressively(minder, { root });
    expect(imported).toBe(0);
    await finished;
    expect(imported).toBe(501);
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

  test('大型脑图导入时每次让出主线程，不因空闲回调超时连续导入整批节点', async () => {
    const root = { data: { text: 'root' }, children: [] };
    for (let index = 0; index < 1501; index += 1) {
      root.children.push({ data: { text: `case-${index}` }, children: [] });
    }
    const minderRoot = { children: [] };
    let imported = 0;
    const minder = {
      importJson: () => { minderRoot.children = []; },
      getRoot: () => minderRoot,
      createNode: (unused, parent) => {
        const node = { children: [] };
        parent.children.push(node);
        return node;
      },
      importNode: (node, json) => {
        node.data = json.data;
        imported += 1;
        const until = Date.now() + 1;
        while (Date.now() < until) {};
      },
      refresh: () => {},
      fire: () => {},
    };

    const finished = importMindMapProgressively(minder, { root });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(imported).toBeGreaterThan(0);
    expect(imported).toBeLessThan(100);
    await finished;
    expect(imported).toBe(1501);
  }, 10000);
});
