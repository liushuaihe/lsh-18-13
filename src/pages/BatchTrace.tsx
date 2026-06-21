import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMonitorStore } from '@/store/useMonitorStore';
import { Batch, BatchRiskLevel, BatchStatus } from '@/types';
import { RISK_LEVEL_LABELS, BATCH_STATUS_LABELS } from '@/data/mockData';
import {
  Search, Filter, ArrowLeft, CheckCircle, XCircle,
  ThermometerSun, Cog, Truck, Package, AlertTriangle,
  Calendar, User, FileText, Clock, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BatchTrace() {
  const navigate = useNavigate();
  const { batches, acceptBatch, rejectBatch } = useMonitorStore();
  const [searchText, setSearchText] = useState('');
  const [riskFilter, setRiskFilter] = useState<BatchRiskLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
  const [spindleFilter, setSpindleFilter] = useState<string>('all');
  const [conveyorFilter, setConveyorFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [inspectorName, setInspectorName] = useState('');
  const [remark, setRemark] = useState('');

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (searchText && !b.batchNo.toLowerCase().includes(searchText.toLowerCase())
        && !b.productName.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      if (riskFilter !== 'all' && b.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (spindleFilter !== 'all' && b.spindleId !== spindleFilter) return false;
      if (conveyorFilter !== 'all' && b.conveyorId !== conveyorFilter) return false;
      return true;
    }).sort((a, b) => b.endTime - a.endTime);
  }, [batches, searchText, riskFilter, statusFilter, spindleFilter, conveyorFilter]);

  const stats = useMemo(() => {
    const total = batches.length;
    const pending = batches.filter(b => b.status === 'pending').length;
    const risky = batches.filter(b => b.riskLevel === 'warning' || b.riskLevel === 'critical').length;
    const critical = batches.filter(b => b.riskLevel === 'critical').length;
    return { total, pending, risky, critical };
  }, [batches]);

  const handleAccept = () => {
    if (!selectedBatch || !inspectorName.trim()) return;
    acceptBatch(selectedBatch.id, inspectorName.trim(), remark.trim() || undefined);
    setShowAcceptDialog(false);
    setInspectorName('');
    setRemark('');
    setSelectedBatch(prev => prev ? { ...prev, status: 'accepted', inspector: inspectorName.trim(), remark: remark.trim() || prev.remark } : null);
  };

  const handleReject = () => {
    if (!selectedBatch || !inspectorName.trim()) return;
    rejectBatch(selectedBatch.id, inspectorName.trim(), remark.trim() || undefined);
    setShowRejectDialog(false);
    setInspectorName('');
    setRemark('');
    setSelectedBatch(prev => prev ? { ...prev, status: 'rejected', inspector: inspectorName.trim(), remark: remark.trim() || prev.remark } : null);
  };

  const spindleOptions = useMemo(() => {
    const set = new Set(batches.map(b => b.spindleId));
    return Array.from(set).map(id => ({ id, name: batches.find(b => b.spindleId === id)?.spindleName || id }));
  }, [batches]);

  const conveyorOptions = useMemo(() => {
    const set = new Set(batches.map(b => b.conveyorId));
    return Array.from(set).map(id => ({ id, name: batches.find(b => b.conveyorId === id)?.conveyorName || id }));
  }, [batches]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatDuration = (start: number, end: number) => {
    const mins = Math.floor((end - start) / 60000);
    if (mins < 60) return `${mins}分钟`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}小时${rem}分`;
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-cyber-bg overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none cyber-grid opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-noise" />

      {/* Header */}
      <div className="relative z-10 h-14 flex items-center px-4 gap-3 border-b border-cyber-line
        bg-gradient-to-r from-cyber-panel via-cyber-card to-cyber-panel">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-cyber-cyan/40
            bg-cyber-cyan/5 text-cyber-cyan hover:bg-cyber-cyan/15 transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          返回监控
        </button>
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-cyber-cyan/30 to-transparent" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-cyber-cyan/10 border border-cyber-cyan/50
            flex items-center justify-center">
            <Package size={16} className="text-cyber-cyan" />
          </div>
          <div>
            <div className="font-orbitron text-sm tracking-wider text-cyber-cyan neon-text-cyan">
              BATCH TRACE
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              批次追溯 · 质检验收系统
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4">
          <StatMini icon={<BarChart3 size={12} />} label="总批次" value={stats.total} color="cyan" />
          <StatMini icon={<Clock size={12} />} label="待验收" value={stats.pending} color="amber" />
          <StatMini icon={<AlertTriangle size={12} />} label="风险批次" value={stats.risky} color={stats.critical > 0 ? 'red' : 'amber'} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* LEFT: Batch List */}
        <div className="w-[42%] xl:w-[44%] h-full border-r border-cyber-line/70 flex flex-col bg-cyber-bg/60">
          {/* Filter Bar */}
          <div className="p-3 border-b border-cyber-line/50 space-y-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="搜索批次号、产品名称..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-cyber-panel/60 border border-cyber-line rounded-md
                  text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyber-cyan/50
                  font-mono"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <FilterChip
                icon={<Filter size={11} />}
                label="风险等级"
                value={riskFilter === 'all' ? '全部' : RISK_LEVEL_LABELS[riskFilter].label}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'normal', label: '正常' },
                  { value: 'warning', label: '预警' },
                  { value: 'critical', label: '高风险' },
                ]}
                onChange={v => setRiskFilter(v as BatchRiskLevel | 'all')}
              />
              <FilterChip
                icon={<FileText size={11} />}
                label="状态"
                value={statusFilter === 'all' ? '全部' : BATCH_STATUS_LABELS[statusFilter].label}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'pending', label: '待验收' },
                  { value: 'accepted', label: '已验收' },
                  { value: 'rejected', label: '已拒收' },
                ]}
                onChange={v => setStatusFilter(v as BatchStatus | 'all')}
              />
              <FilterChip
                icon={<Cog size={11} />}
                label="主轴"
                value={spindleFilter === 'all' ? '全部' : spindleOptions.find(o => o.id === spindleFilter)?.name || spindleFilter}
                options={[{ value: 'all', label: '全部' }, ...spindleOptions.map(o => ({ value: o.id, label: o.name }))]}
                onChange={v => setSpindleFilter(v)}
              />
              <FilterChip
                icon={<Truck size={11} />}
                label="传送带"
                value={conveyorFilter === 'all' ? '全部' : conveyorOptions.find(o => o.id === conveyorFilter)?.name || conveyorFilter}
                options={[{ value: 'all', label: '全部' }, ...conveyorOptions.map(o => ({ value: o.id, label: o.name }))]}
                onChange={v => setConveyorFilter(v)}
              />
            </div>
          </div>

          {/* Batch List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Package size={32} className="mb-2 opacity-40" />
                <div className="text-sm">没有找到匹配的批次</div>
              </div>
            ) : (
              filteredBatches.map(batch => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  selected={selectedBatch?.id === batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Batch Detail */}
        <div className="flex-1 h-full flex flex-col bg-cyber-bg/50 p-4">
          {selectedBatch ? (
            <BatchDetail
              batch={selectedBatch}
              formatDate={formatDate}
              formatDuration={formatDuration}
              onAccept={() => { setInspectorName(''); setRemark(''); setShowAcceptDialog(true); }}
              onReject={() => { setInspectorName(''); setRemark(''); setShowRejectDialog(true); }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700
                flex items-center justify-center mb-4">
                <Package size={32} className="opacity-40" />
              </div>
              <div className="text-sm font-mono">选择左侧批次查看详情</div>
              <div className="text-xs text-slate-600 mt-1">SELECT A BATCH TO VIEW DETAILS</div>
            </div>
          )}
        </div>
      </div>

      {/* Accept Dialog */}
      {showAcceptDialog && selectedBatch && (
        <ActionDialog
          title="验收批次"
          batchNo={selectedBatch.batchNo}
          type="accept"
          inspectorName={inspectorName}
          setInspectorName={setInspectorName}
          remark={remark}
          setRemark={setRemark}
          onConfirm={handleAccept}
          onCancel={() => setShowAcceptDialog(false)}
        />
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedBatch && (
        <ActionDialog
          title="拒收批次"
          batchNo={selectedBatch.batchNo}
          type="reject"
          inspectorName={inspectorName}
          setInspectorName={setInspectorName}
          remark={remark}
          setRemark={setRemark}
          onConfirm={handleReject}
          onCancel={() => setShowRejectDialog(false)}
        />
      )}
    </div>
  );
}

const StatMini: React.FC<{ icon: React.ReactNode; label: string; value: number; color: 'cyan' | 'amber' | 'red' }> = ({ icon, label, value, color }) => {
  const cmap = {
    cyan: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5',
    amber: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    red: 'text-rose-400 border-rose-500/50 bg-rose-500/10',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-md border ${cmap[color]}`}>
      <span>{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-orbitron font-bold text-sm">{value}</span>
    </div>
  );
};

const FilterChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ icon, label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-cyber-line/60
          bg-cyber-panel/50 text-slate-300 hover:border-cyber-cyan/40 hover:text-cyber-cyan/80
          transition-colors text-xs"
      >
        <span className="text-slate-500">{icon}</span>
        <span className="text-slate-500">{label}:</span>
        <span className="font-mono">{value}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[120px] py-1 rounded-md
            border border-cyber-line/60 bg-cyber-card shadow-xl shadow-black/40">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-cyber-cyan/10 transition-colors
                  ${value === opt.value ? 'text-cyber-cyan bg-cyber-cyan/5' : 'text-slate-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const BatchCard: React.FC<{
  batch: Batch;
  selected: boolean;
  onClick: () => void;
  formatDate: (ts: number) => string;
}> = ({ batch, selected, onClick, formatDate }) => {
  const riskInfo = RISK_LEVEL_LABELS[batch.riskLevel];
  const statusInfo = BATCH_STATUS_LABELS[batch.status];
  const overTemp = batch.tempPeak > batch.tempThreshold;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all cursor-pointer
        ${selected
          ? 'border-cyber-cyan/60 bg-cyber-cyan/8 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
          : 'border-cyber-line/50 bg-cyber-panel/30 hover:border-cyber-cyan/30 hover:bg-cyber-panel/50'
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-mono text-sm text-cyber-cyan font-semibold neon-text-cyan">
            {batch.batchNo}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{batch.productName}</div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${riskInfo.color}`}>
            {riskInfo.label}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Cog size={11} className="text-slate-500" />
          <span className="font-mono">{batch.spindleName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Truck size={11} className="text-slate-500" />
          <span className="font-mono">{batch.conveyorName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThermometerSun size={11} className={overTemp ? 'text-rose-400' : 'text-slate-500'} />
          <span className={`font-mono ${overTemp ? 'text-rose-400' : 'text-slate-400'}`}>
            峰值 {batch.tempPeak.toFixed(1)}°C
          </span>
          <span className="text-slate-600 text-[10px]">/ {batch.tempThreshold}°</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Package size={11} className="text-slate-500" />
          <span className="font-mono">{batch.quantity} 件</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-cyber-line/30 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar size={10} />
          <span className="font-mono">{formatDate(batch.endTime)}</span>
        </div>
        {batch.inspector && (
          <div className="flex items-center gap-1">
            <User size={10} />
            <span>{batch.inspector}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const BatchDetail: React.FC<{
  batch: Batch;
  formatDate: (ts: number) => string;
  formatDuration: (s: number, e: number) => string;
  onAccept: () => void;
  onReject: () => void;
}> = ({ batch, formatDate, formatDuration, onAccept, onReject }) => {
  const riskInfo = RISK_LEVEL_LABELS[batch.riskLevel];
  const statusInfo = BATCH_STATUS_LABELS[batch.status];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Detail Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-orbitron text-lg tracking-wider text-cyber-cyan neon-text-cyan">
              {batch.batchNo}
            </div>
            <div className="text-sm text-slate-400 mt-0.5">{batch.productName}</div>
          </div>
          <div className="flex gap-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-mono border ${riskInfo.color}`}>
              {riskInfo.label}
            </span>
            <span className={`px-2.5 py-1 rounded-md text-xs font-mono border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <InfoCard icon={<Cog size={14} />} label="加工主轴" value={batch.spindleName} sub={batch.spindleId} />
        <InfoCard icon={<Truck size={14} />} label="物流通道" value={batch.conveyorName} sub={batch.conveyorId} />
        <InfoCard icon={<Package size={14} />} label="批次数量" value={`${batch.quantity} 件`} sub={`产品规格`} />
        <InfoCard icon={<Clock size={14} />} label="加工时长" value={formatDuration(batch.startTime, batch.endTime)} sub={`${formatDate(batch.startTime).split(' ')[1]} ~ ${formatDate(batch.endTime).split(' ')[1]}`} />
      </div>

      {/* Temperature Section */}
      <div className="flex-1 min-h-0 flex flex-col border border-cyber-line/50 rounded-lg bg-cyber-panel/30 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-cyber-line/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThermometerSun size={14} className="text-cyber-cyan" />
            <span className="text-sm text-slate-200 font-medium">温度曲线</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">平均温度:</span>
              <span className="font-mono text-cyber-cyan">{batch.avgTemp.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">温度峰值:</span>
              <span className={`font-mono ${batch.tempPeak > batch.tempThreshold ? 'text-rose-400' : 'text-emerald-400'}`}>
                {batch.tempPeak.toFixed(1)}°C
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">阈值:</span>
              <span className="font-mono text-amber-400">{batch.tempThreshold}°C</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 min-h-0">
          <BatchTempChart history={batch.tempHistory} threshold={batch.tempThreshold} peak={batch.tempPeak} />
        </div>
      </div>

      {/* Actions & Inspector Info */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-500 flex items-center gap-4">
          {batch.inspector && (
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span>质检员: <span className="text-slate-300 font-mono">{batch.inspector}</span></span>
            </div>
          )}
          {batch.remark && (
            <div className="flex items-center gap-1.5">
              <FileText size={12} />
              <span>备注: <span className="text-slate-300">{batch.remark}</span></span>
            </div>
          )}
        </div>
        {batch.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-rose-500/50
                bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium"
            >
              <XCircle size={14} />
              拒收
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-emerald-500/50
                bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
            >
              <CheckCircle size={14} />
              验收通过
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
  <div className="p-3 rounded-lg border border-cyber-line/50 bg-cyber-panel/30">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-cyber-cyan">{icon}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-sm font-mono text-slate-200">{value}</div>
    {sub && <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{sub}</div>}
  </div>
);

const BatchTempChart: React.FC<{ history: Array<{ t: number; v: number }>; threshold: number; peak: number }> = ({ history, threshold, peak }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 16, right: 48, bottom: 24, left: 8 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const tMin = history[0].t;
    const tMax = history[history.length - 1].t;
    const tRange = tMax - tMin || 1;

    let tempMin = Math.min(...history.map(p => p.v), threshold) - 5;
    let tempMax = Math.max(...history.map(p => p.v), threshold) + 5;
    const tempRange = tempMax - tempMin;

    const x = (t: number) => padding.left + ((t - tMin) / tRange) * plotW;
    const y = (v: number) => padding.top + (1 - (v - tempMin) / tempRange) * plotH;

    // Grid
    ctx.strokeStyle = 'rgba(0,240,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const gy = padding.top + (i / 5) * plotH;
      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(padding.left + plotW, gy);
      ctx.stroke();
      const val = tempMax - (i / 5) * tempRange;
      ctx.fillStyle = 'rgba(138,155,179,0.5)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${val.toFixed(0)}°`, padding.left + plotW + 4, gy);
    }

    // Threshold line
    const thy = y(threshold);
    if (thy >= padding.top && thy <= padding.top + plotH) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(255,149,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, thy);
      ctx.lineTo(padding.left + plotW, thy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,149,0,0.8)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`阈值 ${threshold}°`, padding.left + 6, thy - 3);
      ctx.restore();
    }

    // Peak marker
    const peakIdx = history.reduce((maxIdx, p, i) => p.v > history[maxIdx].v ? i : maxIdx, 0);
    const peakPoint = history[peakIdx];
    const peakX = x(peakPoint.t);
    const peakY = y(peakPoint.v);
    const overTemp = peak > threshold;

    // Fill under curve
    const lineColor = overTemp ? '#FF2D55' : '#00F0FF';
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
    grad.addColorStop(0, lineColor + '30');
    grad.addColorStop(1, lineColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x(history[0].t), y(history[0].v));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(x(history[i].t), y(history[i].v));
    }
    ctx.lineTo(x(history[history.length - 1].t), padding.top + plotH);
    ctx.lineTo(x(history[0].t), padding.top + plotH);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x(history[0].t), y(history[0].v));
    for (let i = 1; i < history.length; i++) {
      const p = history[i];
      const prev = history[i - 1];
      const cpx = x(prev.t) + (x(p.t) - x(prev.t)) * 0.5;
      ctx.bezierCurveTo(cpx, y(prev.v), cpx, y(p.v), x(p.t), y(p.v));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Peak dot
    ctx.fillStyle = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Peak label
    ctx.fillStyle = lineColor;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`峰值 ${peak.toFixed(1)}°`, peakX, peakY - 8);
    ctx.shadowBlur = 0;

    // X axis labels
    ctx.fillStyle = 'rgba(138,155,179,0.5)';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const t = tMin + (i / 4) * tRange;
      const gx = padding.left + (i / 4) * plotW;
      const d = new Date(t);
      const label = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(label, gx, padding.top + plotH + 6);
    }
  }, [history, threshold, peak]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

