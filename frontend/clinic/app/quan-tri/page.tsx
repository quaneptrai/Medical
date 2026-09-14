'use client';

import * as React from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, BookOpen, Building2, CalendarDays, ChevronRight, ClipboardList, HeartHandshake, LayoutDashboard, LockKeyhole, MessageCircle, Package, RefreshCw, Search, Settings2, ShieldCheck, Stethoscope, Users, Wallet, Wrench } from 'lucide-react';
import type { AdminData } from '@/lib/admin-types';
import { ROLE_LABELS, STATUS_LABELS, AUDIT_LABELS, normalizeSearch } from '@/lib/admin-labels';
import { UserDirectory } from '@/components/admin/UserDirectory';
import { DoctorEditor, SpecialtyEditor, ServiceEditor, TenantEditor, InventoryManager, MaintenanceManager } from '@/components/admin/CatalogEditors';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminOverview, Operations } from '@/components/admin/AdminOverview';
import { AppointmentManager } from '@/components/admin/AppointmentManager';
import { ContentReview } from '@/components/admin/ContentReview';
import './admin.css';

const modules = [
  { key:'overview', label:'Tổng quan', group:'Điều hành', icon:LayoutDashboard, hint:'Lịch hôm nay, xu hướng và công việc cần xử lý' },
  { key:'appointments', label:'Lịch hẹn & tiếp nhận', group:'Điều hành', icon:CalendarDays, hint:'Tìm lịch, xác nhận, tiếp nhận và hoàn tất lượt khám' },
  { key:'patients', label:'Danh sách người bệnh', group:'Điều hành', icon:Users, hint:'Người bệnh có tài khoản và lịch sử đặt lịch trong hệ thống' },
  { key:'chat', label:'Theo dõi hội thoại', group:'Điều hành', icon:MessageCircle, hint:'Danh sách 100 kênh gần nhất, người phụ trách và trạng thái' },
  { key:'doctors', label:'Bác sĩ', group:'Dịch vụ khám', icon:Stethoscope, hint:'Hồ sơ, ảnh chân dung và ngày làm việc của bác sĩ' },
  { key:'specialties', label:'Chuyên khoa', group:'Dịch vụ khám', icon:HeartHandshake, hint:'Thông tin chuyên khoa và trạng thái hiển thị' },
  { key:'services', label:'Dịch vụ khám', group:'Dịch vụ khám', icon:ClipboardList, hint:'Danh mục dịch vụ cung cấp tại phòng khám' },
  { key:'triage', label:'Phiên trợ lý sức khỏe', group:'Chăm sóc & nội dung', icon:Activity, hint:'30 phiên được lưu gần nhất và cờ cảnh báo' },
  { key:'feedback', label:'Đánh giá người bệnh', group:'Chăm sóc & nội dung', icon:HeartHandshake, hint:'50 đánh giá gần nhất, xem nội dung và quản lý hiển thị' },
  { key:'content', label:'Rà soát cẩm nang', group:'Chăm sóc & nội dung', icon:BookOpen, hint:'Kiểm tra nội dung còn thiếu và ghi chú biên tập bệnh lý' },
  { key:'inventory', label:'Kho thuốc & vật tư', group:'Nguồn lực & báo cáo', icon:Package, hint:'Danh mục kho, nhập xuất và kiểm kê tồn thực tế' },
  { key:'maintenance', label:'Thiết bị & bảo trì', group:'Nguồn lực & báo cáo', icon:Wrench, hint:'Danh mục tài sản và lịch bảo trì' },
  { key:'invoices', label:'Hóa đơn & thanh toán', group:'Nguồn lực & báo cáo', icon:Wallet, hint:'30 hóa đơn gần nhất · thanh toán đang ở chế độ thử nghiệm' },
  { key:'reports', label:'Báo cáo vận hành', group:'Nguồn lực & báo cáo', icon:LayoutDashboard, hint:'Thống kê lịch khám toàn kỳ, theo ngày và chất lượng chuyên khoa' },
  { key:'users', label:'Tài khoản', group:'Hệ thống', icon:Users, hint:'Tối đa 200 tài khoản gần nhất, xem hồ sơ, khóa và mở khóa' },
  { key:'roles', label:'Vai trò & quyền truy cập', group:'Hệ thống', icon:ShieldCheck, hint:'Danh sách vai trò và các quyền đã cấu hình' },
  { key:'tenants', label:'Thông tin cơ sở', group:'Hệ thống', icon:Building2, hint:'Thông tin liên hệ, thương hiệu và trạng thái cơ sở' },
  { key:'audit', label:'Nhật ký hoạt động', group:'Hệ thống', icon:ClipboardList, hint:'30 thao tác quản trị gần nhất' },
];
const groups=Array.from(new Set(modules.map(m=>m.group)));

