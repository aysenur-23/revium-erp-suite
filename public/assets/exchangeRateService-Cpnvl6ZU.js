import{a3 as i}from"./index-Xd90qdO9.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=i("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);let r=null,c=0;const h=60*60*1e3,l=async()=>{var a,o,s;const t=Date.now();if(r&&t-c<h)return r;try{const n=await fetch("https://api.exchangerate-api.com/v4/latest/TRY");if(!n.ok)throw new Error("Exchange rate API error");const e=await n.json();return r={base:"TRY",rates:{USD:(a=e.rates)!=null&&a.USD?1/e.rates.USD:void 0,EUR:(o=e.rates)!=null&&o.EUR?1/e.rates.EUR:void 0,GBP:(s=e.rates)!=null&&s.GBP?1/e.rates.GBP:void 0},date:e.date||new Date().toISOString().split("T")[0]},c=t,r}catch(n){return console.error("Exchange rate fetch error:",n),r||{base:"TRY",rates:{USD:.034,EUR:.037,GBP:.043},date:new Date().toISOString().split("T")[0]}}},g=async(t,a)=>{if(a==="TRY")return t;const s=(await l()).rates[a];return s?t/s:(console.warn(`Exchange rate not found for ${a}, using 1:1`),t)};export{d as D,g as c};
