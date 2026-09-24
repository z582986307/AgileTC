import React, { Component } from 'react';
import { Button, Tooltip } from 'antd';
import jsonDiff from 'fast-json-patch';
import './DoGroup.scss';

const MAX_HISTORY = 100;

let doDiffs = [];

class DoGroup extends Component {
  state = {
    undoDiffs: [],
    redoDiffs: [],
    patchLock: false,
    lastSnap: this.props.minder && this.props.minder.exportJson(),
  };
  componentDidMount() {
    let { minder } = this.props;
    minder.on('import', this.reset);
    // minder.on('patch', this.updateSelection);
  }
  reset = () => {
    this.setState({
      undoDiffs: [],
      redoDiffs: [],
      lastSnap: this.props.minder.exportJson(),
    });
  };

  makeUndoDiff = () => {
    const { minder } = this.props;
    let { undoDiffs, lastSnap } = this.state;
    const headSnap = minder.exportJson();
    const diff = jsonDiff.compare(headSnap, lastSnap);

    const doDiff = jsonDiff.compare(lastSnap, headSnap);
    if (diff.length) {
      if (diff.length === 1 && diff[0].path === '/base') {
        const undoTop = undoDiffs.pop();
        undoTop.push(diff[0]);
        undoDiffs.push(undoTop);
      } else {
        undoDiffs.push(diff);
        doDiffs.push(doDiff);
      }
      while (undoDiffs.length > MAX_HISTORY) {
        undoDiffs.shift();
        doDiffs.shift();
      }
      lastSnap = headSnap;
      this.setState({ undoDiffs, lastSnap });
      return { changed: true, snapshot: headSnap };
    }
    return { changed: false, snapshot: headSnap };
  };
  makeRedoDiff = () => {
    const { minder } = this.props;
    let { lastSnap, redoDiffs } = this.state;
    let revertSnap = minder.exportJson();
    redoDiffs.push(jsonDiff.compare(revertSnap, lastSnap));

    lastSnap = revertSnap;
    this.setState({ redoDiffs, lastSnap });
  };

  // 撤销
  undo = notifyInfo => {
    this.notifyInfo = notifyInfo;
    this.setState({ patchLock: true }, () => {
      console.log('notifyInfo', this.notifyInfo);
      const { minder } = this.props;
      let { undoDiffs } = this.state;
      const undoDiff = undoDiffs.pop();
      doDiffs.pop();
      if (undoDiff) {
        if (this.notifyInfo instanceof Object) {
          this.props.wsInstance.sendMessage('undo', {
            message: JSON.stringify(undoDiff),
          });
          minder.applyPatches(undoDiff);
        } else {
          minder.applyPatches(JSON.parse(notifyInfo || '{}'));
        }

        this.makeRedoDiff();
      }
      this.setState({ patchLock: false });
    });
  };
  // 重做
  redo = notifyInfo => {
    this.notifyInfo = notifyInfo;
    this.setState({ patchLock: true }, () => {
      const { minder } = this.props;
      let { redoDiffs } = this.state;
      const redoDiff = redoDiffs.pop();

      console.log('pop redoDiffs ?', redoDiffs.length);
      if (redoDiff) {
        if (this.notifyInfo instanceof Object) {
          this.props.wsInstance.sendMessage('redo', {
            message: JSON.stringify(redoDiff),
          });
          minder.applyPatches(redoDiff);
        } else {
          minder.applyPatches(JSON.parse(notifyInfo || '{}'));
        }
        this.makeUndoDiff();
        doDiffs.pop();
      }
      this.setState({ patchLock: false });
    });
  };
  getAndResetPatch = () => {
    const diffs = [...doDiffs];
    doDiffs = [];
    return diffs;
  };
  changed = () => {
    const { patchLock } = this.state;
    if (window.minderData) {
      if (patchLock) return;
      const change = this.makeUndoDiff();
      if (change.changed) {
        this.setState({ redoDiffs: [] });
      }
      return {
        snapshot: change.snapshot,
        patch: this.getAndResetPatch(),
      };
    }
    return null;
  };
  recordDirectChange = (forwardPatches, inversePatches) => {
    if (!forwardPatches.length) return;
    const { undoDiffs, lastSnap } = this.state;
    jsonDiff.applyPatch(lastSnap, forwardPatches, false, true);
    undoDiffs.push(inversePatches);
    doDiffs.push(forwardPatches);
    while (undoDiffs.length > MAX_HISTORY) {
      undoDiffs.shift();
      doDiffs.shift();
    }
    this.setState({ undoDiffs, redoDiffs: [], lastSnap });
    this.getAndResetPatch();
  };
  hasUndo = () => {
    const { undoDiffs } = this.state;
    return !!undoDiffs.length;
  };
  hasRedo = () => {
    const { redoDiffs } = this.state;
    console.log('has redoDiffs ?', redoDiffs.length);
    return !!redoDiffs.length;
  };

  updateSelection = e => {
    const { patchLock } = this.state;
    const { minder } = this.props;
    if (!patchLock) return;
    const patch = e.patch;
    // eslint-disable-next-line default-case
    switch (patch.express) {
      case 'node.add':
        minder.select(patch.node.getChild(patch.index), true);
        break;
      case 'node.remove':
      case 'data.replace':
      case 'data.remove':
      case 'data.add':
        minder.select(patch.node, true);
        break;
    }
  };

  render() {
    const { isLock } = this.props;
    let hasUndo = this.hasUndo();
    let hasRedo = this.hasRedo();
    if (isLock) {
      hasUndo = false;
      hasRedo = false;
    }
    return (
      <div className="nodes-actions do-group">
        <Tooltip title="撤销 (Ctrl + Z)">
          <Button
            aria-label="撤销"
            type="link"
            icon="undo"
            onClick={this.undo}
            disabled={!hasUndo}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl + Y)">
          <Button
            aria-label="重做"
            type="link"
            disabled={!hasRedo}
            icon="redo"
            onClick={this.redo}
          />
        </Tooltip>
      </div>
    );
  }
}
export default DoGroup;
