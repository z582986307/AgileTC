/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { Row, Button, Col, message, Tooltip } from 'antd';
import './index.scss';
import request from '@/utils/axios';
import getQueryString from '@/utils/getCookies';
import moment from 'moment';
import { getSocketUrl } from '../../react-mindmap-editor/util/socketUrl';
import AgileTCEditor from '../../react-mindmap-editor';

const getCookies = getQueryString.getCookie;
/* global staffNamePY */
export default class CaseMgt extends React.Component {
  static propTypes = {
    params: PropTypes.any,
    form: PropTypes.any,
    productId: PropTypes.any,
    updateCallBack: PropTypes.any,
    activeProductObj: PropTypes.any,
  };
  constructor(props) {
    super(props);
    this.state = {
      modaltitle: '',
      visibleStatus: false,
      visible: false,
      title: '',
      caseContent: '',
      id: 0,
      productId: 0,
      recordDetail: null,
      casedetail: null,
      requirementObj: [],
    };
  }
  componentDidMount() {
    const { iscore } = this.props.match.params;
    if (iscore === '3') {
      this.getContentById();
    } else {
      this.getCaseById();
    }
  }

  componentWillMount() {
    // 拦截判断是否离开当前页面
    window.addEventListener('beforeunload', this.handleAutoSave);
  }
  componentWillUnmount() {
    // 销毁拦截判断是否离开当前页面
    window.removeEventListener('beforeunload', this.handleAutoSave);
  //  this.handleAutoSave();
  }
  ///case/getRequirement
  handleAutoSave = () => {
    // e.preventDefault();
    // e.returnValue = '内容会被存储到浏览器缓存中！';
    const { iscore } = this.props.match.params;
    const minderData = this.editorNode
      ? this.editorNode.getAllData()
      : { base: 0 };
    // 是否有ws链接断开弹窗
    const hasBreak =
      document.getElementsByClassName('ws-warning') &&
      document.getElementsByClassName('ws-warning').length > 0;
    if (Number(iscore) !== 2 && minderData && !hasBreak) {
      // 非冒烟case才可保存
      if (Number(minderData.base) > 1) {
        message.warn('即将离开页面，自动保存当前用例。');
        this.updateCase();
      }
    }

  };
  getRequirementsById = requirementIds => {
    // request(`${this.props.oeApiPrefix}/business-lines/requirements`, {
    //   method: 'GET',
    //   params: { requirementIds: requirementIds },
    // }).then(res => {
    //   this.setState({ requirementObj: res, loading: false });
    // });
  };

  getCaseById = () => {
    let url = `${this.props.doneApiPrefix}/case/getCaseInfo`;
    request(url, {
      method: 'GET',
      params: { id: this.props.match.params.caseId },
    }).then(res => {
      if (res.code == 200) {
        this.setState(
          {
            casedetail: res.data,
          },
          () => {
            this.state.casedetail.requirementId &&
              this.getRequirementsById(this.state.casedetail.requirementId);
          },
        );
      } else {
        message.error(res.msg);
        this.props.history.push('/case/caseList/1');
      }
    });
  };

  ///record/getContentById
  getContentById = () => {
    let url = `${this.props.doneApiPrefix}/record/getRecordInfo`;

    request(url, {
      method: 'GET',
      params: { id: this.props.match.params.itemid },
    }).then(res => {
      if (res.code == 200) {
        this.setState({ recordDetail: res.data });
      } else {
        message.error(res.msg);
      }
    });
  };

  //保存用例
  updateCase = () => {
    let recordId =
      this.props.match.params.itemid == 'undefined'
        ? undefined
        : this.props.match.params.itemid;

    const param = {
      id: this.props.match.params.caseId,
      title: '更新内容，实际不会保存title',
      recordId,
      modifier: getCookies('username'),
      caseContent: JSON.stringify(this.editorNode.getAllData()),
    };
    let url = `${this.props.doneApiPrefix}/case/update`;
    request(url, { method: 'POST', body: param }).then(res => {
      if (res.code == 200) {
        message.success('保存内容成功');
      } else {
        message.error(res.msg);
      }
    });
  };

