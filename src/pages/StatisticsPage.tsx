import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  List,
  Tabs,
  Collapse,
  Badge,
  Select,
  DatePicker,
  Space,
  Avatar,
  Button,
  Modal,
  message,
  Alert,
} from 'antd';
import {
  BarChartOutlined,
  TrophyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SafetyOutlined,
  BulbOutlined,
  ToolOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../context/AppContext';
import { Problem, CommonProblem, AuditTask } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const StatisticsPage: React.FC = () => {
  const { problems, auditTasks, auditRecords, stores, commonProblems, getTaskRecords, getTaskProblems } = useApp();
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedProblem, setSelectedProblem] = useState<CommonProblem | null>(null);
  const [isProblemDetailOpen, setIsProblemDetailOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AuditTask | null>(null);

  const totalTasks = auditTasks.length;
  const completedTasks = auditTasks.filter((t) => t.status === 'completed').length;
  const totalProblems = problems.length;
  const closedProblems = problems.filter((p) => p.status === 'closed').length;
  const rectificationRate = totalProblems > 0 ? Math.round((closedProblems / totalProblems) * 100) : 0;

  const highRiskCount = problems.filter((p) => p.riskLevel === 'high').length;
  const mediumRiskCount = problems.filter((p) => p.riskLevel === 'medium').length;
  const lowRiskCount = problems.filter((p) => p.riskLevel === 'low').length;

  const highRiskTasks = auditTasks.filter((t) => t.status === 'completed' && t.riskLevel === 'high').length;
  const mediumRiskTasks = auditTasks.filter((t) => t.status === 'completed' && t.riskLevel === 'medium').length;
  const lowRiskTasks = auditTasks.filter((t) => t.status === 'completed' && t.riskLevel === 'low').length;
  const pendingRiskTasks = auditTasks.filter((t) => t.status === 'completed' && !t.riskLevel).length;

  const storeRankings = useMemo(() => {
    return stores.map((store) => {
      const storeProblems = problems.filter((p) => p.storeId === store.id);
      const storeTasks = auditTasks.filter((t) => t.storeId === store.id);
      const storeRecords = auditRecords.filter((r) => {
        const task = auditTasks.find((t) => t.id === r.taskId);
        return task?.storeId === store.id;
      });
      const passCount = storeRecords.filter((r) => r.overallResult === 'pass').length;
      const passRate = storeRecords.length > 0 ? Math.round((passCount / storeRecords.length) * 100) : 0;
      const closedCount = storeProblems.filter((p) => p.status === 'closed').length;
      const problemRectRate = storeProblems.length > 0 ? Math.round((closedCount / storeProblems.length) * 100) : 0;
      
      const highRiskTaskCount = storeTasks.filter((t) => t.riskLevel === 'high').length;
      const riskPenalty = highRiskTaskCount * 10;
      
      const score = Math.round(passRate * 0.4 + problemRectRate * 0.3 + (100 - storeProblems.length * 2) * 0.2 + (100 - riskPenalty) * 0.1);
      
      const avgRiskLevel = storeTasks.filter((t) => t.status === 'completed' && t.riskLevel).length > 0
        ? storeTasks.filter((t) => t.status === 'completed' && t.riskLevel === 'high').length > 0
          ? 'high'
          : storeTasks.filter((t) => t.status === 'completed' && t.riskLevel === 'medium').length > 0
            ? 'medium'
            : 'low'
        : undefined;
      
      return {
        storeId: store.id,
        storeName: store.name,
        region: store.region,
        auditCount: storeTasks.length,
        passRate,
        problemCount: storeProblems.length,
        rectificationRate: problemRectRate,
        highRiskTaskCount,
        avgRiskLevel,
        score: Math.max(0, Math.min(100, score)),
        rank: 0,
      };
    }).sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));
  }, [problems, auditTasks, auditRecords, stores]);

  const problemTrendData = useMemo(() => {
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const dayProblems = problems.filter((p) => dayjs(p.createdAt).format('YYYY-MM-DD') === date);
      const dayRectified = problems.filter((p) => p.recheckAt && dayjs(p.recheckAt).format('YYYY-MM-DD') === date && p.status === 'closed');
      last14Days.push({
        date,
        problemCount: dayProblems.length,
        rectifiedCount: dayRectified.length,
      });
    }
    return last14Days;
  }, [problems]);

  const taskRiskTrendData = useMemo(() => {
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const dayTasks = auditTasks.filter((t) => t.status === 'completed' && dayjs(t.createdAt).format('YYYY-MM-DD') === date);
      last14Days.push({
        date,
        high: dayTasks.filter((t) => t.riskLevel === 'high').length,
        medium: dayTasks.filter((t) => t.riskLevel === 'medium').length,
        low: dayTasks.filter((t) => t.riskLevel === 'low').length,
      });
    }
    return last14Days;
  }, [auditTasks]);

  const problemCategoryStats = useMemo(() => {
    const categories: Record<string, number> = {};
    problems.forEach((p) => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [problems]);

  const topProblems = useMemo(() => {
    return [...commonProblems].sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, 5);
  }, [commonProblems]);

  const filteredTasks = useMemo(() => {
    let tasks = [...auditTasks];
    if (selectedStore !== 'all') {
      tasks = tasks.filter((t) => t.storeId === selectedStore);
    }
    return tasks.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  }, [auditTasks, selectedStore]);

  const getTaskStatusTag = (status: AuditTask['status']) => {
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

  const getRiskTag = (level?: CommonProblem['riskLevel']) => {
    if (!level) return <Tag color="default">-</Tag>;
    switch (level) {
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

  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['发现问题', '完成整改'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: problemTrendData.map((d) => d.date.slice(5)),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '发现问题',
        type: 'line',
        data: problemTrendData.map((d) => d.problemCount),
        smooth: true,
        itemStyle: { color: '#ff4d4f' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
              { offset: 1, color: 'rgba(255, 77, 79, 0)' },
            ],
          },
        },
      },
      {
        name: '完成整改',
        type: 'line',
        data: problemTrendData.map((d) => d.rectifiedCount),
        smooth: true,
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0)' },
            ],
          },
        },
      },
    ],
  };

  const riskPieOption = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '风险等级分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: highRiskCount, name: '高风险', itemStyle: { color: '#ff4d4f' } },
          { value: mediumRiskCount, name: '中风险', itemStyle: { color: '#faad14' } },
          { value: lowRiskCount, name: '低风险', itemStyle: { color: '#52c41a' } },
        ],
      },
    ],
  };

  const taskRiskPieOption = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '任务风险等级分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: highRiskTasks, name: '高风险任务', itemStyle: { color: '#ff4d4f' } },
          { value: mediumRiskTasks, name: '中风险任务', itemStyle: { color: '#faad14' } },
          { value: lowRiskTasks, name: '低风险任务', itemStyle: { color: '#52c41a' } },
        ],
      },
    ],
  };

  const taskRiskTrendOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['高风险', '中风险', '低风险'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: taskRiskTrendData.map((d) => d.date.slice(5)),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '高风险',
        type: 'bar',
        stack: 'total',
        data: taskRiskTrendData.map((d) => d.high),
        itemStyle: { color: '#ff4d4f' },
      },
      {
        name: '中风险',
        type: 'bar',
        stack: 'total',
        data: taskRiskTrendData.map((d) => d.medium),
        itemStyle: { color: '#faad14' },
      },
      {
        name: '低风险',
        type: 'bar',
        stack: 'total',
        data: taskRiskTrendData.map((d) => d.low),
        itemStyle: { color: '#52c41a' },
      },
    ],
  };

  const categoryBarOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: problemCategoryStats.map((d) => d.name),
      axisLabel: {
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '问题数量',
        type: 'bar',
        data: problemCategoryStats.map((d) => d.value),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#69c0ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  const rankingColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      align: 'center' as const,
      render: (rank: number) => (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#8c8c8c',
            color: 'white',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          {rank}
        </div>
      ),
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      width: 100,
    },
    {
      title: '抽检次数',
      dataIndex: 'auditCount',
      key: 'auditCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '高风险任务',
      dataIndex: 'highRiskTaskCount',
      key: 'highRiskTaskCount',
      width: 100,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>{count}</span>
      ),
    },
    {
      title: '整体风险',
      dataIndex: 'avgRiskLevel',
      key: 'avgRiskLevel',
      width: 100,
      align: 'center' as const,
      render: (level?: 'high' | 'medium' | 'low') => getRiskTag(level),
    },
    {
      title: '合格率',
      dataIndex: 'passRate',
      key: 'passRate',
      width: 130,
      render: (rate: number) => (
        <Progress percent={rate} size="small" status={rate >= 80 ? 'success' : rate >= 60 ? 'active' : 'exception'} />
      ),
    },
    {
      title: '问题数',
      dataIndex: 'problemCount',
      key: 'problemCount',
      width: 80,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: count > 3 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>{count}</span>
      ),
    },
    {
      title: '整改完成率',
      dataIndex: 'rectificationRate',
      key: 'rectificationRate',
      width: 130,
      render: (rate: number) => (
        <Progress percent={rate} size="small" status={rate >= 80 ? 'success' : rate >= 60 ? 'active' : 'exception'} />
      ),
    },
    {
      title: '综合评分',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      align: 'center' as const,
      render: (score: number) => (
        <span style={{ fontWeight: 700, fontSize: 16, color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f' }}>
          {score}
        </span>
      ),
    },
  ];

  const taskListColumns = [
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
      render: (level?: AuditTask['riskLevel']) => getRiskTag(level),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AuditTask['status']) => getTaskStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: AuditTask) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => {
            setSelectedTask(record);
            setIsTaskDetailOpen(true);
          }}
        >
          详情
        </Button>
      ),
    },
  ];

  const handleViewProblemDetail = (problem: CommonProblem) => {
    setSelectedProblem(problem);
    setIsProblemDetailOpen(true);
  };

  return (
    <div className="page-container">
      <div className="page-title">
        <BarChartOutlined style={{ color: '#1890ff' }} />
        统计分析
        <Space style={{ marginLeft: 'auto' }}>
          <Select value={selectedStore} onChange={setSelectedStore} style={{ width: 150 }} size="small">
            <Option value="all">全部门店</Option>
            {stores.map((s) => (
              <Option key={s.id} value={s.id}>{s.name}</Option>
            ))}
          </Select>
          <RangePicker size="small" />
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="抽检任务总数"
              value={totalTasks}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>次</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="高风险任务"
              value={highRiskTasks}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>次</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="发现问题总数"
              value={totalProblems}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>项</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="整改完成率"
              value={rectificationRate}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>%</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="高风险问题"
              value={highRiskCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>项</span>}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已完成任务"
              value={completedTasks}
              valueStyle={{ color: '#52c41a' }}
              prefix={<FileDoneOutlined />}
              suffix={<span style={{ fontSize: 14, color: '#8c8c8c' }}>次</span>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" title="问题趋势（近14天）">
            <ReactECharts option={trendChartOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="任务风险趋势（近14天）">
            <ReactECharts option={taskRiskTrendOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="任务风险等级分布">
            <ReactECharts option={taskRiskPieOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="任务风险概览" style={{ marginBottom: 16 }} extra={<div style={{ display: 'flex', gap: 16 }}>
        <span>高风险任务：<strong style={{ color: '#ff4d4f' }}>{highRiskTasks}</strong> 次</span>
        <span>中风险任务：<strong style={{ color: '#faad14' }}>{mediumRiskTasks}</strong> 次</span>
        <span>低风险任务：<strong style={{ color: '#52c41a' }}>{lowRiskTasks}</strong> 次</span>
      </div>}>
        <Table
          columns={taskListColumns}
          dataSource={filteredTasks}
          rowKey="id"
          size="middle"
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条任务`,
          }}
        />
      </Card>

      <Row gutter={16}>
        <Col span={24}>
          <Card size="small" title="门店排名">
            <Table
              columns={rankingColumns}
              dataSource={storeRankings}
              rowKey="storeId"
              size="middle"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card size="small" title="问题分类统计">
            <ReactECharts option={categoryBarOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="常见问题 TOP5" extra={<a>查看全部</a>}>
            <List
              dataSource={topProblems}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => handleViewProblemDetail(item)}>
                      详情
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: index === 0 ? '#ff4d4f' : index === 1 ? '#fa8c16' : index === 2 ? '#faad14' : '#8c8c8c',
                          color: 'white',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {index + 1}
                      </div>
                    }
                    title={
                      <Space>
                        {item.description}
                        {getRiskTag(item.riskLevel)}
                      </Space>
                    }
                    description={
                      <Space>
                        <span style={{ color: '#8c8c8c' }}>累计发生 {item.occurrenceCount} 次</span>
                        <Tag color="blue">{item.category}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="常见问题库" style={{ marginTop: 16 }}>
        <Collapse accordion>
          {commonProblems.map((problem) => (
            <Panel
              key={problem.id}
              header={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space>
                    <BulbOutlined style={{ color: '#faad14' }} />
                    <strong>{problem.description}</strong>
                    {getRiskTag(problem.riskLevel)}
                    <Tag color="blue">{problem.category}</Tag>
                  </Space>
                  <Tag color="orange" className="occurrence-tag">
                    累计 {problem.occurrenceCount} 次
                  </Tag>
                </div>
              }
            >
              <Row gutter={24}>
                <Col span={12}>
                  <div style={{ marginBottom: 12 }}>
                    <strong><ToolOutlined /> 典型场景：</strong>
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      {problem.typicalScenarios.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 12 }}>
                    <strong><SafetyOutlined /> 整改指导：</strong>
                    <p style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{problem.rectificationGuidance}</p>
                  </div>
                </Col>
              </Row>
              <div>
                <strong><BulbOutlined /> 预防措施：</strong>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {problem.preventionMeasures.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            </Panel>
          ))}
        </Collapse>
      </Card>

      <Modal
        title="问题详情"
        open={isProblemDetailOpen}
        onCancel={() => setIsProblemDetailOpen(false)}
        footer={null}
        width={700}
      >
        {selectedProblem && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space size="large">
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>风险等级</div>
                  <div>{getRiskTag(selectedProblem.riskLevel)}</div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>分类</div>
                  <div><Tag color="blue">{selectedProblem.category}</Tag></div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>累计发生</div>
                  <div style={{ fontWeight: 700, color: '#faad14' }}>{selectedProblem.occurrenceCount} 次</div>
                </div>
              </Space>
            </div>

            <Card size="small" title={<span><ExclamationCircleOutlined style={{ color: '#faad14' }} /> 问题描述</span>} style={{ marginBottom: 12 }}>
              <p>{selectedProblem.description}</p>
            </Card>

            <Card size="small" title={<span><ToolOutlined style={{ color: '#1890ff' }} /> 典型场景</span>} style={{ marginBottom: 12 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {selectedProblem.typicalScenarios.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </Card>

            <Card size="small" title={<span><SafetyOutlined style={{ color: '#52c41a' }} /> 整改指导</span>} style={{ marginBottom: 12 }}>
              <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{selectedProblem.rectificationGuidance}</p>
            </Card>

            <Card size="small" title={<span><BulbOutlined style={{ color: '#faad14' }} /> 预防措施</span>}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {selectedProblem.preventionMeasures.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="任务详情"
        open={isTaskDetailOpen}
        onCancel={() => setIsTaskDetailOpen(false)}
        footer={null}
        width={700}
      >
        {selectedTask && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space size="large" wrap>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>任务编号</div>
                  <div style={{ fontWeight: 600 }}>{selectedTask.taskCode}</div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>门店</div>
                  <div>{selectedTask.storeName}</div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>状态</div>
                  <div>{getTaskStatusTag(selectedTask.status)}</div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>风险等级</div>
                  <div>{getRiskTag(selectedTask.riskLevel)}</div>
                </div>
              </Space>
            </div>

            <Card size="small" title="任务信息" style={{ marginBottom: 12 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>任务名称：</strong>{selectedTask.taskName}</p>
                  <p><strong>计划日期：</strong>{selectedTask.planDate}</p>
                  <p><strong>抽检数量：</strong>{selectedTask.packageCount} 包</p>
                </Col>
                <Col span={12}>
                  <p><strong>督导员：</strong>{selectedTask.auditor}</p>
                  <p><strong>创建时间：</strong>{selectedTask.createdAt}</p>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="核验结果" style={{ marginBottom: 12 }}>
              {(() => {
                const records = getTaskRecords(selectedTask.id);
                const problems = getTaskProblems(selectedTask.id);
                const passCount = records.filter(r => r.overallResult === 'pass').length;
                const failCount = records.filter(r => r.overallResult === 'fail').length;
                
                return (
                  <div>
                    <Row gutter={16}>
                      <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '12px 0', background: '#f6ffed', borderRadius: 4 }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{passCount}</div>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>合格</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '12px 0', background: '#fff1f0', borderRadius: 4 }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>{failCount}</div>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>不合格</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '12px 0', background: '#fff7e6', borderRadius: 4 }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{problems.length}</div>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>问题数</div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                );
              })()}
            </Card>

            {selectedTask.riskLevel && (
              <Alert
                message={`任务风险等级：${selectedTask.riskLevel === 'high' ? '高' : selectedTask.riskLevel === 'medium' ? '中' : '低'}风险`}
                description={selectedTask.riskLevel === 'high'
                  ? '本次核验发现严重问题，需立即整改并加强培训'
                  : selectedTask.riskLevel === 'medium'
                    ? '本次核验存在一定风险问题，需按要求整改'
                    : '本次核验情况良好，继续保持'}
                type={selectedTask.riskLevel === 'high' ? 'error' : selectedTask.riskLevel === 'medium' ? 'warning' : 'success'}
                showIcon
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StatisticsPage;
