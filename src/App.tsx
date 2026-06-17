import React, { useState } from 'react';
import { Layout, Tabs, Avatar, Badge } from 'antd';
import {
  FileSearchOutlined,
  QrcodeOutlined,
  ToolOutlined,
  BarChartOutlined,
  UserOutlined,
  BellOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import AuditTaskPage from './pages/AuditTaskPage';
import OnSiteVerificationPage from './pages/OnSiteVerificationPage';
import RectificationPage from './pages/RectificationPage';
import StatisticsPage from './pages/StatisticsPage';

const { Header, Content } = Layout;

const App: React.FC = () => {
  const [activeKey, setActiveKey] = useState('1');

  const tabs = [
    {
      key: '1',
      label: (
        <span>
          <FileSearchOutlined className="tab-icon" />
          抽检任务
        </span>
      ),
      children: <AuditTaskPage />,
    },
    {
      key: '2',
      label: (
        <span>
          <QrcodeOutlined className="tab-icon" />
          现场核验
        </span>
      ),
      children: <OnSiteVerificationPage />,
    },
    {
      key: '3',
      label: (
        <span>
          <ToolOutlined className="tab-icon" />
          问题整改
        </span>
      ),
      children: <RectificationPage />,
    },
    {
      key: '4',
      label: (
        <span>
          <BarChartOutlined className="tab-icon" />
          统计分析
        </span>
      ),
      children: <StatisticsPage />,
    },
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <SafetyOutlined className="logo-icon" />
          <span>口腔感控稽核系统</span>
        </div>
        <div className="app-header-info">
          <Badge count={5} size="small">
            <BellOutlined style={{ fontSize: 20, color: 'white', cursor: 'pointer' }} />
          </Badge>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <span>感控督导员</span>
          </div>
        </div>
      </Header>
      <Content className="app-content">
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={tabs}
          size="large"
          style={{ background: 'white', borderRadius: 8, padding: '0 16px' }}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Content>
    </Layout>
  );
};

export default App;
