jest.mock('antd', () => ({
  Button: () => null,
  ConfigProvider: () => null,
  Tabs: { TabPane: () => null },
  Input: () => null,
  Icon: () => null,
  notification: {},
  Modal: {},
  Spin: () => null,
  Switch: () => null,
  Tooltip: () => null,
  Popover: () => null,
  List: () => null,
  Avatar: () => null,
}));
jest.mock('marked', () => ({ setOptions: jest.fn() }));

const DoGroup = require('../src/components/react-mindmap-editor/toolbar/DoGroup').default;
const {
  createExecutionResultIndex,
  updateExecutionResultIndex,
  buildNodeDataPatches,
  invertNodeDataPatches,
  toWirePatches,
} = require('../src/components/react-mindmap-editor/executionPanelUtils');

describe('大型脑图性能回归', () => {
  test('一次内容变更只导出一次完整脑图并返回可复用快照', () => {
    const snapshots = [
      { base: 1, root: { data: { text: '旧节点' }, children: [] } },
      { base: 1, root: { data: { text: '新节点' }, children: [] } },
    ];
    let exportCount = 0;
    const minder = {
      exportJson: () => {
        exportCount++;
        return snapshots[1];
      },
    };
    const group = new DoGroup({ minder });
    group.state.lastSnap = snapshots[0];
    group.setState = update => Object.assign(group.state, update);
    exportCount = 0;
    window.minderData = snapshots[0];

    const change = group.changed();

    expect(exportCount).toBe(1);
    expect(change.snapshot).toBe(snapshots[1]);
    expect(change.patch.length).toBeGreaterThan(0);
  });
});

describe('执行结果索引', () => {
  const leaf = progress => ({
    getChildren: () => [],
    getData: key => (key === 'progress' ? progress : undefined),
    isRoot: () => false,
  });

  test('节点选中后可直接读取缓存统计，不需要再次遍历根节点', () => {
    const passed = leaf(9);
    const pending = leaf(undefined);
    const root = {
      getChildren: () => [passed, pending],
      isRoot: () => true,
    };
    const index = createExecutionResultIndex(root);

    expect(index.counts.total).toBe(2);
    expect(index.counts.passed).toBe(1);
    expect(index.counts.pending).toBe(1);

    updateExecutionResultIndex(index, [pending], undefined, 1);
    expect(index.counts.pending).toBe(0);
    expect(index.counts.failed).toBe(1);
  });

  test('执行结果只生成目标节点补丁，避免导出和比对整棵脑图', () => {
    const parent = { children: [] };
    const node = {
      parent,
      getData: key => (key === 'progress' ? 9 : undefined),
    };
    parent.children.push(node);
    const patches = buildNodeDataPatches([node], 'progress', 1);

    expect(toWirePatches(patches)).toEqual([
      { op: 'replace', path: '/root/children/0/data/progress', value: 1 },
    ]);
    expect(invertNodeDataPatches(patches)).toEqual([
      { op: 'replace', path: '/root/children/0/data/progress', value: 9 },
    ]);
  });
});
