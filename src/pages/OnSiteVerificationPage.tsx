import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Tag,
  Checkbox,
  Space,
  Row,
  Col,
  Descriptions,
  message,
  Modal,
  Form,
  Select,
  DatePicker,
  Badge,
  Empty,
  Upload,
} from 'antd';
import {
  QrcodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CameraOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useApp, checkItemTemplates } from '../context/AppContext';
import { AuditRecord, CheckItem, Problem } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const OnSiteVerificationPage: React.FC = () => {
  const {
    currentTask,
    auditRecords,
    packages,
    addAuditRecord,
    updateAuditRecord,
    addProblem,
    calculateRiskLevel,
    completeTask,
    updateTaskStatus,
  } = useApp();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [currentRecordData, setCurrentRecordData] = useState<AuditRecord | null>(null);
  
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemForm] = Form.useForm();
  const [pendingRecord, setPendingRecord] = useState<AuditRecord | null>(null);
  const [pendingNextPackage, setPendingNextPackage] = useState<string | null>(null);
  
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storePackages = currentTask ? packages[currentTask.storeId] || [] : [];
  const sampledPackages = currentTask
    ? storePackages.filter((p) => currentTask.sampledPackages.includes(p.id))
    : [];

  const taskRecords = currentTask
    ? auditRecords.filter((r) => r.taskId === currentTask.id)
    : [];

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
            id: `ci_${cat.category}_${idx}_${Date.now()}`,
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
  }, [selectedPackageId]);

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = 8 - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    if (filesToProcess.length === 0) {
      message.warning('最多只能上传8张照片');
      return;
    }

    const loadPromises = filesToProcess.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loadPromises).then((newPhotos) => {
      setPhotos(prev => [...prev, ...newPhotos]);
      message.success(`已添加 ${newPhotos.length} 张照片`);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreviewPhoto = (photo: string) => {
    setPreviewPhoto(photo);
    setPhotoPreviewVisible(true);
  };

  const handleSaveRecord = () => {
    if (!selectedPackage || !currentTask) return;

    const overallResult = getOverallResult();
    const riskLevel = getRiskLevel();

    const recordId = currentRecordData?.id || `rec_${Date.now()}`;

    const record: AuditRecord = {
      id: recordId,
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
      setPendingRecord(record);
      
      const currentIndex = sampledPackages.findIndex((p) => p.id === selectedPackageId);
      const nextPkg = currentIndex < sampledPackages.length - 1
        ? sampledPackages[currentIndex + 1].id
        : null;
      setPendingNextPackage(nextPkg);

      setIsProblemModalOpen(true);
      problemForm.setFieldsValue({
        description: checkItems
          .filter((item) => item.result === 'fail')
          .map((item) => `${item.name}: ${item.description || '不合格'}`)
          .join('\n'),
        riskLevel,
        category: '灭菌记录不完整',
        deadline: dayjs().add(7, 'day'),
      });
    } else {
      const currentIndex = sampledPackages.findIndex((p) => p.id === selectedPackageId);
      if (currentIndex < sampledPackages.length - 1) {
        setSelectedPackageId(sampledPackages[currentIndex + 1].id);
      }
    }
  };

  const handleCreateProblem = (values: any) => {
    if (!pendingRecord || !currentTask) return;

    const problem: Problem = {
      id: `prob_${Date.now()}`,
      taskId: currentTask.id,
      recordId: pendingRecord.id,
      storeId: currentTask.storeId,
      storeName: currentTask.storeName,
      packageCode: pendingRecord.packageCode,
      description: values.description,
      category: values.category,
      riskLevel: values.riskLevel,
      status: 'pending',
      rectificationDeadline: values.deadline.format('YYYY-MM-DD'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: currentTask.auditor,
    };

    addProblem(problem);
    message.success(`问题已记录，对应器械包：${pendingRecord.packageCode}`);

    setIsProblemModalOpen(false);
    problemForm.resetFields();
    setPendingRecord(null);
    
    if (pendingNextPackage) {
      setSelectedPackageId(pendingNextPackage);
    }
    setPendingNextPackage(null);
  };

  const handleSkipProblem = () => {
    setIsProblemModalOpen(false);
    problemForm.resetFields();
    setPendingRecord(null);
    
    if (pendingNextPackage) {
      setSelectedPackageId(pendingNextPackage);
    }
    setPendingNextPackage(null);
  };

  const handleCompleteTask = () => {
    if (!currentTask) return;
    
    const result = completeTask(currentTask.id);
    const riskText = result.riskLevel === 'high' ? '高' : result.riskLevel === 'medium' ? '中' : '低';
    const riskColor = result.riskLevel === 'high' ? '#ff4d4f' : result.riskLevel === 'medium' ? '#faad14' : '#52c41a';
    
    Modal.success({
      title: '核验任务完成',
      content: (
        <div>
          <p>共核验 <strong>{taskRecords.length}</strong> 个器械包</p>
          <p>其中合格 <strong style={{ color: '#52c41a' }}>{taskRecords.length - result.failCount}</strong> 个，不合格 <strong style={{ color: '#ff4d4f' }}>{result.failCount}</strong> 个</p>
          <p>整体风险等级：<strong style={{ color: riskColor }}>{riskText}风险</strong></p>
        </div>
      ),
      icon: <SafetyOutlined style={{ color: riskColor }} />,
    });
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

  const progressPercent = sampledPackages.length > 0
    ? Math.round((taskRecords.length / sampledPackages.length) * 100)
    : 0;

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
            <div style={{ marginTop: 4 }}>
              <strong>督导员：</strong>
              {currentTask.auditor}
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
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
              核验进度：{progressPercent}%
              </div>
              <div style={{ width: '100%', height: 8, background: '#f0f0f0', borderRadius: 4 }}>
              <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: progressPercent === 100 ? '#52c41a' : '#1890ff',
                borderRadius: 4,
                transition: 'width 0.3s',
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
              onPressEnter={handleScan}
            />
          </div>

          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            抽检包列表 ({sampledPackages.length})
          </div>

          <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="package-code" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.packageCode}</div>
                      <div className="package-name">{pkg.packageName}</div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      {record ? (
                        <Badge
                          status={record.overallResult === 'pass' ? 'success' : 'error'}
                          text={record.overallResult === 'pass' ? '合' : '不'}
                        />
                      ) : (
                        <Tag color="default" style={{ margin: 0 }}>未检</Tag>
                      )}
                    </div>
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
                  <Space wrap>
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
                  <Tag color={getRiskLevel() === 'high' ? 'red' : getRiskLevel() === 'medium' ? 'orange' : 'green'}>
                    风险：{getRiskLevel() === 'high' ? '高' : getRiskLevel() === 'medium' ? '中' : '低'}
                  </Tag>
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

              <Card size="small" title={<Space><CameraOutlined /> 照片证据（{photos.length}/8）</Space>} style={{ marginBottom: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <div className="photo-grid">
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="photo-item has-photo"
                      style={{
                        backgroundImage: `url(${photo})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      onClick={() => handlePreviewPhoto(photo)}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(idx);
                        }}
                      >
                        <DeleteOutlined />
                      </div>
                    </div>
                  ))}
                  {photos.length < 8 && (
                    <div
                      className="photo-item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
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
                  {taskRecords.length === sampledPackages.length && currentTask.status !== 'completed' && (
                    <Button type="primary" onClick={handleCompleteTask}>
                      完成核验
                    </Button>
                  )}
                  {currentTask.status === 'completed' && (
                    <Tag color="success">已完成</Tag>
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
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            记录问题并生成整改
            {pendingRecord && (
              <Tag color="blue">包号：{pendingRecord.packageCode}</Tag>
            )}
          </Space>
        }
        open={isProblemModalOpen}
        onCancel={handleSkipProblem}
        footer={null}
        width={600}
        maskClosable={false}
      >
        <Alert
          message="确认问题信息"
          description={
            <div>
              <p>器械包：<strong>{pendingRecord?.packageCode}</strong></p>
              <p>风险等级：<Tag color={pendingRecord?.riskLevel === 'high' ? 'red' : pendingRecord?.riskLevel === 'medium' ? 'orange' : 'green'}>
                {pendingRecord?.riskLevel === 'high' ? '高风险' : pendingRecord?.riskLevel === 'medium' ? '中风险' : '低风险'}
              </Tag></p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
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
              <Button onClick={handleSkipProblem}>跳过</Button>
              <Button type="primary" htmlType="submit">
                生成整改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={photoPreviewVisible}
        footer={null}
        onCancel={() => setPhotoPreviewVisible(false)}
        width="auto"
        style={{ top: 20 }}
      >
        {previewPhoto && (
          <img
            src={previewPhoto}
            alt="预览"
            style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block' }}
          />
        )}
      </Modal>
    </div>
  );
};

export default OnSiteVerificationPage;
