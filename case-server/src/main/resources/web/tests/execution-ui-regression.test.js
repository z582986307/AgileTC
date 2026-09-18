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

assert(editor.includes("hotbox.state('expand')"), '空白处右键菜单应提供展开选项')
assert(editor.includes('expandAllExecutionNodes(this.minder.getRoot())'), '脑图导入后应默认展开全部')
assert(!editor.includes('<TabPane tab="思路"'), '不应继续展示“思路”入口')
assert(editor.includes('className="mindmap-history-actions"'), '撤销重做应固定在脑图左上角')
assert(!view.includes('expandMenu'), '视图工具栏不应继续提供展开菜单')
assert(panel.includes('renderExecutionStatusIcon(item)'), '悬浮窗结果按钮应使用统一状态图标')
assert(utils.includes('execution-context-list'), '右键结果菜单应使用竖排列表样式')
assert(
  styles.includes('.hotbox .state.progress .top') &&
    styles.includes('flex-direction: column'),
  '右键结果菜单应具备竖排布局',
)
assert(styles.includes('grid-auto-rows: 38px'), '结果按钮选中前后应保持固定高度')

console.log('execution UI regression checks passed')
