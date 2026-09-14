'use client';
import * as React from 'react';
import Link from 'next/link';
import { AdminTable } from './AdminTable';

type Entry={id:string;name:string;system:string;hasWarnings:boolean;hasRisks:boolean;hasQuestions:boolean;review:{status:string;note:string}};
const labels:Record<string,string>={todo:'Chưa rà soát',in_progress:'Đang rà soát',done:'Đã xử lý'};
export function ContentReview() {
  const [rows,setRows]=React.useState<Entry[]>([]);const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState('');const [filter,setFilter]=React.useState('all');
  const [selected,setSelected]=React.useState<Entry|null>(null);const [note,setNote]=React.useState('');const [status,setStatus]=React.useState('todo');const [saving,setSaving]=React.useState(false);
  const load=React.useCallback(async()=>{try{const response=await fetch('/api/admin/operations?view=content');const result=await response.json();if(!response.ok)throw new Error(result.detail);setRows(result.rows);setError('');}catch(error){setError(error instanceof Error?error.message:'Không thể tải cẩm nang.');}finally{setLoading(false);}},[]);
  React.useEffect(()=>{void load();},[load]);
  async function save(){if(!selected)return;setSaving(true);setError('');try{const response=await fetch('/api/admin/operations',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,status,note})});const result=await response.json();if(!response.ok)throw new Error(result.detail);setSelected(null);await load();}catch(error){setError(error instanceof Error?error.message:'Không thể lưu.');}finally{setSaving(false);}}
  const missing=rows.filter(r=>!r.hasWarnings||!r.hasRisks||!r.hasQuestions);
  return <div><div className="admin-info">Theo dõi độ đầy đủ và ghi chú biên tập cho {rows.length} mục bệnh. Ghi chú ở đây dùng nội bộ; trạng thái “Đã xử lý” không xác nhận nội dung đã được thẩm định y khoa.</div>
    <div className="admin-stat-grid compact"><div><strong>{rows.length}</strong><span>Mục bệnh trong thư viện</span></div><div><strong>{missing.length}</strong><span>Thiếu nội dung mở rộng</span></div><div><strong>{rows.filter(r=>r.review.status==='done').length}</strong><span>Đã xử lý ghi chú</span></div></div>
    {error&&<p role="alert" className="admin-error">{error}</p>}{loading?<div className="admin-empty">Đang đọc thư viện…</div>:<AdminTable label="mục bệnh" rows={filter==='missing'?missing:filter==='all'?rows:rows.filter(r=>r.review.status===filter)} filter={<select aria-label="Lọc nội dung" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả bài</option><option value="missing">Thiếu nội dung</option>{Object.entries(labels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select>} columns={[
      {label:'Tên bệnh',value:r=>r.name,render:r=><Link href={`/benh/${r.id}`} target="_blank" rel="noopener noreferrer">{r.name} ↗</Link>},
      {label:'Hệ cơ quan',value:r=>r.system},
      {label:'Phần cần bổ sung',value:r=>[!r.hasWarnings?'Cảnh báo':'',!r.hasRisks?'Yếu tố nguy cơ':'',!r.hasQuestions?'Câu hỏi khi khám':''].filter(Boolean).join(' · ')||'Đủ các trường mở rộng'},
      {label:'Rà soát',value:r=>labels[r.review.status]||'Chưa rà soát'},
      {label:'Ghi chú',value:r=>r.review.note,render:r=><button className="admin-button" onClick={()=>{setSelected(r);setNote(r.review.note);setStatus(r.review.status);}}>Biên tập ghi chú</button>},
    ]}/>}
    {selected&&<section className="admin-review-form"><h3>Ghi chú: {selected.name}</h3><label className="admin-field">Trạng thái xử lý<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(labels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><label className="admin-field">Nội dung cần rà soát<textarea autoFocus maxLength={2000} rows={4} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="admin-toolbar"><button disabled={saving} className="admin-button primary" onClick={save}>{saving?'Đang lưu…':'Lưu ghi chú'}</button><button disabled={saving} className="admin-button" onClick={()=>setSelected(null)}>Đóng</button></div></section>}
  </div>;
}
