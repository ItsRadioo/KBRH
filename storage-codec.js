/* Shared browser/server storage codec. Containers never contain growing child-ID lists.
 * Applicant/resident records have stable paths; nested histories are separate records.
 * Every document is bounded, including unusually long text. No production data here. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KBRHStorageCodec=factory();})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const enc=new TextEncoder(),MAX_BYTES=48000,PART_CHARS=6000;
 const canonical=v=>JSON.stringify(sort(v));
 function sort(v){if(Array.isArray(v))return v.map(sort);if(v&&typeof v==='object'){const out=Object.create(null);for(const k of Object.keys(v).sort())out[k]=sort(v[k]);return out;}return v;}
 async function hash(v){const bytes=await crypto.subtle.digest('SHA-256',enc.encode(typeof v==='string'?v:canonical(v)));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
 function clean(value){return JSON.parse(JSON.stringify(value));}
 async function encode(input,previous){
  function validate(v,depth=0){if(depth>40)throw Error('Record nesting exceeds the supported depth.');if(v===null)return;if(typeof v==='number'&&!Number.isFinite(v))throw Error('Non-finite stored values need review before migration.');if(v&&typeof v==='object'){if(typeof v.toJSON==='function'||(!Array.isArray(v)&&Object.prototype.toString.call(v)!=='[object Object]'))throw Error('A typed stored value needs review before migration.');Object.values(v).forEach(x=>validate(x,depth+1));}else if(!['string','number','boolean','undefined'].includes(typeof v))throw Error('Unsupported stored value.');}
  validate(input);const state=clean(input);delete state._storageRevision;
  const nodes=[];
  const prior=new Map(previous?Array.from(previous.values(),n=>[canonical(n.path),n]):[]);
  function ranks(tokens,path){
   const result=new Array(tokens.length),anchors=[];let last=-Infinity;
   for(let i=0;i<tokens.length;i++){const old=prior.get(canonical([...path,tokens[i]]));if(Number.isFinite(old?.order)&&old.order>last){anchors.push(i);result[i]=old.order;last=old.order;}}
   let left=-1;for(const right of [...anchors,tokens.length]){const count=right-left-1;if(count){const a=left<0?(right<tokens.length?result[right]-1024*(count+1):-1024):result[left];const b=right===tokens.length?a+1024*(count+1):result[right];for(let i=1;i<=count;i++)result[left+i]=a+(b-a)*i/(count+1);}left=right;}
   if(result.some((r,i)=>!Number.isFinite(r)||(i&&r<=result[i-1])))throw Error('Record ordering needs maintenance before this change can be saved.');return result;
  }
  function visit(value,path,order){
   if(path.length>40)throw Error('Record nesting exceeds the supported depth.');
   const base={path,kind:'scalar',...(order===undefined?{}:{order})};
   if(Array.isArray(value)){
    nodes.push({...base,kind:'array'});const used=new Map();
    const tokens=value.map((item,i)=>{const raw=item&&typeof item==='object'&&!Array.isArray(item)&&item.id!==undefined?'id:'+canonical(item.id):'index:'+i;const occurrence=used.get(raw)||0;used.set(raw,occurrence+1);return raw+':'+occurrence;});
    const orders=ranks(tokens,path);value.forEach((item,i)=>visit(item,[...path,tokens[i]],orders[i]));
   }else if(value&&typeof value==='object'){
    const scalar=Object.create(null),children=[];
    for(const [key,item] of Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0)){
     if(item!==null&&typeof item==='object'){children.push([key,item]);continue;}
     const candidate={...scalar,[key]:item};
     if(enc.encode(canonical({...base,kind:'object',value:candidate})).length>MAX_BYTES)children.push([key,item]);else scalar[key]=item;
    }
    nodes.push({...base,kind:'object',value:scalar});children.forEach(([key,item])=>visit(item,[...path,'key:'+key]));
   }else if(typeof value==='string'&&enc.encode(value).length>24000){
    nodes.push({...base,kind:'string'});let i=0;
    // Array.from keeps surrogate pairs intact, so Unicode round-trips exactly.
    const chars=Array.from(value);for(let offset=0;offset<chars.length;offset+=PART_CHARS)nodes.push({path:[...path,'part:'+i],kind:'scalar',order:i++,value:chars.slice(offset,offset+PART_CHARS).join('')});
   }else nodes.push({...base,value});
  }
  visit(state,[]);
  const entries=await Promise.all(nodes.map(async n=>{
   if(enc.encode(canonical(n)).length>MAX_BYTES)throw Error('A record key or path is too large.');
   return [await hash(canonical(n.path)),n];
  }));return new Map(entries.sort(([a],[b])=>a<b?-1:a>b?1:0));
 }
 function decode(entries){
  const all=Array.from(entries instanceof Map?entries.values():entries),byPath=new Map(),children=new Map();
  for(const n of all){const key=canonical(n.path);if(byPath.has(key))throw Error('Duplicate record path.');byPath.set(key,n);if(n.path.length){const parent=canonical(n.path.slice(0,-1));if(!children.has(parent))children.set(parent,[]);children.get(parent).push(n);}}
  const root=byPath.get('[]');if(!root)throw Error('Storage root is missing.');let visited=0;
  function build(n){visited++;const kids=children.get(canonical(n.path))||[];
   if(n.kind==='scalar'){if(kids.length)throw Error('Scalar has children.');return n.value;}
   if(n.kind==='array'||n.kind==='string'){kids.sort((a,b)=>a.order-b.order);if(kids.some((k,i)=>!Number.isFinite(k.order)||(i&&k.order<=kids[i-1].order)))throw Error('Array order is invalid.');if(n.kind==='string'&&kids.some((k,i)=>k.order!==i))throw Error('Text parts are incomplete.');const values=kids.map(build);return n.kind==='string'?values.join(''):values;}
   if(n.kind!=='object')throw Error('Unknown record type.');
   const value=Object.assign(Object.create(null),n.value||{});for(const kid of kids){const token=kid.path.at(-1);if(!token.startsWith('key:'))throw Error('Invalid object field.');const k=token.slice(4);if(Object.hasOwn(value,k))throw Error('Duplicate field.');value[k]=build(kid);}return value;
  }
  const result=build(root);if(visited!==all.length)throw Error('Orphaned storage records.');return clean(result);
 }
 function diff(before,after){const ops=[];for(const [id,node] of after)if(canonical(before.get(id))!==canonical(node))ops.push({id,node});for(const id of before.keys())if(!after.has(id))ops.push({id,node:null});return ops;}
 return {canonical,hash,encode,decode,diff,clean,MAX_BYTES};
});
