import React from 'react';
import PropTypes from 'prop-types';
import io from './assets/socketio/socket.io.js';
import { notification } from 'antd';
import { prepareLargeMindMap } from './largeMindMap';
import { normalizeRightMindMap } from './executionPanelUtils';
// import { AsyncStorage } from 'react-native-community/async-storage';

class Socket extends React.Component {

    constructor(props) {
        super(props);
        this.state = { ws : io(this.props.url, props.wsParam) };
        this.sendMessage = this.sendMessage.bind(this);
        this.setupSocket = this.setupSocket.bind(this);
        this.leaveListener = this.leaveListener.bind(this);
    }

    setupSocket() {
        var websocket = this.state.ws;

        websocket.on ('connect', () => {
            if (typeof this.props.onOpen === 'function') this.props.onOpen();
        });

        websocket.on ('reconnect', () => {
            websocket.disconnect();
            notification.error({ message: 'Version of client is not equal to server, please refresh.'});
        });

        websocket.on('disconnect', () => {
            if (typeof this.props.onClose === 'function') this.props.onClose();
            console.log('disconnect happened.')
            if (!this.isExecutionRecord()) {
                localStorage.setItem(JSON.stringify(this.props.wsParam), JSON.stringify(this.props.wsMinder.exportJson()));
            }
        });

        websocket.on('connect_notify_event', evt => {
            console.log('connect notify ', evt.message);
            if (typeof this.props.handleWsUserStat === 'function') this.props.handleWsUserStat(evt.message);
        });

        websocket.on('open_event', evt => {
            const recv = normalizeRightMindMap(JSON.parse(evt.message || '{}'));
            const dataJson = prepareLargeMindMap(recv).data;

            if (this.isExecutionRecord()) {
                localStorage.removeItem(JSON.stringify(this.props.wsParam));
                window.minderData = undefined;
                this.props.wsMinder.importJson(dataJson);
                window.minderData = dataJson;
                this.expectedBase = this.props.wsMinder.getBase();
                return;
            }
            
            try {
                const cacheContent = prepareLargeMindMap(
                    JSON.parse(localStorage.getItem(JSON.stringify(this.props.wsParam)))
                ).data;
                if (cacheContent == undefined) {
                    throw 'cache is empty'; 
                }
                if (dataJson.base > cacheContent.base) { // 服务端版本高
                    throw 'choose server'; 
                } else { // 客户端版本高 或者 相同
                    // do nothing
                    // websocket.sendMessage('edit', { caseContent: JSON.stringify(cacheContent), patch: null, caseVersion: caseContent.base });
                } 
                window.minderData = undefined;
                this.props.wsMinder.importJson(cacheContent);
                window.minderData = cacheContent;
                this.expectedBase = this.props.wsMinder.getBase();
                // todo 测试版本，暂不清除
                localStorage.removeItem(JSON.stringify(this.props.wsParam));
            } catch (e) {
                if (evt.message === JSON.stringify(this.props.wsMinder.exportJson())) {
                  return;
                } 

                window.minderData = undefined;
                this.props.wsMinder.importJson(dataJson);
                window.minderData = dataJson;
                this.expectedBase = this.props.wsMinder.getBase();

                // this.props.onMessage(evt.data);
            }
        });

        websocket.on('edit_ack_event', evt => {
            const recv = JSON.parse(evt.message || '{}');
            // 如果json解析没有root节点
            this.props.wsMinder.setStatus('readonly');
            const recvPatches = this.travere(recv);
            // const recvBase = recvPatches.filter((item) => item.path === '/base')[0]?.value;
            // const recvFromBase = recvPatches.filter((item) => item.path === '/base')[0]?.fromValue;
            try {
                this.props.wsMinder.applyPatches(recvPatches);
            } catch(e) {
                alert('客户端接受应答消息异常，请刷新重试');
            }
            // this.props.wsMinder._status='nomal';
        });

        websocket.on('edit_notify_event', evt => {
            const recv = JSON.parse(evt.message || '{}');
            // 如果json解析没有root节点
            try {
                this.props.wsMinder.setStatus('readonly');
                const recvPatches = this.travere(recv);
                this.props.wsMinder.applyPatches(recvPatches);
            } catch(e) {
                alert('客户端接受通知消息异常，请刷新重试');
            }
            
        });
        websocket.on('undo', evt => {
            console.log('undo info', evt.message);
            try {
                if (typeof this.props.handleUndoAck === 'function') {
                    this.props.handleUndoAck(evt.message);
                }
            } catch(e) {
                alert('客户端接受通知消息异常，请刷新重试');
            }
        })
        websocket.on('redo', evt => {
            console.log('redo info', evt.message);
            try {
                if (typeof this.props.handleRedoAck === 'function') {
                    this.props.handleRedoAck(evt.message);
                }
            } catch(e) {
                alert('客户端接受通知消息异常，请刷新重试');
            }
        })
        // message 0:加锁；1：解锁；2:加/解锁成功；3:加/解锁失败
        websocket.on('lock', evt => {
            console.log('lock info', evt.message);
            if (typeof this.props.handleLock === 'function') this.props.handleLock(evt.message);
        });

        websocket.on('connect_error', e => {
            console.log('connect_error', e);
            websocket.disconnect();
        });

        websocket.on('warning', e => {
            notification.error({ message: 'server process patch failed, please refresh'});
        });
    }

    travere = (arrPatches) => {
        var patches = [];
        for (var i = 0; i < arrPatches.length; i++) {
          if (arrPatches[i].op === undefined) {
            for (var j = 0; j < arrPatches[i].length; j++) {
              patches.push(arrPatches[i][j]);
            }
          } else {
            patches.push(arrPatches[i]);
          }
        }
        return patches;
    };

    sendMessage(type, message) {
        let websocket = this.state.ws;
        // var jsonObject = {userName: 'userName', message: message};
        websocket.emit(type, message);
    }

    isExecutionRecord = () => {
        const query = this.props.wsParam && this.props.wsParam.query;
        return Boolean(query && query.recordId && query.recordId !== 'undefined');
    };

    leaveListener(e) {
        e.preventDefault();
        e.returnValue = '内容将被存储到缓存，下次打开相同用例优先从缓存获取！';
        if (!this.isExecutionRecord() && this.props.wsMinder.getBase() > 16) {
            localStorage.setItem(JSON.stringify(this.props.wsParam), JSON.stringify(this.props.wsMinder.exportJson()));
        }
    }

    componentDidMount() {
        console.log(' -- componentDidMount -- ')
        this.setupSocket();
        window.addEventListener('beforeunload', this.leaveListener);
    }

    componentWillUnmount() {
        window.removeEventListener('beforeunload', this.leaveListener);

        this.state.ws.disconnect();
        console.log(' -- componentWillUnmount -- ');
    }

    render() {
        return (<div></div>)
    }
}

Socket.propTypes = {
    url: PropTypes.string.isRequired,
    onMessage: PropTypes.func.isRequired,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    handleLock: PropTypes.func,
    handleUndoAck: PropTypes.func,
    handleRedoAck: PropTypes.func,
    handleWsUserStat: PropTypes.func
}

export default Socket;
