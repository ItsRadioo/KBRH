const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const $=id=>document.getElementById(id);

function fillDays(id,value){
  const el=$(id);
  el.innerHTML=DAYS.map(day=>`<option value="${day}" ${day===value?"selected":""}>${day}</option>`).join("");
}

async function loadSettingsForm(){
  if(!isKbrhAdmin()){
    alert("System Settings are restricted to the Administrator and Executive Director.");
    window.location.replace("index.html");
    return;
  }
  const s=await loadKbrhSettings();
  fillDays("callInDay",s.callInDay);
  fillDays("choreRolloverDay",s.choreRolloverDay);
  $("noCallWarningThreshold").value=s.noCallWarningThreshold||2;
  $("choreRolloverTime").value=s.choreRolloverTime||"00:01";
  $("webPushVapidKey").value=s.webPushVapidKey||"";
}

async function saveSettings(){
  if(!isKbrhAdmin())return;
  const next={
    callInDay:$("callInDay").value,
    noCallWarningThreshold:Math.max(1,Math.min(10,Number($("noCallWarningThreshold").value)||2)),
    choreRolloverDay:$("choreRolloverDay").value,
    choreRolloverTime:$("choreRolloverTime").value||"00:01",
    webPushVapidKey:$("webPushVapidKey").value.trim(),
    timeZone:"America/Toronto",
    updatedAt:new Date().toISOString(),
    updatedBy:auth.currentUser?.email||""
  };
  try{
    await SETTINGS_DOC_REF().set(next,{merge:true});
    window.KBRH_SETTINGS={...defaultKbrhSettings(),...next};
    $("settingsStatus").textContent="Settings saved for all staff workstations.";
  }catch(error){
    console.error(error);
    $("settingsStatus").textContent=`Could not save settings${error?.code?` (${error.code})`:""}.`;
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  $("saveSettingsBtn").onclick=saveSettings;
  $("resetSettingsBtn").onclick=()=>{
    const d=defaultKbrhSettings();
    fillDays("callInDay",d.callInDay);
    fillDays("choreRolloverDay",d.choreRolloverDay);
    $("noCallWarningThreshold").value=d.noCallWarningThreshold;
    $("choreRolloverTime").value=d.choreRolloverTime;
    $("webPushVapidKey").value=d.webPushVapidKey||"";
  };
});

auth.onAuthStateChanged(user=>{if(user)loadSettingsForm();});
