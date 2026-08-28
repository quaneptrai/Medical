"""
Build a standalone keyboard-driven labeling tool for the retrieval benchmark.

441 rows of long Vietnamese text with a 30-way choice is slow and error-prone in
a spreadsheet. This bakes the candidates and the disease list into one local HTML
file that runs offline in a browser: keyboard shortcuts, autosave to
localStorage, and a real file download to round-trip the labels back to disk.

It is written as a local file rather than a published artifact on purpose --
artifact viewers block page-initiated downloads, and the labels must come back
to data/test_cases/ to be usable.

Usage:
    python scripts/build_labeling_tool.py
    # then open data/test_cases/label_tool.html in a browser
"""
import io
import json
import sys
from pathlib import Path

import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from knowledge.schema import load_all_diseases

CSV_IN = ROOT / "data" / "test_cases" / "real_benchmark_candidates.csv"
HTML_OUT = ROOT / "data" / "test_cases" / "label_tool.html"

HTML = """<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gán nhãn benchmark</title>
<style>
:root{--bg:#0f1115;--card:#181b22;--fg:#e6e8ec;--mut:#9aa3b2;--acc:#4c8dff;
--ok:#31c48d;--no:#f05252;--bd:#272b35}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:20px}
.bar{height:6px;background:var(--bd);border-radius:3px;overflow:hidden;margin:12px 0}
.bar>i{display:block;height:100%;background:var(--acc);transition:width .2s}
.meta{display:flex;gap:14px;flex-wrap:wrap;color:var(--mut);font-size:13px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;
padding:18px;margin:14px 0}
.q{font-size:16px;white-space:pre-wrap;max-height:320px;overflow-y:auto}
.sug{margin:14px 0;padding:12px;border-left:3px solid var(--acc);background:#1d2330}
.sug b{color:var(--acc)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}
button{font:inherit;cursor:pointer;border-radius:7px;border:1px solid var(--bd);
background:#20242e;color:var(--fg);padding:8px 10px;text-align:left}
button:hover{border-color:var(--acc)}
button.k{grid-column:1/-1;border-color:var(--no);color:#ffb4b4}
.row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.row button{text-align:center}
.pri{background:var(--ok);color:#04231a;border-color:var(--ok);font-weight:600}
kbd{background:#2b3240;border:1px solid var(--bd);border-radius:4px;
padding:1px 6px;font-size:12px;color:var(--mut)}
input{width:100%;padding:9px;border-radius:7px;border:1px solid var(--bd);
background:#12151c;color:var(--fg);font:inherit;margin-bottom:8px}
.done{text-align:center;padding:40px}
.tag{padding:2px 8px;border-radius:20px;font-size:12px;background:#2b3240}
</style></head><body><div class="wrap">
<h2 style="margin:0">Gán nhãn benchmark thật</h2>
<div class="meta">
  <span id="prog"></span><span id="stat"></span>
  <span><kbd>Enter</kbd> nhận gợi ý</span><span><kbd>K</kbd> không thuộc</span>
  <span><kbd>←</kbd> quay lại</span><span><kbd>/</kbd> tìm bệnh</span>
</div>
<div class="bar"><i id="pbar"></i></div>
<div id="app"></div>
<div class="row">
  <button onclick="exportJSON()">Tải file nhãn (.json)</button>
  <button onclick="if(confirm('Xoá toàn bộ nhãn đã gán?'))reset()">Xoá hết</button>
</div>
</div><script>
const DATA=__DATA__, DISEASES=__DISEASES__, KEY='botmed_labels_v1';
let labels={}, i=0;
try{labels=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){labels={}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(labels))}catch(e){}};
function firstUnlabeled(){for(let j=0;j<DATA.length;j++)if(labels[j]===undefined)return j;return DATA.length-1}
function setLabel(v){labels[i]=v;save();i=Math.min(i+1,DATA.length);render()}
function reset(){labels={};save();i=0;render()}
function exportJSON(){
  const out=DATA.map((r,j)=>({...r,actual_label:labels[j]??''}));
  const b=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='labels_done.json';a.click();URL.revokeObjectURL(a.href);
}
function render(){
  const n=DATA.length, done=Object.keys(labels).length;
  document.getElementById('prog').textContent=`${done}/${n} đã gán`;
  const kept=Object.values(labels).filter(v=>v&&v!=='KHONG_THUOC').length;
  document.getElementById('stat').innerHTML=
    `<span class="tag">giữ lại: ${kept}</span>`;
  document.getElementById('pbar').style.width=(done/n*100)+'%';
  const app=document.getElementById('app');
  if(i>=n){app.innerHTML=`<div class="card done"><h3>Xong ${done}/${n}</h3>
    <p>Giữ lại <b>${kept}</b> ca dùng được. Bấm “Tải file nhãn” rồi đưa lại cho Claude.</p></div>`;return}
  const r=DATA[i], cur=labels[i];
  app.innerHTML=`<div class="card">
    <div class="meta" style="margin-bottom:10px">
      <span class="tag">#${i+1}</span><span class="tag">${r.difficulty}</span>
      <span class="tag">BM25 ${(+r.bm25_score).toFixed(1)}</span>
      ${cur!==undefined?`<span class="tag" style="background:#1d3a2c">đã gán: ${cur||'(trống)'}</span>`:''}
    </div>
    <div class="q">${esc(r.query)}</div>
    <div class="sug">Gợi ý của BM25: <b>${esc(r.predicted_disease)}</b>
      <div style="color:var(--mut);font-size:13px">Gợi ý thường SAI — đọc kỹ rồi mới nhận.</div></div>
    <div class="row">
      <button class="pri" onclick="setLabel(DATA[i].predicted_disease)">✓ Nhận gợi ý (Enter)</button>
      <button onclick="setLabel('KHONG_THUOC')">✗ Không thuộc 30 bệnh (K)</button>
      ${i>0?'<button onclick="i--;render()">← Quay lại</button>':''}
    </div>
    <input id="f" placeholder="Gõ để lọc 30 bệnh… (phím /)" oninput="render2(this.value)">
    <div class="grid" id="list"></div></div>`;
  render2('');
}
function render2(q){
  const list=document.getElementById('list'); if(!list)return;
  const s=(q||'').toLowerCase();
  list.innerHTML=DISEASES.filter(d=>d.toLowerCase().includes(s))
    .map(d=>`<button onclick="setLabel(${JSON.stringify(d).replace(/"/g,'&quot;')})">${esc(d)}</button>`).join('');
}
function esc(t){const d=document.createElement('div');d.textContent=t??'';return d.innerHTML}
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'){if(e.key==='Escape')e.target.blur();return}
  if(e.key==='Enter'&&i<DATA.length)setLabel(DATA[i].predicted_disease);
  else if(e.key.toLowerCase()==='k'&&i<DATA.length)setLabel('KHONG_THUOC');
  else if(e.key==='ArrowLeft'&&i>0){i--;render()}
  else if(e.key==='/'){e.preventDefault();document.getElementById('f')?.focus()}
});
i=firstUnlabeled();render();
</script></body></html>"""


def main():
    if not CSV_IN.exists():
        print(f"Missing {CSV_IN}")
        return

    df = pd.read_csv(CSV_IN)
    rows = df.to_dict(orient="records")
    for r in rows:
        r["bm25_score"] = float(r["bm25_score"])
        r["actual_label"] = ""

    diseases = [d.name_vi for d in load_all_diseases(ROOT / "data" / "diseases")]

    html = (HTML
            .replace("__DATA__", json.dumps(rows, ensure_ascii=False))
            .replace("__DISEASES__", json.dumps(diseases, ensure_ascii=False)))
    HTML_OUT.write_text(html, encoding="utf-8")

    print(f"{len(rows)} candidates, {len(diseases)} diseases")
    print(f"-> {HTML_OUT}  ({HTML_OUT.stat().st_size/1024:.0f} KB)")
    print("\nOpen it in a browser. Progress autosaves in that browser;")
    print("press 'Tải file nhãn' at the end to download labels_done.json.")


if __name__ == "__main__":
    main()
