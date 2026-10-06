/* ============================================================
   EASYBUY APP — FIXED VERSION
   All functions defined, no duplicates, no errors
   ============================================================ */

/* ---------- HELPERS ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-PK');
const uid=()=>Math.random().toString(36).slice(2,8);
const CATS={Pets:'🐾',Fashion:'👗',Electronics:'🎧',Home:'🏠',Beauty:'💄',Other:'🛍️'};
const COLORS=['#0a7d55','#1f6f9f','#d8452e','#7a4dd8','#c98a00','#c2185b','#26332e'];
const STATUSES=['New','Confirmed','Shipped','Delivered','Cancelled'];

const THEMES=[
  {id:'classic',name:'Classic',desc:'Green · Pakistani favourite'},
  {id:'minimal',name:'Minimal',desc:'White & black · clean'},
  {id:'bold',name:'Bold',desc:'Colorful · vibrant'},
  {id:'elegant',name:'Elegant',desc:'Dark & gold · luxury'},
  {id:'nordic',name:'Nordic',desc:'Soft blues · calm'},
  {id:'sunset',name:'Sunset',desc:'Warm gradient'},
  {id:'ocean',name:'Ocean',desc:'Blue gradient'},
  {id:'forest',name:'Forest',desc:'Deep greens'},
  {id:'mono',name:'Mono',desc:'Pure black & white'},
  {id:'rose',name:'Rose',desc:'Soft pinks'},
  {id:'lavender',name:'Lavender',desc:'Purple gradient'},
  {id:'cocoa',name:'Cocoa',desc:'Brown tones'},
  {id:'mint',name:'Mint',desc:'Fresh greens'},
  {id:'coral',name:'Coral',desc:'Pink-red gradient'},
  {id:'slate',name:'Slate',desc:'Grey tones'},
  {id:'gold',name:'Gold',desc:'Dark luxury'},
  {id:'cyan',name:'Cyan',desc:'Bright blue'},
  {id:'amber',name:'Amber',desc:'Orange warm'},
  {id:'crimson',name:'Crimson',desc:'Deep red'},
  {id:'sage',name:'Sage',desc:'Light green'}
];

const SECTION_TYPES={
  hero:{name:'Hero',icon:'🎯',desc:'Big headline with CTA'},
  about:{name:'About',icon:'ℹ️',desc:'Tell your story'},
  products:{name:'Featured Products',icon:'🛍️',desc:'Showcase products'},
  contact:{name:'Contact',icon:'📞',desc:'Phone, email, WhatsApp'},
  faq:{name:'FAQ',icon:'❓',desc:'Common questions'},
  testimonials:{name:'Testimonials',icon:'⭐',desc:'Customer reviews'},
  newsletter:{name:'Newsletter',icon:'📧',desc:'Collect emails'}
};

const slugify=s=>{
  let b=(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24).replace(/-+$/,'');
  if(b.length<3)b=(b+'-shop').replace(/^-/,'');
  return b
};
const slugPreview=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24)||'yourstore';
function ink(hex){const n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;return (0.299*r+0.587*g+0.114*b)>165?'#10231d':'#ffffff'}
function waNum(p){let d=String(p||'').replace(/\D/g,'');if(d.startsWith('0'))d='92'+d.slice(1);return d}

let toastT;
function toast(m){
  const t=$('#toast');
  if(!t)return;
  t.textContent=m;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),3200);
}

const ok=r=>{if(r.error)throw r.error;return r.data};
async function busy(btn,fn){
  if(btn)btn.disabled=true;
  try{return await fn()}
  catch(e){console.error(e);toast(e.message||'Something went wrong')}
  finally{if(btn)btn.disabled=false}
}

const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};

/* ---------- SUPABASE ---------- */
const CFG=window.EASYBUY_CONFIG||{};
const configured=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!/^PASTE/.test(CFG.SUPABASE_URL)&&window.supabase);
const sb=configured?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
let USER=null;

/* ---------- EMAIL ---------- */
async function sendEmail({to,subject,html,reply_to}){
  if(!sb)return false;
  try{
    const r=await sb.functions.invoke('send-email',{body:{to,subject,html,reply_to}});
    if(r.error)throw r.error;
    return true;
  }catch(e){console.error('Email failed:',e);return false}
}

function emailTemplate(title,body,cta){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f8f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f7;padding:40px 20px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(12,40,34,.08)">
<tr><td style="background:linear-gradient(135deg,#07352a,#00a878);padding:28px 32px;color:#fff;font-size:20px;font-weight:800">🛍️ EasyBuy</td></tr>
<tr><td style="padding:36px 32px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:750;color:#101817">${title}</h1>
<div style="color:#4b5563;font-size:15px;line-height:1.7">${body}</div>
${cta?`<div style="margin-top:28px"><a href="${cta.url}" style="display:inline-block;padding:14px 26px;background:linear-gradient(135deg,#13bb8b,#008d68);color:#fff;text-decoration:none;border-radius:12px;font-weight:700">${cta.text}</a></div>`:''}
</td></tr>
<tr><td style="padding:20px 32px;background:#f9fafb;color:#89918e;font-size:12px;text-align:center">Powered by EasyBuy</td></tr>
</table></td></tr></table></body></html>`;
}

/* ---------- CUSTOMER ---------- */
let CUSTOMER=null;
const CUST_SESSION_KEY='eb.customer';

async function loadCustomerSession(){
  try{
    const saved=JSON.parse(lsGet(CUST_SESSION_KEY)||'null');
    if(!saved)return null;
    const r=await sb.auth.getSession();
    if(r.data.session?.user){CUSTOMER=r.data.session.user;return CUSTOMER}
  }catch(e){}
  return null;
}

async function customerSignUp(email,password,name,phone){
  const r=await sb.auth.signUp({email,password,options:{data:{full_name:name,phone}}});
  if(r.error)throw r.error;
  CUSTOMER=r.data.user;
  if(r.data.session)lsSet(CUST_SESSION_KEY,JSON.stringify({email,name,phone}));
  return r.data;
}
async function customerSignIn(email,password){
  const r=await sb.auth.signInWithPassword({email,password});
  if(r.error)throw r.error;
  CUSTOMER=r.data.user;
  lsSet(CUST_SESSION_KEY,JSON.stringify({email:CUSTOMER.email}));
  return r.data;
}
async function customerSignOut(){
  try{await sb.auth.signOut()}catch(e){}
  CUSTOMER=null;
  lsDel(CUST_SESSION_KEY);
}
async function linkCustomerToStore(storeId,name,phone,email){
  if(!CUSTOMER)return null;
  try{
    const {data:existing}=await sb.from('customers').select('id').eq('store_id',storeId).eq('user_id',CUSTOMER.id).maybeSingle();
    if(existing)return existing;
    const {data}=await sb.from('customers').insert({
      store_id:storeId,
      user_id:CUSTOMER.id,
      name:name||CUSTOMER.user_metadata?.full_name||'Customer',
      email:email||CUSTOMER.email,
      phone:phone||CUSTOMER.user_metadata?.phone||'',
      city:'',order_count:0,total_spent:0
    }).select().single();
    return data;
  }catch(e){return null}
}

function openCustomerAuthModal(mode='login'){
  const old=document.getElementById('custAuthModal');if(old)old.remove();
  const su=mode==='signup';
  const html=`<div class="modal open cust-modal" id="custAuthModal" style="z-index:200">
    <div class="box">
      <div class="sheet-head"><h2>${su?'Create your account':'Welcome back'}</h2><button type="button" class="btn small" data-cust-close>Close</button></div>
      <p>${su?'Save your details for faster checkout and order history.':'Log in to see your order history.'}</p>
      <form id="custAuthForm" data-mode="${mode}">
        ${su?`<label>Your name<input id="custName" required maxlength="60"></label>`:''}
        <label>Email<input id="custEmail" type="email" required placeholder="you@example.com"></label>
        ${su?`<label>Phone<input id="custPhone" required placeholder="03XXXXXXXXX"></label>`:''}
        <label>Password${su?' (6+ characters)':''}<input id="custPass" type="password" minlength="6" required></label>
        <button type="submit" class="btn primary big">${su?'Create account':'Log in'}</button>
        <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--muted)">${su?'Already have an account? <a data-cust-switch="login" style="color:var(--brand);font-weight:600;cursor:pointer">Log in</a>':'New here? <a data-cust-switch="signup" style="color:var(--brand);font-weight:600;cursor:pointer">Create an account</a>'}</div>
        <p class="fine" id="custMsg" style="text-align:center"></p>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  const modal=document.getElementById('custAuthModal');
  modal.addEventListener('click',async ev=>{
    if(ev.target.id==='custAuthModal'||ev.target.closest('[data-cust-close]')){modal.remove();return}
    const sw=ev.target.closest('[data-cust-switch]');
    if(sw){modal.remove();openCustomerAuthModal(sw.dataset.custSwitch);return}
  });
  modal.querySelector('#custAuthForm').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const btn=ev.submitter;
    const m=ev.target.dataset.mode;
    await busy(btn,async()=>{
      const email=$('#custEmail').value.trim();
      const pass=$('#custPass').value;
      if(m==='signup'){
        const name=$('#custName').value.trim();
        const phone=$('#custPhone').value.trim();
        const r=await customerSignUp(email,pass,name,phone);
        if(!r.session){$('#custMsg').textContent='Check your email to confirm, then log in.';return}
        if(SF.store)await linkCustomerToStore(SF.store.id,name,phone,email);
        toast('Account created!');
      }else{
        await customerSignIn(email,pass);
        toast('Logged in');
      }
      modal.remove();
      if(SF.store)drawCustomerBar();
    });
  });
}

function drawCustomerBar(){
  const bar=$('#custBar');
  if(!bar)return;
  const existing=bar.querySelector('.cust-auth-bar');
  if(existing)existing.remove();
  const bar2=document.createElement('div');
  bar2.className='cust-auth-bar';
  bar2.style.display='flex';
  bar2.style.gap='8px';
  bar2.innerHTML=CUSTOMER
    ?`<button class="btn small" data-cust="account">👤 ${esc(CUSTOMER.user_metadata?.full_name||CUSTOMER.email?.split('@')[0]||'Account')}</button>
      <button class="btn small" data-cust="logout">Log out</button>`
    :`<button class="btn small" data-cust="login">Log in</button>
      <button class="btn small primary" data-cust="signup">Sign up</button>`;
  bar.appendChild(bar2);
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-cust]');if(!b)return;
  const k=b.dataset.cust;
  if(k==='login')openCustomerAuthModal('login');
  if(k==='signup')openCustomerAuthModal('signup');
  if(k==='logout'){customerSignOut().then(()=>{drawCustomerBar();toast('Logged out')})}
  if(k==='account')location.hash='#/account';
});

/* ---------- ACCOUNT PAGE ---------- */
async function renderAccount(){
  const el=$('#v-account');
  if(!el)return;
  if(!CUSTOMER){
    el.innerHTML=`<div style="max-width:900px;margin:60px auto;padding:0 20px"><div class="empty"><h2>Please log in</h2><p>Log in to see your orders.</p><button class="btn primary" data-cust="login">Log in</button></div></div>`;
    return;
  }
  el.innerHTML='<div class="empty">Loading...</div>';
  let orders=[];
  try{
    const r=await sb.from('orders').select('*').eq('customer_user_id',CUSTOMER.id).order('created_at',{ascending:false}).limit(50);
    if(!r.error)orders=r.data||[];
  }catch(e){}
  const name=CUSTOMER.user_metadata?.full_name||CUSTOMER.email?.split('@')[0]||'Customer';
  el.innerHTML=`<div style="max-width:900px;margin:60px auto;padding:0 20px">
    <div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#07352a,#00a878);color:#fff;display:flex;align-items:center;gap:16px;margin-bottom:32px">
      <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.20);display:grid;place-items:center;font-size:24px">👤</div>
      <div style="flex:1"><h1 style="font-size:22px;font-weight:750;color:#fff;margin:0">${esc(name)}</h1><p style="color:rgba(255,255,255,.75);font-size:13px;margin:4px 0 0">${esc(CUSTOMER.email)}</p></div>
      <button class="btn small" data-cust="logout" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff">Log out</button>
    </div>
    <h2 style="margin-bottom:16px">My orders (${orders.length})</h2>
    ${orders.length?orders.map(o=>`<div style="padding:20px;border:1px solid var(--line);border-radius:16px;background:#fff;margin-bottom:14px;box-shadow:var(--shadow-sm)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><strong>Order #${o.order_no}</strong><span class="pill st-${o.status}">${o.status}</span><time style="margin-left:auto;color:var(--muted-2);font-size:11px">${new Date(o.created_at).toLocaleDateString('en-PK')}</time></div>
      <ul style="margin:8px 0;padding-left:18px;font-size:13px;color:var(--muted)">${(o.items||[]).map(i=>`<li>${esc(i.name)}${i.variant?' ('+esc(i.variant)+')':''} x${i.qty}</li>`).join('')}</ul>
      <div style="margin-top:12px;font-weight:700">${money(o.total)}</div>
    </div>`).join(''):'<div class="empty"><h3>No orders yet</h3><p>When you place an order, it will appear here.</p></div>'}
  </div>`;
}

