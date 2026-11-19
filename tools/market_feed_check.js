/* market_feed.json 검사 — 주간 자동 갱신이 올리기 전에 반드시 실행
   사용: node tools/market_feed_check.js <새 파일> <이전 파일(git show HEAD:market_feed.json 저장본)>
   검사: JSON 형식 · tag(YYYY-MM-DD[문자]) 가 이전보다 큼 · asOf/stAsOf 날짜 · 표 항목(줄마다 «|» 칸 수)이 이전과 같음 · HTML 태그 균형 · 빈 값 없음 */
const fs=require('fs');
const [,,NEW,OLD]=process.argv;
let bad=0; const err=m=>{ bad++; console.log('✗ '+m); };
let n,o;
try{ n=JSON.parse(fs.readFileSync(NEW,'utf8')); }catch(e){ console.log('✗ JSON 오류: '+e.message); process.exit(1); }
try{ o=OLD?JSON.parse(fs.readFileSync(OLD,'utf8')):null; }catch(e){ o=null; }
if(!/^\d{4}-\d{2}-\d{2}[a-z]?$/.test(String(n.tag||'')))err('tag 형식(YYYY-MM-DD 또는 YYYY-MM-DDb): '+n.tag);
if(o&&!(String(n.tag)>String(o.tag)))err('tag 가 이전('+o.tag+')보다 커야 함: '+n.tag);
if(!n.update||typeof n.update!=='object')err('update 없음');
const U=n.update||{}, P=(o&&o.update)||{};
['asOf','stAsOf'].forEach(k=>{ if(U[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(U[k]))err(k+' 날짜 형식'); });
const cols=v=>String(v).split('\n').filter(l=>l.trim()).map(l=>l.split('|').length);
Object.keys(U).forEach(k=>{
  const v=U[k]; if(typeof v!=='string'||!v.trim())return err(k+' 빈 값');
  if(/<script|javascript:|onerror=|onload=/i.test(v))err(k+' 위험한 HTML');
  const ob=(v.match(/<b>/g)||[]).length, cb=(v.match(/<\/b>/g)||[]).length; if(ob!==cb)err(k+' <b> 태그 짝 안 맞음');
  if(P[k]&&/\|/.test(P[k])&&!(n.hkeys&&n.hkeys[k])){
    const a=cols(P[k]), b=cols(v), ca=[...new Set(a)].sort().join(','), cb2=[...new Set(b)].sort().join(',');
    if(ca!==cb2)err(k+' 칸 수 달라짐: 이전 '+ca+' → 새 '+cb2);
    if(a.length!==b.length)console.log('… '+k+' 줄 수 '+a.length+' → '+b.length+' (확인)');
  }
});
/* 좁은 칸(기간·기준일)에 긴 문구가 들어가면 표가 옆으로 늘어남 */
if(U.stTrade)String(U.stTrade).split('\n').forEach(l=>{ const c=l.split('|'); if(c[3]&&c[3].length>30)err('stTrade «기간» 칸은 30자 이내(긴 설명은 마지막 «우리 영향» 칸으로): '+c[3]); });
if(o)Object.keys(P).forEach(k=>{ if(!(k in U))console.log('… '+k+' 이번에 빠짐(이전 값 유지됨)'); });
if(n.hkeys)Object.keys(n.hkeys).forEach(k=>{ if(U[k]&&String(U[k]).indexOf(n.hkeys[k])!==0)err(k+' 는 «'+n.hkeys[k]+'» 로 시작해야 함'); });
console.log(bad?('검사 실패 '+bad+'건'):'✓ 검사 통과 · 항목 '+Object.keys(U).length+'개 · tag '+n.tag);
process.exit(bad?1:0);
