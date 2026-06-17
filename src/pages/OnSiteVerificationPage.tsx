import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Input,
  Button,
  Tag,
  Checkbox,
  Space,
  Divider,
  Row,
  Col,
  Descriptions,
  message,
  Modal,
  Form,
  Select,
  DatePicker,
  Upload,
  Alert,
  Badge,
  Steps,
  Tabs,
  Empty,
} from 'antd';
import {
  QrcodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  FileProtectOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useApp, checkItemTemplates } from '../context/AppContext';
import { InstrumentPackage, AuditRecord, CheckItem, Problem } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const OnSiteVerificationPage: React.FC = () => {
  const {
    currentTask,
    auditRecords,
    packages,
    setCurrentRecord,
    addAuditRecord,
    updateAuditRecord,
    addProblem,
    calculateRiskLevel,
    updateTaskStatus,
  } = useApp();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemForm] = Form.useForm();
  const [currentRecordData, setCurrentRecordData] = useState<AuditRecord | null>(null);

  const storePackages = currentTask ? packages[currentTask.storeId] || [] : [];
  const sampledPackages = currentTask
    ? storePackages.filter((p) => currentTask.sampledPackages.includes(p.id))
    : [];

  const taskRecords = currentTask
    ? auditRecords.filter((r) => r.taskId === currentTask.id)
    : [];

  const checkedPackageIds = taskRecords.map((r) => r.packageId);

  const selectedPackage = sampledPackages.find((p) => p.id === selectedPackageId);

  useEffect(() => {
    if (selectedPackage) {
      const existingRecord = taskRecords.find((r) => r.packageId === selectedPackage.id);
      if (existingRecord) {
        setCheckItems(existingRecord.checkItems);
        setPhotos(existingRecord.photos);
        setNotes(existingRecord.notes || '');
        setCurrentRecordData(existingRecord);
      } else {
        const initialItems = checkItemTemplates.flatMap((cat) =>
          cat.items.map((item, idx) => ({
            id: `ci_${cat.category}_${idx}`,
            name: item,
            category: cat.category,
            result: 'na' as const,
          }))
        );
        setCheckItems(initialItems);
        setPhotos([]);
        setNotes('');
        setCurrentRecordData(null);
      }
    }
  }, [selectedPackageId, taskRecords]);

  const handleScan = () => {
    if (!scanInput.trim()) {
      message.warning('请输入或扫描器械包编号');
      return;
    }
    const found = sampledPackages.find(
      (p) => p.packageCode.toLowerCase() === scanInput.trim().toLowerCase()
    );
    if (found) {
      setSelectedPackageId(found.id);
      message.success(`已找到器械包：${found.packageName}`);
      setScanInput('');
    } else {
      message.error('未找到该器械包，请确认编号是否正确');
    }
  };

  const handleCheckItemChange = (itemId: string, result: 'pass' | 'fail' | 'na') => {
    setCheckItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, result } : item))
    );
  };

  const handleItemDescriptionChange = (itemId: string, description: string) => {
    setCheckItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, description } : item))
    );
  };

  const getOverallResult = (): 'pass' | 'fail' | 'pending' => {
    const hasFail = checkItems.some((item) => item.result === 'fail');
    const allChecked = checkItems.every((item) => item.result !== 'na');
    if (hasFail) return 'fail';
    if (allChecked) return 'pass';
    return 'pending';
  };

  const getRiskLevel = () => calculateRiskLevel(checkItems);

  const handleSaveRecord = () => {
    if (!selectedPackage || !currentTask) return;

    const overallResult = getOverallResult();
    const riskLevel = getRiskLevel();

    const record: AuditRecord = {
      id: currentRecordData?.id || `rec_${Date.now()}`,
      taskId: currentTask.id,
      packageId: selectedPackage.id,
      packageCode: selectedPackage.packageCode,
      packageName: selectedPackage.packageName,
      checkItems,
      photos,
      overallResult,
      riskLevel,
      checkedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      checker: currentTask.auditor,
      notes,
    };

    if (currentRecordData) {
      updateAuditRecord(record);
    } else {
      addAuditRecord(record);
    }

    message.success('核验记录已保存');

    if (overallResult === 'fail') {
      setIsProblemModalOpen(true);
      problemForm.setFieldsValue({
        description: checkItems
          .filter((item) => item.result === 'fail')
          .map((item) => `${item.name}: ${item.description || '不合格'}`)
          .join('\n'),
        riskLevel,
      });
    }

    const currentIndex = sampledPackages.findIndex((p) => p.id === selectedPackageId);
    if (currentIndex < sampledPackages.length - 1) {
      setSelectedPackageId(sampledPackages[currentIndex + 1].id);
    }
  };

  const handleCreateProblem = (values: any) => {
    if (!selectedPackage || !currentTask) return;

    const problem: Problem = {
      id: `prob_${Date.now()}`,
      taskId: currentTask.id,
      recordId: currentRecordData?.id || `rec_${Date.now()}`,
      storeId: currentTask.storeId,
      storeName: currentTask.storeName,
      packageCode: selectedPackage.packageCode,
      description: values.description,
      category: values.category,
      riskLevel: values.riskLevel,
      status: 'pending',
      rectificationDeadline: values.deadline.format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: currentTask.auditor,
    };

    addProblem(problem);
    message.success('问题已记录，将生成整改任务');
    setIsProblemModalOpen(false);
    problemForm.resetFields();
  };

  const handleCompleteTask = () => {
    if (!currentTask) return;
    
    const failCount = taskRecords.filter((r) => r.overallResult === 'fail').length;
    const overallRisk = failCount > 3 ? 'high' : failCount > 0 ? 'medium' : 'low';
    
    updateTaskStatus(currentTask.id, 'completed');
    message.success(`核验任务完成，共发现 ${failCount} 个不合格包，整体风险等级：${overallRisk === 'high' ? '高' : overallRisk === 'medium' ? '中' : '低'}`);
  };

  const groupedCheckItems = checkItemTemplates.map((cat) => ({
    ...cat,
    items: checkItems.filter((item) => item.category === cat.category),
  }));

  if (!currentTask) {
    return (
      <div className="page-container">
        <Empty
          description={
            <span>
              请先在 <strong>抽检任务</strong> 中选择一个任务开始核验
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-title">
        <QrcodeOutlined style={{ color: '#1890ff' }} />
        现场核验 - {currentTask.taskName}
      </div>

      <div className="summary-section">
        <Row>
          <Col span={12}>
            <div>
              <strong>任务编号：</strong>
              {currentTask.taskCode}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>门店：</strong>
              {currentTask.storeName}
            </div>
          </Col>
          <Col span={12}>
            <div className="summary-stats">
              <div className="summary-stat">
                <div className="value" style={{ color: '#1890ff' }}>
                  {sampledPackages.length}
                </div>
                <div className="label">待检总数</div>
              </div>
              <div className="summary-stat">
                <div className="value" style={{ color: '#52c41a' }}>
                  {taskRecords.filter((r) => r.overallResult === 'pass').length}
                </div>
                <div className="label">合格</div>
              </div>
              <div className="summary-stat">
                <div className="value" style={{ color: '#ff4d4f' }}>
                  {taskRecords.filter((r) => r.overallResult === 'fail').length}
                </div>
                <div className="label">不合格</div>
              </div>
              <div className="summary-stat">
                <div className="value" style={{ color: '#8c8c8c' }}>
                  {sampledPackages.length - taskRecords.length}
                </div>
                <div className="label">未检</div>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <div className="verification-panel">
        <div className="verification-left">
          <div className="scan-input-section">
            <Input.Search
              placeholder="扫描或输入器械包编号"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onSearch={handleScan}
              enterButton={<QrcodeOutlined />}
              size="large"
            />
          </div>

          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            抽检包列表 ({sampledPackages.length})
          </div>

          <div>
            {sampledPackages.map((pkg) => {
              const record = taskRecords.find((r) => r.packageId === pkg.id);
              const isChecked = !!record;
              const isSelected = selectedPackageId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={`package-list-item ${isSelected ? 'active' : ''} ${isChecked ? 'checked' : ''}`}
                  onClick={() => setSelectedPackageId(pkg.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="package-code">{pkg.packageCode}</div>
                      <div className="package-name">{pkg.packageName}</div>
                    </div>
                    {record && (
                      <Badge
                        status={record.overallResult === 'pass' ? 'success' : 'error'}
                        text={record.overallResult === 'pass' ? '合格' : '不合格'}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="verification-right">
          {selectedPackage ? (
            <div>
              <Card
                size="small"
                title={
                  <Space>
                    <SafetyOutlined style={{ color: '#1890ff' }} />
                    {selectedPackage.packageName}
                    <Tag color="blue">{selectedPackage.packageCode}</Tag>
                    {getOverallResult() === 'pass' && (
                      <Tag color="success" icon={<CheckCircleOutlined />}>合格</Tag>
                    )}
                    {getOverallResult() === 'fail' && (
                      <Tag color="error" icon={<CloseCircleOutlined />}>不合格</Tag>
                    )}
                    {getOverallResult() === 'pending' && (
                      <Tag color="default" icon={<ClockCircleOutlined />}>核验中</Tag>
                    )}
                  </Space>
                }
                style={{ marginBottom: 16 }}
                extra={
                  <Space>
                    <Tag color={getRiskLevel() === 'high' ? 'red' : getRiskLevel() === 'medium' ? 'orange' : 'green'}>
                      风险等级：{getRiskLevel() === 'high' ? '高' : getRiskLevel() === 'medium' ? '中' : '低'}
                    </Tag>
                  </Space>
                }
              >
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="灭菌批次">
                    {selectedPackage.sterilizationBatch}
                  </Descriptions.Item>
                  <Descriptions.Item label="灭菌日期">
                    {selectedPackage.sterilizationDate}
                  </Descriptions.Item>
                  <Descriptions.Item label="有效期至">
                    <span style={{ color: dayjs(selectedPackage.expirationDate).isBefore(dayjs().add(7, 'day')) ? '#ff4d4f' : undefined }}>
                      {selectedPackage.expirationDate}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="灭菌器">
                    {selectedPackage.sterilizer}
                  </Descriptions.Item>
                  <Descriptions.Item label="操作员">
                    {selectedPackage.operator}
                  </Descriptions.Item>
                  <Descriptions.Item label="质检员">
                    {selectedPackage.checker}
                  </Descriptions.Item>
                  <Descriptions.Item label="存放位置" span={2}>
                    <EnvironmentOutlined /> {selectedPackage.storageLocation}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {groupedCheckItems.map((category, catIdx) => (
                <Card key={catIdx} size="small" style={{ marginBottom: 12 }}>
                  <div className="check-category">
                    <div className="check-category-title">{category.category}</div>
                    {category.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="audit-item-card"
                        style={{
                          marginBottom: 8,
                          background: item.result === 'fail' ? '#fff1f0' : undefined,
                          borderColor: item.result === 'fail' ? '#ffccc7' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                            {item.result === 'fail' && (
                              <Input
                                size="small"
                                placeholder="请描述问题详情..."
                                value={item.description || ''}
                                onChange={(e) => handleItemDescriptionChange(item.id, e.target.value)}
                                style={{ marginTop: 8, width: '70%' }}
                              />
                            )}
                          </div>
                          <Space>
                            <Checkbox
                              checked={item.result === 'pass'}
                              onChange={(e) =>
                                handleCheckItemChange(item.id, e.target.checked ? 'pass' : 'na')
                              }
                            >
                              <span style={{ color: '#52c41a' }}>合格</span>
                            </Checkbox>
                            <Checkbox
                              checked={item.result === 'fail'}
                              onChange={(e) =>
                                handleCheckItemChange(item.id, e.target.checked ? 'fail' : 'na')
                              }
                            >
                              <span style={{ color: '#ff4d4f' }}>不合格</span>
                            </Checkbox>
                          </Space>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}

              <Card size="small" title={<Space><CameraOutlined /> 照片证据</Space>} style={{ marginBottom: 12 }}>
                <div className="photo-grid">
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="photo-item has-photo"
                      style={{
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1890ff',
                      }}
                    >
                      <CameraOutlined style={{ fontSize: 24 }} />
                      <span style={{ fontSize: 12, marginTop: 4 }}>照片 {idx + 1}</span>
                    </div>
                  ))}
                  {photos.length < 8 && (
                    <div className="photo-item" onClick={() => message.info('请连接摄像头或上传照片')}>
                      <div style={{ textAlign: 'center' }}>
                        <PlusOutlined style={{ fontSize: 24 }} />
                        <div style={{ fontSize: 12, marginTop: 4 }}>添加照片</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card size="small" title="备注" style={{ marginBottom: 16 }}>
                <TextArea
                  rows={3}
                  placeholder="请输入核验备注..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Card>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    disabled={sampledPackages.findIndex((p) => p.id === selectedPackageId) === 0}
                    onClick={() => {
                      const currentIdx = sampledPackages.findIndex((p) => p.id === selectedPackageId);
                      if (currentIdx > 0) {
                        setSelectedPackageId(sampledPackages[currentIdx - 1].id);
                      }
                    }}
                  >
                    上一个
                  </Button>
                  <Button
                    icon={<ArrowRightOutlined />}
                    disabled={sampledPackages.findIndex((p) => p.id === selectedPackageId) === sampledPackages.length - 1}
                    onClick={() => {
                      const currentIdx = sampledPackages.findIndex((p) => p.id === selectedPackageId);
                      if (currentIdx < sampledPackages.length - 1) {
                        setSelectedPackageId(sampledPackages[currentIdx + 1].id);
                      }
                    }}
                  >
                    下一个
                  </Button>
                </Space>
                <Space>
                  <Button icon={<SaveOutlined />} onClick={handleSaveRecord}>
                    保存记录
                  </Button>
                  {taskRecords.length === sampledPackages.length && (
                    <Button type="primary" onClick={handleCompleteTask}>
                      完成核验
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          ) : (
            <Empty description="请选择一个器械包开始核验" />
          )}
        </div>
      </div>

      <Modal
        title="记录问题并生成整改"
        open={isProblemModalOpen}
        onCancel={() => setIsProblemModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={problemForm} layout="vertical" onFinish={handleCreateProblem}>
          <Form.Item
            label="问题描述"
            name="description"
            rules={[{ required: true, message: '请描述问题' }]}
          >
            <TextArea rows={4} placeholder="请详细描述发现的问题" />
          </Form.Item>

          <Form.Item
            label="问题分类"
            name="category"
            rules={[{ required: true, message: '请选择问题分类' }]}
          >
            <Select placeholder="请选择问题分类">
              <Option value="包装不合格">包装不合格</Option>
              <Option value="灭菌记录不完整">灭菌记录不完整</Option>
              <Option value="包内配置不符">包内配置不符</Option>
              <Option value="存放不规范">存放不规范</Option>
              <Option value="签名不规范">签名不规范</Option>
              <Option value="效期问题">效期问题</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="风险等级"
            name="riskLevel"
            rules={[{ required: true, message: '请选择风险等级' }]}
          >
            <Select placeholder="请选择风险等级">
              <Option value="high">高风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="low">低风险</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="整改截止日期"
            name="deadline"
            rules={[{ required: true, message: '请选择整改截止日期' }]}
          >
            <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsProblemModalOpen(false)}>跳过</Button>
              <Button type="primary" htmlType="submit">
                生成整改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OnSiteVerificationPage;