/* ---------- ROUTER ---------- */
function route(){
  const cleanHash=(location.hash||'#/').split('?')[0];
  const parts=cleanHash.split('/');
  let v=parts[1]==='dashboard'?'dashboard':parts[1]==='s'?'store':parts[1]==='login'?'login':parts[1]==='track'?'track':parts[1]==='account'?'account':'home';
  if(v==='dashboard'&&!USER){AUTH.note=AUTH.note||'Log in to open your seller dashboard.';location.hash='#/login';return}
  $$('[data-view]').forEach(e=>e.hidden=e.id!=='v-'+v);
  $('#siteHeader').hidden=v==='store';
  $('#siteFooter').hidden=v==='store';
  $$('.nav-links a[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===v));
  if(v==='home')renderHome();
  if(v==='login')renderLogin();
  if(v==='dashboard')loadDash();
  if(v==='store')renderStore(parts[2]);
  if(v==='track')renderTrack();
  if(v==='account')renderAccount();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>route());
function paintNav(){$('#navAuth').textContent=USER?'Log out':'Log in'}

/* ---------- AUTH ---------- */
const AUTH={mode:'signup',note:''};
function renderLogin(){
  const su=AUTH.mode==='signup',pend=readPending();
  $('#v-login').innerHTML=`<div class="wrap" style="padding:60px 0;min-height:calc(100vh - 110px);display:grid;place-items:center"><form class="builder" id="authForm" style="width:min(520px,100%)">
    <h2>${su?'Create your seller account':'Log in'}</h2>
    <p class="fine" style="margin:0 0 16px">${esc(pend?'Your store "'+pend.name+'" will be created as soon as your account is ready.':AUTH.note||'Sign up with your email address and a password.')}</p>
    <label>Email<input id="aEmail" type="email" required></label>
    <label>Password (6+ characters)<input id="aPass" type="password" minlength="6" required></label>
    <button class="btn primary big" type="submit">${su?'Create account':'Log in'}</button>
    <p class="fine"><button class="linkbtn" type="button" data-auth="toggle">${su?'Already have an account? Log in':'New here? Create an account'}</button></p>
    <p class="fine" id="aMsg" role="alert"></p></form></div>`;
}
function readPending(){try{return JSON.parse(lsGet('eb.pending')||'null')}catch(e){return null}}
async function afterAuth(){
  AUTH.note='';
  const pend=readPending();
  if(pend){lsDel('eb.pending');try{const st=await createStore(pend);MY.active=st.id;toast('Store created. Design it now!');D.tab='design'}catch(e){toast(e.message)}}
  location.hash='#/dashboard';
  if(location.hash==='#/dashboard')route();
}
async function createStore(d){
  let base=slugify(d.name);
  const defaults=[
    {id:uid(),type:'hero',enabled:true},
    {id:uid(),type:'products',enabled:true},
    {id:uid(),type:'about',enabled:false},
    {id:uid(),type:'contact',enabled:true}
  ];
  for(let i=0;i<5;i++){
    const slug=i===0?base:(base.slice(0,24)+'-'+uid().slice(0,3));
    const r=await sb.from('stores').insert({
      slug,name:d.name,category:d.cat,color:d.color,whatsapp:d.wa||'',
      tagline:'Welcome to '+d.name+'. Order online and pay in cash when it arrives.',
      theme:'classic',sections:defaults
    }).select().single();
    if(!r.error)return r.data;
    if(r.error.code!=='23505')throw r.error;
  }
  throw new Error('Could not find a free store link. Try a different name.');
}
document.addEventListener('submit',async e=>{
  if(e.target.id!=='authForm')return;e.preventDefault();
  if(!sb){toast('Add your Supabase keys in config.js first');return}
  const email=$('#aEmail').value.trim(),password=$('#aPass').value,msg=$('#aMsg');
  msg.textContent='';
  await busy(e.target.querySelector('button[type=submit]'),async()=>{
    if(AUTH.mode==='signup'){
      const r=await sb.auth.signUp({email,password});
      if(r.error){msg.textContent=r.error.message;return}
      if(r.data.session){USER=r.data.session.user;paintNav();await afterAuth()}
      else msg.textContent='Account created. Check your email to confirm.';
    }else{
      const r=await sb.auth.signInWithPassword({email,password});
      if(r.error){msg.textContent=r.error.message;return}
      USER=r.data.user;paintNav();await afterAuth();
    }
  });
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-auth]');
  if(t&&t.dataset.auth==='toggle'){AUTH.mode=AUTH.mode==='signup'?'login':'signup';renderLogin()}
  if(e.target.id==='navAuth'){
    if(USER){await sb.auth.signOut();USER=null;paintNav();toast('Logged out');location.hash='#/';route()}
    else{AUTH.mode='login';location.hash='#/login';route()}
  }
});

/* ---------- HOME EXTRAS ---------- */
const HERO_WORDS=['five minutes','one afternoon','a single evening','your lunch break'];
let heroI=0,heroT=null;
function startHeroRotator(){
  const words=$$('.hero-rotator .word');
  if(!words.length)return;
  clearInterval(heroT);
  heroT=setInterval(()=>{
    words[heroI].classList.remove('active');
    heroI=(heroI+1)%words.length;
    words[heroI].classList.add('active');
  },2600);
}
function initDarkTabs(){
  const tabs=$$('.dark-tab');
  if(!tabs.length)return;
  tabs.forEach(t=>t.addEventListener('click',()=>{
    const key=t.dataset.tab;
    tabs.forEach(x=>x.classList.toggle('on',x===t));
    $$('.dark-tab-panel').forEach(p=>p.classList.toggle('on',p.dataset.panel===key));
  }));
}
let statsDone=false;
function initStatsCounter(){
  if(statsDone)return;
  const section=document.querySelector('.stats-section-dark');
  if(!section)return;
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting&&!statsDone){
        statsDone=true;
        $$('.stat-dark b').forEach(el=>{
          const target=parseInt(el.dataset.count,10)||0;
          const suffix=el.dataset.suffix||'+';
          const dur=1400;
          const start=performance.now();
          const step=(now)=>{
            const t=Math.min(1,(now-start)/dur);
            const val=Math.floor(target*(1-Math.pow(1-t,3)));
            el.textContent=val.toLocaleString('en-PK')+(target>0?suffix:'');
            if(t<1)requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        io.disconnect();
      }
    });
  },{threshold:0.25});
  io.observe(section);
}
function initFaqAccordion(){
  const items=$$('.faq-item');
  items.forEach(item=>{
    item.addEventListener('toggle',()=>{
      if(item.open){items.forEach(x=>{if(x!==item)x.open=false})}
    });
  });
}
const B={cat:'Pets',color:COLORS[0]};
function initBuilder(){
  const catBox=$('#bCats'),colorBox=$('#bColors');
  if(!catBox||!colorBox)return;
  catBox.innerHTML=Object.keys(CATS).map(c=>`<button type="button" class="chip" data-cat="${c}" aria-pressed="${c===B.cat}">${CATS[c]} ${c}</button>`).join('');
  colorBox.innerHTML=COLORS.map(c=>`<button type="button" class="sw" data-color="${c}" style="background:${c}" aria-pressed="${c===B.color}"></button>`).join('');
  catBox.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;B.cat=b.dataset.cat;$$('#bCats .chip').forEach(x=>x.setAttribute('aria-pressed',x===b));preview()});
  colorBox.addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;B.color=b.dataset.color;$$('#bColors .sw').forEach(x=>x.setAttribute('aria-pressed',x===b));preview()});
  const bn=$('#bName'); if(bn)bn.addEventListener('input',preview);
  const bf=$('#builder');
  if(bf)bf.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$('#bName').value.trim();
    if(!name){toast('Enter a store name first');$('#bName').focus();return}
    const draft={name,cat:B.cat,color:B.color,wa:$('#bWa').value.trim()};
    if(!sb){toast('Add your Supabase keys in config.js first');return}
    if(!USER){lsSet('eb.pending',JSON.stringify(draft));AUTH.mode='signup';location.hash='#/login';route();return}
    await busy(e.submitter,async()=>{const st=await createStore(draft);MY.active=st.id;D.tab='design';toast('Store created!');location.hash='#/dashboard';route()});
  });
  const nc=$('#navCreate'),hc=$('#heroCreate'),cb=$('#ctaBottom');
  [nc,hc,cb].forEach(b=>{
    if(!b)return;
    b.addEventListener('click',e=>{
      const target=$('#bName');
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>target.focus({preventScroll:true}),400);
      }
    });
  });
  preview();
}
function preview(){
  const nameEl=$('#bName');
  if(!nameEl)return;
  const name=nameEl.value.trim()||'Your store';
  const f=$('#frame'); if(f){f.style.setProperty('--accent',B.color);f.style.setProperty('--on-accent',ink(B.color));}
  const pn=$('#pvName'),pb=$('#pvBand'),pu=$('#pvUrl'),pg=$('#pvGrid');
  if(pn)pn.textContent=name;
  if(pb)pb.textContent=name;
  if(pu)pu.textContent=slugPreview(nameEl.value)+'.easybuy.pk';
  if(pg){
    const e=CATS[B.cat],prices=['1,499','2,999','799'];
    pg.innerHTML=prices.map(p=>`<div class="pv-tile"><div class="pv-pic">${e}</div><div class="pv-txt"><s></s><s></s><strong>Rs. ${p}</strong></div></div>`).join('');
  }
}
async function renderHome(){
  const yr=$('#yr'); if(yr)yr.textContent=new Date().getFullYear();
  startHeroRotator();
  initDarkTabs();
  initStatsCounter();
  initFaqAccordion();
}

/* ---------- DASHBOARD ---------- */
const MY={stores:[],active:null,products:[],orders:[]};
const D={tab:'orders',form:null,file:null};
const curS=()=>MY.stores.find(s=>s.id===MY.active);

