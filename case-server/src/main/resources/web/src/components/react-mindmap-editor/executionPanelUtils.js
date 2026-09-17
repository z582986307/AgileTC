export const RESULT_OPTIONS = [
  { key: 'passed', label: '通过', value: 9, icon: 'checked', tone: 'success' },
  { key: 'failed', label: '失败', value: 1, icon: 'fail', tone: 'danger' },
  { key: 'blocked', label: '阻塞', value: 5, icon: 'block', tone: 'warning' },
  { key: 'skipped', label: '跳过', value: 4, icon: 'skip', tone: 'skipped' },
]
export const EXECUTION_MARK_OPTIONS = [
  {
    key: 'untested',
    label: '未测试',
    value: undefined,
    icon: 'minus-circle',
    tone: 'untested',
    antIcon: true,
  },
  ...RESULT_OPTIONS,
]
export const EXECUTION_FILTER_OPTIONS = EXECUTION_MARK_OPTIONS
export const getExecutionContextOptions = () => EXECUTION_MARK_OPTIONS
export const renderExecutionContextLabel = item =>
  `<span class="execution-context-label ${item.tone}">${item.label}</span>`
export const getLockStatusLabel = locked => (locked ? '已锁定' : '已解锁')
export const PANEL_TOGGLE_ICONS = { expanded: 'right', collapsed: 'left' }
export const getExecutionOptionClassName = (tone, active) =>
  `execution-status-button ${tone}${active ? ' active' : ''}`
export const getExecutionMarkGridStyle = () => ({
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
})
export const shouldShowMediaToolbar = progressShow => !progressShow
export const canMarkExecutionResult = (selectedCount, isLock) => !isLock && selectedCount > 0
export const getExecutionProgress = counts => {
  const completed = counts.passed + counts.failed + counts.blocked + counts.skipped
  const total = counts.total
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  }
}
const childrenOf = node => (node && node.getChildren ? node.getChildren() : [])
export const isExecutableNode = node =>
  Boolean(node && !(node.isRoot && node.isRoot()) && childrenOf(node).length === 0)
export const collectExecutionNodes = root => {
  const nodes = []
  const visit = node => {
    if (!node) return
    if (node !== root && isExecutableNode(node)) nodes.push(node)
    childrenOf(node).forEach(visit)
  }
  visit(root)
  return nodes
}
export const collectSelectedExecutionNodes = selectedNodes => {
  const nodes = []
  const seen = new Set()
  selectedNodes.forEach(selectedNode => {
    const visit = node => {
      if (isExecutableNode(node)) {
        if (!seen.has(node)) {
          seen.add(node)
          nodes.push(node)
        }
        return
      }
      childrenOf(node).forEach(visit)
    }
    visit(selectedNode)
  })
  return nodes
}
export const normalizeRightMindMap = data => {
  if (!data || !data.root) return data
  data.template = 'right'
  data.theme = 'byte-blue'
  const setRight = node => {
    node.data = node.data || {}
    node.data.layout = 'right'
    const children = node.children || []
    children.forEach(child => {
      setRight(child)
    })
  }
  setRight(data.root)
  return data
}
export const forceRightMindMap = minder => {
  minder.getRoot().traverse(node => node.setLayout('right'))
  minder.layout(100)
  minder.fire('contentchange')
}
export const focusFilteredExecutionNodes = (root, matchedNodes) => {
  const collapseTree = node => {
    const children = childrenOf(node)
    if (!children.length) return
    node.collapse()
    children.forEach(collapseTree)
  }
  collapseTree(root)
  root.expand()
  const expanded = new Set([root])
  matchedNodes.forEach(node => {
    const path = []
    let parent = node.parent
    while (parent && parent !== root) {
      path.unshift(parent)
      parent = parent.parent
    }
    path.forEach(item => {
      if (!expanded.has(item)) {
        expanded.add(item)
        item.expand()
      }
    })
  })
}
export const countExecutionResults = root => {
  const counts = {
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    pending: 0,
    total: 0,
  }
  const keyByValue = { 9: 'passed', 1: 'failed', 5: 'blocked', 4: 'skipped' }
  collectExecutionNodes(root).forEach(node => {
    counts.total += 1
    counts[keyByValue[node.getData('progress')] || 'pending'] += 1
  })
  return counts
}
export const getNodeNote = node => (node && node.getData('note')) || ''
