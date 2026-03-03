import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  CalendarRange, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  Settings,
  Package,
  Cpu,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Model {
  id: number;
  code: string;
  name: string;
}

interface Component {
  id: number;
  code: string;
  name: string;
  standard_time_minutes: number;
  setup_time_minutes: number;
  buffer_time_minutes: number;
}

interface RoadmapItem {
  id: number;
  plan_id: number;
  component_id: number;
  component_name: string;
  component_code: string;
  quantity: number;
  start_date: string;
  end_date: string;
  leadtime_minutes: number;
  is_bottleneck: boolean;
}

interface BOMItem {
  id: number;
  model_id: number;
  component_id: number;
  quantity: number;
  component_name: string;
  component_code: string;
  standard_time_minutes: number;
}

interface Capacity {
  workers: number;
  hours_per_day: number;
}

interface Plan {
  id: number;
  model_id: number;
  model_name: string;
  model_code: string;
  quantity: number;
  start_date: string;
  deadline: string;
  estimated_completion_date: string;
  gap_hours: number;
  status: string;
}

// --- Components ---

const Card = ({ children, title, icon: Icon, className = "" }: any) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
    {(title || Icon) && (
      <div className="px-6 py-4 border-bottom border-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
          {title}
        </h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const StatCard = ({ label, value, subValue, icon: Icon, trend, color = "indigo" }: any) => {
  const colorClasses: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [models, setModels] = useState<Model[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [capacity, setCapacity] = useState<Capacity>({ workers: 0, hours_per_day: 0 });
  const [loading, setLoading] = useState(true);

  // Form States
  const [newModel, setNewModel] = useState({ code: '', name: '' });
  const [newComponent, setNewComponent] = useState({ code: '', name: '', standard_time_minutes: 0, setup_time_minutes: 0, buffer_time_minutes: 0 });
  const [newPlan, setNewPlan] = useState({ model_id: 0, quantity: 0, start_date: '', deadline: '' });
  const [newBOM, setNewBOM] = useState({ model_id: 0, component_id: 0, quantity: 1 });

  // Roadmap State
  const [selectedPlanRoadmap, setSelectedPlanRoadmap] = useState<RoadmapItem[] | null>(null);
  const [viewingRoadmapId, setViewingRoadmapId] = useState<number | null>(null);

  // Editing States
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingBOM, setEditingBOM] = useState<BOMItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modelsRes, componentsRes, plansRes, capacityRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/components'),
        fetch('/api/plans'),
        fetch('/api/capacity')
      ]);
      
      setModels(await modelsRes.json());
      setComponents(await componentsRes.json());
      setPlans(await plansRes.json());
      setCapacity(await capacityRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModel)
    });
    setNewModel({ code: '', name: '' });
    fetchData();
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/components', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComponent)
    });
    setNewComponent({ code: '', name: '', standard_time_minutes: 0, setup_time_minutes: 0, buffer_time_minutes: 0 });
    fetchData();
  };

  const fetchRoadmap = async (planId: number) => {
    setViewingRoadmapId(planId);
    const res = await fetch(`/api/plans/${planId}/roadmap`);
    setSelectedPlanRoadmap(await res.json());
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans';
    const method = editingPlan ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPlan || newPlan)
    });
    if (res.ok) {
      setNewPlan({ model_id: 0, quantity: 0, start_date: '', deadline: '' });
      setEditingPlan(null);
      fetchData();
      setActiveTab('dashboard');
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kế hoạch này?')) return;
    await fetch(`/api/plans/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleEditModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;
    await fetch(`/api/models/${editingModel.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingModel)
    });
    setEditingModel(null);
    fetchData();
  };

  const handleDeleteModel = async (id: number) => {
    if (!confirm('Xóa Model sẽ không xóa các kế hoạch liên quan nhưng có thể gây lỗi hiển thị. Bạn có chắc chắn?')) return;
    await fetch(`/api/models/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleEditComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent) return;
    await fetch(`/api/components/${editingComponent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingComponent)
    });
    setEditingComponent(null);
    fetchData();
  };

  const handleDeleteComponent = async (id: number) => {
    if (!confirm('Xóa linh kiện sẽ ảnh hưởng đến các BOM đang sử dụng nó. Tiếp tục?')) return;
    await fetch(`/api/components/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleDeleteBOM = async (id: number) => {
    if (!confirm('Xóa linh kiện này khỏi BOM?')) return;
    await fetch(`/api/bom/${id}`, { method: 'DELETE' });
    fetchBOM(currentModelId);
  };

  const [selectedModelBOM, setSelectedModelBOM] = useState<BOMItem[]>([]);
  const [currentModelId, setCurrentModelId] = useState<number>(0);

  const fetchBOM = async (modelId: number) => {
    if (!modelId) return;
    setCurrentModelId(modelId);
    const res = await fetch(`/api/bom/${modelId}`);
    setSelectedModelBOM(await res.json());
  };

  const handleAddBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/bom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBOM)
    });
    fetchBOM(newBOM.model_id);
  };

  const updateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(capacity)
    });
    fetchData();
  };

  const renderDashboard = () => {
    const totalPlans = plans.length;
    const delayedPlans = plans.filter(p => p.gap_hours > 0).length;
    const onTimePlans = totalPlans - delayedPlans;

    const chartData = plans.slice(0, 7).reverse().map(p => ({
      name: p.model_code,
      gap: Math.round(p.gap_hours),
      status: p.gap_hours > 0 ? 'Delayed' : 'On Time'
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Tổng kế hoạch" value={totalPlans} icon={CalendarRange} color="indigo" />
          <StatCard label="Đúng tiến độ" value={onTimePlans} icon={CheckCircle2} color="emerald" />
          <StatCard label="Cảnh báo trễ" value={delayedPlans} icon={AlertCircle} color="rose" />
          <StatCard label="Năng lực (Giờ/Ngày)" value={capacity.workers * capacity.hours_per_day} subValue={`${capacity.workers} nhân công`} icon={Clock} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Phân tích trễ hạn (Giờ)" icon={LayoutDashboard} className="lg:col-span-2">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="gap" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gap > 0 ? '#f43f5e' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Kế hoạch gần đây" icon={Clock}>
            <div className="space-y-4">
              {plans.slice(0, 5).map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{plan.model_name}</p>
                    <p className="text-xs text-slate-500">{plan.quantity} PCS • {plan.deadline}</p>
                  </div>
                  {plan.gap_hours > 0 ? (
                    <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold uppercase">Trễ {Math.round(plan.gap_hours)}h</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase">Kịp</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Danh sách kế hoạch chi tiết" icon={CalendarRange}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Model</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Số lượng</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Bắt đầu</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Deadline</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Dự kiến xong</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Trạng thái</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-slate-900">{plan.model_name}</div>
                      <div className="text-xs text-slate-400">{plan.model_code}</div>
                    </td>
                    <td className="py-4 text-sm text-slate-600 font-mono">{plan.quantity}</td>
                    <td className="py-4 text-sm text-slate-600">{plan.start_date}</td>
                    <td className="py-4 text-sm text-slate-600">{plan.deadline}</td>
                    <td className="py-4 text-sm text-slate-600">{plan.estimated_completion_date}</td>
                    <td className="py-4">
                      {plan.gap_hours > 0 ? (
                        <div className="flex items-center gap-1.5 text-rose-600 font-medium text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Trễ {Math.round(plan.gap_hours)}h
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Khả thi
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => fetchRoadmap(plan.id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <ChevronRight className="w-4 h-4" />
                          Roadmap
                        </button>
                        <button 
                          onClick={() => {
                            setEditingPlan(plan);
                            setActiveTab('planning');
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <AnimatePresence>
          {selectedPlanRoadmap && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <Card title={`Lộ trình sản xuất chi tiết (Plan #${viewingRoadmapId})`} icon={CalendarRange}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedPlanRoadmap.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-2xl border transition-all ${item.is_bottleneck ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-900">{item.component_name}</h4>
                            <p className="text-xs text-slate-500">{item.component_code} • {item.quantity} PCS</p>
                          </div>
                          {item.is_bottleneck && (
                            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Điểm nghẽn
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Bắt đầu muộn nhất</p>
                            <p className="font-semibold text-slate-700">{item.start_date}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Hoàn thành</p>
                            <p className="font-semibold text-slate-700">{item.end_date}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <p className="text-xs text-slate-500">
                            Leadtime: <span className="font-bold text-slate-700">{Math.round(item.leadtime_minutes)} phút</span>
                          </p>
                          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.is_bottleneck ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                              style={{ width: '100%' }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setSelectedPlanRoadmap(null)}
                    className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 font-medium"
                  >
                    Đóng lộ trình
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMasterData = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Quản lý Model" icon={Package}>
            <form onSubmit={handleAddModel} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Mã Model" 
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={newModel.code || ''}
                onChange={e => setNewModel({...newModel, code: e.target.value})}
                required
              />
              <input 
                type="text" 
                placeholder="Tên Model" 
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={newModel.name || ''}
                onChange={e => setNewModel({...newModel, name: e.target.value})}
                required
              />
              <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {models.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                  {editingModel?.id === m.id ? (
                    <form onSubmit={handleEditModel} className="flex gap-2 w-full">
                      <input 
                        type="text" 
                        className="flex-1 px-2 py-1 rounded border text-sm"
                        value={editingModel.code || ''}
                        onChange={e => setEditingModel({...editingModel, code: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="flex-1 px-2 py-1 rounded border text-sm"
                        value={editingModel.name || ''}
                        onChange={e => setEditingModel({...editingModel, name: e.target.value})}
                      />
                      <button type="submit" className="text-emerald-600"><CheckCircle2 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setEditingModel(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-400">{m.code}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingModel(m)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteModel(m.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Quản lý Linh kiện (Khay)" icon={Cpu}>
            <form onSubmit={handleAddComponent} className="space-y-3 mb-6">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Mã Linh kiện" 
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newComponent.code || ''}
                  onChange={e => setNewComponent({...newComponent, code: e.target.value})}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Tên Linh kiện" 
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newComponent.name || ''}
                  onChange={e => setNewComponent({...newComponent, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input 
                  type="number" 
                  placeholder="Chuẩn (phút)" 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newComponent.standard_time_minutes === 0 ? '0' : (newComponent.standard_time_minutes || '')}
                  onChange={e => setNewComponent({...newComponent, standard_time_minutes: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  required
                />
                <input 
                  type="number" 
                  placeholder="Setup (phút)" 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newComponent.setup_time_minutes === 0 ? '0' : (newComponent.setup_time_minutes || '')}
                  onChange={e => setNewComponent({...newComponent, setup_time_minutes: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                />
                <input 
                  type="number" 
                  placeholder="Buffer (phút)" 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newComponent.buffer_time_minutes === 0 ? '0' : (newComponent.buffer_time_minutes || '')}
                  onChange={e => setNewComponent({...newComponent, buffer_time_minutes: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                />
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" /> Thêm linh kiện
              </button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {components.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                  {editingComponent?.id === c.id ? (
                    <form onSubmit={handleEditComponent} className="flex flex-col gap-2 w-full">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          value={editingComponent.code || ''}
                          onChange={e => setEditingComponent({...editingComponent, code: e.target.value})}
                        />
                        <input 
                          type="text" 
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          value={editingComponent.name || ''}
                          onChange={e => setEditingComponent({...editingComponent, name: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <input 
                          type="number" 
                          className="px-2 py-1 rounded border text-sm"
                          value={editingComponent.standard_time_minutes === 0 ? '0' : (editingComponent.standard_time_minutes || '')}
                          onChange={e => setEditingComponent({...editingComponent, standard_time_minutes: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                        />
                        <input 
                          type="number" 
                          className="px-2 py-1 rounded border text-sm"
                          value={editingComponent.setup_time_minutes === 0 ? '0' : (editingComponent.setup_time_minutes || '')}
                          onChange={e => setEditingComponent({...editingComponent, setup_time_minutes: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                        />
                        <input 
                          type="number" 
                          className="px-2 py-1 rounded border text-sm"
                          value={editingComponent.buffer_time_minutes === 0 ? '0' : (editingComponent.buffer_time_minutes || '')}
                          onChange={e => setEditingComponent({...editingComponent, buffer_time_minutes: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="submit" className="text-emerald-600"><CheckCircle2 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setEditingComponent(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.code} • Chuẩn: {c.standard_time_minutes}m • Setup: {c.setup_time_minutes}m • Buffer: {c.buffer_time_minutes}m</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingComponent(c)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteComponent(c.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Định mức nguyên vật liệu (BOM)" icon={Settings}>
            <form onSubmit={handleAddBOM} className="space-y-3 mb-6">
              <select 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={newBOM.model_id || ''}
                onChange={e => {
                  const id = parseInt(e.target.value);
                  setNewBOM({...newBOM, model_id: id});
                  fetchBOM(id);
                }}
                required
              >
                <option value="">Chọn Model</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
              </select>
              <div className="flex gap-2">
                <select 
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newBOM.component_id || ''}
                  onChange={e => setNewBOM({...newBOM, component_id: parseInt(e.target.value)})}
                  required
                >
                  <option value="">Chọn Linh kiện</option>
                  {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input 
                  type="number" 
                  placeholder="SL/Model" 
                  className="w-24 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={newBOM.quantity === 0 ? '0' : (newBOM.quantity || '')}
                  onChange={e => setNewBOM({...newBOM, quantity: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                  required
                />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </form>
            
            {currentModelId > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Linh kiện trong BOM:</h4>
                {selectedModelBOM.length > 0 ? (
                  selectedModelBOM.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 group">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.component_name}</p>
                        <p className="text-xs text-slate-500">{item.component_code}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-indigo-600">x{item.quantity}</p>
                          <p className="text-[10px] text-slate-400">{item.standard_time_minutes}m/đv</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteBOM(item.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">Chưa có linh kiện nào trong BOM này.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4 italic text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                Chọn Model để xem và chỉnh sửa BOM
              </p>
            )}
          </Card>

          <Card title="Năng lực sản xuất" icon={Clock}>
            <form onSubmit={updateCapacity} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Số nhân công/máy</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={capacity.workers === 0 ? '0' : (capacity.workers || '')}
                    onChange={e => setCapacity({...capacity, workers: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Giờ làm việc/ngày</label>
                  <input 
                    type="number" 
                    step="0.5"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={capacity.hours_per_day === 0 ? '0' : (capacity.hours_per_day || '')}
                    onChange={e => setCapacity({...capacity, hours_per_day: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors text-sm font-medium">
                Cập nhật năng lực
              </button>
            </form>
          </Card>
        </div>
      </div>
    );
  };

  const renderPlanning = () => {
    const isEditing = !!editingPlan;
    const planData = editingPlan || newPlan;

    return (
      <div className="max-w-2xl mx-auto">
        <Card title={isEditing ? "Chỉnh sửa kế hoạch" : "Tạo kế hoạch sản xuất mới"} icon={CalendarRange}>
          <form onSubmit={handleAddPlan} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sản phẩm (Model)</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={planData.model_id || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    isEditing ? setEditingPlan({...editingPlan, model_id: val}) : setNewPlan({...newPlan, model_id: val});
                  }}
                  required
                >
                  <option value="">Chọn Model cần sản xuất</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng (PCS)</label>
                <input 
                  type="number" 
                  placeholder="Ví dụ: 500"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={planData.quantity === 0 ? '0' : (planData.quantity || '')}
                  onChange={e => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                    isEditing ? setEditingPlan({...editingPlan, quantity: val}) : setNewPlan({...newPlan, quantity: val});
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={planData.start_date || ''}
                    onChange={e => {
                      const val = e.target.value;
                      isEditing ? setEditingPlan({...editingPlan, start_date: val}) : setNewPlan({...newPlan, start_date: val});
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót (Deadline)</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={planData.deadline || ''}
                    onChange={e => {
                      const val = e.target.value;
                      isEditing ? setEditingPlan({...editingPlan, deadline: val}) : setNewPlan({...newPlan, deadline: val});
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
              <div className="flex gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                  <Settings className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-900">Giải thích Thuật toán</h4>
                  <div className="text-xs text-indigo-700 mt-2 space-y-2 leading-relaxed">
                    <p><strong>1. Leadtime Linh kiện:</strong> (Số lượng × Thời gian chuẩn) + Setup time + Buffer time.</p>
                    <p><strong>2. Lập lịch ngược (Backward):</strong> Dựa trên Deadline, hệ thống tính ngược lại ngày bắt đầu muộn nhất cho từng linh kiện (loại trừ Chủ Nhật).</p>
                    <p><strong>3. Phân bổ nguồn lực:</strong> Linh kiện có Leadtime dài nhất được ưu tiên sắp xếp trước.</p>
                    <p><strong>4. Cảnh báo điểm nghẽn:</strong> Nếu Leadtime linh kiện vượt quá quỹ thời gian 1 ca làm việc, hệ thống sẽ đánh dấu màu vàng.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {isEditing && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setActiveTab('dashboard');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
                >
                  Hủy bỏ
                </button>
              )}
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <CalendarRange className="w-5 h-5" />
                {isEditing ? "Cập nhật kế hoạch" : "Tính toán & Lập kế hoạch"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Package className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">WaterFlow</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Production Pro</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('planning')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'planning' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <CalendarRange className="w-5 h-5" />
              Lập kế hoạch
            </button>
            <button 
              onClick={() => setActiveTab('masterdata')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'masterdata' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Database className="w-5 h-5" />
              Dữ liệu gốc
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-xs font-medium text-slate-400">Hệ thống đang chạy</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold">Máy chủ ổn định</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {activeTab === 'dashboard' && 'Tổng quan sản xuất'}
            {activeTab === 'planning' && 'Lập kế hoạch tự động'}
            {activeTab === 'masterdata' && 'Quản lý danh mục'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">Admin Factory</p>
              <p className="text-xs text-slate-400">Quản lý sản xuất</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'masterdata' && renderMasterData()}
              {activeTab === 'planning' && renderPlanning()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