  //清除执行记录
  clearRecord = () => {
    const params = {
      id: this.props.match.params.itemid,
      modifier: getCookies('username'),
    };

    let url = `${this.props.doneApiPrefix}/record/clear`;
    request(url, { method: 'POST', body: params }).then(res => {
      if (res.code == 200) {
        message.success('清除执行记录成功');
        this.editorNode.setEditerData(JSON.parse(res.data.caseContent));
      } else {
        message.error(res.msg);
      }
    });
  };

  render() {
    //this.props.match.params.iscore  0:需求case  3:执行记录详情
    const { match } = this.props;
    const { iscore, caseId, itemid } = match.params;
    const user = getCookies('username');
    const { recordDetail, casedetail } = this.state;
    let readOnly = false;
    let progressShow = false;
    let addFactor = false;
    if (iscore === '0' || iscore === '1') {
      readOnly = false;
      progressShow = false;
      addFactor = true;
    } else {
      readOnly = true;
      progressShow = true;
      addFactor = false;
    }
    const planCycle = recordDetail
      ? `${recordDetail.expectStartTime
          ? moment(recordDetail.expectStartTime).format('YYYY/MM/DD')
          : '未设置'} - ${recordDetail.expectEndTime
          ? moment(recordDetail.expectEndTime).format('YYYY/MM/DD')
          : '未设置'}`
      : '';
    return (
      <div style={{ position: 'relative', minHeight: '80vh' }}>
        <div className="case-detail-heading">
          <Button
            type="link"
            icon="arrow-left"
            className="case-detail-back"
            onClick={() => window.history.back()}
          >
            返回
          </Button>
          <div className="case-detail-meta">
            <span className="case-detail-title">
              用例详情：
              {recordDetail ? recordDetail.title : ''}
              {casedetail ? casedetail.title : ''}
            </span>
            <span className="case-detail-requirement">
              关联需求：
              {(recordDetail && recordDetail.requirementIds) ||
                (casedetail && casedetail.requirementId) ||
                '未关联'}
            </span>
          </div>
        </div>
        <div className="case-detail-content">
          {(recordDetail && (
            <Row>
              <Col span={6} className="description-case elipsis-case">
                <Tooltip
                  title={recordDetail.description}
                  placement="bottomLeft"
                >
                  {recordDetail.description}
                </Tooltip>
              </Col>
            </Row>
          )) ||
            null}

          {(casedetail && (
            <Row>
              <Col span={6} className="description-case elipsis-case">
                <Tooltip title={casedetail.description} placement="topLeft">
                  {casedetail.description}
                </Tooltip>
              </Col>
            </Row>
          )) ||
            null}
           
          <AgileTCEditor
            ref={editorNode => (this.editorNode = editorNode)}
            tags={['前置条件', '执行步骤', '预期结果']}
            iscore={iscore}
            progressShow={progressShow}
            planCycle={planCycle}
            readOnly={readOnly}
            mediaShow={!progressShow}
            editorStyle={{ height: 'calc(100vh - 100px)' }}
            toolbar={{
              image: true,
              theme: ['classic-compact', 'fresh-blue', 'fresh-green-compat'],
              template: ['default', 'right', 'fish-bone'],
              noteTemplate: '# test',
              addFactor,
            }}
            baseUrl=""
            uploadUrl="/api/file/uploadAttachment"
            wsUrl={getSocketUrl(window.location)}
            wsParam = {{ transports:['websocket','xhr-polling','jsonp-polling'], query: { caseId: caseId, recordId: itemid, user: user }}}
            // wsUrl={`ws://localhost:8094/api/case/${caseId}/${itemid}/${iscore}/${user}`}
            onSave={
              Number(iscore) !== 2
                ? () => {
                    message.loading('保存中......', 1);
                    this.updateCase();
                  }
                : null
            }
          />
        </div>
      </div>
    );
  }
}
