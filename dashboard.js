(()=>{
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const personName=p=>`${p?.firstName||""} ${p?.lastName||""}`.trim()||"Unnamed";
  const phaseOf=r=>String(r?.phase||"phase1").toLowerCase().replace(/\s/g,"");
  const outcomeCode=r=>{if(r?.dischargeOutcomeCode)return r.dischargeOutcomeCode;const x=String(r?.archiveReason||"").toLowerCase();if(x.includes("complete"))return"completed";if(x.includes("involuntary")||x.includes("removed"))return"involuntary";return"";};
  const dateLabel=v=>{if(!v)return"Not scheduled";const d=new Date(String(v).slice(0,10)+"T12:00:00");return isNaN(d)?String(v):d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"});};
  function card(label,value,detail,cls=""){return `<article class="v568-kpi ${cls}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;}
  async function pendingAcknowledgements(){
    const user=auth.currentUser;if(!user)return 0;
    try{const snap=await db.collection("kbrhNotifications").where("recipientUid","==",user.uid).limit(100).get();return snap.docs.map(d=>d.data()).filter(n=>n.requiresAcknowledgement!==false&&n.source==="digital-logbook"&&!n.acknowledgedAt).length;}catch(e){console.warn("Dashboard notification count unavailable",e);return null;}
  }
  async function render(){
    try{
      const s=await loadAppState();
      const roster=(s.roster||[]).filter(Boolean),active=roster.filter(r=>!r.archived);
      const p1=active.filter(r=>!phaseOf(r).includes("2"));
      const p2=active.filter(r=>phaseOf(r).includes("2"));
      const wait=(s.waitlist||[]).filter(x=>!x.archived&&x.admissionStage!=="Pending Admission");
      const pending=(s.pendingAdmissions||[]).filter(x=>x.status==="Pending Admission");
      const archived=roster.filter(r=>r.archived);
      const completed=archived.filter(r=>outcomeCode(r)==="completed").length;
      const involuntary=archived.filter(r=>outcomeCode(r)==="involuntary").length;
      const outcomeDen=completed+involuntary;
      const success=outcomeDen?`${(completed/outcomeDen*100).toFixed(1)}%`:"—";
      const ack=await pendingAcknowledgements();
      document.getElementById("dashKpis").innerHTML=[
        card("Phase 1 Occupancy",`${p1.length} / 18`,`${Math.max(0,18-p1.length)} bed${Math.max(0,18-p1.length)===1?"":"s"} available`,p1.length>=16?"attention":""),
        card("Phase 2",p2.length,"Current Phase 2 residents"),
        card("Waitlist",wait.length,"Active applicants"),
        card("Pending Admission",pending.length,"Approved / expected"),
        card("Success Rate",success,outcomeDen?`${completed} completed vs ${involuntary} involuntary discharge${involuntary===1?"":"s"}`:"No classified outcomes yet","success"),
        card("Acknowledgements",ack==null?"—":ack,ack===0?"No priority notes waiting":"Important / Urgent notes waiting",ack>0?"urgent":"")
      ].join("");
      const threshold=Number(s.operationalSettings?.noCallThreshold)||2;
      const missed=wait.filter(x=>{const h=x.callInHistory||[];let n=0;for(let i=h.length-1;i>=0;i--){const st=String(h[i].status||"").toLowerCase();if(st.includes("no call"))n++;else break;}return n>=threshold;});
      const now=new Date(),soon=new Date(now);soon.setDate(soon.getDate()+14);
      const exits=p1.filter(r=>{if(!r.expectedDischargeDate)return false;const d=new Date(r.expectedDischargeDate+"T12:00:00");return d>=new Date(now.toDateString())&&d<=soon;}).sort((a,b)=>String(a.expectedDischargeDate).localeCompare(String(b.expectedDischargeDate)));
      const priority=[];
      if(ack>0)priority.push(`<a class="v55-attention-item v568-urgent-item" href="digital-logbook.html"><strong>${ack} priority notification${ack===1?"":"s"}</strong><span>Acknowledgement required</span></a>`);
      missed.slice(0,5).forEach(p=>priority.push(`<a class="v55-attention-item" href="waitlist.html?search=${encodeURIComponent(personName(p))}"><strong>${esc(personName(p))}</strong><span>${threshold}+ consecutive no calls</span></a>`));
      exits.slice(0,5).forEach(r=>priority.push(`<a class="v55-attention-item v568-neutral-item" href="roster.html?search=${encodeURIComponent(personName(r))}"><strong>${esc(personName(r))}</strong><span>Expected discharge ${esc(dateLabel(r.expectedDischargeDate))}</span></a>`));
      document.getElementById("dashPriority").innerHTML=priority.length?priority.join(""):'<p class="empty">No priority items right now.</p>';
      const intakes=pending.map(pa=>{const a=(s.waitlist||[]).find(w=>w.id===pa.applicantId)||{};return{pa,a};}).sort((x,y)=>String(x.pa.expectedIntakeDate||"9999").localeCompare(String(y.pa.expectedIntakeDate||"9999")));
      document.getElementById("dashIntakes").innerHTML=intakes.length?intakes.slice(0,8).map(({pa,a})=>`<tr><td><a href="pending-admissions.html">${esc(pa.applicantName||personName(a))}</a></td><td>${esc(dateLabel(pa.expectedIntakeDate))}${pa.expectedIntakeTime?` · ${esc(pa.expectedIntakeTime)}`:""}</td><td><span class="v55-status-chip">Pending</span></td></tr>`).join(""):'<tr><td colspan="3" class="empty">No upcoming intakes scheduled.</td></tr>';
    }catch(e){console.error(e);document.getElementById("dashKpis").innerHTML='<p class="empty">Dashboard data could not be loaded.</p>';}
  }
  render();
})();
