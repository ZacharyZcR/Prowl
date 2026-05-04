import{c as a,u as f,r as s}from"./index-CdmrdFNk.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=a("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);function m(r){const t=f(o=>o.token),c=s.useRef(r);c.current=r,s.useEffect(()=>{if(!t)return;const o=`/api/v1/sse?token=${encodeURIComponent(t)}`,e=new EventSource(o);return e.onmessage=n=>{try{const u=JSON.parse(n.data);c.current(u)}catch{}},e.onerror=()=>{e.close()},()=>e.close()},[t])}export{k as L,m as u};
