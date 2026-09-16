export const RESULT_OPTIONS = [
  { key: 'passed', label: '通过', value: 9, icon: 'checked', tone: 'success' },
  { key: 'failed', label: '失败', value: 1, icon: 'fail', tone: 'danger' },
  { key: 'blocked', label: '阻塞', value: 5, icon: 'block', tone: 'warning' },
  { key: 'skipped', label: '跳过', value: 4, icon: 'skip', tone: 'neutral' },
]
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
export const countExecutionResults = root => {
  const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, pending: 0, total: 0 }
  const keyByValue = { 9: 'passed', 1: 'failed', 5: 'blocked', 4: 'skipped' }
  collectExecutionNodes(root).forEach(node => {
    counts.total += 1
    counts[keyByValue[node.getData('progress')] || 'pending'] += 1
  })
  return counts
}
export const getNodeNote = node => (node && node.getData('note')) || ''
