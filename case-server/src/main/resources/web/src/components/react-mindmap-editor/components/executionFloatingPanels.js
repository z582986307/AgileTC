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
        <header className="execution-panel-header">
          <span className="execution-panel-heading">
            <span className="execution-panel-icon">
              <Icon type="filter" />
            </span>
            <span>
              <strong>筛选与进度</strong>
              <small>按执行状态快速定位</small>
            </span>
          </span>
          <span className="execution-total-badge">共 {counts.total} 条</span>
          <Button
            type="link"
            className="execution-panel-icon-button"
            icon="right"
            aria-label="收起筛选与进度"
            title="收起筛选与进度"
            onClick={() => this.setState({ filterCollapsed: true })}
          />
        </header>
        <button type="button" className="execution-filter-all" onClick={() => this.filter('all')}>
          <span>
            <Icon type="profile" />
            全部用例
          </span>
          <strong>{counts.total}</strong>
        </button>
        <div className="execution-filter-grid">
          {RESULT_OPTIONS.map(item => (
            <button
              type="button"
              key={item.key}
              className={`execution-filter-item ${item.tone}`}
              onClick={() => this.filter(item.value)}
            >
              <span>
                <i className={`execution-status-dot ${item.tone}`} aria-hidden="true" />
                {item.label}
              </span>
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
    const selectedProgress = selectedNode && selectedNode.getData('progress')
    return (
      <React.Fragment>
        {this.renderFilter()}
        <section className="execution-result-panel" aria-label="执行结果">
          <header className="execution-panel-header">
            <span className="execution-panel-heading">
              <span className="execution-panel-icon">
                <Icon type="check-circle" />
              </span>
              <span>
                <strong>执行结果</strong>
                <small title={disabled ? undefined : selectedNode.getText()}>
                  {disabled ? '选择末级用例后可标记' : selectedNode.getText()}
                </small>
              </span>
            </span>
          </header>
          <div className="execution-section-label">标记状态</div>
          <div className="execution-result-actions">
            {RESULT_OPTIONS.map(item => (
              <Tooltip title={item.label} key={item.key}>
                <Button
                  className={`execution-result-button ${item.tone}${
                    selectedProgress === item.value ? ' active' : ''
                  }`}
                  disabled={disabled}
                  onClick={() => this.mark(item.value)}
                >
                  <CustomIcon type={item.icon} disabled={disabled} />
                  <span>{item.label}</span>
                </Button>
              </Tooltip>
            ))}
          </div>
          <button
            type="button"
            className="execution-clear-button"
            disabled={disabled}
            onClick={() => this.mark(undefined)}
          >
            <Icon type="minus-circle" />
            清除结果
          </button>
          <div className="execution-note-header">
            <span>执行备注</span>
            <em>{this.state.note.length}/500</em>
          </div>
          <Input.TextArea
            rows={3}
            maxLength={500}
            disabled={disabled}
            placeholder="填写本次执行备注"
            value={this.state.note}
            onChange={event => this.setState({ note: event.target.value })}
          />
          <div className="execution-panel-footer">
            <Button type="primary" disabled={disabled} onClick={this.saveNote}>
              保存备注
            </Button>
          </div>
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
