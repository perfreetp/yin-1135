import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AuditTask, AuditRecord, Problem, Store, InstrumentPackage, CommonProblem } from '../types';
import { mockStores, mockPackages, mockAuditTasks, mockAuditRecords, mockProblems, mockCommonProblems, checkItemTemplates } from '../data/mockData';
import dayjs from 'dayjs';

const STORAGE_KEY = 'dental_audit_app_data';

interface PersistedData {
  auditTasks: AuditTask[];
  auditRecords: AuditRecord[];
  problems: Problem[];
}

interface AppState {
  stores: Store[];
  packages: Record<string, InstrumentPackage[]>;
  auditTasks: AuditTask[];
  auditRecords: AuditRecord[];
  problems: Problem[];
  commonProblems: CommonProblem[];
  currentTask: AuditTask | null;
  currentRecord: AuditRecord | null;
  activeTab: string;
}

interface AppContextType extends AppState {
  setCurrentTask: (task: AuditTask | null) => void;
  setCurrentRecord: (record: AuditRecord | null) => void;
  setActiveTab: (key: string) => void;
  generateAuditTask: (params: { storeId: string; taskName: string; planDate: string; packageCount: number; auditor: string }) => AuditTask;
  addAuditRecord: (record: AuditRecord) => void;
  updateAuditRecord: (record: AuditRecord) => void;
  addProblem: (problem: Problem) => void;
  updateProblem: (problem: Problem) => void;
  updateTaskStatus: (taskId: string, status: AuditTask['status']) => void;
  completeTask: (taskId: string) => void;
  ensureTaskSampled: (taskId: string) => AuditTask | null;
  getStorePackages: (storeId: string) => InstrumentPackage[];
  getTaskRecords: (taskId: string) => AuditRecord[];
  getTaskProblems: (taskId: string) => Problem[];
  calculateRiskLevel: (checkItems: AuditRecord['checkItems']) => 'high' | 'medium' | 'low';
  calculateTaskRiskLevel: (taskId: string) => 'high' | 'medium' | 'low';
  resetToMockData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadFromStorage = (): PersistedData | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
  }
  return null;
};

