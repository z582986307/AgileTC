const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../src/components/react-mindmap-editor')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const editor = read('index.js')
const panel = read('components/executionFloatingPanels.js')
const view = read('view/index.js')
const styles = read('index.scss')
const utils = read('executionPanelUtils.js')

assert(editor.includes("hotbox.state('expandRoot')"), '空白处右键菜单应只提供展开入口')
assert(editor.includes("hotbox.state('expandLevels')"), '展开入口应打开二级层级菜单')
assert(editor.includes("this.hotbox.active('expandRoot', position)"), '空白菜单应定位到鼠标位置')
assert(editor.includes('expandAllExecutionNodes(this.minder.getRoot())'), '脑图导入后应默认展开全部')
assert(!editor.includes('<TabPane tab="思路"'), '不应继续展示“思路”入口')
assert(editor.includes('className="mindmap-history-actions"'), '撤销重做应固定在脑图左上角')
assert(!view.includes('expandMenu'), '视图工具栏不应继续提供展开菜单')
assert(panel.includes('renderExecutionStatusIcon(item)'), '悬浮窗结果按钮应使用统一状态图标')
assert(utils.includes('execution-context-list'), '右键结果菜单应使用竖排列表样式')
assert(utils.includes('<svg class="execution-status-icon'), '结果状态应使用统一 SVG 图标')
assert(
  styles.includes('.hotbox .state.progress .top') &&
    styles.includes('flex-direction: column'),
  '右键结果菜单应具备竖排布局',
)
assert(styles.includes('grid-auto-rows: 38px'), '结果按钮选中前后应保持固定高度')
assert(styles.includes('box-shadow: none;') && styles.includes('&.active'), '选中态不应改变按钮外部尺寸')
assert(styles.includes('.hotbox .state.expandRoot .top'), '展开一级菜单应有独立样式')
assert(styles.includes('transform: none;'), '右键菜单左上角应对齐鼠标位置')
assert(!editor.includes("label: '撤销',\n      key: 'Ctrl + Z'"), '节点右键菜单不应包含撤销')
assert(!editor.includes("label: '重做',\n      key: 'Ctrl + Y'"), '节点右键菜单不应包含重做')

console.log('execution UI regression checks passed')
