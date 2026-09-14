'use client';
import * as React from 'react';
import { useAdminDialog } from './useAdminDialog';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { APPOINTMENT_NEXT, STATUS_LABELS, displayDate, vietnamDate } from '@/lib/admin-labels';

type Appointment={id:string;patient_name:string;patient_phone:string;appointment_date:string;appointment_time:string;status:string;queue_number:number|null;notes:string|null;cancellation_reason:string|null;specialty_name:string|null;doctor_name:string|null};
export function AppointmentManager({specialties,onChanged}:{specialties:Array<{id:string;name:string}>;onChanged:()=>void}) {
  const [query,setQuery]=React.useState(''); const [date,setDate]=React.useState(''); const [status,setStatus]=React.useState(''); const [specialty,setSpecialty]=React.useState('');
  const [page,setPage]=React.useState(1); const [rows,setRows]=React.useState<Appointment[]>([]); const [total,setTotal]=React.useState(0);
  const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState('');const [selected,setSelected]=React.useState<Appointment|null>(null);
  const [next,setNext]=React.useState('');const [reason,setReason]=React.useState('');const [saving,setSaving]=React.useState(false);const [version,setVersion]=React.useState(0);
  React.useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const timer=setTimeout(async()=>{try{const params=new URLSearchParams({view:'appointments',q:query,date,status,specialty,page:String(page)});
      const response=await fetch(`/api/admin/operations?${params}`,{signal:controller.signal,cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.detail||'Không thể tải lịch hẹn.');setRows(result.rows);setTotal(result.total);setPage(result.page);
    }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Mất kết nối.');}finally{if(!controller.signal.aborted)setLoading(false);}},200);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,date,status,specialty,page,version]);
  const dialogRef=useAdminDialog(Boolean(selected),()=>setSelected(null),saving);
  async function update() {
    if(!selected||!next)return;setSaving(true);setError('');
    try{const response=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:'appointment_status',id:selected.id,value:next,expectedStatus:selected.status,reason})});const result=await response.json();if(!response.ok)throw new Error(result.detail||'Không thể cập nhật.');setSelected(null);setVersion(v=>v+1);onChanged();}
    catch(error){setError(error instanceof Error?error.message:'Mất kết nối. Vui lòng thử lại.');}finally{setSaving(false);}
  }
  const reset=()=>{setQuery('');setDate('');setStatus('');setSpecialty('');setPage(1);};
  return <div>
    <div className="admin-toolbar"><label className="admin-search"><Search size={17}/><input aria-label="Tìm lịch hẹn" placeholder="Tên, số điện thoại hoặc mã lịch hẹn…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><button className="admin-button" onClick={()=>{setDate(vietnamDate());setPage(1);}}>Hôm nay</button><button className="admin-button" onClick={reset}>Xóa bộ lọc</button></div>
    <div className="admin-filters"><label>Ngày khám<input type="date" value={date} onChange={e=>{setDate(e.target.value);setPage(1);}}/></label><label>Trạng thái<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Tất cả trạng thái</option>{Object.keys(APPOINTMENT_NEXT).map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label><label>Chuyên khoa<select value={specialty} onChange={e=>{setSpecialty(e.target.value);setPage(1);}}><option value="">Tất cả chuyên khoa</option>{specialties.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}
    <div className="admin-table-scroll" aria-busy={loading}><table><thead><tr><th>Người bệnh</th><th>Ngày · giờ khám</th><th>Chuyên khoa / bác sĩ</th><th>Số thứ tự</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{!loading&&rows.map(row=><tr key={row.id}><td><strong>{row.patient_name}</strong><small>{row.patient_phone}</small></td><td>{displayDate(row.appointment_date)}<small>{row.appointment_time}</small></td><td>{row.specialty_name||'Chưa phân khoa'}<small>{row.doctor_name||'Chưa chỉ định bác sĩ'}</small></td><td>{row.queue_number??'—'}</td><td><span className={`admin-badge ${row.status==='cancelled'?'danger':''}`}>{STATUS_LABELS[row.status]||row.status}</span></td><td><button className="admin-button" onClick={()=>{setSelected(row);setNext('');setReason('');setError('');}}>Chi tiết</button></td></tr>)}</tbody></table></div>
    {loading?<div className="admin-empty" role="status">Đang tải lịch hẹn…</div>:!rows.length?<div className="admin-empty">Chưa có lịch hẹn phù hợp với bộ lọc.</div>:null}
    <div className="admin-pagination"><span>{total} lịch hẹn · Trang {page}/{Math.max(1,Math.ceil(total/20))}</span><div><button className="admin-button" aria-label="Trang trước" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button><button className="admin-button" aria-label="Trang sau" disabled={loading||page>=Math.ceil(total/20)} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div></div>
    {selected&&<div className="admin-dialog-backdrop"><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="appointment-title" className="admin-dialog"><header><div><span className="admin-eyebrow">Chi tiết lịch hẹn</span><h3 id="appointment-title">{selected.patient_name}</h3></div><button className="admin-button" aria-label="Đóng chi tiết" disabled={saving} onClick={()=>setSelected(null)}><X size={18}/></button></header><p className="admin-muted">Mã: {selected.id}</p><dl className="admin-detail"><dt>Liên hệ</dt><dd>{selected.patient_phone}</dd><dt>Lịch khám</dt><dd>{displayDate(selected.appointment_date)} · {selected.appointment_time}</dd><dt>Bác sĩ</dt><dd>{selected.doctor_name||'Chưa chỉ định'}</dd><dt>Ghi chú</dt><dd>{selected.notes||'Chưa có ghi chú'}</dd><dt>Trạng thái</dt><dd>{STATUS_LABELS[selected.status]}</dd>{selected.cancellation_reason&&<><dt>Lý do hủy</dt><dd>{selected.cancellation_reason}</dd></>}</dl>
    {(APPOINTMENT_NEXT[selected.status]||[]).length>0?<><label className="admin-field">Bước tiếp theo<select value={next} onChange={e=>setNext(e.target.value)}><option value="">Chọn thao tác</option>{APPOINTMENT_NEXT[selected.status].map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label>{next==='cancelled'&&<label className="admin-field">Lý do hủy lịch<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>}{error&&<p role="alert" className="admin-error">{error}</p>}<button className="admin-button primary" disabled={saving||!next||(next==='cancelled'&&!reason.trim())} onClick={update}>{saving?'Đang lưu…':'Lưu thay đổi'}</button></>:<p className="admin-muted">Lịch hẹn đã kết thúc.</p>}</section></div>}
  </div>;
}