const ActionDialog: React.FC<{
  title: string;
  batchNo: string;
  type: 'accept' | 'reject';
  inspectorName: string;
  setInspectorName: (v: string) => void;
  remark: string;
  setRemark: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, batchNo, type, inspectorName, setInspectorName, remark, setRemark, onConfirm, onCancel }) => {
  const colorClass = type === 'accept'
    ? 'border-emerald-500/50 text-emerald-400'
    : 'border-rose-500/50 text-rose-400';
  const btnClass = type === 'accept'
    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30'
    : 'bg-rose-500/20 border-rose-500/60 text-rose-300 hover:bg-rose-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-lg border border-cyber-line bg-cyber-card shadow-2xl shadow-black/50">
        <div className={`px-4 py-3 border-b ${type === 'accept' ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
          <div className={`font-orbitron text-sm tracking-wider ${type === 'accept' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {title}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono">{batchNo}</div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">质检员姓名 *</label>
            <input
              type="text"
              value={inspectorName}
              onChange={e => setInspectorName(e.target.value)}
              placeholder="请输入质检员姓名"
              className="w-full px-3 py-2 bg-cyber-panel/60 border border-cyber-line rounded-md
                text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyber-cyan/50
                font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">备注说明</label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="请输入验收备注（可选）"
              rows={3}
              className="w-full px-3 py-2 bg-cyber-panel/60 border border-cyber-line rounded-md
                text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyber-cyan/50
                resize-none font-mono"
            />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-cyber-line/50 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-cyber-line/60 text-slate-400
              hover:bg-cyber-panel/50 hover:text-slate-300 transition-colors text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!inspectorName.trim()}
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors
              ${btnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            确认{title}
          </button>
        </div>
      </div>
    </div>
  );
};
