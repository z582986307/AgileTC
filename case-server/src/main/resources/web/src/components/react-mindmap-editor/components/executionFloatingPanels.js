import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, Icon, Input, message, Tooltip } from 'antd'
import { CustomIcon, ImageModal, LinkModal } from './index'
import {
  EXECUTION_FILTER_OPTIONS,
  EXECUTION_MARK_OPTIONS,
  RESULT_OPTIONS,
  canMarkExecutionResult,
  collectExecutionNodes,
  collectSelectedExecutionNodes,
  countExecutionResults,
  focusFilteredExecutionNodes,
  getExecutionProgress,
  getExecutionOptionClassName,
  getExecutionMarkGridStyle,
  getNodeNote,
  PANEL_TOGGLE_ICONS,
} from '../executionPanelUtils'

class ExecutionFloatingPanels extends Component {
  state = {
    filterCollapsed: false,
    resultCollapsed: false,
    showImage: false,
    showLink: false,
    note: getNodeNote(this.props.selectedNode),
  }
  componentDidUpdate(prevProps) {
    if (prevProps.selectedNode !== this.props.selectedNode)
      this.setState({ note: getNodeNote(this.props.selectedNode) })
  }
  mark = value => {
    const { minder } = this.props
    const selectedNodes = [...minder.getSelectedNodes()]
    const executionNodes = collectSelectedExecutionNodes(selectedNodes)
    if (!executionNodes.length) return
    minder.select(executionNodes, true)
    minder.execCommand('Progress', value)
    minder.select(selectedNodes, true)
    minder.fire('receiverfocus')
    this.props.onChange()
  }
  saveNote = () => {
    this.props.minder.execCommand('Note', this.state.note.trim() || null)
    this.props.onChange()
    message.success('备注已保存')
  }
  filter = value => {
    const { minder } = this.props
    const root = minder.getRoot()
    const nodes = collectExecutionNodes(root).filter(node =>
      value === 'pending'
        ? node.getData('progress') === undefined || node.getData('progress') === null
        : node.getData('progress') === value,
    )
    focusFilteredExecutionNodes(root, nodes)
    root.renderTree()
    minder.layout(100)
    minder.select(nodes, true)
    minder.fire('receiverfocus')
  }
  renderFilter() {
    const counts = countExecutionResults(this.props.minder.getRoot())
    const progress = getExecutionProgress(counts)
    if (this.state.filterCollapsed) {
      return (
        <Button
          className="execution-filter-rail"
          icon={PANEL_TOGGLE_ICONS.collapsed}
          aria-label="展开执行进度"
          title="展开执行进度"
          onClick={() => this.setState({ filterCollapsed: false })}
        >
          执行进度
        </Button>
      )
    }
    return (
      <section className="execution-filter-panel" aria-label="计划周期与执行进度">
        <Button
          className="execution-panel-collapse-handle"
          icon={PANEL_TOGGLE_ICONS.expanded}
          aria-label="收起计划周期与执行进度"
          title="收起执行进度"
          onClick={() => this.setState({ filterCollapsed: true })}
        />
        <div className="execution-plan-cycle">
          <span>计划周期</span>
          <strong>{this.props.planCycle || '未设置'}</strong>
        </div>
        <div className="execution-progress-summary">
          <span>已执行用例</span>
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
              <button
                type="button"
                className={`execution-progress-segment ${item.tone}`}
                aria-label={`筛选${item.label}用例 ${counts[item.key]} 条`}
                onClick={() => this.filter(item.value)}
                style={{
                  width: `${progress.total ? (counts[item.key] / progress.total) * 100 : 0}%`,
                }}
              />
            </Tooltip>
          ))}
          <Tooltip title={`未测试 ${counts.pending}`}>
            <button
              type="button"
              className="execution-progress-segment pending"
              aria-label={`筛选未测试用例 ${counts.pending} 条`}
              onClick={() => this.filter('pending')}
              style={{
                width: `${progress.total ? (counts.pending / progress.total) * 100 : 100}%`,
              }}
            />
          </Tooltip>
        </div>
        <div className="execution-filter-grid" aria-label="按执行结果筛选">
          {EXECUTION_FILTER_OPTIONS.map(item => {
            const count = item.key === 'untested' ? counts.pending : counts[item.key]
            const value = item.value === undefined ? 'pending' : item.value
            return (
              <Button
                className={`${getExecutionOptionClassName(item.tone, false)} execution-filter-item`}
                aria-label={`筛选${item.label}用例 ${count} 条`}
                key={item.key}
                onClick={() => this.filter(value)}
              >
                <span>
                  <i className={`execution-status-dot ${item.tone}`} aria-hidden="true" />
                  {item.label}
                </span>
                <strong className="execution-status-count">{count}</strong>
              </Button>
            )
          })}
        </div>
      </section>
    )
  }
  render() {
    const { selectedNode, isLock } = this.props
    const selectedCount = this.props.minder.getSelectedNodes().length
    const markDisabled = !canMarkExecutionResult(selectedCount, isLock)
    const noteDisabled = isLock || selectedCount !== 1 || !selectedNode
    const selectedProgress =
      selectedNode && selectedNode.getChildren().length === 0
        ? selectedNode.getData('progress')
        : '__parent__'
    return (
      <React.Fragment>
        {this.renderFilter()}
        {this.state.resultCollapsed ? (
          <Button
            className="execution-result-rail"
            icon={PANEL_TOGGLE_ICONS.collapsed}
            aria-label="展开标记结果"
            title="展开标记结果"
            onClick={() => this.setState({ resultCollapsed: false })}
          >
            标记结果
          </Button>
        ) : (
          <section className="execution-result-panel" aria-label="执行结果">
            <Button
              className="execution-panel-collapse-handle"
              icon={PANEL_TOGGLE_ICONS.expanded}
              aria-label="收起标记结果"
              title="收起标记结果"
              onClick={() => this.setState({ resultCollapsed: true })}
            />
            <div className="execution-section-label">标记状态</div>
            <div className="execution-result-actions" style={getExecutionMarkGridStyle()}>
              {EXECUTION_MARK_OPTIONS.map(item => {
                const active =
                  item.value === undefined
                    ? selectedProgress === undefined || selectedProgress === null
                    : selectedProgress === item.value
                return (
                  <Tooltip title={item.label} key={item.key}>
                    <Button
                      className={`${getExecutionOptionClassName(
                        item.tone,
                        active,
                      )} execution-result-button`}
                      disabled={markDisabled}
                      onClick={() => this.mark(item.value)}
                    >
                      {item.antIcon ? (
                        <Icon type={item.icon} />
                      ) : (
                        <CustomIcon type={item.icon} disabled={false} />
                      )}
                      <span>{item.label}</span>
                    </Button>
                  </Tooltip>
                )
              })}
            </div>
            <div className="execution-note-header">
              <span>执行备注</span>
              <div className="execution-note-tools">
                <Tooltip title="插入链接">
                  <Button
                    type="link"
                    icon="link"
                    disabled={noteDisabled}
                    aria-label="插入链接"
                    onClick={() => this.setState({ showLink: true })}
                  />
                </Tooltip>
                <Tooltip title="插入图片">
                  <Button
                    type="link"
                    icon="picture"
                    disabled={noteDisabled}
                    aria-label="插入图片"
                    onClick={() => this.setState({ showImage: true })}
                  />
                </Tooltip>
                <em>{this.state.note.length}/500</em>
              </div>
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
        {this.state.showLink && (
          <LinkModal
            visible
            minder={this.props.minder}
            onCancel={() => this.setState({ showLink: false })}
          />
        )}
        {this.state.showImage && (
          <ImageModal
            visible
            minder={this.props.minder}
            baseUrl={this.props.baseUrl}
            uploadUrl={this.props.uploadUrl}
            onCancel={() => this.setState({ showImage: false })}
          />
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
  planCycle: PropTypes.string,
  baseUrl: PropTypes.string,
  uploadUrl: PropTypes.string,
}
export default ExecutionFloatingPanels
