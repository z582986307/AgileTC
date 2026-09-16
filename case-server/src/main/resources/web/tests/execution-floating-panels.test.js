/* eslint-env jest */
import {
  RESULT_OPTIONS,
  collectExecutionNodes,
  countExecutionResults,
  getNodeNote,
  isExecutableNode,
} from '../src/components/react-mindmap-editor/executionPanelUtils'
import { getSocketUrl } from '../src/components/react-mindmap-editor/util/socketUrl'
const node = (data, children = []) => ({ getChildren: () => children, getData: key => data[key] })
test('执行结果提供稳定的语义样式标识', () => {
  expect(RESULT_OPTIONS.map(item => item.tone)).toEqual(['success', 'danger', 'warning', 'neutral'])
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