function StatusControl({entity,id,value,onChanged}:{entity:string;id:string;value:string|number;onChanged:()=>void}) {
  const [saving,setSaving]=React.useState(false);const [error,setError]=React.useState('');
  const options:Record<string,Array<string|number>>={tenant_active:[1,0],feedback_status:['published','reviewed','hidden'],invoice_status:['pending','paid_demo','failed','refunded_demo'],chat_status:['active','closed']};
  return <div><select aria-label="Thay đổi trạng thái" value={value} disabled={saving} onChange={async e=>{
    const next=entity==='tenant_active'?Number(e.target.value):e.target.value;setSaving(true);setError('');
    try{const response=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity,id,value:next})});const result=await response.json();if(!response.ok)throw new Error(result.detail||'Không thể cập nhật.');onChanged();}
    catch(error){setError(error instanceof Error?error.message:'Mất kết nối. Vui lòng thử lại.');}finally{setSaving(false);}
  }}>{options[entity].map(option=><option key={option} value={option}>{entity==='tenant_active'?(option===1?'Đang hoạt động':'Tạm ngưng'):STATUS_LABELS[String(option)]||String(option)}</option>)}</select>{error&&<small role="alert" className="admin-error">{error}</small>}</div>;
}

export default function AdminPage(){
  const [data,setData]=React.useState<AdminData|null>(null);const [ops,setOps]=React.useState<Operations|null>(null);
  const [error,setError]=React.useState('');const [loading,setLoading]=React.useState(false);const [active,setActive]=React.useState('overview');const [menuQuery,setMenuQuery]=React.useState('');
  const [updated,setUpdated]=React.useState('');
  const load=React.useCallback(async()=>{
    setLoading(true);
    try{
      const [response,operationResponse]=await Promise.all([fetch('/api/admin',{cache:'no-store'}),fetch('/api/admin/operations',{cache:'no-store'})]);
      if(!response.ok)throw new Error(response.status===401?'Vui lòng đăng nhập tài khoản quản trị.':response.status===403?'Tài khoản cần vai trò Quản trị hệ thống.':'Không thể tải dữ liệu quản trị.');
      if(!operationResponse.ok)throw new Error('Không thể tải dữ liệu vận hành. Vui lòng thử lại.');
      setData(await response.json());setOps(await operationResponse.json());setError('');setUpdated(new Date().toLocaleTimeString('vi-VN'));
    }catch(error){setError(error instanceof Error?error.message:'Mất kết nối máy chủ.');}finally{setLoading(false);}
  },[]);
  React.useEffect(()=>{void load();const sync=()=>{const key=window.location.hash.slice(1);setActive(modules.some(m=>m.key===key)?key:'overview');};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[load]);
  function navigate(key:string){if(modules.some(m=>m.key===key)){setActive(key);window.location.hash=key;}}
  const current=modules.find(m=>m.key===active)||modules[0];
  if(!data) return <div className="admin-root admin-access"><LockKeyhole size={32}/><h1>{error?'Không thể mở quản trị':'Đang tải phòng làm việc…'}</h1>{error&&<><p role="alert">{error}</p><Link className="admin-button primary" href="/dang-nhap?returnUrl=/quan-tri">Đăng nhập quản trị</Link><button className="admin-button" onClick={load}>Thử lại</button></>}</div>;
  return <div className="admin-root">
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span><Settings2 size={22}/></span><div><strong>QUANG THANH</strong><small>Không gian quản lý</small></div></div>
        <label className="admin-menu-search"><Search size={16}/><input aria-label="Tìm chức năng quản lý" placeholder="Tìm chức năng…" value={menuQuery} onChange={e=>setMenuQuery(e.target.value)}/></label>
        <nav aria-label="Chức năng quản lý">{groups.map(group=>{const items=modules.filter(m=>m.group===group&&normalizeSearch(m.label).includes(normalizeSearch(menuQuery.trim())));return items.length?<div key={group}><p>{group}</p>{items.map(m=><button key={m.key} aria-current={active===m.key?'page':undefined} onClick={()=>navigate(m.key)} className={active===m.key?'is-active':''}><m.icon size={17}/><span>{m.label}</span>{active===m.key&&<ChevronRight size={14}/>}</button>)}</div>:null;})}{!modules.some(m=>normalizeSearch(m.label).includes(normalizeSearch(menuQuery.trim())))&&<p role="status" className="px-3 py-4 text-xs">Không tìm thấy chức năng phù hợp.</p>}</nav>
        <Link href="/" className="admin-back">Xem website <ArrowUpRight size={16}/></Link>
      </aside>
      <div className="admin-workspace">
        <div className="admin-topline"><span>Quản lý phòng khám <ChevronRight size={13}/> {current.group}</span><span className="admin-account"><ShieldCheck size={15}/>{data.viewer.display_name||data.viewer.email}</span></div>
        <header className="admin-page-heading"><div><span className="admin-eyebrow">{active==='overview'?'Chào mừng trở lại':current.group}</span><h1>{current.label}</h1><p>{current.hint}</p></div><div><button disabled={loading} className="admin-button" onClick={load}><RefreshCw size={15} className={loading?'animate-spin':''}/>{loading?'Đang tải…':'Làm mới dữ liệu'}</button><small>Cập nhật lúc {updated}</small></div></header>
        {error&&<p className="admin-error" role="alert">{error}</p>}
        <div className="admin-module" key={active}>
          {(active==='overview'||active==='reports')&&ops&&<AdminOverview data={ops} navigate={navigate} reports={active==='reports'}/>}
          {active==='appointments'&&<AppointmentManager specialties={data.specialties} onChanged={load}/>}
          {active==='patients'&&<><p className="admin-info">Danh sách tài khoản có vai trò Người bệnh (tối đa 200 tài khoản gần nhất). Người đặt lịch chưa có tài khoản nằm trong mục Lịch hẹn & tiếp nhận.</p><UserDirectory users={data.users.filter(u=>u.roles.split(',').includes('patient'))} roles={data.roles} onChanged={load}/></>}
          {active==='users'&&<UserDirectory users={data.users} roles={data.roles} onChanged={load}/>}
          {active==='doctors'&&<DoctorEditor doctors={data.doctors} specialties={data.specialties} onChanged={load}/>}
          {active==='specialties'&&<SpecialtyEditor specialties={data.specialties} onChanged={load}/>}
          {active==='services'&&<ServiceEditor services={data.services} specialties={data.specialties} onChanged={load}/>}
          {active==='inventory'&&<InventoryManager data={data} onChanged={load}/>}
          {active==='maintenance'&&<MaintenanceManager data={data} onChanged={load}/>}
          {active==='content'&&<ContentReview/>}
          {active==='tenants'&&data.tenants.map(t=><section className="admin-panel" key={t.id}><header><h3>{t.name}</h3><StatusControl entity="tenant_active" id={t.id} value={t.is_active} onChanged={load}/></header><TenantEditor tenant={t} onChanged={load}/></section>)}
          {active==='roles'&&<><AdminTable label="vai trò" rows={data.roles} columns={[{label:'Vai trò',value:r=>ROLE_LABELS[r.code]||r.name},{label:'Người dùng',value:r=>r.user_count},{label:'Số quyền',value:r=>r.permission_count}]}/><h3 className="admin-section-title">Các quyền đang cấu hình</h3><AdminTable label="quyền truy cập" rows={data.permissions} columns={[{label:'Chức năng',value:r=>r.name},{label:'Mã quyền',value:r=>r.code},{label:'Nhóm',value:r=>r.category}]}/><p className="admin-info">Gán vai trò cho từng người trong mục Tài khoản.</p></>}
          {active==='feedback'&&<AdminTable label="đánh giá" rows={data.feedback} columns={[{label:'Bác sĩ',value:r=>r.doctor_name},{label:'Chuyên khoa',value:r=>r.specialty_name},{label:'Điểm',value:r=>r.rating+'/5'},{label:'Nội dung',value:r=>r.comment},{label:'Trạng thái',value:r=>STATUS_LABELS[r.status]||r.status,render:r=><StatusControl entity="feedback_status" id={r.id} value={r.status} onChanged={load}/>} ]}/>}
          {active==='triage'&&<AdminTable label="phiên trợ lý" rows={data.triage} columns={[{label:'Mã phiên',value:r=>r.id},{label:'Giai đoạn',value:r=>({intake:'Tiếp nhận',collecting:'Thu thập triệu chứng',clarifying:'Làm rõ triệu chứng',completed:'Hoàn thành',emergency:'Cảnh báo khẩn cấp'}[r.stage]||r.stage)},{label:'Mô tả ban đầu',value:r=>r.chief_complaint},{label:'Cảnh báo',value:r=>r.is_emergency?'Khẩn cấp':'Không có cờ khẩn cấp'}]}/>}
          {active==='invoices'&&<><p className="admin-info">Thanh toán thử nghiệm: thay đổi trạng thái chỉ cập nhật dữ liệu mô phỏng, không thu hoặc hoàn tiền thật. Số liệu này không dùng làm doanh thu thực tế.</p><AdminTable label="hóa đơn" rows={data.invoices} columns={[{label:'Mã hóa đơn',value:r=>r.id},{label:'Số tiền (đ)',value:r=>new Intl.NumberFormat('vi-VN').format(r.amount)},{label:'Phương thức',value:r=>STATUS_LABELS[r.payment_method]||r.payment_method},{label:'Mã giao dịch',value:r=>r.transaction_code},{label:'Trạng thái',value:r=>STATUS_LABELS[r.payment_status]||r.payment_status,render:r=><StatusControl entity="invoice_status" id={r.id} value={r.payment_status} onChanged={load}/>} ]}/></>}
          {active==='chat'&&ops&&<AdminTable label="hội thoại" rows={ops.chat} columns={[{label:'Người bệnh',value:r=>r.patient_name},{label:'Bác sĩ phụ trách',value:r=>r.doctor_name||'Chưa phân công'},{label:'Số tin nhắn',value:r=>r.message_count},{label:'Cập nhật gần nhất',value:r=>new Date((r.last_message_at||r.created_at)*1000).toLocaleString('vi-VN')},{label:'Trạng thái',value:r=>STATUS_LABELS[r.status]||r.status,render:r=><StatusControl entity="chat_status" id={r.id} value={r.status} onChanged={load}/>} ]}/>}
          {active==='audit'&&<AdminTable label="hoạt động" rows={data.audit} columns={[{label:'Thao tác',value:r=>AUDIT_LABELS[r.action]||r.action},{label:'Đối tượng',value:r=>r.resource_id||'—'},{label:'Người thực hiện',value:r=>data.users.find(u=>u.id===r.user_id)?.full_name||data.users.find(u=>u.id===r.user_id)?.email||r.user_id||'Hệ thống'},{label:'Thời điểm',value:r=>new Date(r.created_at*1000).toLocaleString('vi-VN')} ]}/>}
          {active==='reports'&&<section className="admin-panel"><h3>Hoạt động theo chuyên khoa · Toàn kỳ</h3><AdminTable label="chuyên khoa" rows={data.specialtyPerformance} columns={[{label:'Chuyên khoa',value:r=>r.name},{label:'Lịch hẹn',value:r=>r.appointment_count},{label:'Đánh giá công khai',value:r=>r.feedback_count},{label:'Điểm trung bình',value:r=>r.average_rating===null?'Chưa có đánh giá':r.average_rating+'/5'}]}/></section>}
        </div>
      </div>
    </div>
  </div>;
}
