import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  message,
  Timeline,
  Tabs,
  Badge,
  Upload,
  Popconfirm,
  Progress,
  Descriptions,
  List,
  Radio,
} from 'antd';
import {
  ToolOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  CameraOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { Problem } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const RectificationPage: React.FC = () => {
  const { problems, updateProblem, stores } = useApp();
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRectifyModalOpen, setIsRectifyModalOpen] = useState(false);
  const [isRecheckModalOpen, setIsRecheckModalOpen] = useState(false);
  const [rectifyForm] = Form.useForm();
  const [recheckForm] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');

  const getStatusTag = (status: Problem['status']) => {
    switch (status) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="default">待整改</Tag>;
      case 'rectifying':
        return <Tag icon={<PlayCircleOutlined />} color="processing">整改中</Tag>;
      case 'rechecking':
        return <Tag icon={<EyeOutlined />} color="warning">待复查</Tag>;
      case 'closed':
        return <Tag icon={<CheckCircleOutlined />} color="success">已闭环</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const getRiskTag = (riskLevel: Problem['riskLevel']) => {
    switch (riskLevel) {
      case 'high':
        return <Tag color="error" className="risk-high">高风险</Tag>;
      case 'medium':
        return <Tag color="warning" className="risk-medium">中风险</Tag>;
      case 'low':
        return <Tag color="success" className="risk-low">低风险</Tag>;
      default:
        return <Tag>-</Tag>;
    }
  };

  const getDaysLeft = (deadline: string) => {
    const diff = dayjs(deadline).diff(dayjs(), 'day');
    return diff;
  };

  const getDeadlineStatus = (deadline: string, status: Problem['status']) => {
    if (status === 'closed') return { type: 'success', text: '已完成' };
    const days = getDaysLeft(deadline);
    if (days < 0) return { type: 'error', text: `已逾期 ${Math.abs(days)} 天` };
    if (days <= 1) return { type: 'error', text: `剩 ${days} 天` };
    if (days <= 3) return { type: 'warning', text: `剩 ${days} 天` };
    return { type: 'success', text: `剩 ${days} 天` };
  };

  const filteredProblems = problems.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterRisk !== 'all' && p.riskLevel !== filterRisk) return false;
    if (filterStore !== 'all' && p.storeId !== filterStore) return false;
    return true;
  });

  const handleViewDetail = (problem: Problem) => {
    setSelectedProblem(problem);
    setIsDetailModalOpen(true);
  };

  const handleStartRectify = (problem: Problem) => {
    setSelectedProblem(problem);
    setIsRectifyModalOpen(true);
  };

  const handleSubmitRectify = (values: any) => {
    if (!selectedProblem) return;
    
    const updated: Problem = {
      ...selectedProblem,
      status: 'rechecking',
      rectificationMeasures: values.measures,
    };
    
    updateProblem(updated);
    message.success('整改措施已提交，等待复查');
    setIsRectifyModalOpen(false);
    rectifyForm.resetFields();
  };

  const handleRecheck = (problem: Problem) => {
    setSelectedProblem(problem);
    setIsRecheckModalOpen(true);
  };

  const handleSubmitRecheck = (values: any) => {
    if (!selectedProblem) return;
    
    const updated: Problem = {
      ...selectedProblem,
      status: values.result === 'pass' ? 'closed' : 'rectifying',
      recheckResult: values.result,
      recheckAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      rechecker: '感控督导员',
    };
    
    updateProblem(updated);
    message.success(values.result === 'pass' ? '复查通过，问题已闭环' : '复查不通过，需继续整改');
    setIsRecheckModalOpen(false);
    recheckForm.resetFields();
  };

  const stats = {
    total: problems.length,
    pending: problems.filter((p) => p.status === 'pending').length,
    rectifying: problems.filter((p) => p.status === 'rectifying').length,
    rechecking: problems.filter((p) => p.status === 'rechecking').length,
    closed: problems.filter((p) => p.status === 'closed').length,
    overdue: problems.filter((p) => p.status !== 'closed' && dayjs(p.rectificationDeadline).isBefore(dayjs())).length,
  };

  const rectificationRate = problems.length > 0 ? Math.round((stats.closed / problems.length) * 100) : 0;

  const columns = [
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 280,
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 120,
    },
    {
      title: '器械包',
      dataIndex: 'packageCode',
      key: 'packageCode',
      width: 140,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (level: Problem['riskLevel']) => getRiskTag(level),
    },
    {
      title: '整改截止',
      dataIndex: 'rectificationDeadline',
      key: 'rectificationDeadline',
      width: 120,
      render: (deadline: string, record: Problem) => {
        const status = getDeadlineStatus(deadline, record.status);
        return (
          <div>
            <div>{deadline}</div>
            <Tag color={status.type === 'success' ? 'green' : status.type === 'warning' ? 'orange' : 'red'} style={{ marginTop: 4 }}>
              {status.text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Problem['status']) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Problem) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {(record.status === 'pending') && (
            <Button type="primary" size="small" onClick={() => handleStartRectify(record)}>
              开始整改
            </Button>
          )}
          {record.status === 'rechecking' && (
            <Button type="primary" size="small" onClick={() => handleRecheck(record)}>
              复查
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const storeStats = stores.map((store) => {
    const storeProblems = problems.filter((p) => p.storeId === store.id);
    const closedCount = storeProblems.filter((p) => p.status === 'closed').length;
    const rate = storeProblems.length > 0 ? Math.round((closedCount / storeProblems.length) * 100) : 0;
    return {
      ...store,
      total: storeProblems.length,
      closed: closedCount,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <div className="page-container">
      <div className="page-title">
        <ToolOutlined style={{ color: '#1890ff' }} />
        问题整改管理
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="问题总数"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="待整改"
              value={stats.pending}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="整改中"
              value={stats.rectifying}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="待复查"
              value={stats.rechecking}
              valueStyle={{ color: '#faad14' }}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已闭环"
              value={stats.closed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已逾期"
              value={stats.overdue}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>整体整改完成率：</span>
              <Progress percent={rectificationRate} style={{ flex: 1, maxWidth: 400 }} />
              <span style={{ fontWeight: 700, color: rectificationRate >= 80 ? '#52c41a' : rectificationRate >= 60 ? '#faad14' : '#ff4d4f' }}>
                {rectificationRate}%
              </span>
            </div>
          </Col>
          <Col span={12}>
            <Space>
              <span>状态筛选：</span>
              <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 120 }} size="small">
                <Option value="all">全部</Option>
                <Option value="pending">待整改</Option>
                <Option value="rectifying">整改中</Option>
                <Option value="rechecking">待复查</Option>
                <Option value="closed">已闭环</Option>
              </Select>
              <span>风险等级：</span>
              <Select value={filterRisk} onChange={setFilterRisk} style={{ width: 120 }} size="small">
                <Option value="all">全部</Option>
                <Option value="high">高风险</Option>
                <Option value="medium">中风险</Option>
                <Option value="low">低风险</Option>
              </Select>
              <span>门店：</span>
              <Select value={filterStore} onChange={setFilterStore} style={{ width: 150 }} size="small" showSearch>
                <Option value="all">全部门店</Option>
                {stores.map((s) => (
                  <Option key={s.id} value={s.id}>{s.name}</Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={18}>
          <Card size="small" title="整改问题清单">
            <Table
              columns={columns}
              dataSource={filteredProblems}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize: 8,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条问题`,
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" title="各门店整改率排名">
            <List
              dataSource={storeStats}
              renderItem={(item, index) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: index < 3 ? 700 : 500 }}>
                        <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'default'} style={{ marginRight: 8 }}>
                          {index + 1}
                        </Tag>
                        {item.name}
                      </span>
                      <span style={{ color: item.rate >= 80 ? '#52c41a' : item.rate >= 60 ? '#faad14' : '#ff4d4f', fontWeight: 600 }}>
                        {item.rate}%
                      </span>
                    </div>
                    <Progress percent={item.rate} size="small" showInfo={false} />
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                      {item.closed}/{item.total} 项已完成
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="问题详情"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedProblem && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="问题描述" span={2}>
                {selectedProblem.description}
              </Descriptions.Item>
              <Descriptions.Item label="门店">{selectedProblem.storeName}</Descriptions.Item>
              <Descriptions.Item label="器械包">{selectedProblem.packageCode}</Descriptions.Item>
              <Descriptions.Item label="问题分类">{selectedProblem.category}</Descriptions.Item>
              <Descriptions.Item label="风险等级">
                {getRiskTag(selectedProblem.riskLevel)}
              </Descriptions.Item>
              <Descriptions.Item label="整改截止">
                {selectedProblem.rectificationDeadline}
                <Tag color={getDeadlineStatus(selectedProblem.rectificationDeadline, selectedProblem.status).type === 'success' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                  {getDeadlineStatus(selectedProblem.rectificationDeadline, selectedProblem.status).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedProblem.status)}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{selectedProblem.createdBy}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedProblem.createdAt}</Descriptions.Item>
            </Descriptions>

            <Timeline>
              <Timeline.Item color="blue">
                <p><strong>问题发现</strong> - {selectedProblem.createdAt}</p>
                <p>{selectedProblem.description}</p>
              </Timeline.Item>
              {selectedProblem.rectificationMeasures && (
                <Timeline.Item color="green">
                  <p><strong>提交整改措施</strong></p>
                  <p>{selectedProblem.rectificationMeasures}</p>
                </Timeline.Item>
              )}
              {selectedProblem.recheckAt && (
                <Timeline.Item color={selectedProblem.recheckResult === 'pass' ? 'green' : 'red'}>
                  <p><strong>复查{selectedProblem.recheckResult === 'pass' ? '通过' : '不通过'}</strong> - {selectedProblem.recheckAt}</p>
                  <p>复查人：{selectedProblem.rechecker}</p>
                </Timeline.Item>
              )}
            </Timeline>
          </div>
        )}
      </Modal>

      <Modal
        title="提交整改措施"
        open={isRectifyModalOpen}
        onCancel={() => setIsRectifyModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={rectifyForm} layout="vertical" onFinish={handleSubmitRectify}>
          <Form.Item
            label="整改措施"
            name="measures"
            rules={[{ required: true, message: '请描述整改措施' }]}
          >
            <TextArea rows={6} placeholder="请详细描述整改措施和计划..." />
          </Form.Item>

          <Form.Item label="整改照片">
            <div className="photo-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="photo-item">
                  <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
                    <CameraOutlined style={{ fontSize: 20 }} />
                    <div style={{ fontSize: 12, marginTop: 4 }}>照片 {i + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsRectifyModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交整改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="复查确认"
        open={isRecheckModalOpen}
        onCancel={() => setIsRecheckModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={recheckForm} layout="vertical" onFinish={handleSubmitRecheck}>
          <Form.Item
            label="复查结果"
            name="result"
            rules={[{ required: true, message: '请选择复查结果' }]}
          >
            <Radio.Group>
              <Radio value="pass">
                <span style={{ color: '#52c41a' }}><CheckCircleOutlined /> 整改合格，予以闭环</span>
              </Radio>
              <Radio value="fail">
                <span style={{ color: '#ff4d4f' }}><CloseCircleOutlined /> 整改不到位，继续整改</span>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="复查意见" name="comment">
            <TextArea rows={4} placeholder="请输入复查意见..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsRecheckModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认复查
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RectificationPage;
