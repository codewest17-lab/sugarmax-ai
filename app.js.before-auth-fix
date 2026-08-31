const SUPABASE_URL="https://dwzbffuzupgjctdkswbq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_VzlX6SSmCVcGEVG3OWdX3w_XIwNlSM-";
const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
let mode="signin",session=null;

function showAuth(){ $("#auth").classList.remove("hidden"); document.body.style.overflow="hidden"; }
function hideAuth(){ $("#auth").classList.add("hidden"); document.body.style.overflow=""; }
function setMessage(t){$("#authMessage").textContent=t||""}
function updateAuthMode(){ $("#authTitle").textContent=mode==="signin"?"Welcome back":"Create your account"; $("#authSub").textContent=mode==="signin"?"Sign in to continue analyzing your food.":"Create an account and start with 2 free scans."; $("#emailSubmit").textContent=mode==="signin"?"Sign in":"Create account"; $("#toggleAuth").textContent=mode==="signin"?"Create a new account":"I already have an account"; }

async function openApp(s){
 session=s; $("#auth").classList.add("hidden"); $("#app").classList.remove("hidden"); $("#home").classList.add("hidden"); $("#how").classList.add("hidden"); $("#pricing").classList.add("hidden"); await loadQuota(); await loadHistory(); window.scrollTo({top:0,behavior:"smooth"});
}
async function loadQuota(){
 const {data,error}=await supabase.from("profiles").select("plan,scans_used,scans_limit").eq("user_id",session.user.id).maybeSingle();
 if(error)return;
 const limit=data?.scans_limit??2, used=data?.scans_used??0, left=Math.max(limit-used,0);
 $("#quotaText").textContent=`${left} / ${limit}`;
 $("#quotaBar").style.width=`${Math.min(100,(left/limit)*100)}%`;
}
async function loadHistory(){
 const {data}=await supabase.from("scans").select("food_name,sugar_grams,sugar_percentage,is_good_to_eat,created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(10);
 const box=$("#historyList"); box.innerHTML="";
 (data||[]).forEach(x=>{const el=document.createElement("div");el.className="history-list-item";el.innerHTML=`<div><strong>${escapeHtml(x.food_name||"Food")}</strong><br><small>${new Date(x.created_at).toLocaleString()}</small></div><div><strong>${Number(x.sugar_grams||0).toFixed(1)}g</strong><br><small>${Number(x.sugar_percentage||0).toFixed(1)}% sugar</small></div>`;box.appendChild(el)});
 if(!data?.length) box.innerHTML="<p style='color:#667085'>No scans yet.</p>";
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function oauth(provider){setMessage("");const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+window.location.pathname}});if(error)setMessage(error.message)}
async function ensureProfile(){try{await supabase.rpc("ensure_profile")}catch(e){}}

$("#heroStart").onclick=showAuth; $("#navLogin").onclick=showAuth; $("#pricingUpgrade").onclick=showAuth; $("#appUpgrade").onclick=async()=>{await startPayment()};
$("#closeAuth").onclick=hideAuth;
$("#toggleAuth").onclick=()=>{mode=mode==="signin"?"signup":"signin";updateAuthMode();setMessage("")};
$("#googleBtn").onclick=()=>oauth("google"); $("#appleBtn").onclick=()=>oauth("apple");
$("#emailForm").onsubmit=async e=>{
 e.preventDefault();setMessage("");const email=$("#email").value.trim(),password=$("#password").value;
 let result=mode==="signin"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
 if(result.error){setMessage(result.error.message);return}
 if(mode==="signup"&&!result.data.session){setMessage("Account created. Check your email to confirm your account.");return}
 if(result.data.session)openApp(result.data.session);
};
$("#logout").onclick=async()=>{await supabase.auth.signOut();session=null;$("#app").classList.add("hidden");$("#home").classList.remove("hidden");$("#how").classList.remove("hidden");$("#pricing").classList.remove("hidden")};
$("#chooseBtn").onclick=()=>$("#fileInput").click(); $("#cameraBtn").onclick=()=>{$("#fileInput").setAttribute("capture","environment");$("#fileInput").click()};
$("#fileInput").onchange=e=>{const f=e.target.files?.[0];if(f)analyze(f)};
$("#dropZone").ondragover=e=>{e.preventDefault();$("#dropZone").style.background="#eef8f4"};$("#dropZone").ondragleave=()=>$("#dropZone").style.background="";$("#dropZone").ondrop=e=>{e.preventDefault();$("#dropZone").style.background="";const f=e.dataTransfer.files?.[0];if(f)analyze(f)};
$("#refreshHistory").onclick=loadHistory;

