import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AuditTask, AuditRecord, Problem, Store, InstrumentPackage, CommonProblem } from '../types';
import { mockStores, mockPackages, mockAuditTasks, mockAuditRecords, mockProblems, mockCommonProblems, checkItemTemplates } from '../data/mockData';
import dayjs from 'dayjs';

interface AppState {
  stores: Store[];
  packages: Record<string, InstrumentPackage[]>;
  auditTasks: AuditTask[];
  auditRecords: AuditRecord[];
  problems: Problem[];
  commonProblems: CommonProblem[];
  currentTask: AuditTask | null;
  currentRecord: AuditRecord | null;
}

interface AppContextType extends AppState {
  setCurrentTask: (task: AuditTask | null) => void;
  setCurrentRecord: (record: AuditRecord | null) => void;
  generateAuditTask: (params: { storeId: string; taskName: string; planDate: string; packageCount: number; auditor: string }) => AuditTask;
  addAuditRecord: (record: AuditRecord) => void;
  updateAuditRecord: (record: AuditRecord) => void;
  addProblem: (problem: Problem) => void;
  updateProblem: (problem: Problem) => void;
  updateTaskStatus: (taskId: string, status: AuditTask['status']) => void;
  getStorePackages: (storeId: string) => InstrumentPackage[];
  getTaskRecords: (taskId: string) => AuditRecord[];
  getTaskProblems: (taskId: string) => Problem[];
  calculateRiskLevel: (checkItems: AuditRecord['checkItems']) => 'high' | 'medium' | 'low';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stores] = useState<Store[]>(mockStores);
  const [packages] = useState<Record<string, InstrumentPackage[]>>(mockPackages);
  const [auditTasks, setAuditTasks] = useState<AuditTask[]>(mockAuditTasks);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(mockAuditRecords);
  const [problems, setProblems] = useState<Problem[]>(mockProblems);
  const [commonProblems] = useState<CommonProblem[]>(mockCommonProblems);
  const [currentTask, setCurrentTask] = useState<AuditTask | null>(null);
  const [currentRecord, setCurrentRecord] = useState<AuditRecord | null>(null);

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

  const value: AppContextType = {
    stores,
    packages,
    auditTasks,
    auditRecords,
    problems,
    commonProblems,
    currentTask,
    currentRecord,
    setCurrentTask,
    setCurrentRecord,
    generateAuditTask,
    addAuditRecord,
    updateAuditRecord,
    addProblem,
    updateProblem,
    updateTaskStatus,
    getStorePackages,
    getTaskRecords,
    getTaskProblems,
    calculateRiskLevel,
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
