const assert = require('assert')
const fs = require('fs')
const path = require('path')

const list = fs.readFileSync(
  path.resolve(__dirname, '../src/components/case/caselist/index.js'),
  'utf8',
)
const styles = fs.readFileSync(
  path.resolve(__dirname, '../src/components/case/caselist/index.scss'),
  'utf8',
)

assert(list.includes('className="all-content byte-case-list"'), '用例列表应使用独立的字节风格作用域')
assert(styles.includes('.byte-case-list'), '用例列表应提供字节风格容器样式')
assert(styles.includes('border-radius: 12px;'), '列表卡片和弹窗应使用更大的圆角')
assert(styles.includes('.ant-select-selection'), '下拉框应统一优化边框和圆角')
assert(styles.includes('.ant-modal-content'), '弹窗应统一优化边框和圆角')

console.log('case list UI regression checks passed')