async function analyze(file){
 if(!session)return showAuth();
 $("#dropZone").classList.add("hidden");$("#loading").classList.remove("hidden");$("#result").classList.add("hidden");
 try{
   const compressed=await compressImage(file,1280,.82);
   const base64=await toBase64(compressed.blob);
   const {data,error}=await supabase.functions.invoke("analyze-food-v2",{body:{image_base64:base64,mime_type:"image/jpeg"}});
   if(error)throw error;if(data?.error==="SCAN_LIMIT_REACHED")throw new Error("Your free scans are finished. Upgrade to Pro for 100 scans.");
   renderResult(data);await loadQuota();await loadHistory();
 }catch(e){renderError(e.message||"Analysis failed.")}
 finally{$("#loading").classList.add("hidden")}
}
function renderResult(a){
 $("#result").classList.remove("hidden");
 $("#result").innerHTML=`<div class="result-head"><div><span class="eyebrow">${a.cached?"CACHED ANALYSIS":"AI ANALYSIS"}</span><h3>${escapeHtml(a.food_name)}</h3><p>Confidence: ${Number(a.confidence||0).toFixed(0)}%</p></div><div class="score">${Number(a.health_rating||0).toFixed(1)}/10</div></div><div class="metrics"><div class="metric"><small>Estimated sugar</small><strong>${Number(a.sugar_grams||0).toFixed(1)}g</strong></div><div class="metric"><small>Sugar percentage</small><strong>${Number(a.sugar_percentage||0).toFixed(1)}%</strong></div><div class="metric"><small>Assessment</small><strong>${a.is_good_to_eat?"Good":"Limit"}</strong></div></div><p><strong>Portion:</strong> ${escapeHtml(a.portion_estimate||"Unknown")}</p><p>${escapeHtml(a.explanation||"")}</p><p><strong>Advice:</strong> ${escapeHtml(a.advice||"")}</p><button class="secondary" onclick="resetScanner()">Scan another food</button>`;
}
function renderError(m){$("#result").classList.remove("hidden");$("#result").innerHTML=`<div><span class="eyebrow">NOTICE</span><h3>We couldn't complete the scan</h3><p>${escapeHtml(m)}</p><button class="primary" onclick="resetScanner()">Try again</button></div>`}
function resetScanner(){$("#result").classList.add("hidden");$("#dropZone").classList.remove("hidden");$("#fileInput").value=""}
async function compressImage(file,max=1280,quality=.82){
 return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{let w=img.width,h=img.height;if(Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r)}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);c.toBlob(blob=>{URL.revokeObjectURL(url);resolve({blob})},"image/jpeg",quality)};img.onerror=reject;img.src=url})
}
function toBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(blob)})}
async function startPayment(){
 const {data,error}=await supabase.functions.invoke("initialize-payment",{body:{callback_url:window.location.origin+window.location.pathname+"?payment=complete"}});
 if(error||!data?.authorization_url){alert(error?.message||"Payment initialization failed.");return}
 window.location.href=data.authorization_url;
}
supabase.auth.onAuthStateChange(async(event,s)=>{if(s){session=s;await ensureProfile();if(!$("#app").classList.contains("hidden"))return;openApp(s)}});
(async()=>{updateAuthMode();const {data}=await supabase.auth.getSession();if(data.session)openApp(data.session)})();

/* SugarMax AI authentication route fix */
function routeAuth() {
  if (window.location.hash === "#auth") {
    showAuth();
  }
}

window.addEventListener("hashchange", routeAuth);
routeAuth();
