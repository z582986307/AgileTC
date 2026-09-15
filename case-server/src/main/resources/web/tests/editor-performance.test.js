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
