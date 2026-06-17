export interface Store {
  id: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  region: string;
  status: 'active' | 'inactive';
}

export interface InstrumentPackage {
  id: string;
  packageCode: string;
  packageName: string;
  type: string;
  sterilizationBatch: string;
  sterilizationDate: string;
  expirationDate: string;
  sterilizer: string;
  operator: string;
  checker: string;
  storageLocation: string;
  items: PackageItem[];
  storeId: string;
}

export interface PackageItem {
  name: string;
  quantity: number;
  specification?: string;
}

export interface AuditTask {
  id: string;
  taskCode: string;
  taskName: string;
  storeId: string;
  storeName: string;
  planDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  packageCount: number;
  sampledPackages: string[];
  auditor: string;
  createdAt: string;
  riskLevel?: 'high' | 'medium' | 'low';
}

export interface AuditRecord {
  id: string;
  taskId: string;
  packageId: string;
  packageCode: string;
  packageName: string;
  checkItems: CheckItem[];
  photos: string[];
  overallResult: 'pass' | 'fail' | 'pending';
  riskLevel: 'high' | 'medium' | 'low';
  checkedAt: string;
  checker: string;
  notes?: string;
}

export interface CheckItem {
  id: string;
  name: string;
  category: string;
  result: 'pass' | 'fail' | 'na';
  description?: string;
  evidence?: string;
}

export interface Problem {
  id: string;
  taskId: string;
  recordId: string;
  storeId: string;
  storeName: string;
  packageCode: string;
  description: string;
  category: string;
  riskLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'rectifying' | 'rechecking' | 'closed';
  rectificationDeadline: string;
  rectificationMeasures?: string;
  rectificationPhotos?: string[];
  recheckResult?: 'pass' | 'fail';
  recheckAt?: string;
  rechecker?: string;
  createdAt: string;
  createdBy: string;
}

export interface CommonProblem {
  id: string;
  category: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  occurrenceCount: number;
  typicalScenarios: string[];
  rectificationGuidance: string;
  preventionMeasures: string[];
}

export interface StatisticsData {
  totalTasks: number;
  completedTasks: number;
  totalProblems: number;
  rectificationRate: number;
  storeRankings: StoreRanking[];
  problemTrend: TrendItem[];
  riskDistribution: { level: string; count: number }[];
  topProblems: { description: string; count: number }[];
}

export interface StoreRanking {
  storeId: string;
  storeName: string;
  auditCount: number;
  passRate: number;
  problemCount: number;
  rectificationRate: number;
  score: number;
  rank: number;
}

export interface TrendItem {
  date: string;
  problemCount: number;
  rectifiedCount: number;
}
