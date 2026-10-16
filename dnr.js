/* DNR restrictions are stored in shared KBRH application state. */
const KBRHDNR = {
 norm(v){return String(v||'').normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();},
 date(v){const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{2})[.\/](\d{2})[.\/](\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:s;},
 match(state,person){if(!person?.dob)return null;return (state?.doNotReadmit||[]).find(r=>r.active!==false&&this.norm(r.firstName)===this.norm(person.firstName)&&this.norm(r.lastName)===this.norm(person.lastName)&&this.date(r.dob)===this.date(person.dob))||null;},
 approved(person,record){return !!(record&&person?.dnrApproval?.recordId===record.id&&person.dnrApproval?.decision==='Approved');},
 warning(record){return `DO NOT READMIT — EXECUTIVE DIRECTOR APPROVAL REQUIRED\n\nReason: ${record.reason}\nAdded by: ${record.addedBy}\nDate added: ${record.addedAt}`;},
 guard(state,person,action){const r=this.match(state,person);if(!r)return false;if(this.approved(person,r))return false;alert(`${this.warning(r)}\n\nCannot ${action} without a documented ED exception.`);return true;},
 isED(){return String(auth.currentUser?.email||'').toLowerCase()==='executivedirector@kbrh.local';},
 async decide(state,person){const r=this.match(state,person);if(!r){alert('No active DNR match.');return;}if(!this.isED()){alert('Only the Executive Director may approve or deny DNR exceptions.');return;}const decision=confirm('Approve this ONE application despite the DNR restriction?\nOK = Approve; Cancel = choose denial or abort.');let result=decision?'Approved':(confirm('Deny this application?')?'Denied':null);if(!result)return;const reason=prompt(`Reason for ${result.toLowerCase()} decision (required):`);if(!reason?.trim())return;const identity=typeof getCurrentStaffIdentity==='function'?await getCurrentStaffIdentity():{name:auth.currentUser?.email||'',uid:auth.currentUser?.uid||''};person.dnrApproval={recordId:r.id,decision:result,reason:reason.trim(),by:identity.name||auth.currentUser?.email||'',byUid:identity.uid||'',at:new Date().toISOString()};await saveAppState(state);alert(`DNR exception ${result.toLowerCase()} and recorded.`);}
};