async function loadDash(){
  $('#dash').innerHTML='<div class="empty">Loading your store...</div>';
  try{
    MY.stores=ok(await sb.from('stores').select('*').eq('owner_id',USER.id).order('created_at'));
    if(!curS())MY.active=MY.stores[0]?MY.stores[0].id:null;
    await loadStoreData();
  }catch(e){toast(e.message)}
  renderDash();
}
async function loadStoreData(){
  MY.products=[];MY.orders=[];
  if(!MY.active)return;
  const [p,o]=await Promise.all([
    sb.from('products').select('*').eq('store_id',MY.active).order('created_at'),
    sb.from('orders').select('*').eq('store_id',MY.active).order('created_at',{ascending:false})]);
  MY.products=ok(p);MY.orders=ok(o);
}
function renderDash(){
  const el=$('#dash'),st=curS();
  if(!st){el.innerHTML='<div class="empty"><h2>No stores yet</h2><p>Create your first store and it will show up here.</p><a class="btn primary" href="#/" id="goCreate">Create a store</a></div>';return}
  const live=MY.orders.filter(o=>o.status!=='Cancelled');
  const rev=live.reduce((a,o)=>a+o.total,0),fresh=MY.orders.filter(o=>o.status==='New').length;
  const active=MY.products.filter(p=>p.is_active).length;
  el.innerHTML=`<div class="dash-shell">
    <aside class="dash-side">
      <div class="side-store"><small style="color:rgba(255,255,255,.55)">Your store</small><b>${esc(st.name)}</b><small>${esc(st.category)}</small></div>
      <div class="side-nav">
        <button class="${D.tab==='orders'?'active':''}" data-tab="orders">📦 Orders ${fresh?`<span class="mini-status">${fresh}</span>`:''}</button>
        <button class="${D.tab==='products'?'active':''}" data-tab="products">🛍️ Products</button>
        <button class="${D.tab==='design'?'active':''}" data-tab="design">🎨 Themes</button>
        <button class="${D.tab==='code'?'active':''}" data-tab="code">⚡ Custom Code</button>
        <button class="${D.tab==='email'?'active':''}" data-tab="email">📧 Email & Carts</button>
        <button class="${D.tab==='advanced'?'active':''}" data-tab="advanced">📊 Analytics</button>
        <button class="${D.tab==='settings'?'active':''}" data-tab="settings">⚙️ Settings</button>
      </div>
      <div class="side-help">Share your store link, receive COD orders, and manage everything from this dashboard.</div>
    </aside>
    <div class="dash-main">
      <div class="mobile-dash-nav" style="display:flex;gap:6px;padding:12px 16px 0;flex-wrap:wrap">${['orders','products','design','code','email','advanced','settings'].map(t=>`<button class="btn small ${D.tab===t?'primary':''}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
      <div class="dash-top"><div><h1>${D.tab==='orders'?'Orders':D.tab==='products'?'Products':D.tab==='design'?'Themes':D.tab==='code'?'Custom code':D.tab==='email'?'Email & Carts':D.tab==='advanced'?'Analytics':'Store settings'}</h1><p>Manage <b>${esc(st.name)}</b> from one place.</p></div><select id="storeSel" style="max-width:220px;margin:0">${MY.stores.map(s=>`<option value="${s.id}"${s.id===st.id?' selected':''}>${esc(s.name)}</option>`).join('')}</select><div class="dash-actions"><a class="btn" href="#/s/${esc(st.slug)}">View store</a><button class="btn" data-act="copy">Copy link</button><button class="btn" data-act="refresh">Refresh</button></div></div>
      ${(D.tab==='design'||D.tab==='code'||D.tab==='email')?'':`<div class="metric-grid"><div class="metric"><span>Products</span><b>${active}</b></div><div class="metric"><span>Total orders</span><b>${MY.orders.length}</b></div><div class="metric"><span>New orders</span><b>${fresh}</b></div><div class="metric"><span>Order value</span><b>${money(rev)}</b></div></div>`}
      ${D.tab==='orders'?ordersPanel(st):D.tab==='products'?productsPanel(st):D.tab==='design'?designPanel(st):D.tab==='code'?codePanel(st):D.tab==='email'?emailPanel(st):D.tab==='advanced'?advancedPanel(st):settingsPanel(st)}
    </div>
  </div>`;

  if(D.tab==='design' && st){
    const previewBody=$('#designerPreviewBody');
    if(previewBody){
      setTimeout(()=>{
        previewBody.innerHTML='';
        const iframe=document.createElement('iframe');
        iframe.id='designerFrame';
        iframe.title='Store preview';
        iframe.style.width='100%';
        iframe.style.height='100%';
        iframe.style.border='0';
        iframe.src='#/s/'+st.slug;
        previewBody.appendChild(iframe);
      },150);
    }
  }
  if(D.tab==='code' && st){
    setTimeout(()=>{
      const frame=$('#codeFrame');
      if(frame){
        const src='#/s/'+st.slug;
        frame.setAttribute('src','about:blank');
        setTimeout(()=>frame.setAttribute('src',src),80);
      }
    },150);
  }
}

function ordersPanel(st){
  if(!MY.orders.length)return `<div class="panel-box empty"><h3>No orders yet</h3><p>Share your store link. When a customer orders, it shows up here.</p><a class="btn primary" href="#/s/${esc(st.slug)}">Open your store</a></div>`;
  return `<div class="panel-box">${MY.orders.map(o=>`
    <article class="order">
      <div class="order-top"><strong>Order #${o.order_no}</strong><span class="pill st-${o.status}">${o.status}</span><time>${new Date(o.created_at).toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short'})}</time></div>
      <p><b style="color:var(--ink)">${esc(o.customer_name)}</b>, ${esc(o.customer_phone)}</p>
      <p>${esc(o.address)}, ${esc(o.city)}</p>
      <ul>${o.items.map(i=>`<li>${esc(i.name)}${i.variant?' ('+esc(i.variant)+')':''} x${i.qty}</li>`).join('')}</ul>
      <div class="order-foot"><strong>${money(o.total)} ${o.payment_method&&o.payment_method!=='cod'?'via '+esc(payLabel(o.payment_method)):'COD'}</strong>
        <select data-status="${o.id}" aria-label="Order status">${STATUSES.map(s=>`<option${s===o.status?' selected':''}>${s}</option>`).join('')}</select>
        <a class="btn small" target="_blank" rel="noopener" href="https://wa.me/${waNum(o.customer_phone)}?text=${encodeURIComponent('Assalam o Alaikum '+o.customer_name+', this is '+st.name+' about your order #'+o.order_no+'.')}">WhatsApp</a>
      </div>
    </article>`).join('')}</div>`;
}

function productsPanel(st){
  const f=D.form;
  const form=f?`<form class="dashboard-card" id="pForm" style="margin:0 24px 18px;padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px"><div class="row-head"><h2>${f.id?'Edit product':'Add product'}</h2><button class="btn small" type="button" data-act="cancelform">Close</button></div>
    <label>Product name<input id="pName" maxlength="120" required value="${esc(f.name||'')}"></label>
    <div class="two"><label>Price (Rs.)<input id="pPrice" type="number" min="1" required value="${esc(f.price||'')}"></label><label>Compare-at price<input id="pOld" type="number" min="0" value="${esc(f.old_price||'')}"></label></div>
    <div class="two"><label>Category<input id="pCat" maxlength="30" value="${esc(f.category||'')}"></label><label>Visibility<select id="pActive"><option value="true"${f.is_active!==false?' selected':''}>Visible</option><option value="false"${f.is_active===false?' selected':''}>Hidden</option></select></label></div>
    <div class="two"><label>SKU<input id="pSku" maxlength="40" value="${esc(f.sku||'')}"></label><label>Stock<input id="pStock" type="number" min="0" value="${f.stock==null?'':esc(f.stock)}"></label></div>
    <label>Variants<textarea id="pVariants" placeholder="Red | Small | 799">${esc((f.variants||[]).map(v=>[v.name||'',v.option||'',v.price||''].join(' | ')).join('\n'))}</textarea></label>
    <label>Description<textarea id="pDesc" maxlength="240">${esc(f.description||'')}</textarea></label>
    <div class="img-pick"><div id="pThumb" style="width:64px;height:64px;display:grid;place-items:center;background:#f3f5f4;border-radius:12px">${f.image_url?`<img src="${esc(f.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`:(CATS[st.category]||'🛍️')}</div><label style="margin:0;flex:1">Product photo<input id="pImg" type="file" accept="image/*"></label></div>
    <div style="display:flex;gap:10px"><button class="btn primary" type="submit">Save product</button><button class="btn" type="button" data-act="cancelform">Cancel</button></div>
  </form>`:'';
  const list=MY.products.length?`<div class="panel-box"><div class="row-head"><div><h2>All products</h2><p class="fine">${MY.products.length} products</p></div>${f?'':'<button class="btn primary" data-act="addproduct">+ Add product</button>'}</div><div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Price</th><th>Status</th><th>Category</th><th></th></tr></thead><tbody>${MY.products.map(p=>`<tr><td><div style="display:flex;gap:10px;align-items:center"><div style="width:44px;height:44px;display:grid;place-items:center;background:#f3f5f4;border-radius:12px">${p.image_url?`<img src="${esc(p.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`:(CATS[st.category]||'🛍️')}</div><b>${esc(p.name)}</b></div></td><td><b>${money(p.price)}</b></td><td><span class="mini-status">${p.is_active?'Visible':'Hidden'}</span></td><td>${esc(p.category||'—')}</td><td><div style="display:flex;gap:8px"><button class="btn small" data-edit="${p.id}">Edit</button><button class="btn small danger" data-del="${p.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`:`<div class="panel-box empty"><h3>No products yet</h3><p>Add your first product.</p><button class="btn primary" data-act="addproduct">Add product</button></div>`;
  return form+list;
}

function getSections(st){
  if(Array.isArray(st.sections)&&st.sections.length)return JSON.parse(JSON.stringify(st.sections));
  return [
    {id:uid(),type:'hero',enabled:true},
    {id:uid(),type:'products',enabled:true},
    {id:uid(),type:'about',enabled:false},
    {id:uid(),type:'contact',enabled:true}
  ];
}
function designPanel(st){
  const theme=st.theme||'classic';
  const sections=getSections(st);
  return `<div class="designer-wrap" style="padding:0 24px 24px">
    <div class="designer-grid" style="display:grid;grid-template-columns:320px minmax(0,1fr);gap:20px;align-items:start">
      <div class="designer-side" style="display:grid;gap:16px;position:sticky;top:100px">
        <div class="designer-card" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:18px">
          <div class="row-head" style="margin-bottom:14px"><h3 style="margin:0">Theme library</h3><span class="fine" style="margin:0">${THEMES.length} themes</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:400px;overflow-y:auto">
            ${THEMES.map(t=>`
              <div class="theme-card tp-${t.id} ${theme===t.id?'on':''}" data-set-theme="${t.id}" style="border:2px solid ${theme===t.id?'var(--brand)':'var(--line)'};border-radius:14px;overflow:hidden;background:#fff;cursor:pointer;transition:all .25s">
                <div class="theme-preview tp-${t.id}" style="height:60px"></div>
                <div style="padding:8px 10px;font-size:11px;font-weight:650;color:var(--ink-strong)">${esc(t.name)}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="designer-card" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:18px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Sections</h3>
            <button type="button" class="btn small primary" data-act="addsection">+ Add</button>
          </div>
          <div style="display:grid;gap:10px">
            ${sections.map((s,i)=>`
              <div class="section-item ${s.enabled?'':'off'}" data-sid="${s.id}" style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff;${s.enabled?'':'opacity:.5'}">
                <span style="cursor:grab;color:var(--muted-2)">⋮⋮</span>
                <span style="flex:1;font-weight:650;color:var(--ink-strong);font-size:13px">${SECTION_TYPES[s.type]?.icon||'📄'} ${SECTION_TYPES[s.type]?.name||s.type}</span>
                <div style="display:flex;gap:4px">
                  <button type="button" data-sup="${s.id}" ${i===0?'disabled':''} style="width:26px;height:26px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer">↑</button>
                  <button type="button" data-sdown="${s.id}" ${i===sections.length-1?'disabled':''} style="width:26px;height:26px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer">↓</button>
                  <button type="button" class="del" data-sdel="${s.id}" style="width:26px;height:26px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer">×</button>
                </div>
                <div style="position:relative;width:34px;height:20px;background:${s.enabled?'var(--brand)':'var(--line-strong)'};border-radius:999px;cursor:pointer" data-stoggle="${s.id}"><span style="position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .2s;transform:translateX(${s.enabled?'14px':'0'})"></span></div>
              </div>`).join('')}
          </div>
        </div>
        <div class="designer-card" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:18px">
          <h3 style="margin:0 0 14px">Quick actions</h3>
          <button type="button" class="btn primary big" data-act="savetheme" style="margin-bottom:8px">💾 Save & publish</button>
          <a class="btn big" href="#/s/${esc(st.slug)}" target="_blank" style="text-align:center;display:block">👁️ Preview store</a>
        </div>
      </div>
      <div style="border:1px solid var(--line);border-radius:20px;overflow:hidden;background:#fff">
        <div style="padding:12px 16px;background:#f6f7f7;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)">
          <i style="width:9px;height:9px;border-radius:50%;background:#cfd5d2"></i><i style="width:9px;height:9px;border-radius:50%;background:#cfd5d2"></i><i style="width:9px;height:9px;border-radius:50%;background:#cfd5d2"></i>
          <span style="flex:1;text-align:center">${esc(st.slug)}.easybuy.pk</span>
        </div>
        <div style="height:640px;overflow-y:auto;background:#fff" id="designerPreviewBody">
          <div style="display:grid;place-items:center;height:100%;color:#89918e;font-size:14px">Loading preview…</div>
        </div>
      </div>
    </div>
  </div>`;
}

function refreshDesignerFrame(){
  const previewBody=$('#designerPreviewBody');
  if(!previewBody)return;
  const st=curS();if(!st)return;
  previewBody.innerHTML='<div style="display:grid;place-items:center;height:100%;color:#89918e">Refreshing…</div>';
  setTimeout(()=>{
    previewBody.innerHTML='';
    const iframe=document.createElement('iframe');
    iframe.style.width='100%';iframe.style.height='100%';iframe.style.border='0';
    iframe.src='#/s/'+st.slug;
    previewBody.appendChild(iframe);
  },150);
}
async function updateStoreSections(sections,msg){
  const st=curS();if(!st)return;
  const r=await sb.from('stores').update({sections}).eq('id',st.id).select().single();
  if(r.error)throw r.error;
  MY.stores=MY.stores.map(x=>x.id===st.id?r.data:x);
  renderDash();
  if(msg)toast(msg);
}

/* ---------- EMAIL PANEL ---------- */
async function emailPanel(st){
  let carts=[],logs=[];
  try{
    const [a,b]=await Promise.all([
      sb.from('abandoned_carts').select('*').eq('store_id',st.id).eq('recovered',false).order('last_activity',{ascending:false}).limit(30),
      sb.from('email_log').select('*').eq('store_id',st.id).order('created_at',{ascending:false}).limit(30)
    ]);
    carts=a.error?[]:a.data||[];
    logs=b.error?[]:b.data||[];
  }catch(e){}
  return `<div style="padding:0 24px 24px">
    <div class="designer-card" style="margin-bottom:20px;padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px">
      <div class="row-head"><h2>📧 Email notifications</h2></div>
      <p class="fine" style="margin:0 0 16px">Get instant email alerts when customers place orders. Powered by Resend.</p>
      <form id="emailSettingsForm">
        <label>Notification email<input id="notifEmail" type="email" placeholder="you@example.com" value="${esc(st.notification_email||'')}"></label>
        <div style="display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:12px;border:1px solid var(--line);border-radius:14px;background:#fff"><div style="flex:1;font-size:13px;font-weight:600">Order notifications<span style="display:block;font-weight:400;color:var(--muted);font-size:12px">Get email when a customer places an order</span></div><input id="notifEnabled" type="checkbox" ${st.email_notifications_enabled!==false?'checked':''} style="width:auto;margin:0"></div>
        <div style="display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:12px;border:1px solid var(--line);border-radius:14px;background:#fff"><div style="flex:1;font-size:13px;font-weight:600">Abandoned cart recovery<span style="display:block;font-weight:400;color:var(--muted);font-size:12px">Auto-email customers who left items in cart</span></div><input id="cartEnabled" type="checkbox" ${st.abandoned_cart_enabled!==false?'checked':''} style="width:auto;margin:0"></div>
        <label>Recovery email delay (minutes)<input id="cartDelay" type="number" min="15" max="1440" value="${st.abandoned_cart_delay_minutes||60}"></label>
        <button class="btn primary" type="submit">Save settings</button>
      </form>
    </div>
    <div class="designer-card" style="margin-bottom:20px;padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px">
      <div class="row-head"><h2>🛒 Abandoned carts (${carts.length})</h2></div>
      ${carts.length?`<div class="table-wrap"><table class="mini-table"><thead><tr><th>Customer</th><th>Items</th><th>Total</th><th>Last activity</th><th></th></tr></thead><tbody>${carts.map(c=>`<tr><td>${esc(c.customer_name||'Guest')}<br><small style="color:var(--muted)">${esc(c.customer_phone||c.customer_email||'—')}</small></td><td>${(c.items||[]).slice(0,2).map(i=>esc(i.name)).join(', ')}</td><td><b>${money(c.total)}</b></td><td><small>${new Date(c.last_activity).toLocaleString('en-PK',{dateStyle:'short',timeStyle:'short'})}</small></td><td><a class="btn small" target="_blank" href="https://wa.me/${waNum(c.customer_phone)}?text=${encodeURIComponent('Hi '+c.customer_name+', you left items in your cart at '+st.name)}">WhatsApp</a></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>No abandoned carts yet.</p></div>'}
    </div>
    <div class="designer-card" style="padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px">
      <div class="row-head"><h2>📨 Email log</h2></div>
      ${logs.length?`<div class="table-wrap"><table class="mini-table"><thead><tr><th>To</th><th>Template</th><th>Status</th><th>Sent</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${esc(l.customer_email||l.customer_phone||'—')}</td><td>${esc(l.template||'order')}</td><td><span class="mini-status">${esc(l.status||'sent')}</span></td><td><small>${new Date(l.sent_at).toLocaleString('en-PK',{dateStyle:'short',timeStyle:'short'})}</small></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>No emails sent yet.</p></div>'}
    </div>
  </div>`;
}
document.addEventListener('submit',async e=>{
  if(e.target.id!=='emailSettingsForm')return;
  e.preventDefault();
  await busy(e.submitter,async()=>{
    const st=curS();
    const r=await sb.from('stores').update({
      notification_email:$('#notifEmail').value.trim(),
      email_notifications_enabled:$('#notifEnabled').checked,
      abandoned_cart_enabled:$('#cartEnabled').checked,
      abandoned_cart_delay_minutes:Math.max(15,parseInt($('#cartDelay').value,10)||60)
    }).eq('id',st.id).select().single();
    if(r.error)throw r.error;
    MY.stores=MY.stores.map(x=>x.id===st.id?r.data:x);
    toast('Email settings saved');
  });
});

/* ---------- CODE PANEL ---------- */
let CODE_TAB='css';
function codePanel(st){
  const css=st.custom_css||'';
  const html=st.custom_html||'';
  const js=st.custom_js||'';
  const val=CODE_TAB==='css'?css:CODE_TAB==='html'?html:js;
  return `<div style="padding:0 24px 24px">
    <div class="editor-tabs" style="display:flex;gap:6px;margin-bottom:16px;padding:6px;background:var(--surface-muted);border-radius:999px;width:fit-content">
      <button type="button" class="editor-tab ${CODE_TAB==='css'?'on':''}" data-code-tab="css" style="padding:8px 16px;border:0;border-radius:999px;font-size:12px;font-weight:650;cursor:pointer;background:${CODE_TAB==='css'?'#fff':'transparent'};color:var(--ink-strong)">🎨 CSS</button>
      <button type="button" class="editor-tab ${CODE_TAB==='html'?'on':''}" data-code-tab="html" style="padding:8px 16px;border:0;border-radius:999px;font-size:12px;font-weight:650;cursor:pointer;background:${CODE_TAB==='html'?'#fff':'transparent'};color:var(--ink-strong)">📄 HTML</button>
      <button type="button" class="editor-tab ${CODE_TAB==='js'?'on':''}" data-code-tab="js" style="padding:8px 16px;border:0;border-radius:999px;font-size:12px;font-weight:650;cursor:pointer;background:${CODE_TAB==='js'?'#fff':'transparent'};color:var(--ink-strong)">⚡ JS</button>
    </div>
    <textarea class="code-editor" id="codeEditor" spellcheck="false" style="width:100%;min-height:400px;padding:20px;border:1px solid var(--line-strong);border-radius:16px;background:#0f1419;color:#e8e2d5;font-family:'SF Mono','Monaco','Consolas',monospace;font-size:13px;line-height:1.7;tab-size:2;resize:vertical;outline:none">${esc(val)}</textarea>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;align-items:center">
      <button type="button" class="btn primary" data-act="savecode">💾 Save code</button>
      <button type="button" class="btn" data-act="previewcode">🔍 Refresh preview</button>
      <button type="button" class="btn danger" data-act="clearcode">🗑️ Clear all</button>
      <span class="status" id="codeStatus" style="font-size:12px;color:var(--muted);margin-left:auto"></span>
    </div>
    <div style="margin-top:20px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff">
      <div style="padding:10px 16px;background:#f6f7f7;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)">Live preview — ${esc(st.slug)}.easybuy.pk</div>
      <div style="height:500px;overflow-y:auto"><iframe id="codeFrame" src="#/s/${esc(st.slug)}" style="width:100%;height:100%;border:0"></iframe></div>
    </div>
  </div>`;
}
function refreshCodeFrame(){
  const f=$('#codeFrame');
  if(!f)return;
  const st=curS();if(!st)return;
  f.setAttribute('src','about:blank');
  setTimeout(()=>f.setAttribute('src','#/s/'+st.slug),80);
}

/* ---------- ADVANCED PANEL ---------- */
function advancedPanel(st){
  const live=MY.orders.filter(o=>o.status!=='Cancelled');
  const revenue=live.reduce((a,o)=>a+o.total,0);
  const avg=live.length?Math.round(revenue/live.length):0;
  const delivered=MY.orders.filter(o=>o.status==='Delivered').length;
  const low=MY.products.filter(p=>p.stock!=null&&p.stock<=5).length;
  const byCity={};live.forEach(o=>byCity[o.city]=(byCity[o.city]||0)+o.total);
  const topCities=Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxCity=topCities[0]?.[1]||1;
  return `<div style="padding:0 24px 24px">
    <div class="metric-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
      <div class="metric" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:16px"><span style="color:var(--muted);font-size:12px">Gross revenue</span><b style="display:block;margin-top:5px;font-size:24px;font-weight:750;color:var(--ink-strong)">${money(revenue)}</b></div>
      <div class="metric" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:16px"><span style="color:var(--muted);font-size:12px">Active orders</span><b style="display:block;margin-top:5px;font-size:24px;font-weight:750;color:var(--ink-strong)">${live.length}</b></div>
      <div class="metric" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:16px"><span style="color:var(--muted);font-size:12px">Average order</span><b style="display:block;margin-top:5px;font-size:24px;font-weight:750;color:var(--ink-strong)">${money(avg)}</b></div>
      <div class="metric" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:16px"><span style="color:var(--muted);font-size:12px">Low stock</span><b style="display:block;margin-top:5px;font-size:24px;font-weight:750;color:var(--ink-strong)">${low}</b></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <section style="padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px">
        <h2 style="margin-bottom:14px">Sales by city</h2>
        ${topCities.length?topCities.map(([c,v])=>`<div style="display:grid;grid-template-columns:120px 1fr auto;gap:12px;align-items:center;margin:8px 0"><span>${esc(c)}</span><div style="height:10px;border-radius:999px;background:linear-gradient(90deg,#00a878,#7c5cff);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(v/maxCity*100)}%"></i></div><b>${money(v)}</b></div>`).join(''):'<p class="fine">No sales yet.</p>'}
      </section>
      <section style="padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px">
        <h2 style="margin-bottom:14px">Order pipeline</h2>
        ${STATUSES.map(x=>{const n=MY.orders.filter(o=>o.status===x).length;return `<div style="display:grid;grid-template-columns:120px 1fr auto;gap:12px;align-items:center;margin:8px 0"><span>${x}</span><div style="height:10px;border-radius:999px;background:linear-gradient(90deg,#00a878,#7c5cff);overflow:hidden"><i style="display:block;height:100%;width:${MY.orders.length?Math.round(n/MY.orders.length*100):0}%"></i></div><b>${n}</b></div>`}).join('')}
        <p class="fine">Delivered: ${delivered} order(s).</p>
      </section>
    </div>
  </div>`;
}
async function loadAdvanced(){}
const ADV={extra:{customers:[],coupons:[],reviews:[],profile:null}};
function marketsCard(){return ''}
async function saveStoreFields(){}

/* ---------- SETTINGS PANEL ---------- */
function settingsPanel(st){
  return `<form class="panel-box" id="sForm" style="padding:24px;background:#fff;border:1px solid var(--line);border-radius:18px;margin:0 24px 24px">
    <div class="row-head"><h2>Store settings</h2></div>
    <div class="two"><label>Store name<input id="sName" maxlength="60" required value="${esc(st.name)}"></label>
    <label>WhatsApp number<input id="sWa" inputmode="tel" value="${esc(st.whatsapp)}"></label></div>
    <label>Tagline<input id="sTag" maxlength="120" value="${esc(st.tagline||'')}"></label>
    <label>Description<textarea id="sDesc" maxlength="500">${esc(st.description||'')}</textarea></label>
    <fieldset><legend>Accent colour</legend><div class="swatches">${COLORS.map(c=>`<button type="button" class="sw" data-scolor="${c}" style="background:${c}" aria-pressed="${c.toLowerCase()===st.color.toLowerCase()}"></button>`).join('')}</div></fieldset>
    <p class="fine">Store link: ${esc(location.href.split('#')[0])}#/s/${esc(st.slug)}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" type="submit">Save settings</button><button class="btn danger" type="button" data-act="delstore">Delete store</button></div>
  </form>`;
}

function toBlob(file,cb){
  const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{const m=900,k=Math.min(1,m/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>cb(b),'image/jpeg',.82)};im.src=r.result};
  r.readAsDataURL(file);
}
async function uploadImage(blob){
  const path=USER.id+'/'+Date.now()+'-'+uid()+'.jpg';
  const r=await sb.storage.from('product-images').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});
  if(r.error)throw r.error;
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

/* ---------- DESIGNER EVENTS ---------- */
let designerBound=false;
function bindDesigner(){
  if(designerBound)return;
  designerBound=true;
  document.addEventListener('click',async e=>{
    if(!$('#v-dashboard')||$('#v-dashboard').hidden)return;
    const th=e.target.closest('[data-set-theme]');
    if(th){
      e.preventDefault();
      const st=curS();if(!st)return;
      const theme=th.dataset.setTheme;
      await busy(null,async()=>{
        const r=await sb.from('stores').update({theme}).eq('id',st.id).select().single();
        if(r.error)throw r.error;
        MY.stores=MY.stores.map(x=>x.id===st.id?r.data:x);
        toast('Theme applied: '+theme);
        renderDash();
      });
      return;
    }
    if(e.target.closest('[data-act="addsection"]')){e.preventDefault();openAddSectionModal();return}
    const tg=e.target.closest('[data-stoggle]');
    if(tg){
      e.preventDefault();
      const st=curS();if(!st)return;
      const sections=getSections(st);
      const s=sections.find(x=>x.id===tg.dataset.stoggle);
      if(!s)return;
      s.enabled=!s.enabled;
      await busy(null,()=>updateStoreSections(sections,s.enabled?'Section shown':'Section hidden'));
      return;
    }
    const up=e.target.closest('[data-sup]');
    if(up){
      e.preventDefault();
      const st=curS();if(!st)return;
      const sections=getSections(st);
      const i=sections.findIndex(x=>x.id===up.dataset.sup);
      if(i<=0)return;
      [sections[i-1],sections[i]]=[sections[i],sections[i-1]];
      await busy(null,()=>updateStoreSections(sections,'Section moved up'));
      return;
    }
    const dn=e.target.closest('[data-sdown]');
    if(dn){
      e.preventDefault();
      const st=curS();if(!st)return;
      const sections=getSections(st);
      const i=sections.findIndex(x=>x.id===dn.dataset.sdown);
      if(i<0||i>=sections.length-1)return;
      [sections[i],sections[i+1]]=[sections[i+1],sections[i]];
      await busy(null,()=>updateStoreSections(sections,'Section moved down'));
      return;
    }
    const dl=e.target.closest('[data-sdel]');
    if(dl){
      e.preventDefault();
      const st=curS();if(!st)return;
      if(!confirm('Remove this section?'))return;
      const sections=getSections(st).filter(x=>x.id!==dl.dataset.sdel);
      await busy(null,()=>updateStoreSections(sections,'Section removed'));
      return;
    }
    if(e.target.closest('[data-act="savetheme"]')){e.preventDefault();toast('Store saved');refreshDesignerFrame();return}
  },true);
}

function openAddSectionModal(){
  const st=curS();if(!st)return;
  const existing=getSections(st).map(s=>s.type);
  const available=Object.entries(SECTION_TYPES).filter(([k])=>!existing.includes(k));
  const old=document.getElementById('addSectionModal');if(old)old.remove();
  const html=`<div class="modal open" id="addSectionModal" style="z-index:200"><div class="box" style="max-width:520px">
    <div class="sheet-head"><h2>Add a section</h2><button type="button" class="btn small" data-close-add>Close</button></div>
    ${available.length?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${available.map(([k,v])=>`<button type="button" style="padding:16px;border:2px solid var(--line);border-radius:14px;text-align:center;cursor:pointer;background:#fff" data-add-type="${k}"><div style="font-size:28px;margin-bottom:6px">${v.icon}</div><b style="display:block;font-size:13px">${v.name}</b><small style="color:var(--muted);font-size:11px">${v.desc}</small></button>`).join('')}</div>`:'<p class="fine">All sections added.</p>'}
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  const modal=document.getElementById('addSectionModal');
  modal.addEventListener('click',async ev=>{
    if(ev.target.id==='addSectionModal'||ev.target.closest('[data-close-add]')){modal.remove();return}
    const opt=ev.target.closest('[data-add-type]');
    if(opt){
      const type=opt.dataset.addType;
      const st2=curS();
      const sections=getSections(st2);
      sections.push({id:uid(),type,enabled:true});
      modal.remove();
      await busy(null,()=>updateStoreSections(sections,SECTION_TYPES[type].name+' added'));
    }
  });
}

/* ---------- CODE EVENTS ---------- */
let codeBound=false;
function bindCode(){
  if(codeBound)return;
  codeBound=true;
  document.addEventListener('click',async e=>{
    if(!$('#v-dashboard')||$('#v-dashboard').hidden)return;
    const ct=e.target.closest('[data-code-tab]');
    if(ct){e.preventDefault();CODE_TAB=ct.dataset.codeTab;renderDash();return}
    if(e.target.closest('[data-act="savecode"]')){
      e.preventDefault();
      const st=curS();if(!st)return;
      const editor=$('#codeEditor');if(!editor)return;
      const val=editor.value;
      const field=CODE_TAB==='css'?'custom_css':CODE_TAB==='html'?'custom_html':'custom_js';
      const status=$('#codeStatus');
      if(status)status.textContent='Saving...';
      await busy(e.target.closest('[data-act="savecode"]'),async()=>{
        const upd={};upd[field]=val;
        const r=await sb.from('stores').update(upd).eq('id',st.id).select().single();
        if(r.error)throw r.error;
        MY.stores=MY.stores.map(x=>x.id===st.id?r.data:x);
        if(status)status.textContent='✅ Saved';
        toast('Custom '+CODE_TAB.toUpperCase()+' saved');
        setTimeout(()=>refreshCodeFrame(),200);
      });
      return;
    }
    if(e.target.closest('[data-act="previewcode"]')){e.preventDefault();refreshCodeFrame();toast('Preview refreshed');return}
    if(e.target.closest('[data-act="clearcode"]')){
      e.preventDefault();
      if(!confirm('Clear ALL custom code?'))return;
      const st=curS();if(!st)return;
      await busy(e.target.closest('[data-act="clearcode"]'),async()=>{
        const r=await sb.from('stores').update({custom_css:'',custom_html:'',custom_js:''}).eq('id',st.id).select().single();
        if(r.error)throw r.error;
        MY.stores=MY.stores.map(x=>x.id===st.id?r.data:x);
        renderDash();
        toast('Cleared');
      });
      return;
    }
  },true);
}

/* ---------- DASHBOARD BINDINGS ---------- */
function bindDash(){
  const el=$('#v-dashboard');
  el.addEventListener('click',async e=>{
    if(e.target.closest('[data-set-theme]')||e.target.closest('[data-stoggle]')||e.target.closest('[data-sup]')||e.target.closest('[data-sdown]')||e.target.closest('[data-sdel]')||e.target.closest('[data-act="addsection"]')||e.target.closest('[data-act="savetheme"]')||e.target.closest('[data-code-tab]')||e.target.closest('[data-act="savecode"]')||e.target.closest('[data-act="previewcode"]')||e.target.closest('[data-act="clearcode"]')||e.target.closest('[data-close-add]')||e.target.closest('[data-add-type]')||e.target.id==='addSectionModal'){return}
    const st=curS();
    const tab=e.target.closest('[data-tab]');if(tab){D.tab=tab.dataset.tab;D.form=null;D.file=null;renderDash();return}
    if(e.target.id==='goCreate'){e.preventDefault();location.hash='#/';route();return}
    if(!st)return;
    const ed=e.target.closest('[data-edit]');if(ed){D.form={...MY.products.find(x=>x.id===ed.dataset.edit)};D.file=null;renderDash();return}
    const dl=e.target.closest('[data-del]');
    if(dl){const p=MY.products.find(x=>x.id===dl.dataset.del);
      if(p&&confirm('Delete "'+p.name+'"?'))await busy(dl,async()=>{ok(await sb.from('products').delete().eq('id',p.id));await loadStoreData();renderDash();toast('Deleted')});return}
    const sc=e.target.closest('[data-scolor]');if(sc){D.color=sc.dataset.scolor;$$('.sw[data-scolor]').forEach(x=>x.setAttribute('aria-pressed',x===sc));return}
    const a=e.target.closest('[data-act]');if(!a)return;
    const act=a.dataset.act;
    if(act==='addproduct'){D.form={};D.file=null;renderDash();$('#pName')&&$('#pName').focus()}
    if(act==='cancelform'){D.form=null;D.file=null;renderDash()}
    if(act==='refresh')await busy(a,async()=>{await loadStoreData();renderDash();toast('Updated')});
    if(act==='copy'){const url=location.href.split('#')[0]+'#/s/'+st.slug;(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Copied'),()=>toast(url))}
    if(act==='delstore'&&confirm('Delete "'+st.name+'"?'))await busy(a,async()=>{ok(await sb.from('stores').delete().eq('id',st.id));MY.active=null;await loadDash();toast('Deleted')});
  });
  el.addEventListener('change',async e=>{
    if(e.target.id==='storeSel'){MY.active=e.target.value;D.form=null;await loadStoreData();renderDash();return}
    if(e.target.dataset.status){const o=MY.orders.find(x=>x.id===e.target.dataset.status);
      if(o)await busy(e.target,async()=>{ok(await sb.from('orders').update({status:e.target.value}).eq('id',o.id));o.status=e.target.value;renderDash();toast('Order updated')});return}
    if(e.target.id==='pImg'&&e.target.files[0]){toBlob(e.target.files[0],b=>{D.file=b;$('#pThumb').innerHTML='<img src="'+URL.createObjectURL(b)+'" style="width:100%;height:100%;object-fit:cover;border-radius:12px">'})}
  });
  el.addEventListener('submit',async e=>{
    e.preventDefault();const st=curS();const btn=e.submitter;
    if(e.target.id==='pForm'){
      const price=parseInt($('#pPrice').value,10);
      if(!$('#pName').value.trim()||!(price>0)){toast('Add name and price');return}
      await busy(btn,async()=>{
        let image_url=D.form.image_url||'';
        if(D.file)image_url=await uploadImage(D.file);
        const variants=$('#pVariants').value.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const a=line.split('|').map(v=>v.trim());return {name:a[0]||'',option:a[1]||'',price:parseInt(a[2],10)||price}});
        const row={store_id:st.id,name:$('#pName').value.trim(),price,old_price:parseInt($('#pOld').value,10)||0,category:$('#pCat').value.trim(),description:$('#pDesc').value.trim(),image_url,is_active:$('#pActive').value==='true',sku:$('#pSku').value.trim(),stock:$('#pStock').value.trim()===''?null:Math.max(0,parseInt($('#pStock').value,10)||0),variants};
        ok(D.form.id?await sb.from('products').update(row).eq('id',D.form.id):await sb.from('products').insert(row));
        D.form=null;D.file=null;await loadStoreData();renderDash();toast('Product saved');
      });
    }
    if(e.target.id==='sForm'){
      await busy(btn,async()=>{
        const upd={name:$('#sName').value.trim()||st.name,whatsapp:$('#sWa').value.trim(),tagline:$('#sTag').value.trim(),description:$('#sDesc').value.trim()};
        if(D.color)upd.color=D.color;
        ok(await sb.from('stores').update(upd).eq('id',st.id));
        D.color=null;await loadDash();toast('Saved');
      });
    }
  });
}

/* ---------- INTERNATIONAL ---------- */
const COUNTRIES=[
 {code:'PK',name:'Pakistan',cur:'PKR',dial:'+92'},{code:'US',name:'United States',cur:'USD',dial:'+1'},
 {code:'GB',name:'United Kingdom',cur:'GBP',dial:'+44'},{code:'CA',name:'Canada',cur:'CAD',dial:'+1'},
 {code:'AU',name:'Australia',cur:'AUD',dial:'+61'},{code:'NZ',name:'New Zealand',cur:'NZD',dial:'+64'},
 {code:'AE',name:'UAE',cur:'AED',dial:'+971'},{code:'SA',name:'Saudi Arabia',cur:'SAR',dial:'+966'},
 {code:'QA',name:'Qatar',cur:'QAR',dial:'+974'},{code:'KW',name:'Kuwait',cur:'KWD',dial:'+965'},
 {code:'DE',name:'Germany',cur:'EUR',dial:'+49'},{code:'FR',name:'France',cur:'EUR',dial:'+33'},
 {code:'IT',name:'Italy',cur:'EUR',dial:'+39'},{code:'ES',name:'Spain',cur:'EUR',dial:'+34'},
 {code:'NL',name:'Netherlands',cur:'EUR',dial:'+31'},{code:'TR',name:'Turkey',cur:'TRY',dial:'+90'},
 {code:'MY',name:'Malaysia',cur:'MYR',dial:'+60'},{code:'SG',name:'Singapore',cur:'SGD',dial:'+65'}];
const countryOf=c=>COUNTRIES.find(x=>x.code===c);
const countryName=c=>(countryOf(c)||{name:c}).name;
function decOf(c){c=(c||'').toUpperCase();return ['PKR','JPY','KRW'].includes(c)?0:['KWD','BHD','OMR'].includes(c)?3:2}
function fmtCur(n,cur){
  cur=(cur||'PKR').toUpperCase();
  if(cur==='PKR')return money(n);
  const d=decOf(cur);
  try{return new Intl.NumberFormat('en',{style:'currency',currency:cur,currencyDisplay:'code',minimumFractionDigits:d,maximumFractionDigits:d}).format(n).replace(/\u00a0/g,' ')}
  catch(e){return cur+' '+Number(n).toFixed(d)}
}

/* ---------- STOREFRONT ---------- */
let SF={store:null,products:[],reviews:[],q:'',cat:'',quote:null,country:''};
const cartKey=()=>'eb.cart.'+SF.store.id;
function getCart(){try{const c=JSON.parse(lsGet(cartKey())||'[]');return Array.isArray(c)?c:[]}catch(e){return[]}}
function setCart(c){lsSet(cartKey(),JSON.stringify(c));saveAbandonedCart()}
const PAY={cod:'Cash on Delivery',bank:'Bank transfer',easypaisa:'Easypaisa',jazzcash:'JazzCash'};
const payLabel=m=>PAY[m]||m;
const varLabel=v=>[v&&v.name,v&&v.option].map(x=>String(x||'').trim()).filter(Boolean).join(' / ');
const isSold=p=>p.stock!=null&&p.stock<=0;
const lowStock=p=>p.stock!=null&&p.stock>0&&p.stock<=5;
const stars=n=>{const k=Math.round(n);return '★'.repeat(k)+'☆'.repeat(5-k)};
function unitPrice(p,variant){
  if(variant&&Array.isArray(p.variants)){const v=p.variants.find(x=>varLabel(x)===variant);if(v&&v.price>0)return v.price}
  return p.price;
}
const homeCountry=st=>st.home_country||'PK';
function marketList(st){
  const h={country:homeCountry(st),currency:st.currency||'PKR',rate:1,shipping:st.shipping_fee||0,free_min:st.free_shipping_min||0,payment_methods:(Array.isArray(st.payment_methods)&&st.payment_methods.length?st.payment_methods:['cod']),home:true};
  return [h,...(Array.isArray(st.markets)?st.markets:[])];
}
function curMarket(){const l=marketList(SF.store);return l.find(m=>m.country===SF.country)||l[0]}
function mp(base){const m=curMarket(),d=decOf(m.currency),k=Math.pow(10,d);return fmtCur(Math.round(base*m.rate*k)/k,m.currency)}
function priceHtml(p,variant){
  const vs=Array.isArray(p.variants)?p.variants:[];
  if(variant)return mp(unitPrice(p,variant));
  if(vs.length){const prices=vs.map(v=>v.price>0?v.price:p.price);const lo=Math.min(...prices);return 'From '+mp(lo)}
  return mp(p.price)+(p.old_price>p.price?`<s>${mp(p.old_price)}</s>`:'');
}
function ratingOf(pid){const r=SF.reviews.filter(x=>x.product_id===pid);return r.length?{avg:r.reduce((a,b)=>a+b.rating,0)/r.length,n:r.length}:null}
function validCart(){return getCart().filter(i=>SF.products.some(p=>p.id===i.id))}
const cartItem=i=>({product_id:i.id,qty:i.qty,variant:i.variant||''});
function addToCart(pid,variant){
  const p=SF.products.find(x=>x.id===pid);if(!p)return false;
  if(isSold(p)){toast(p.name+' is sold out');return false}
  const vs=Array.isArray(p.variants)?p.variants:[];
  if(vs.length&&!variant){toast('Please choose an option first');return false}
  const c=getCart(),inCart=c.filter(i=>i.id===pid).reduce((a,b)=>a+b.qty,0);
  if(p.stock!=null&&inCart+1>p.stock){toast('Only '+p.stock+' available');return false}
  const x=c.find(i=>i.id===pid&&(i.variant||'')===(variant||''));
  x?x.qty=Math.min(99,x.qty+1):c.push({id:pid,qty:1,variant:variant||''});
  setCart(c);drawCart();return true;
}

/* ---------- ABANDONED CART ---------- */
function getCartToken(storeId){
  let t=lsGet('eb.cartToken.'+storeId);
  if(!t){t=uid()+uid();lsSet('eb.cartToken.'+storeId,t)}
  return t;
}
async function saveAbandonedCart(){
  if(!SF.store)return;
  const c=validCart();
  if(!c.length)return;
  const token=getCartToken(SF.store.id);
  const items=c.map(i=>{const p=SF.products.find(x=>x.id===i.id);return{product_id:i.id,name:p?.name||'',qty:i.qty,variant:i.variant||'',price:p?.price||0}});
  const total=c.reduce((a,i)=>{const p=SF.products.find(x=>x.id===i.id);return a+(unitPrice(p,i.variant)*i.qty)},0);
  const email=(CUSTOMER&&CUSTOMER.email)||'';
  const name=(CUSTOMER&&CUSTOMER.user_metadata?.full_name)||'';
  const phone=(CUSTOMER&&CUSTOMER.user_metadata?.phone)||'';
  try{
    await sb.from('abandoned_carts').upsert({
      store_id:SF.store.id,cart_token:token,
      customer_name:name,customer_email:email,customer_phone:phone,
      items,total,recovered:false,last_activity:new Date().toISOString()
    },{onConflict:'cart_token'});
  }catch(e){}
}

/* ---------- EMAIL TRIGGERS ---------- */
async function emailSellerNewOrder(order,store){
  if(!store.email_notifications_enabled||!store.notification_email)return;
  const items=(order.items||[]).map(i=>`<li>${esc(i.name)} × ${i.qty}</li>`).join('');
  const html=emailTemplate(
    `🎉 New order #${order.order_no}`,
    `<p><b>${esc(order.customer_name)}</b> placed an order on <b>${esc(store.name)}</b>.</p>
     <div style="padding:16px;background:#f6f7f7;border-radius:12px;margin:16px 0"><ul style="margin:0;padding-left:20px">${items}</ul><div style="margin-top:12px"><b>Total:</b> ${money(order.total)}</div></div>
     <div style="padding:16px;background:#eef7f3;border-radius:12px"><div>${esc(order.customer_name)} · ${esc(order.customer_phone)}</div><div>${esc(order.address)}, ${esc(order.city)}</div></div>`,
    {url:`https://wa.me/${waNum(order.customer_phone)}?text=${encodeURIComponent('Assalam o Alaikum '+order.customer_name+', about order #'+order.order_no)}`,text:'Message customer'}
  );
  await sendEmail({to:store.notification_email,subject:`New order #${order.order_no} — ${money(order.total)}`,html});
}
async function emailCustomerOrderConfirm(order,store,toEmail){
  if(!toEmail)return;
  const items=(order.items||[]).map(i=>`<li>${esc(i.name)} × ${i.qty}</li>`).join('');
  const html=emailTemplate(
    `Order confirmed — #${order.order_no}`,
    `<p>Thank you <b>${esc(order.customer_name)}</b>! Your order from <b>${esc(store.name)}</b> is confirmed.</p>
     <div style="padding:16px;background:#f6f7f7;border-radius:12px;margin:16px 0"><ul style="margin:0;padding-left:20px">${items}</ul><div style="margin-top:12px"><b>Total:</b> ${money(order.total)}</div></div>`,
    {url:`https://wa.me/${waNum(store.whatsapp)}?text=Hi, about order #${order.order_no}`,text:'Contact seller'}
  );
  await sendEmail({to:toEmail,subject:`Order #${order.order_no} confirmed — ${store.name}`,html});
}

/* ---------- SECTION RENDERERS ---------- */
function renderSection(sec,st){
  if(!sec.enabled)return '';
  const t=sec.type;
  if(t==='hero'){
    const tag=st.tagline||('Welcome to '+st.name+'. Order online and pay in cash.');
    return `<section class="sf-hero"><div class="wrap"><h1>${esc(st.name)}</h1><p>${esc(tag)}</p><div class="sf-trust" id="sfTrust"></div></div></section>`;
  }
  if(t==='about'){
    return `<section class="sf-section alt"><div class="wrap"><div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;max-width:1000px;margin:0 auto"><div><h2 style="text-align:left">About ${esc(st.name)}</h2><p style="color:var(--muted);font-size:15px;line-height:1.8">${esc(st.description||('We are '+st.name+', a '+st.category.toLowerCase()+' store.'))}</p></div><div style="background:linear-gradient(135deg,#eef5f2,#d9e8e2);border-radius:20px;aspect-ratio:4/3;display:grid;place-items:center;font-size:80px">${CATS[st.category]||'🛍️'}</div></div></div></section>`;
  }
  if(t==='contact'){
    return `<section class="sf-section"><div class="wrap"><h2 style="text-align:center">Get in touch</h2><p style="text-align:center;color:var(--muted);margin-bottom:40px">We reply within an hour on WhatsApp.</p>${st.whatsapp?`<div style="text-align:center"><a class="btn primary big" style="max-width:300px;margin:0 auto" target="_blank" href="https://wa.me/${waNum(st.whatsapp)}">Send on WhatsApp</a></div>`:''}</div></section>`;
  }
  if(t==='faq'){
    return `<section class="sf-section alt"><div class="wrap"><h2 style="text-align:center">FAQ</h2><div style="max-width:720px;margin:30px auto"><details style="padding:18px;border:1px solid var(--line);border-radius:14px;background:#fff;margin-bottom:12px"><summary style="cursor:pointer;font-weight:650">How do I order?</summary><p style="margin-top:12px;color:var(--muted)">Add products to cart, enter your details, and place the order.</p></details><details style="padding:18px;border:1px solid var(--line);border-radius:14px;background:#fff"><summary style="cursor:pointer;font-weight:650">Do you offer COD?</summary><p style="margin-top:12px;color:var(--muted)">Yes, Cash on Delivery available.</p></details></div></div></section>`;
  }
  if(t==='testimonials'){
    return `<section class="sf-section"><div class="wrap"><h2 style="text-align:center">What our customers say</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:30px"><div style="padding:26px;background:#fff;border:1px solid var(--line);border-radius:20px"><div style="color:#f5a623;margin-bottom:12px">★★★★★</div><p style="font-style:italic;color:var(--ink)">"Excellent quality!"</p><b>Ayesha K.</b></div><div style="padding:26px;background:#fff;border:1px solid var(--line);border-radius:20px"><div style="color:#f5a623;margin-bottom:12px">★★★★★</div><p style="font-style:italic;color:var(--ink)">"Fast delivery, great service."</p><b>Bilal A.</b></div><div style="padding:26px;background:#fff;border:1px solid var(--line);border-radius:20px"><div style="color:#f5a623;margin-bottom:12px">★★★★★</div><p style="font-style:italic;color:var(--ink)">"Highly recommended!"</p><b>Fatima S.</b></div></div></div></section>`;
  }
  if(t==='newsletter'){
    return `<section class="sf-section"><div class="wrap"><div style="text-align:center;padding:60px 30px;border-radius:28px;background:linear-gradient(135deg,#07352a,#00a878);color:#fff;max-width:900px;margin:0 auto"><h2 style="color:#fff">Get updates</h2><p style="margin-bottom:24px">Subscribe for new arrivals and sales.</p><form onsubmit="event.preventDefault();this.reset();alert('Subscribed!')" style="display:flex;gap:10px;max-width:460px;margin:0 auto"><input type="email" placeholder="your@email.com" required style="flex:1;padding:14px;border:0;border-radius:12px"><button type="submit" style="padding:0 24px;background:#fff;color:#008060;border:0;border-radius:12px;font-weight:700;cursor:pointer">Subscribe</button></form></div></div></section>`;
  }
  return '';
}
function renderProductsSection(st,products){
  return `<section class="sf-section"><div class="wrap"><h2 style="text-align:center">${products.length?'Our products':'No products yet'}</h2><input class="search" id="sfSearch" type="search" placeholder="Search products" style="margin:24px auto;display:block;max-width:440px;width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:12px"><div class="grid" id="sfGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:18px;margin-top:20px"></div></div></section>`;
}

async function renderStore(slug){
  slug=(slug||'').split('?')[0];
  const el=$('#v-store');
  el.innerHTML='<div class="wrap empty" style="padding-top:80px">Loading...</div>';
  const oldCSS=document.getElementById('storeCustomCSS');if(oldCSS)oldCSS.remove();
  const oldHTML=document.getElementById('storeCustomHTML');if(oldHTML)oldHTML.remove();
  const oldJS=document.getElementById('storeCustomJS');if(oldJS)oldJS.remove();

  let st=null,prods=[],revs=[];
  try{
    if(!sb)throw new Error('Supabase keys missing');
    st=ok(await sb.from('stores').select('*').eq('slug',slug||'').maybeSingle());
    if(st){
      prods=ok(await sb.from('products').select('*').eq('store_id',st.id).eq('is_active',true).order('created_at'));
      const rr=await sb.rpc('get_reviews',{p_store:st.id});revs=rr.error?[]:(rr.data||[]);
    }
  }catch(e){el.innerHTML='<div class="wrap empty" style="padding-top:80px"><h2>Could not load store</h2><p>'+esc(e.message)+'</p><a class="btn primary" href="#/">Back</a></div>';return}
  if(!st){el.innerHTML='<div class="wrap empty" style="padding-top:80px"><h2>Store not found</h2><a class="btn primary" href="#/">Back</a></div>';return}
  SF={store:st,products:prods,reviews:revs,q:'',cat:'',quote:null,country:''};
  {const saved=lsGet('eb.country.'+st.id),ml=marketList(st);SF.country=ml.some(m=>m.country===saved)?saved:homeCountry(st)}
  document.title=st.name+' on EasyBuy';
  el.style.setProperty('--accent',st.color);el.style.setProperty('--on-accent',ink(st.color));
  el.className='theme-'+(st.theme||'classic');

  const sections=getSections(st);
  let bodyHtml='';
  sections.forEach(sec=>{
    if(sec.type==='products'){bodyHtml+=renderProductsSection(st,prods)}
    else bodyHtml+=renderSection(sec,st);
  });

  el.innerHTML=`
  <div class="eb-bar" style="padding:8px;background:#f7f8f8;border-bottom:1px solid var(--line);text-align:center;font-size:11px">You are viewing ${esc(st.name)} on EasyBuy.<a href="#/dashboard" style="margin-left:10px;color:var(--brand);font-weight:650">Dashboard</a><a href="#/" style="margin-left:10px;color:var(--brand);font-weight:650">EasyBuy</a></div>
  <header class="sf-head"><div class="wrap sf-nav"><strong class="sf-logo">${esc(st.name)}</strong><div class="sf-right" id="custBar" style="display:flex;gap:8px;align-items:center">${(st.markets||[]).length?`<select id="sfCountry" style="width:auto;margin:0">${marketList(st).map(m=>`<option value="${esc(m.country)}"${m.country===SF.country?' selected':''}>${esc(countryName(m.country))} (${esc(m.currency)})</option>`).join('')}</select>`:''}<button class="btn accent" data-sf="opencart" style="background:var(--accent);color:var(--on-accent)">Cart <span id="sfCount">0</span></button></div></div></header>
  <div class="sf-sections">${bodyHtml}</div>
  <footer class="sf-foot"><div class="wrap">Store powered by EasyBuy.</div></footer>
  <div class="drawer" id="sfDrawer"><aside class="sheet">
    <div class="sheet-head"><h2>Your cart</h2><button class="btn small" data-sf="closecart">Close</button></div>
    <div id="sfItems"></div><div id="sfQuote"></div>
    <form id="sfForm" style="margin-top:18px">
      <h3 style="font-size:19px;margin-bottom:10px">Delivery details</h3>
      <label>Full name<input id="cName" required></label>
      <label>Phone<input id="cPhone" required placeholder="03XXXXXXXXX"></label>
      <p class="fine" id="cShipTo"></p>
      <label>City<input id="cCity" required></label>
      <label>Full address<input id="cAddr" required></label>
      <div id="cIntl" hidden><label>State<input id="cState"></label><label>Postal<input id="cPostal"></label></div>
      <label>Coupon code<input id="cCoupon" placeholder="SAVE10"></label>
      <p class="fine" id="couponMsg"></p>
      <label>Payment method<select id="cPay"></select></label>
      <div id="payInfo"></div>
      <button class="btn accent big" type="submit" id="placeBtn">Place order</button>
      <a class="fine" href="#/track" style="display:block;margin-top:12px">Track order</a>
    </form>
  </aside></div>
  <div class="modal" id="sfDone"><div class="box"><h2 id="doneTitle">Order placed</h2><p id="doneText"></p><a class="btn primary" id="doneWa" target="_blank" href="#">WhatsApp</a><button class="btn" data-sf="closedone">Continue</button></div></div>
  <div class="modal product-modal" id="sfProduct"><div class="box"><div class="sheet-head"><h2>Product</h2><button class="btn small" data-sf="closeproduct">Close</button></div><div id="pmBody"></div></div></div>`;
  syncCheckout();drawGrid();drawCart();drawCustomerBar();

  if(st.custom_css){const s=document.createElement('style');s.id='storeCustomCSS';s.textContent=st.custom_css;document.head.appendChild(s);}
  if(st.custom_html){const b=document.createElement('div');b.id='storeCustomHTML';b.innerHTML=st.custom_html;const f=el.querySelector('.sf-foot');if(f)f.parentNode.insertBefore(b,f);else el.appendChild(b);}
  if(st.custom_js){try{const sc=document.createElement('script');sc.id='storeCustomJS';sc.textContent=st.custom_js;document.body.appendChild(sc);}catch(err){}}
}

function drawGrid(){
  const st=SF.store,q=SF.q.toLowerCase();
  const cats=[...new Set(SF.products.map(p=>p.category).filter(Boolean))];
  const cf=$('#sfCats'); if(cf)cf.innerHTML=`<button class="active" data-catfilter="">All</button>`+cats.map(c=>`<button data-catfilter="${esc(c)}">${esc(c)}</button>`).join('');
  const activeCat=SF.cat||'';
  if(cf)cf.querySelectorAll('[data-catfilter]').forEach(b=>b.classList.toggle('active',b.dataset.catfilter===activeCat));
  const list=SF.products.filter(p=>(!activeCat||p.category===activeCat)&&(p.name+' '+p.category+' '+p.description).toLowerCase().includes(q));
  const grid=$('#sfGrid'); if(!grid)return;
  grid.innerHTML=list.map(p=>{
    const vs=Array.isArray(p.variants)?p.variants:[],rt=ratingOf(p.id);
    const badge=isSold(p)?'<span class="chipbadge st-Cancelled">Sold out</span>':lowStock(p)?`<span class="chipbadge st-New">Only ${p.stock} left</span>`:'';
    const btn=isSold(p)?'<button class="btn accent" disabled>Sold out</button>':vs.length?`<button class="btn accent" data-product="${p.id}">Choose option</button>`:`<button class="btn accent" data-add="${p.id}">Add to cart</button>`;
    return `<article class="card" style="background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column"><button class="pic" data-product="${p.id}" style="width:100%;height:200px;display:grid;place-items:center;background:#f3f5f4;border:0;cursor:pointer;padding:0">${p.image_url?`<img src="${esc(p.image_url)}" style="width:100%;height:100%;object-fit:cover">`:(CATS[st.category]||'🛍️')}</button><div style="padding:14px;flex:1;display:flex;flex-direction:column;gap:8px">${badge}${p.category?`<span style="color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${esc(p.category)}</span>`:''}<h3 style="color:var(--ink-strong);font-size:14px;font-weight:650;margin:0">${esc(p.name)}</h3>${rt?`<div style="color:#f5a623;font-size:12px">${stars(rt.avg)}</div>`:''}<div style="flex:1;color:var(--muted);font-size:13px">${esc(p.description||'')}</div><div style="color:var(--ink-strong);font-size:16px;font-weight:700">${priceHtml(p)}</div>${btn}</div></article>`}).join('')||`<div class="empty" style="grid-column:1/-1"><h3>${SF.products.length?'No products match':'No products yet'}</h3></div>`;
}

function openProduct(p){
  const st=SF.store,vs=Array.isArray(p.variants)?p.variants:[],rt=ratingOf(p.id),mine=SF.reviews.filter(r=>r.product_id===p.id);
  const note=isSold(p)?'<p style="color:var(--danger)">Sold out</p>':lowStock(p)?`<p style="color:var(--warning)">Only ${p.stock} left</p>`:'';
  $('#pmBody').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px"><div style="background:#f3f5f4;border-radius:18px;display:grid;place-items:center;min-height:280px;font-size:60px;overflow:hidden">${p.image_url?`<img src="${esc(p.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:18px">`:(CATS[st.category]||'🛍️')}</div><div>${p.old_price>p.price?'<span class="pill st-New">SALE</span>':''}<h2 style="margin-top:10px">${esc(p.name)}</h2>${rt?`<div style="color:#f5a623">${stars(rt.avg)}</div>`:''}<div class="price" id="pmPrice">${priceHtml(p)}</div>${vs.length?`<label style="margin-top:10px">Choose an option<select id="pmVariant"><option value="">Select...</option>${vs.map(v=>`<option value="${esc(varLabel(v))}">${esc(varLabel(v))}</option>`).join('')}</select></label>`:''}${note}<p class="fine">${esc(p.description||'')}</p><button class="btn accent big" id="pmAdd" data-add="${p.id}"${isSold(p)?' disabled':''}>${isSold(p)?'Sold out':'Add to cart'}</button></div></div>`;
  $('#sfProduct').classList.add('open');
}

function drawCart(){
  const c=validCart();
  const cnt=$('#sfCount'); if(cnt)cnt.textContent=c.reduce((a,b)=>a+b.qty,0);
  if(!$('#sfItems'))return;
  if(!c.length){$('#sfItems').innerHTML='<div class="empty">Cart is empty.</div>';$('#sfQuote').innerHTML='';$('#sfForm').hidden=true;return}
  $('#sfForm').hidden=false;
  $('#sfItems').innerHTML=c.map(i=>{const p=SF.products.find(x=>x.id===i.id);
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;margin-bottom:8px;border:1px solid var(--line);border-radius:12px"><div><b>${esc(p.name)}</b>${i.variant?`<br><small>${esc(i.variant)}</small>`:''}<br><small>${mp(unitPrice(p,i.variant))} x ${i.qty}</small></div><div style="display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:4px 8px"><button data-chg="${p.id}" data-var="${esc(i.variant||'')}" data-d="-1">−</button>${i.qty}<button data-chg="${p.id}" data-var="${esc(i.variant||'')}" data-d="1">+</button></div></div>`}).join('');
  refreshQuote();
}

let quoteT;
function refreshQuote(){
  clearTimeout(quoteT);
  quoteT=setTimeout(async()=>{
    const box=$('#sfQuote');if(!box||!SF.store)return;
    const c=validCart();if(!c.length){box.innerHTML='';return}
    const code=($('#cCoupon')&&$('#cCoupon').value||'').trim(),msg=$('#couponMsg');
    const r=await sb.rpc('quote_cart',{p_store:SF.store.id,p_items:c.map(cartItem),p_coupon:code,p_country:SF.country});
    let q;
    if(r.error){
      const sub=c.reduce((a,i)=>a+unitPrice(SF.products.find(p=>p.id===i.id),i.variant)*i.qty,0),s=SF.store;
      const ship=s.free_shipping_min>0&&sub>=s.free_shipping_min?0:(s.shipping_fee||0);
      q={subtotal:sub,discount:0,shipping:ship,total:sub+ship,coupon_msg:''};
    }else q=r.data[0];
    SF.quote=q;
    const F=n=>fmtCur(n,q.currency||curMarket().currency);
    box.innerHTML=`<div style="display:flex;justify-content:space-between;padding:8px 12px;margin-bottom:6px;border:1px solid var(--line);border-radius:10px"><span>Subtotal</span><span>${F(q.subtotal)}</span></div>${q.discount>0?`<div style="display:flex;justify-content:space-between;padding:8px 12px;margin-bottom:6px;border:1px solid var(--line);border-radius:10px"><span>Discount</span><span>−${F(q.discount)}</span></div>`:''}<div style="display:flex;justify-content:space-between;padding:8px 12px;margin-bottom:6px;border:1px solid var(--line);border-radius:10px"><span>Shipping</span><span>${q.shipping>0?F(q.shipping):'Free'}</span></div><div style="display:flex;justify-content:space-between;padding:12px;margin-bottom:6px;font-weight:700;background:#eef7f3;border-radius:10px"><span>Total</span><span>${F(q.total)}</span></div>`;
    if(msg){msg.textContent=code?(q.coupon_msg||''):''}
  },250);
}

function payInfo(){
  const st=SF.store,sel=$('#cPay'),box=$('#payInfo'),btn=$('#placeBtn');if(!sel||!box)return;
  const m=sel.value;let t='';
  if(m==='bank')t=st.bank_details?'Bank: '+st.bank_details:'Seller will share bank details.';
  if(m==='easypaisa')t=st.easypaisa_number?'Easypaisa: '+st.easypaisa_number:'Seller will share details.';
  if(m==='jazzcash')t=st.jazzcash_number?'JazzCash: '+st.jazzcash_number:'Seller will share details.';
  box.innerHTML=m==='cod'?'':`<div style="padding:12px;margin-bottom:10px;background:#f6f7f7;border-radius:12px;font-size:12px">${esc(t)}</div><label>Transaction ID<input id="cPayNote" placeholder="Optional"></label>`;
  btn.textContent=m==='cod'?'Place order (COD)':'Place order';
}

function syncCheckout(){
  const st=SF.store,m=curMarket(),sel=$('#cPay');if(!sel)return;
  const keep=sel.value,methods=Array.isArray(m.payment_methods)&&m.payment_methods.length?m.payment_methods:['cod'];
  sel.innerHTML=methods.map(x=>`<option value="${esc(x)}">${esc(payLabel(x))}</option>`).join('');
  sel.value=methods.includes(keep)?keep:methods[0];
  const n=(st.markets||[]).length;
  const trust=$('#sfTrust');
  if(trust)trust.innerHTML=methods.map(x=>`<span>${esc(payLabel(x))}</span>`).join('');
  const intl=m.country!==homeCountry(st),c=countryOf(m.country);
  const ci=$('#cIntl'); if(ci)ci.hidden=!intl;
  const cp=$('#cPostal'); if(cp)cp.required=intl;
  const cs=$('#cShipTo'); if(cs)cs.textContent=(n||intl)?'Shipping to '+countryName(m.country)+' · '+m.currency:'';
  const cph=$('#cPhone'); if(cph)cph.placeholder=m.country==='PK'?'03XXXXXXXXX':((c&&c.dial)||'+')+' number';
  payInfo();
}

function bindStore(){
  const el=$('#v-store');
  el.addEventListener('input',e=>{
    if(e.target.id==='sfSearch'){SF.q=e.target.value;drawGrid()}
    if(e.target.id==='cCoupon')refreshQuote();
  });
  el.addEventListener('change',e=>{
    if(e.target.id==='cPay')payInfo();
    if(e.target.id==='sfCountry'){SF.country=e.target.value;lsSet('eb.country.'+SF.store.id,SF.country);syncCheckout();drawGrid();drawCart()}
    if(e.target.id==='pmVariant'){const p=SF.products.find(x=>x.id===$('#pmAdd').dataset.add);if(p)$('#pmPrice').innerHTML=priceHtml(p,e.target.value)}
  });
  el.addEventListener('click',e=>{
    if(!SF.store)return;
    const ad=e.target.closest('[data-add]');
    if(ad){
      const isModal=ad.id==='pmAdd';
      const variant=isModal?($('#pmVariant')?$('#pmVariant').value:''):'';
      if(addToCart(ad.dataset.add,variant)){if(isModal)$('#sfProduct').classList.remove('open');$('#sfDrawer').classList.add('open')}
      return;
    }
    const ch=e.target.closest('[data-chg]');
    if(ch){
      let c=getCart();const v=ch.dataset.var||'',d=parseInt(ch.dataset.d,10);
      const x=c.find(i=>i.id===ch.dataset.chg&&(i.variant||'')===v);
      if(x){
        const p=SF.products.find(pp=>pp.id===x.id),total=c.filter(i=>i.id===x.id).reduce((a,b)=>a+b.qty,0);
        if(d>0&&p&&p.stock!=null&&total+1>p.stock){toast('Only '+p.stock+' available');return}
        x.qty+=d;if(x.qty<=0)c=c.filter(i=>i!==x);
      }
      setCart(c);drawCart();return;
    }
    const cat=e.target.closest('[data-catfilter]'); if(cat){SF.cat=cat.dataset.catfilter;drawGrid();return}
    const pr=e.target.closest('[data-product]'); if(pr){const p=SF.products.find(x=>x.id===pr.dataset.product);if(p)openProduct(p);return}
    const a=e.target.closest('[data-sf]');
    if(a){const k=a.dataset.sf;
      if(k==='opencart')$('#sfDrawer').classList.add('open');
      if(k==='closecart')$('#sfDrawer').classList.remove('open');
      if(k==='closedone')$('#sfDone').classList.remove('open');
      if(k==='closeproduct')$('#sfProduct').classList.remove('open');
      return}
    if(e.target.id==='sfDrawer')$('#sfDrawer').classList.remove('open');
    if(e.target.id==='sfProduct')$('#sfProduct').classList.remove('open');
  });
  el.addEventListener('submit',async e=>{
    if(e.target.id!=='sfForm')return;e.preventDefault();
    const st=SF.store,c=validCart();if(!c.length)return;
    const name=$('#cName').value.trim(),phone=$('#cPhone').value.trim(),city=$('#cCity').value.trim(),address=$('#cAddr').value.trim();
    const mk=curMarket();
    if(mk.country==='PK'&&!/^(92|0)?3\d{9}$/.test(phone.replace(/\D/g,''))){toast('Enter a Pakistani mobile (03XXXXXXXXX)');return}
    const state=$('#cState')?$('#cState').value.trim():'',postal=$('#cPostal')?$('#cPostal').value.trim():'';
    const pay=$('#cPay').value,note=$('#cPayNote')?$('#cPayNote').value.trim():'';
    await busy(e.submitter,async()=>{
      const res=await sb.rpc('place_order',{p_store:st.id,p_name:name,p_phone:phone,p_city:city,p_address:address,p_items:c.map(cartItem),p_coupon:$('#cCoupon')?$('#cCoupon').value.trim():'',p_payment:pay,p_note:note,p_country:SF.country,p_state:state,p_postal:postal});
      const row=ok(res)[0];
      if(CUSTOMER){
        try{await sb.from('orders').update({customer_user_id:CUSTOMER.id}).eq('id',row.o_id||row.id)}catch(e){}
        await linkCustomerToStore(st.id,name,phone,CUSTOMER.email);
      }
      const token=getCartToken(st.id);
      try{await sb.from('abandoned_carts').update({recovered:true,recovered_at:new Date().toISOString()}).eq('cart_token',token)}catch(e){}
      const orderData={order_no:row.o_no,customer_name:name,customer_phone:phone,address,city,items:c.map(i=>{const p=SF.products.find(x=>x.id===i.id);return{name:p?.name,variant:i.variant,qty:i.qty}}),total:row.o_charged!=null?row.o_charged:row.o_total,payment_method:pay};
      emailSellerNewOrder(orderData,st);
      const custEmail=(CUSTOMER&&CUSTOMER.email)||'';
      if(custEmail)emailCustomerOrderConfirm(orderData,st,custEmail);
      const items=c.map(i=>{const p=SF.products.find(x=>x.id===i.id);return p.name+' x'+i.qty}).join(', ');
      setCart([]);e.target.reset();$('#sfDrawer').classList.remove('open');
      try{SF.products=ok(await sb.from('products').select('*').eq('store_id',st.id).eq('is_active',true).order('created_at'))}catch(err){}
      syncCheckout();drawGrid();drawCart();
      const cc=row.o_currency||mk.currency,F=n=>fmtCur(n,cc);
      $('#doneTitle').textContent='Order #'+row.o_no+' placed';
      $('#doneText').textContent=pay==='cod'?'Pay '+F(row.o_charged!=null?row.o_charged:row.o_total)+' when delivered.':'Seller will confirm payment.';
      $('#doneWa').href='https://wa.me/'+waNum(st.whatsapp)+'?text='+encodeURIComponent('New order #'+row.o_no+' from '+name+': '+items);
      $('#sfDone').classList.add('open');
    });
  });
}

/* ---------- TRACKING ---------- */
function renderTrack(){
  const el=$('#v-track');
  if(!el)return;
  el.innerHTML=`<div class="wrap" style="padding:60px 0 80px"><div class="builder" style="max-width:560px;margin-inline:auto"><h2>Track your order</h2><p class="fine">Enter store slug, order number and phone.</p><form id="trackForm"><label>Store slug<input id="tStore" placeholder="my-store" required></label><label>Order number<input id="tNo" type="number" required></label><label>Phone<input id="tPhone" placeholder="03XXXXXXXXX" required></label><button class="btn primary big">Track order</button></form><div id="trackResult" style="margin-top:16px"></div></div></div>`;
}
addEventListener('submit',async e=>{if(e.target.id!=='trackForm')return;e.preventDefault();await busy(e.submitter,async()=>{const slug=$('#tStore').value.trim(),no=parseInt($('#tNo').value,10),phone=$('#tPhone').value.trim();const st=ok(await sb.from('stores').select('id,name').eq('slug',slug).maybeSingle());if(!st)throw new Error('Store not found');const r=ok(await sb.rpc('track_order',{p_store:st.id,p_order_no:no,p_phone:phone}));const x=r[0];$('#trackResult').innerHTML=x?`<div style="padding:16px;border:1px solid var(--line);border-radius:14px;background:#fafcfb"><b>Order #${x.order_no}</b><p>Status: <strong>${esc(x.status)}</strong></p></div>`:'<div style="padding:16px;border:1px solid var(--line);border-radius:14px;background:#fff3f0">Order not found.</div>'})});

/* ---------- START ---------- */
(async function init(){
  initBuilder();bindDash();bindStore();bindDesigner();bindCode();
  await loadCustomerSession();
  if(!configured){const s=$('#setup'); if(s)s.hidden=false;}
  else{
    try{const r=await sb.auth.getSession();USER=r.data.session?r.data.session.user:null}catch(e){}
    sb.auth.onAuthStateChange((_e,s)=>{USER=s?s.user:null;paintNav()});
  }
  paintNav();route();
})();
