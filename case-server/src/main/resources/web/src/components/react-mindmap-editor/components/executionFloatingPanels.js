import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon, Input, message, Tooltip } from 'antd'
import { CustomIcon } from './index'
import {
  RESULT_OPTIONS,
  collectExecutionNodes,
  countExecutionResults,
  getNodeNote,
  isExecutableNode,
} from '../executionPanelUtils'

class ExecutionFloatingPanels extends Component {
  state = { filterCollapsed: false, note: getNodeNote(this.props.selectedNode) }
  componentDidUpdate(prevProps) {
    if (prevProps.selectedNode !== this.props.selectedNode)
      this.setState({ note: getNodeNote(this.props.selectedNode) })
  }
  mark = value => {
    this.props.minder.execCommand('Progress', value)
    this.props.onChange()
  }
  saveNote = () => {
    this.props.minder.execCommand('Note', this.state.note.trim() || null)
    this.props.onChange()
    message.success('备注已保存')
  }
  filter = value => {
    const nodes = collectExecutionNodes(this.props.minder.getRoot()).filter(
      node => value === 'all' || node.getData('progress') === value,
    )
    this.props.minder.select(nodes, true)
    this.props.minder.fire('receiverfocus')
  }
  renderFilter() {
    const counts = countExecutionResults(this.props.minder.getRoot())
    if (this.state.filterCollapsed) {
      return (
        <Button
          className="execution-filter-rail"
          icon="bar-chart"
          aria-label="展开筛选与进度"
          title="展开筛选与进度"
          onClick={() => this.setState({ filterCollapsed: false })}
        />
      )
    }
    return (
      <section className="execution-filter-panel" aria-label="筛选与进度">
        <header>
          <strong>筛选与进度</strong>
          <Button
            type="link"
            icon="right"
            aria-label="收起筛选与进度"
            onClick={() => this.setState({ filterCollapsed: true })}
          />
        </header>
        <button type="button" className="execution-filter-all" onClick={() => this.filter('all')}>
          全部用例 <strong>{counts.total}</strong>
        </button>
        <div className="execution-filter-grid">
          {RESULT_OPTIONS.map(item => (
            <button type="button" key={item.key} onClick={() => this.filter(item.value)}>
              <span>{item.label}</span>
              <strong>{counts[item.key]}</strong>
            </button>
          ))}
        </div>
        <div className="execution-pending">
          未执行 <strong>{counts.pending}</strong>
        </div>
      </section>
    )
  }
  render() {
    const { selectedNode, isLock } = this.props
    const disabled =
      isLock || this.props.minder.getSelectedNodes().length !== 1 || !isExecutableNode(selectedNode)
    return (
      <React.Fragment>
        {this.renderFilter()}
        <section className="execution-result-panel" aria-label="执行结果">
          <header>
            <strong>标记执行结果</strong>
            <span>{disabled ? '请先选择末级用例' : selectedNode.getText()}</span>
          </header>
          <div className="execution-result-actions">
            {RESULT_OPTIONS.map(item => (
              <Tooltip title={item.label} key={item.key}>
                <Button disabled={disabled} onClick={() => this.mark(item.value)}>
                  <CustomIcon type={item.icon} disabled={disabled} />
                  <span>{item.label}</span>
                </Button>
              </Tooltip>
            ))}
            <Tooltip title="清除结果">
              <Button disabled={disabled} onClick={() => this.mark(undefined)}>
                <Icon type="minus-circle" />
                <span>清除</span>
              </Button>
            </Tooltip>
          </div>
          <Input.TextArea
            rows={3}
            maxLength={500}
            disabled={disabled}
            placeholder="填写本次执行备注"
            value={this.state.note}
            onChange={event => this.setState({ note: event.target.value })}
          />
          <Button type="primary" block disabled={disabled} onClick={this.saveNote}>
            保存备注
          </Button>
        </section>
      </React.Fragment>
    )
  }
}
ExecutionFloatingPanels.propTypes = {
  minder: PropTypes.object.isRequired,
  selectedNode: PropTypes.object,
  isLock: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
}
export default ExecutionFloatingPanels
