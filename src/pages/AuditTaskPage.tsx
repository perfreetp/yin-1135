import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { AuditTask } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const AuditTaskPage: React.FC = () => {
  const { auditTasks, stores, generateAuditTask, setCurrentTask, getTaskRecords, getTaskProblems } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedStore, setSelectedStore] = useState<string>('');

  const getStatusTag = (status: AuditTask['status']) => {
    switch (status) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="default">待执行</Tag>;
      case 'in_progress':
        return <Tag icon={<PlayCircleOutlined />} color="processing">进行中</Tag>;
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">已完成</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const getRiskTag = (riskLevel?: AuditTask['riskLevel']) => {
    if (!riskLevel) return <Tag>-</Tag>;
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

  const handleCreateTask = (values: any) => {
    const newTask = generateAuditTask({
      storeId: values.storeId,
      taskName: values.taskName,
      planDate: values.planDate.format('YYYY-MM-DD'),
      packageCount: values.packageCount,
      auditor: values.auditor || '感控督导员',
    });
    message.success(`抽检任务创建成功：${newTask.taskCode}`);
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleStartTask = (task: AuditTask) => {
    setCurrentTask(task);
    message.info(`已选择任务：${task.taskName}，请前往现场核验`);
  };

  const columns = [
    {
      title: '任务编号',
      dataIndex: 'taskCode',
      key: 'taskCode',
      width: 180,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 140,
    },
    {
      title: '计划日期',
      dataIndex: 'planDate',
      key: 'planDate',
      width: 120,
    },
    {
      title: '抽检数量',
      dataIndex: 'packageCount',
      key: 'packageCount',
      width: 100,
      align: 'center' as const,
      render: (count: number) => `${count} 包`,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (level: AuditTask['riskLevel']) => getRiskTag(level),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AuditTask['status']) => getStatusTag(status),
    },
    {
      title: '督导员',
      dataIndex: 'auditor',
      key: 'auditor',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: AuditTask) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} size="small">
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              onClick={() => handleStartTask(record)}
            >
              开始核验
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              onClick={() => handleStartTask(record)}
            >
              继续核验
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const stats = {
    total: auditTasks.length,
    pending: auditTasks.filter(t => t.status === 'pending').length,
    inProgress: auditTasks.filter(t => t.status === 'in_progress').length,
    completed: auditTasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="page-container">
      <div className="page-title">
        <FileDoneOutlined style={{ color: '#1890ff' }} />
        抽检任务管理
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="任务总数"
              value={stats.total}
              prefix={<FileDoneOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="待执行"
              value={stats.pending}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={stats.inProgress}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="抽检任务列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            新建抽检任务
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={auditTasks}
          rowKey="id"
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="新建抽检任务"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{
            packageCount: 10,
            planDate: dayjs(),
            auditor: '感控督导员',
          }}
        >
          <Form.Item
            label="选择门店"
            name="storeId"
            rules={[{ required: true, message: '请选择门店' }]}
          >
            <Select
              placeholder="请选择门店"
              onChange={(value) => setSelectedStore(value)}
              showSearch
              optionFilterProp="children"
            >
              {stores.map((store) => (
                <Option key={store.id} value={store.id}>
                  {store.name} - {store.region}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="任务名称"
            name="taskName"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：6月第2周例行抽检" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="计划日期"
                name="planDate"
                rules={[{ required: true, message: '请选择计划日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="抽检数量"
                name="packageCount"
                rules={[{ required: true, message: '请输入抽检数量' }]}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="督导员" name="auditor">
            <Input placeholder="请输入督导员姓名" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建任务
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AuditTaskPage;