const saveToStorage = (data: PersistedData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to localStorage:', e);
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stores] = useState<Store[]>(mockStores);
  const [packages] = useState<Record<string, InstrumentPackage[]>>(mockPackages);
  const [commonProblems] = useState<CommonProblem[]>(mockCommonProblems);
  const [currentTask, setCurrentTask] = useState<AuditTask | null>(null);
  const [currentRecord, setCurrentRecord] = useState<AuditRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>('1');

  const [auditTasks, setAuditTasks] = useState<AuditTask[]>(() => {
    const persisted = loadFromStorage();
    return persisted?.auditTasks || mockAuditTasks;
  });

  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(() => {
    const persisted = loadFromStorage();
    return persisted?.auditRecords || mockAuditRecords;
  });

  const [problems, setProblems] = useState<Problem[]>(() => {
    const persisted = loadFromStorage();
    return persisted?.problems || mockProblems;
  });

  useEffect(() => {
    saveToStorage({
      auditTasks,
      auditRecords,
      problems,
    });
  }, [auditTasks, auditRecords, problems]);

  const generateAuditTask = useCallback((params: {
    storeId: string;
    taskName: string;
    planDate: string;
    packageCount: number;
    auditor: string;
  }): AuditTask => {
    const store = stores.find(s => s.id === params.storeId);
    const storePackages = packages[params.storeId] || [];
    
    const shuffled = [...storePackages].sort(() => Math.random() - 0.5);
    const sampled = shuffled.slice(0, params.packageCount);
    
    const newTask: AuditTask = {
      id: `task_${Date.now()}`,
      taskCode: `AUDIT-${dayjs().format('YYYYMMDD')}-${String(auditTasks.length + 1).padStart(3, '0')}`,
      taskName: params.taskName,
      storeId: params.storeId,
      storeName: store?.name || '',
      planDate: params.planDate,
      status: 'pending',
      packageCount: params.packageCount,
      sampledPackages: sampled.map(p => p.id),
      auditor: params.auditor,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    
    setAuditTasks(prev => [newTask, ...prev]);
    return newTask;
  }, [stores, packages, auditTasks.length]);

  const ensureTaskSampled = useCallback((taskId: string): AuditTask | null => {
    const task = auditTasks.find(t => t.id === taskId);
    if (!task) return null;
    
    if (task.sampledPackages && task.sampledPackages.length > 0) {
      return task;
    }
    
    const storePackages = packages[task.storeId] || [];
    const shuffled = [...storePackages].sort(() => Math.random() - 0.5);
    const sampled = shuffled.slice(0, task.packageCount);
    const sampledIds = sampled.map(p => p.id);
    
    const updatedTask = { ...task, sampledPackages: sampledIds };
    setAuditTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    return updatedTask;
  }, [auditTasks, packages]);

  const addAuditRecord = useCallback((record: AuditRecord) => {
    setAuditRecords(prev => [...prev, record]);
  }, []);

  const updateAuditRecord = useCallback((record: AuditRecord) => {
    setAuditRecords(prev => prev.map(r => r.id === record.id ? record : r));
  }, []);

  const addProblem = useCallback((problem: Problem) => {
    setProblems(prev => [...prev, problem]);
  }, []);

  const updateProblem = useCallback((problem: Problem) => {
    setProblems(prev => prev.map(p => p.id === problem.id ? problem : p));
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: AuditTask['status']) => {
    setAuditTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    if (currentTask?.id === taskId) {
      setCurrentTask(prev => prev ? { ...prev, status } : null);
    }
  }, [currentTask]);

  const calculateTaskRiskLevel = useCallback((taskId: string): 'high' | 'medium' | 'low' => {
    const taskRecords = auditRecords.filter(r => r.taskId === taskId);
    if (taskRecords.length === 0) return 'low';
    
    const hasHighRisk = taskRecords.some(r => r.riskLevel === 'high');
    const mediumCount = taskRecords.filter(r => r.riskLevel === 'medium').length;
    const failCount = taskRecords.filter(r => r.overallResult === 'fail').length;
    
    if (hasHighRisk || failCount >= 3) return 'high';
    if (mediumCount >= 2 || failCount >= 2) return 'medium';
    return 'low';
  }, [auditRecords]);

  const completeTask = useCallback((taskId: string) => {
    const riskLevel = calculateTaskRiskLevel(taskId);
    setAuditTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', riskLevel } : t));
    if (currentTask?.id === taskId) {
      setCurrentTask(prev => prev ? { ...prev, status: 'completed', riskLevel } : null);
    }
  }, [calculateTaskRiskLevel, currentTask]);

  const getStorePackages = useCallback((storeId: string): InstrumentPackage[] => {
    return packages[storeId] || [];
  }, [packages]);

  const getTaskRecords = useCallback((taskId: string): AuditRecord[] => {
    return auditRecords.filter(r => r.taskId === taskId);
  }, [auditRecords]);

  const getTaskProblems = useCallback((taskId: string): Problem[] => {
    return problems.filter(p => p.taskId === taskId);
  }, [problems]);

  const calculateRiskLevel = useCallback((checkItems: AuditRecord['checkItems']): 'high' | 'medium' | 'low' => {
    const failItems = checkItems.filter(item => item.result === 'fail');
    
    if (failItems.length === 0) return 'low';
    
    const highRiskCategories = ['灭菌记录核对', '包内配置核查'];
    const hasHighRiskFail = failItems.some(item => highRiskCategories.includes(item.category));
    
    if (hasHighRiskFail || failItems.length >= 3) return 'high';
    if (failItems.length >= 2) return 'medium';
    return 'low';
  }, []);

  const resetToMockData = useCallback(() => {
    setAuditTasks(mockAuditTasks);
    setAuditRecords(mockAuditRecords);
    setProblems(mockProblems);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: AppContextType = {
    stores,
    packages,
    auditTasks,
    auditRecords,
    problems,
    commonProblems,
    currentTask,
    currentRecord,
    activeTab,
    setCurrentTask,
    setCurrentRecord,
    setActiveTab,
    generateAuditTask,
    addAuditRecord,
    updateAuditRecord,
    addProblem,
    updateProblem,
    updateTaskStatus,
    completeTask,
    ensureTaskSampled,
    getStorePackages,
    getTaskRecords,
    getTaskProblems,
    calculateRiskLevel,
    calculateTaskRiskLevel,
    resetToMockData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { checkItemTemplates };
