'use client';
import * as React from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { normalizeSearch } from '@/lib/admin-labels';

export type Column<T> = { label: string; value: (row: T) => string | number; render?: (row: T) => React.ReactNode };
export function AdminTable<T extends {id:string}>({rows,columns,label,filter}: {rows:T[];columns:Column<T>[];label:string;filter?:React.ReactNode}) {
  const [query,setQuery] = React.useState('');
  const [page,setPage] = React.useState(1);
  const matches=rows.filter(row=>normalizeSearch(columns.map(c=>c.value(row)).join(' ')).includes(normalizeSearch(query)));
  const pages=Math.max(1,Math.ceil(matches.length/12));
  const current=Math.min(page,pages);
  function download() {
    const quote=(value:unknown)=>{ const text=String(value??''); return '"'+(/^[\s]*[=+@\-]/.test(text)?"'"+text:text).replace(/"/g,'""')+'"'; };
    const csv=[columns.map(c=>quote(c.label)).join(','),...matches.map(row=>columns.map(c=>quote(c.value(row))).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a'); link.href=url; link.download='bao-cao.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="admin-table-block">
    <div className="admin-toolbar"><label className="admin-search"><Search size={17}/><input aria-label={`Tìm ${label}`} value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder={`Tìm ${label}…`}/></label>{filter}<button className="admin-button" disabled={!matches.length} onClick={download}><Download size={15}/> Xuất CSV ({matches.length})</button></div>
    <div className="admin-table-scroll"><table><thead><tr>{columns.map(c=><th key={c.label} scope="col">{c.label}</th>)}</tr></thead><tbody>{matches.slice((current-1)*12,current*12).map(row=><tr key={row.id}>{columns.map(c=><td key={c.label}>{c.render?c.render(row):c.value(row)||'—'}</td>)}</tr>)}</tbody></table></div>
    {!matches.length && <div className="admin-empty">Không có dữ liệu phù hợp. Thử thay đổi từ khóa hoặc bộ lọc.</div>}
    <div className="admin-pagination"><span>{matches.length} bản ghi trong danh sách · Trang {current}/{pages}</span><div><button className="admin-button" aria-label="Trang trước" disabled={current===1} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></button><button className="admin-button" aria-label="Trang sau" disabled={current===pages} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></button></div></div>
  </div>;
}
