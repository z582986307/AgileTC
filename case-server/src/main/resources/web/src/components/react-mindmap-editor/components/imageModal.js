import React from 'react';
import { Modal, Form, Input, Radio, Upload, Icon, message } from 'antd';
import { getUploadedImageUrl, getClipboardImage } from './imageUpload';

const ImageModal = (props) => {
  const defaultObj = props.minder.queryCommandValue('Image');
  const { getFieldDecorator, getFieldValue } = props.form;
  const { baseUrl = '', uploadUrl = '' } = props;
  const [uploadedUrl, setUploadedUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);

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
    const fields = getFieldValue('type') === 'upload' ? ['type', 'title'] : ['type', 'url', 'title'];
    form.validateFields(fields, (err, values) => {
      if (err) {
        console.log('Received values of form: ', values);
        return;
      }
      const url = values.type === 'upload' ? uploadedUrl : values.url;
      if (!url) {
        message.error(values.type === 'upload' ? '请先上传或粘贴图片' : '请输入图片地址');
        return;
      }
      setBusy(true);
      checkImage(url).then(() => {
        minder.execCommand('image', url, values.title);
        setTimeout(onCancel, 300);
      }).catch(error => message.error(error.message)).then(() => setBusy(false));
    });
  };
  const onPaste = event => {
    const file = getClipboardImage(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    setBusy(true);
    uploadImage(file).then(url => {
      setUploadedUrl(url);
      message.success('图片已粘贴并上传');
    }).catch(error => message.error(error.message)).then(() => setBusy(false));
  };

  return (
    <Modal
      title="图片"
      className="testcasemanage-modal"
      visible={props.visible}
      onOk={onOk}
      onCancel={props.onCancel}
      confirmLoading={busy}
      okButtonProps={{ disabled: busy }}
    >
      <Form layout="vertical">
        <Form.Item>
          {getFieldDecorator('type', {
            initialValue: 'out',
          })(
            <Radio.Group>
              <Radio.Button value="out">外链图片</Radio.Button>
              <Radio.Button value="upload">上传图片</Radio.Button>
            </Radio.Group>
          )}
        </Form.Item>
        {getFieldValue('type') === 'out' ? (
          <Form.Item label="图片地址">
            {getFieldDecorator('url', {
              rules: [
                {
                  required: true,
                  message: '必填：以 http(s):// 或 ftp:// 开头',
                },
              ],
              initialValue: defaultObj.url,
            })(<Input placeholder="必填：以 http(s):// 或 ftp:// 开头" />)}
          </Form.Item>
        ) : (
          <Form.Item label="上传图片">
            <div tabIndex={0} onPaste={onPaste} aria-label="点击上传或粘贴图片">
              <Upload.Dragger
                accept="image/*"
                showUploadList={false}
                disabled={busy}
                customRequest={({ file, onSuccess, onError }) => {
                  setBusy(true);
                  uploadImage(file).then(url => {
                    setUploadedUrl(url);
                    onSuccess({ success: 1, data: [{ url }] });
                  }).catch(error => {
                    message.error(error.message);
                    onError(error);
                  }).then(() => setBusy(false));
                }}
              >
                <p className="ant-upload-drag-icon"><Icon type="inbox" /></p>
                <p className="ant-upload-text">点击上传，或在此按 Ctrl+V 粘贴图片</p>
                {uploadedUrl && <p className="ant-upload-hint">图片已上传</p>}
              </Upload.Dragger>
            </div>
          </Form.Item>
        )}

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
