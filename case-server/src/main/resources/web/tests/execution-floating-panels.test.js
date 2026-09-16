/* eslint-env jest */
import {
  RESULT_OPTIONS,
  EXECUTION_MARK_OPTIONS,
  canMarkExecutionResult,
  collectExecutionNodes,
  getExecutionProgress,
  countExecutionResults,
  getNodeNote,
  isExecutableNode,
} from '../src/components/react-mindmap-editor/executionPanelUtils'
import { getSocketUrl } from '../src/components/react-mindmap-editor/util/socketUrl'
const node = (data, children = []) => ({ getChildren: () => children, getData: key => data[key] })
test('执行结果提供稳定的语义样式标识', () => {
  expect(RESULT_OPTIONS.map(item => item.tone)).toEqual(['success', 'danger', 'warning', 'neutral'])
})
test('未测试选项沿用原命令语义清空已选节点结果', () => {
  expect(EXECUTION_MARK_OPTIONS.map(item => item.label)).toEqual([
    '通过',
    '失败',
    '阻塞',
    '跳过',
    '未测试',
  ])
  expect(EXECUTION_MARK_OPTIONS[4].value).toBeUndefined()
})
test('执行结果沿用原逻辑：选中任意数量节点即可标记', () => {
  expect(canMarkExecutionResult(0, false)).toBe(false)
  expect(canMarkExecutionResult(1, false)).toBe(true)
  expect(canMarkExecutionResult(2, false)).toBe(true)
  expect(canMarkExecutionResult(1, true)).toBe(false)
})
test('执行进度显示已执行用例数与总用例数', () => {
  expect(
    getExecutionProgress({ passed: 2, failed: 1, blocked: 1, skipped: 0, pending: 2, total: 6 }),
  ).toEqual({ completed: 4, total: 6, percent: 67 })
  expect(getExecutionProgress({ passed: 0, failed: 0, blocked: 0, skipped: 0, total: 0 })).toEqual({
    completed: 0,
    total: 0,
    percent: 0,
  })
})
test('只允许末级用例执行并统计结果', () => {
  const passed = node({ progress: 9, note: '已核对' })
  const failed = node({ progress: 1 })
  const pending = node({})
  const group = node({}, [passed, failed])
  const root = node({}, [group, pending])
  expect(isExecutableNode(group)).toBe(false)
  expect(isExecutableNode(passed)).toBe(true)
  expect(collectExecutionNodes(root)).toEqual([passed, failed, pending])
  expect(countExecutionResults(root)).toEqual({
    passed: 1,
    failed: 1,
    blocked: 0,
    skipped: 0,
    pending: 1,
    total: 3,
  })
  expect(getNodeNote(passed)).toBe('已核对')
})
test('独立 HTTP 服务自动使用相邻 Socket 端口', () => {
  expect(getSocketUrl({ protocol: 'http:', hostname: 'localhost', port: '8194' })).toBe(
    'http://localhost:8195',
  )
  expect(getSocketUrl({ protocol: 'https:', hostname: 'localhost', port: '8543' })).toBe(
    'https://localhost:8095',
  )
})
