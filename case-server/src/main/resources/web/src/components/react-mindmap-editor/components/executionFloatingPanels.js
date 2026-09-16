import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon, Input, message, Tooltip } from 'antd'
import { CustomIcon } from './index'
import {
  EXECUTION_MARK_OPTIONS,
  RESULT_OPTIONS,
  canMarkExecutionResult,
  collectExecutionNodes,
  countExecutionResults,
  getExecutionProgress,
  getNodeNote,
} from '../executionPanelUtils'

class ExecutionFloatingPanels extends Component {
  state = {
    filterCollapsed: false,
    resultCollapsed: false,
    note: getNodeNote(this.props.selectedNode),
  }
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
    const progress = getExecutionProgress(counts)
    if (this.state.filterCollapsed) {
      return (
        <Button
          className="execution-filter-rail"
          icon="bar-chart"
          aria-label="展开筛选与进度"
          title="展开筛选与进度"
          onClick={() => this.setState({ filterCollapsed: false })}
        >
          执行进度
        </Button>
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
          <span className="execution-total-badge">{progress.percent}%</span>
          <Button
            type="link"
            className="execution-panel-icon-button"
            icon="right"
            aria-label="收起筛选与进度"
            title="收起筛选与进度"
            onClick={() => this.setState({ filterCollapsed: true })}
          />
        </header>
        <div className="execution-progress-summary">
          <span>执行进度</span>
          <strong>
            {progress.completed} / {progress.total}
          </strong>
        </div>
        <div
          className="execution-progress-bar"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax={progress.total}
          aria-valuenow={progress.completed}
          aria-label={`已执行 ${progress.completed} 条，共 ${progress.total} 条`}
        >
          {RESULT_OPTIONS.map(item => (
            <Tooltip title={`${item.label} ${counts[item.key]}`} key={item.key}>
              <span
                className={`execution-progress-segment ${item.tone}`}
                style={{
                  width: `${progress.total ? (counts[item.key] / progress.total) * 100 : 0}%`,
                }}
              />
            </Tooltip>
          ))}
          <Tooltip title={`未测试 ${counts.pending}`}>
            <span
              className="execution-progress-segment pending"
              style={{
                width: `${progress.total ? (counts.pending / progress.total) * 100 : 100}%`,
              }}
            />
          </Tooltip>
        </div>
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
    const selectedCount = this.props.minder.getSelectedNodes().length
    const markDisabled = !canMarkExecutionResult(selectedCount, isLock)
    const noteDisabled = isLock || selectedCount !== 1 || !selectedNode
    const selectedProgress = selectedNode && selectedNode.getData('progress')
    let selectionLabel = '选择用例后可标记'
    if (!markDisabled)
      selectionLabel = selectedNode ? selectedNode.getText() : `已选择 ${selectedCount} 个用例`
    return (
      <React.Fragment>
        {this.renderFilter()}
        {this.state.resultCollapsed ? (
          <Button
            className="execution-result-rail"
            icon="check-circle"
            aria-label="展开标记结果"
            title="展开标记结果"
            onClick={() => this.setState({ resultCollapsed: false })}
          >
            标记结果
          </Button>
        ) : (
          <section className="execution-result-panel" aria-label="执行结果">
            <header className="execution-panel-header">
              <span className="execution-panel-heading">
                <span className="execution-panel-icon">
                  <Icon type="check-circle" />
                </span>
                <span>
                  <strong>执行结果</strong>
                  <small title={selectedNode ? selectedNode.getText() : undefined}>
                    {selectionLabel}
                  </small>
                </span>
              </span>
              <Button
                type="link"
                className="execution-panel-icon-button"
                icon="right"
                aria-label="收起标记结果"
                title="收起标记结果"
                onClick={() => this.setState({ resultCollapsed: true })}
              />
            </header>
            <div className="execution-section-label">标记状态</div>
            <div className="execution-result-actions">
              {EXECUTION_MARK_OPTIONS.map(item => {
                const active =
                  item.value === undefined
                    ? selectedProgress === undefined || selectedProgress === null
                    : selectedProgress === item.value
                return (
                  <Tooltip title={item.label} key={item.key}>
                    <Button
                      className={`execution-result-button ${item.tone}${active ? ' active' : ''}`}
                      disabled={markDisabled}
                      onClick={() => this.mark(item.value)}
                    >
                      {item.antIcon ? (
                        <Icon type={item.icon} />
                      ) : (
                        <CustomIcon type={item.icon} disabled={markDisabled} />
                      )}
                      <span>{item.label}</span>
                    </Button>
                  </Tooltip>
                )
              })}
            </div>
            <div className="execution-note-header">
              <span>执行备注</span>
              <em>{this.state.note.length}/500</em>
            </div>
            <Input.TextArea
              rows={3}
              maxLength={500}
              disabled={noteDisabled}
              placeholder="填写本次执行备注"
              value={this.state.note}
              onChange={event => this.setState({ note: event.target.value })}
            />
            <div className="execution-panel-footer">
              <Button type="primary" disabled={noteDisabled} onClick={this.saveNote}>
                保存备注
              </Button>
            </div>
          </section>
        )}
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
