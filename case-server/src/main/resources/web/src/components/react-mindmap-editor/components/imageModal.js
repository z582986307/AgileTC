import React from 'react';
import { Modal, Form, Input, Upload, Icon, Button, message } from 'antd';
import { getUploadedImageUrl, getClipboardImage } from './imageUpload';

const ImageModal = (props) => {
  const defaultObj = props.minder.queryCommandValue('Image');
  const { getFieldDecorator } = props.form;
  const { baseUrl = '', uploadUrl = '' } = props;
  const [uploadedUrl, setUploadedUrl] = React.useState(defaultObj.url || '');
  const [busy, setBusy] = React.useState(false);
  const [uploadVersion, setUploadVersion] = React.useState(0);
  const uploadSequence = React.useRef(0);

  const uploadImage = file => {
    const data = new FormData();
    data.append('file', file);
    return fetch(baseUrl + uploadUrl, {
      method: 'POST',
      credentials: 'include',
      body: data,
    }).then(response => {
      if (!response.ok) throw new Error('图片上传失败，请重试');
      return response.json();
    }).then(getUploadedImageUrl);
  };

  const checkImage = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error('图片地址无法加载，请确认地址指向图片文件'));
    image.src = url;
  });

  const onOk = () => {
    const { form, minder, onCancel } = props;
    form.validateFields(['title'], (err, values) => {
      if (err) {
        return;
      }
      if (!uploadedUrl) {
        message.error('请先上传或粘贴图片');
        return;
      }
      setBusy(true);
      checkImage(uploadedUrl).then(() => {
        minder.execCommand('image', uploadedUrl, values.title);
        setTimeout(onCancel, 300);
      }).catch(error => message.error(error.message)).then(() => setBusy(false));
    });
  };
  const selectImage = (file, success) => {
    const sequence = ++uploadSequence.current;
    setBusy(true);
    uploadImage(file).then(url => checkImage(url).then(() => url)).then(url => {
      if (sequence !== uploadSequence.current) return;
      setUploadedUrl(url);
      if (success) success({ success: 1, data: [{ url }] });
    }).catch(error => {
      if (sequence === uploadSequence.current) message.error(error.message);
    }).then(() => {
      if (sequence === uploadSequence.current) setBusy(false);
    });
  };
  const onPaste = event => {
    const file = getClipboardImage(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    selectImage(file);
  };

  return (
    <Modal
      title="插入图片"
      className="testcasemanage-modal"
      visible={props.visible}
      onOk={onOk}
      onCancel={props.onCancel}
      confirmLoading={busy}
      okButtonProps={{ disabled: busy }}
    >
      <Form layout="vertical">
        <Form.Item label="上传图片">
          <Upload key={uploadVersion} accept="image/*" showUploadList={false} disabled={busy}
            customRequest={({ file, onSuccess }) => selectImage(file, onSuccess)}>
            <Button aria-label="上传图片" disabled={busy}><Icon type="upload" />上传图片</Button>
          </Upload>
        </Form.Item>
        <Form.Item label="粘贴图片">
          <div aria-label="粘贴图片" role="textbox" tabIndex={0} onPaste={onPaste}
            style={{ minHeight: 80, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 10, color: '#8c8c8c' }}>
            点击这里，按 Ctrl+V 粘贴图片
          </div>
        </Form.Item>
        {uploadedUrl && <Form.Item label="图片预览">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <img aria-label="图片预览" src={uploadedUrl} alt="待插入图片预览"
              style={{ maxWidth: 'calc(100% - 72px)', maxHeight: 180, objectFit: 'contain', border: '1px solid #e8e8e8', borderRadius: 8 }} />
            <Button aria-label="删除已选图片" disabled={busy} onClick={() => {
              uploadSequence.current += 1;
              setUploadedUrl('');
              setUploadVersion(version => version + 1);
            }}>删除</Button>
          </div>
        </Form.Item>}

        <Form.Item label="提示文本">
          {getFieldDecorator('title', {
            initialValue: defaultObj.title,
          })(<Input placeholder="选填：鼠标在图片上悬停时提示的文本" />)}
        </Form.Item>
      </Form>
    </Modal>
  );
};
const WrappedImageForm = Form.create({ name: 'image' })(ImageModal);
export default WrappedImageForm;
