import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import Editor from '../src/components/react-mindmap-editor';

// 真实编辑器，只有网络边界替换成隔离传输，禁止写入真实执行记录。
window.mountTestEditor = (data, execution) => {
  window.__fixtureData = data;
  window.__sentMessages = [];
  return new Promise(resolve => {
    ReactDOM.render(
      <Editor
        ref={instance => { if (instance) resolve(instance); }}
        type="edit"
        editorStyle={{ width: '100%', height: '900px' }}
        progressShow={execution}
        wsUrl="fixture://local"
        wsParam={{ query: { caseId: 'fixture', recordId: execution ? 'fixture-record' : undefined } }}
        planCycle="浏览器隔离验收"
      />,
      document.getElementById('map'),
    );
  });
};

window.unmountTestEditor = () => ReactDOM.unmountComponentAtNode(document.getElementById('map'));
