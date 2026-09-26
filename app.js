/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-PK');
const uid=()=>Math.random().toString(36).slice(2,8);
const CATS={Pets:'🐾',Fashion:'👗',Electronics:'🎧',Home:'🏠',Beauty:'💄',Other:'🛍️'};
const COLORS=['#0a7d55','#1f6f9f','#d8452e','#7a4dd8','#c98a00','#c2185b','#26332e'];
const STATUSES=['New','Confirmed','Shipped','Delivered','Cancelled'];
const slugify=s=>{let b=(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24).replace(/-+$/,'');if(b.length<3)b=(b+'-shop').replace(/^-/,'');return b};
const slugPreview=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24)||'yourstore';
function ink(hex){const n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;return (0.299*r+0.587*g+0.114*b)>165?'#10231d':'#ffffff'}
function waNum(p){let d=String(p||'').replace(/\D/g,'');if(d.startsWith('0'))d='92'+d.slice(1);return d}
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200)}
const ok=r=>{if(r.error)throw r.error;return r.data};
async function busy(btn,fn){if(btn)btn.disabled=true;try{return await fn()}catch(e){console.error(e);toast(e.message||'Something went wrong')}finally{if(btn)btn.disabled=false}}
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};

/* ---------- supabase ---------- */
const CFG=window.EASYBUY_CONFIG||{};
const configured=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!/^PASTE/.test(CFG.SUPABASE_URL)&&window.supabase);
const sb=configured?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
let USER=null;

/* ---------- router ---------- */
function route(){
  const parts=(location.hash||'#/').split('/');
  let v=parts[1]==='dashboard'?'dashboard':parts[1]==='s'?'store':parts[1]==='login'?'login':'home';
  if(v==='dashboard'&&!USER){AUTH.note=AUTH.note||'Log in to open your seller dashboard.';location.hash='#/login';return}
  $$('[data-view]').forEach(e=>e.hidden=e.id!=='v-'+v);
  $('#siteHeader').hidden=v==='store';
  $('#siteFooter').hidden=v==='store';
  $$('.nav-links a[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===v));
  if(v==='home')renderHome();
  if(v==='login')renderLogin();
  if(v==='dashboard')loadDash();
  if(v==='store')renderStore(parts[2]);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>route());
function paintNav(){$('#navAuth').textContent=USER?'Log out':'Log in'}

/* ---------- auth ---------- */
const AUTH={mode:'signup',note:''};
function renderLogin(){
  const su=AUTH.mode==='signup',pend=readPending();
  $('#v-login').innerHTML=`<div class="wrap auth"><form class="builder" id="authForm">
    <h2>${su?'Create your seller account':'Log in'}</h2>
    <p class="fine" style="margin:0 0 16px">${esc(pend?'Aap ka store "'+pend.name+'" account banate hi ban jayega.':AUTH.note||'Email aur password se account banta hai.')}</p>
    <label>Email<input id="aEmail" type="email" autocomplete="email" required></label>
    <label>Password (6+ characters)<input id="aPass" type="password" minlength="6" autocomplete="${su?'new-password':'current-password'}" required></label>
    <button class="btn primary big" type="submit">${su?'Create account':'Log in'}</button>
    <p class="fine"><button class="linkbtn" type="button" data-auth="toggle">${su?'Already have an account? Log in':'New here? Create an account'}</button></p>
    <p class="fine" id="aMsg" role="alert"></p></form></div>`;
}
function readPending(){try{return JSON.parse(lsGet('eb.pending')||'null')}catch(e){return null}}
async function afterAuth(){
  AUTH.note='';
  const pend=readPending();
  if(pend){lsDel('eb.pending');try{const st=await createStore(pend);MY.active=st.id;toast('Store ban gaya. Ab pehla product add karo.');D.tab='products'}catch(e){toast(e.message)}}
  location.hash='#/dashboard';
  if(location.hash==='#/dashboard')route();
}
async function createStore(d){
  let base=slugify(d.name);
  for(let i=0;i<5;i++){
    const slug=i===0?base:(base.slice(0,24)+'-'+uid().slice(0,3));
    const r=await sb.from('stores').insert({slug,name:d.name,category:d.cat,color:d.color,whatsapp:d.wa||'',tagline:'Welcome to '+d.name+'. Order online and pay in cash when it arrives.'}).select().single();
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
      else msg.textContent='Account ban gaya. Email mein confirmation link aaya hoga, usay kholo aur phir Log in karo.';
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

/* ---------- home ---------- */
const B={cat:'Pets',color:COLORS[0]};
function initBuilder(){
  $('#bCats').innerHTML=Object.keys(CATS).map(c=>`<button type="button" class="chip" data-cat="${c}" aria-pressed="${c===B.cat}">${CATS[c]} ${c}</button>`).join('');
  $('#bColors').innerHTML=COLORS.map(c=>`<button type="button" class="sw" data-color="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${c===B.color}"></button>`).join('');
  $('#bCats').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;B.cat=b.dataset.cat;$$('#bCats .chip').forEach(x=>x.setAttribute('aria-pressed',x===b));preview()});
  $('#bColors').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;B.color=b.dataset.color;$$('#bColors .sw').forEach(x=>x.setAttribute('aria-pressed',x===b));preview()});
  $('#bName').addEventListener('input',preview);
  $('#builder').addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$('#bName').value.trim();
    if(!name){toast('Pehle store ka naam likho');$('#bName').focus();return}
    const draft={name,cat:B.cat,color:B.color,wa:$('#bWa').value.trim()};
    if(!sb){toast('Add your Supabase keys in config.js first');return}
    if(!USER){lsSet('eb.pending',JSON.stringify(draft));AUTH.mode='signup';location.hash='#/login';route();return}
    await busy(e.submitter,async()=>{const st=await createStore(draft);MY.active=st.id;D.tab='products';toast('Store ban gaya. Ab pehla product add karo.');location.hash='#/dashboard';route()});
  });
  $('#navCreate').addEventListener('click',e=>{
    if((location.hash||'#/')==='#/'||location.hash===''){e.preventDefault();$('#builderTop').scrollIntoView();$('#bName').focus({preventScroll:true})}
  });
  preview();
}
function preview(){
  const name=$('#bName').value.trim()||'Your store';
  const f=$('#frame');f.style.setProperty('--accent',B.color);f.style.setProperty('--on-accent',ink(B.color));
  $('#pvName').textContent=name;$('#pvBand').textContent=name;
  $('#pvUrl').textContent=slugPreview($('#bName').value)+'.easybuy.pk';
  const e=CATS[B.cat],prices=['1,499','2,999','799'];
  $('#pvGrid').innerHTML=prices.map(p=>`<div class="pv-tile"><div class="pv-pic">${e}</div><div class="pv-txt"><s></s><s></s><strong>Rs. ${p}</strong></div></div>`).join('');
}
async function renderHome(){
  const box=$('#storeList');
  if(!sb){box.innerHTML='<p class="sub">Supabase keys add karne ke baad yahan live stores dikhenge.</p>';return}
  try{
    const list=ok(await sb.from('stores').select('slug,name,category,color').order('created_at',{ascending:false}).limit(12));
    box.innerHTML=list.length?list.map(s=>`
      <div class="store-row"><div class="store-dot" style="background:${esc(s.color)};color:${ink(s.color)}">${CATS[s.category]||'🛍️'}</div>
      <div><b>${esc(s.name)}</b><small>${esc(s.category)}</small></div>
      <a class="btn small" href="#/s/${esc(s.slug)}">Visit store</a></div>`).join('')
      :'<p class="sub">Abhi koi store nahi bana. Pehla store aap ka ho sakta hai.</p>';
  }catch(e){box.innerHTML='<p class="sub">Stores load nahi ho sake: '+esc(e.message)+'</p>'}
}

/* ---------- dashboard ---------- */
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
    sb.from('orders').select('*').eq('store_id',MY.active).order('created_at',{ascending:false})
  ]);
  MY.products=ok(p)||[];
  MY.orders=ok(o)||[];
}
function renderDash(){
  const st=curS();
  if(!st){
    $('#dash').innerHTML=`<div class="empty"><h2>Create your first store</h2><p>You don't have a store yet.</p><a class="btn primary" href="#/">Create store</a></div>`;
    return;
  }
  const active=MY.products.filter(p=>p.is_active).length;
  const fresh=MY.orders.filter(o=>o.status==='New').length;
  const rev=MY.orders.filter(o=>o.status!=='Cancelled').reduce((a,o)=>a+Number(o.total||0),0);
  $('#dash').innerHTML=`<div class="dash-shell">
    <aside class="dash-side">
      <div class="dash-brand">${esc(st.name)}</div>
      <button class="store-select" id="storeSel">${MY.stores.map(s=>`<option value="${s.id}"${s.id===MY.active?' selected':''}>${esc(s.name)}</option>`).join('')}</button>
      <nav>
        <button data-tab="orders" class="${D.tab==='orders'?'on':''}">Orders</button>
        <button data-tab="products" class="${D.tab==='products'?'on':''}">Products</button>
        <button data-tab="advanced" class="${D.tab==='advanced'?'on':''}">Analytics & tools</button>
        <button data-tab="settings" class="${D.tab==='settings'?'on':''}">Settings</button>
      </nav>
      <button class="btn small" data-act="newstore">+ New store</button>
    </aside>
    <main class="dash-main">
      <div class="dash-top"><div><h1>${D.tab==='orders'?'Orders':D.tab==='products'?'Products':'Store settings'}</h1><p>Manage ${esc(st.name)}.</p></div><div class="actions"><a class="btn" href="#/s/${esc(st.slug)}">View store</a><button class="btn" data-act="copy">Copy link</button><button class="btn" data-act="refresh">Refresh</button></div></div>
      <div class="metric-grid"><div class="metric"><span>Products</span><b>${active}</b></div><div class="metric"><span>Total orders</span><b>${MY.orders.length}</b></div><div class="metric"><span>New orders</span><b>${fresh}</b></div><div class="metric"><span>Order value</span><b>${money(rev)}</b></div></div>
      ${D.tab==='orders'?ordersPanel(st):D.tab==='products'?productsPanel(st):settingsPanel(st)}
    </main>
  </div>`;
}
  el.addEventListener('click',async e=>{
    const a=e.target.closest('[data-act]'),st=curS();
    if(a){
      const act=a.dataset.act;
      if(act==='refresh'){await loadStoreData();renderDash();return}
      if(act==='copy'){navigator.clipboard?.writeText(location.origin+location.pathname+'#/s/'+st.slug);toast('Store link copied');return}
      if(act==='newstore'){location.hash='#/';route();setTimeout(()=>$('#builderTop')?.scrollIntoView(),50);return}
      if(act==='addproduct'){D.form={};renderDash();setTimeout(()=>$('#pName')?.focus(),50);return}
      if(act==='editproduct'){D.form=MY.products.find(p=>p.id===a.dataset.id)||{};renderDash();return}
      if(act==='delproduct'&&confirm('Delete this product?'))await busy(a,async()=>{ok(await sb.from('products').delete().eq('id',a.dataset.id));await loadStoreData();renderDash();toast('Product deleted')});
      if(act==='delstore'&&confirm('Delete "'+st.name+'" with all its products and orders? This cannot be undone.'))
        await busy(a,async()=>{ok(await sb.from('stores').delete().eq('id',st.id));MY.active=null;await loadDash();toast('Store deleted')});
    }
    const tab=e.target.closest('[data-tab]');
    if(tab){D.tab=tab.dataset.tab;D.form=null;renderDash()}
    const p=e.target.closest('[data-product]');
    if(p){const x=MY.products.find(x=>x.id===p.dataset.product);if(x){D.form=x;renderDash()}}
    if(e.target.id==='dashNewProduct'){D.form={};renderDash();setTimeout(()=>$('#pName')?.focus(),50)}
  });
  el.addEventListener('change',async e=>{
    if(e.target.id==='storeSel'){MY.active=e.target.value;D.form=null;await loadStoreData();renderDash();return}
    if(e.target.dataset.status){
      const o=MY.orders.find(x=>x.id===e.target.dataset.status);
      if(o)await busy(e.target,async()=>{
        ok(await sb.from('orders').update({status:e.target.value}).eq('id',o.id));
        o.status=e.target.value;renderDash();toast('Order #'+o.order_no+' marked '+o.status)
      });
      return
    }
    if(e.target.id==='pImg'&&e.target.files[0]){
      toBlob(e.target.files[0],b=>{
        D.file=b;
        $('#pThumb').innerHTML='<img src="'+URL.createObjectURL(b)+'" alt="">'
      })
    }
  });
  el.addEventListener('submit',async e=>{
    e.preventDefault();const st=curS();const btn=e.submitter;
    if(e.target.id==='pForm'){
      const price=parseInt($('#pPrice').value,10);
      if(!$('#pName').value.trim()||!(price>0)){toast('Add a name and a price');return}
      await busy(btn,async()=>{
        let image_url=D.form.image_url||'';
        if(D.file)image_url=await uploadImage(D.file);
        const variants=$('#pVariants').value.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{
          const a=line.split('|').map(v=>v.trim());
          return {name:a[0]||'',option:a[1]||'',price:parseInt(a[2],10)||price}
        });
        const row={
          store_id:st.id,
          name:$('#pName').value.trim(),
          price,
          old_price:parseInt($('#pOld').value,10)||0,
          category:$('#pCat').value.trim(),
          description:$('#pDesc').value.trim(),
          image_url,
          is_active:$('#pActive').value==='true',
          sku:$('#pSku').value.trim(),
          stock:$('#pStock').value.trim()===''?null:Math.max(0,parseInt($('#pStock').value,10)||0),
          variants
        };
        ok(D.form.id
          ?await sb.from('products').update(row).eq('id',D.form.id)
          :await sb.from('products').insert(row));
        D.form=null;D.file=null;await loadStoreData();renderDash();toast('Product saved');
      });
    }
    if(e.target.id==='sForm'){
      await busy(btn,async()=>{
        const upd={
          name:$('#sName').value.trim()||st.name,
          whatsapp:$('#sWa').value.trim(),
          tagline:$('#sTag').value.trim(),
          description:$('#sDesc').value.trim()
        };
        if(D.color)upd.color=D.color;
        ok(await sb.from('stores').update(upd).eq('id',st.id));
        D.color=null;await loadDash();toast('Settings saved');
      });
    }
  });
}


/* ---------- international helpers ---------- */
const COUNTRIES=[
 {code:'PK',name:'Pakistan',cur:'PKR',dial:'+92'},{code:'US',name:'United States',cur:'USD',dial:'+1'},
 {code:'GB',name:'United Kingdom',cur:'GBP',dial:'+44'},{code:'CA',name:'Canada',cur:'CAD',dial:'+1'},
 {code:'AU',name:'Australia',cur:'AUD',dial:'+61'},{code:'NZ',name:'New Zealand',cur:'NZD',dial:'+64'},
 {code:'AE',name:'United Arab Emirates',cur:'AED',dial:'+971'},{code:'SA',name:'Saudi Arabia',cur:'SAR',dial:'+966'},
 {code:'QA',name:'Qatar',cur:'QAR',dial:'+974'},{code:'KW',name:'Kuwait',cur:'KWD',dial:'+965'},
 {code:'OM',name:'Oman',cur:'OMR',dial:'+968'},{code:'BH',name:'Bahrain',cur:'BHD',dial:'+973'},
 {code:'DE',name:'Germany',cur:'EUR',dial:'+49'},{code:'FR',name:'France',cur:'EUR',dial:'+33'},
 {code:'IT',name:'Italy',cur:'EUR',dial:'+39'},{code:'ES',name:'Spain',cur:'EUR',dial:'+34'},
 {code:'NL',name:'Netherlands',cur:'EUR',dial:'+31'},{code:'IE',name:'Ireland',cur:'EUR',dial:'+353'},
 {code:'TR',name:'Turkey',cur:'TRY',dial:'+90'},{code:'MY',name:'Malaysia',cur:'MYR',dial:'+60'},
 {code:'SG',name:'Singapore',cur:'SGD',dial:'+65'}];

const countryOf=c=>COUNTRIES.find(x=>x.code===c);
const countryName=c=>(countryOf(c)||{name:c}).name;

function decOf(c){
  c=(c||'').toUpperCase();
  return ['PKR','JPY','KRW','VND','CLP','ISK','UGX'].includes(c)
    ?0
    :['KWD','BHD','OMR','JOD','TND'].includes(c)?3:2
}

function fmtCur(n,cur){
  cur=(cur||'PKR').toUpperCase();
  if(cur==='PKR')return money(n);
  const d=decOf(cur);
  try{
    return new Intl.NumberFormat('en',{
      style:'currency',
      currency:cur,
      currencyDisplay:'code',
      minimumFractionDigits:d,
      maximumFractionDigits:d
    }).format(n).replace(/\u00a0/g,' ')
  }catch(e){
    return cur+' '+Number(n).toFixed(d)
  }
}


/* ---------- storefront ---------- */
let SF={
  store:null,
  products:[],
  reviews:[],
  q:'',
  cat:'',
  quote:null,
  country:''
};

const cartKey=()=>'eb.cart.'+SF.store.id;

function getCart(){
  try{
    const c=JSON.parse(lsGet(cartKey())||'[]');
    return Array.isArray(c)?c:[]
  }catch(e){return[]}
}

function setCart(c){
  lsSet(cartKey(),JSON.stringify(c))
}

const PAY={
  cod:'Cash on Delivery',
  bank:'Bank transfer',
  easypaisa:'Easypaisa',
  jazzcash:'JazzCash'
};

const payLabel=m=>PAY[m]||m;

const varLabel=v=>[
  v&&v.name,
  v&&v.option
].map(x=>String(x||'').trim()).filter(Boolean).join(' / ');

const isSold=p=>p.stock!=null&&p.stock<=0;

const lowStock=p=>p.stock!=null&&p.stock>0&&p.stock<=5;

const stars=n=>{
  const k=Math.round(n);
  return '★'.repeat(k)+'☆'.repeat(5-k)
};

function unitPrice(p,variant){
  if(variant&&Array.isArray(p.variants)){
    const v=p.variants.find(x=>varLabel(x)===variant);
    if(v&&v.price>0)return v.price
  }
  return p.price;
}

const homeCountry=st=>st.home_country||'PK';

function marketList(st){
  const h={
    country:homeCountry(st),
    currency:st.currency||'PKR',
    rate:1,
    shipping:st.shipping_fee||0,
    free_min:st.free_shipping_min||0,
    payment_methods:(Array.isArray(st.payment_methods)&&st.payment_methods.length?st.payment_methods:['cod']),
    home:true
  };
  return [h,...(Array.isArray(st.markets)?st.markets:[])]
}

function curMarket(){
  return marketList(SF.store).find(m=>m.country===SF.country)||marketList(SF.store)[0]
}

function mp(base){
  const m=curMarket(),
        d=decOf(m.currency),
        k=Math.pow(10,d);
  return fmtCur(Math.round(base*m.rate*k)/k,m.currency)
}

function priceHtml(p,variant){
  const vs=Array.isArray(p.variants)?p.variants:[];
  if(variant)return mp(unitPrice(p,variant));
  if(vs.length){
    const prices=vs.map(v=>v.price>0?v.price:p.price),
          lo=Math.min(...prices),
          hi=Math.max(...prices);
    return (lo===hi?'':'From ')+mp(lo)
  }
  return mp(p.price)+(p.old_price>p.price?`<s>${mp(p.old_price)}</s>`:'');
}

function ratingOf(pid){
  const r=SF.reviews.filter(x=>x.product_id===pid);
  return r.length
    ?{
      avg:r.reduce((a,b)=>a+b.rating,0)/r.length,
      n:r.length
    }
    :null
}

function validCart(){
  return getCart().filter(i=>SF.products.some(p=>p.id===i.id))
}

const cartItem=i=>({
  product_id:i.id,
  qty:i.qty,
  variant:i.variant||''
});

function addToCart(pid,variant){
  const p=SF.products.find(x=>x.id===pid);
  if(!p)return false;

  if(isSold(p)){
    toast(p.name+' is sold out');
    return false
  }

  const vs=Array.isArray(p.variants)?p.variants:[];

  if(vs.length&&!variant){
    toast('Please choose an option first');
    return false
  }

  const c=getCart(),
        inCart=c.filter(i=>i.id===pid).reduce((a,b)=>a+b.qty,0);

  if(p.stock!=null&&inCart+1>p.stock){
    toast('Only '+p.stock+' available');
    return false
  }

  const x=c.find(i=>i.id===pid&&(i.variant||'')===(variant||''));

  x
    ?x.qty=Math.min(99,x.qty+1)
    :c.push({id:pid,qty:1,variant:variant||''});

  setCart(c);
  drawCart();
  return true;
}

async function renderStore(slug){
  const el=$('#v-store');

  el.innerHTML='<div class="wrap empty" style="padding-top:80px">Loading store...</div>';

  let st=null,prods=[],revs=[];

  try{
    if(!sb)throw new Error('Supabase keys are missing in config.js');

    st=ok(await sb.from('stores').select('*').eq('slug',slug||'').maybeSingle());

    if(st){
      prods=ok(
        await sb.from('products')
          .select('*')
          .eq('store_id',st.id)
          .eq('is_active',true)
          .order('created_at')
      );

      const rr=await sb.rpc('get_reviews',{p_store:st.id});
      revs=rr.error?[]:(rr.data||[]);
    }
  }catch(e){
    el.innerHTML='<div class="wrap empty" style="padding-top:80px"><h2>Could not load this store</h2><p>'+esc(e.message)+'</p><a class="btn primary" href="#/">Back to EasyBuy</a></div>';
    return
  }

  if(!st){
    el.innerHTML='<div class="wrap empty" style="padding-top:80px"><h2>Store not found</h2><p>Check the link, or ask the seller to send it again.</p><a class="btn primary" href="#/">Back to EasyBuy</a></div>';
    return
  }

  SF={
    store:st,
    products:prods,
    reviews:revs,
    q:'',
    cat:'',
    quote:null,
    country:''
  };

  {
    const saved=lsGet('eb.country.'+st.id),
          ml=marketList(st);

    SF.country=ml.some(m=>m.country===saved)
      ?saved
      :homeCountry(st)
  }

  const methods=Array.isArray(st.payment_methods)&&st.payment_methods.length
    ?st.payment_methods
    :['cod'];

  document.title=st.name+' on EasyBuy';

  el.style.setProperty('--accent',st.color);
  el.style.setProperty('--on-accent',ink(st.color));

  el.innerHTML=`
  <div class="eb-bar">
    You are viewing ${esc(st.name)} on EasyBuy.
    <a href="#/dashboard">Seller dashboard</a>
    <a href="#/">EasyBuy home</a>
  </div>

  <header class="sf-head">
    <div class="wrap sf-nav">
      <strong class="sf-logo">${esc(st.name)}</strong>
      <div class="sf-right">
        ${(st.markets||[]).length
          ?`<select id="sfCountry" aria-label="Ship to country">
            ${marketList(st).map(m=>`
              <option value="${esc(m.country)}"${m.country===SF.country?' selected':''}>
                ${esc(countryName(m.country))} (${esc(m.currency)})
              </option>`).join('')}
          </select>`
          :''}
        <button class="btn accent" data-sf="opencart">
          Cart <span id="sfCount">0</span>
        </button>
      </div>
    </div>
  </header>
`;
  syncCheckout();
  drawGrid();
  drawCart();
}

function drawGrid(){
  const st=SF.store,
        q=SF.q.toLowerCase();

  const cats=[
    ...new Set(SF.products.map(p=>p.category).filter(Boolean))
  ];

  const cf=$('#sfCats');

  if(cf){
    cf.innerHTML=
      `<button class="active" data-catfilter="">All</button>`+
      cats.map(c=>`<button data-catfilter="${esc(c)}">${esc(c)}</button>`).join('');
  }

  const activeCat=SF.cat||'';

  if(cf){
    cf.querySelectorAll('[data-catfilter]').forEach(b=>
      b.classList.toggle('active',b.dataset.catfilter===activeCat)
    );
  }

  const list=SF.products.filter(p=>
    (!activeCat||p.category===activeCat)&&
    (p.name+' '+p.category+' '+p.description).toLowerCase().includes(q)
  );

  $('#sfGrid').innerHTML=list.map(p=>{
    const vs=Array.isArray(p.variants)?p.variants:[],
          rt=ratingOf(p.id);

    const badge=
      isSold(p)
        ?'<span class="chipbadge sold">Sold out</span>'
        :lowStock(p)
          ?`<span class="chipbadge low">Only ${p.stock} left</span>`
          :'';

    const btn=
      isSold(p)
        ?'<button class="btn accent" disabled>Sold out</button>'
        :vs.length
          ?`<button class="btn accent" data-product="${p.id}">Choose option</button>`
          :`<button class="btn accent" data-add="${p.id}">Add to cart</button>`;

    return `<article class="card">
      <button class="pic" data-product="${p.id}" style="border:0;padding:0;cursor:pointer;color:inherit">
        ${p.image_url
          ?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`
          :(CATS[st.category]||'🛍️')}
      </button>

      <div class="body">
        ${badge}
        ${p.category?`<span class="cat">${esc(p.category)}</span>`:''}
        <h3>${esc(p.name)}</h3>

        ${rt
          ?`<div class="rating">
              ${stars(rt.avg)}
              <small>${rt.avg.toFixed(1)} (${rt.n})</small>
            </div>`
          :''}

        <div class="desc">${esc(p.description||'')}</div>

        <div class="price">${priceHtml(p)}</div>

        ${btn}
      </div>
    </article>`
  }).join('')||
  `<div class="empty" style="grid-column:1/-1">
    <h3>${SF.products.length?'No products match your search':'This store has no products yet'}</h3>
    <p>${SF.products.length?'Try a different word or category.':'Please check back soon.'}</p>
  </div>`;
}

function openProduct(p){
  const st=SF.store,
        vs=Array.isArray(p.variants)?p.variants:[],
        rt=ratingOf(p.id),
        mine=SF.reviews.filter(r=>r.product_id===p.id);

  const note=
    isSold(p)
      ?'<p class="stock-note out">Sold out</p>'
      :lowStock(p)
        ?`<p class="stock-note low">Only ${p.stock} left</p>`
        :'';

  $('#pmBody').innerHTML=`
  <div class="product-modal-inner">
    <div class="product-modal-pic">
      ${p.image_url
        ?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`
        :(CATS[st.category]||'🛍️')}
    </div>

    <div>
      ${p.old_price>p.price?'<span class="badge-sale">SALE</span>':''}

      <h2 style="margin-top:10px">${esc(p.name)}</h2>

      ${rt
        ?`<div class="rating">
            ${stars(rt.avg)}
            <small>${rt.avg.toFixed(1)} (${rt.n})</small>
          </div>`
        :''}

      <div class="price" id="pmPrice">${priceHtml(p)}</div>

      ${vs.length
        ?`<label style="margin-top:10px">
            Choose an option
            <select id="pmVariant">
              <option value="">Select...</option>
              ${vs.map(v=>`
                <option value="${esc(varLabel(v))}">
                  ${esc(varLabel(v))}
                  ${v.price>0&&v.price!==p.price?' ('+money(v.price)+')':''}
                </option>`).join('')}
            </select>
          </label>`
        :''}

      ${note}

      <p class="fine" style="font-size:15px;line-height:1.7">
        ${esc(p.description||'No description available.')}
      </p>

      <button class="btn accent big buy" id="pmAdd" data-add="${p.id}"${isSold(p)?' disabled':''}>
        ${isSold(p)?'Sold out':'Add to cart'}
      </button>
    </div>
  </div>

  <div class="reviews-box">
    <h3>Reviews</h3>

    ${mine.length
      ?mine.map(r=>`
        <div class="rv">
          <b>${esc(r.customer_name)}</b>
          <span class="rating">${stars(r.rating)}</span>
          <p>${esc(r.body||'')}</p>
        </div>`).join('')
      :'<p class="fine">No reviews yet.</p>'}

    <details style="margin-top:12px">
      <summary style="cursor:pointer;font-weight:600">Write a review</summary>

      <form id="rvForm" data-pid="${p.id}" style="margin-top:12px">
        <label>Your name
          <input id="rvName" required maxlength="60">
        </label>

        <label>Phone used on your order
          <input id="rvPhone" inputmode="tel" placeholder="03XXXXXXXXX" required>
        </label>

        <label>Rating
          <select id="rvRating">
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
        </label>

        <label>Comment (optional)
          <textarea id="rvBody" maxlength="500"></textarea>
        </label>

        <button class="btn accent" type="submit">Send review</button>

        <p class="fine">
          Only customers who ordered this product can review it.
          The seller approves reviews before they show.
        </p>
      </form>
    </details>
  </div>`;

  $('#sfProduct').classList.add('open');
}

function drawCart(){
  const c=validCart();

  $('#sfCount').textContent=c.reduce((a,b)=>a+b.qty,0);

  if(!c.length){
    $('#sfItems').innerHTML='<div class="empty">Your cart is empty.</div>';
    $('#sfQuote').innerHTML='';
    $('#sfForm').hidden=true;
    return
  }

  $('#sfForm').hidden=false;

  $('#sfItems').innerHTML=c.map(i=>{
    const p=SF.products.find(x=>x.id===i.id);

    return `<div class="ci">
      <div>
        <b>${esc(p.name)}</b>
        ${i.variant?`<br><small>${esc(i.variant)}</small>`:''}
        <br>
        <small>${mp(unitPrice(p,i.variant))} x ${i.qty}</small>
      </div>

      <div class="qty">
        <button data-chg="${p.id}" data-var="${esc(i.variant||'')}" data-d="-1" aria-label="Remove one">−</button>
        ${i.qty}
        <button data-chg="${p.id}" data-var="${esc(i.variant||'')}" data-d="1" aria-label="Add one">+</button>
      </div>
    </div>`
  }).join('');

  refreshQuote();
}

let quoteT;

function refreshQuote(){
  clearTimeout(quoteT);

  quoteT=setTimeout(async()=>{
    const box=$('#sfQuote');

    if(!box||!SF.store)return;

    const c=validCart();

    if(!c.length){
      box.innerHTML='';
      return
    }

    const code=($('#cCoupon')&&$('#cCoupon').value||'').trim(),
          msg=$('#couponMsg');

    const r=await sb.rpc('quote_cart',{
      p_store:SF.store.id,
      p_items:c.map(cartItem),
      p_coupon:code,
      p_country:SF.country
    });

    let q;

    if(r.error){
      if(
        (r.error.code==='PGRST202'||/could not find|schema cache/i.test(r.error.message||''))&&
        !curMarket().home
      ){
        box.innerHTML='<p class="fine">International checkout is not enabled yet. Please choose the home country.</p>';
        SF.quote=null;
        return
      }

      if(
        r.error.code==='PGRST202'||
        /could not find|schema cache/i.test(r.error.message||'')
      ){
        const sub=c.reduce(
          (a,i)=>a+
            unitPrice(SF.products.find(p=>p.id===i.id),i.variant)*i.qty,
          0
        );

        const s=SF.store;

        const ship=
          s.free_shipping_min>0&&sub>=s.free_shipping_min
            ?0
            :(s.shipping_fee||0);

        q={
          subtotal:sub,
          discount:0,
          shipping:ship,
          total:sub+ship,
          coupon_msg:''
        };
      }else{
        box.innerHTML='<p class="fine" style="color:var(--coral)">'+esc(r.error.message)+'</p>';
        SF.quote=null;
        if(msg)msg.textContent='';
        return
      }
    }else{
      q=r.data[0];
    }

    SF.quote=q;

    const F=n=>fmtCur(n,q.currency||curMarket().currency);

    box.innerHTML=
      `<div class="qrow"><span>Subtotal</span><span>${F(q.subtotal)}</span></div>`+
      `${q.discount>0?`<div class="qrow"><span>Discount</span><span>−${F(q.discount)}</span></div>`:''}`+
      `<div class="qrow"><span>Shipping</span><span>${q.shipping>0?F(q.shipping):'Free'}</span></div>`+
      `<div class="qrow tot"><span>Total</span><span>${F(q.total)}</span></div>`;

    if(msg){
      msg.textContent=code?(q.coupon_msg||''):'';
      msg.style.color=q.coupon_msg==='Coupon applied'
        ?'var(--brand)'
        :'var(--muted)';
    }
  },250);
}

function payInfo(){
  const st=SF.store,
        sel=$('#cPay'),
        box=$('#payInfo'),
        btn=$('#placeBtn');

  if(!sel||!box)return;

  const m=sel.value;
  let t='';

  if(m==='bank')
    t=st.bank_details
      ?'Bank details:\n'+st.bank_details
      :'The seller will share bank details on WhatsApp.';

  if(m==='easypaisa')
    t=st.easypaisa_number
      ?'Send payment to Easypaisa: '+st.easypaisa_number
      :'The seller will share Easypaisa details on WhatsApp.';

  if(m==='jazzcash')
    t=st.jazzcash_number
      ?'Send payment to JazzCash: '+st.jazzcash_number
      :'The seller will share JazzCash details on WhatsApp.';

  box.innerHTML=m==='cod'
    ?''
    :`<div class="payinfo">${esc(t)}</div>
      <label>
        Transaction ID (after you pay)
        <input id="cPayNote" maxlength="200" placeholder="Optional, you can also send it on WhatsApp">
      </label>`;

  btn.textContent=
    m==='cod'
      ?'Place order, pay on delivery'
      :'Place order';
}

function syncCheckout(){
  const st=SF.store,
        m=curMarket(),
        sel=$('#cPay');

  if(!sel)return;

  const keep=sel.value,
        methods=
          Array.isArray(m.payment_methods)&&m.payment_methods.length
            ?m.payment_methods
            :['cod'];

  sel.innerHTML=methods.map(x=>
    `<option value="${esc(x)}">${esc(payLabel(x))}</option>`
  ).join('');

  sel.value=methods.includes(keep)?keep:methods[0];

  const n=(st.markets||[]).length;

  $('#sfTrust').innerHTML=
    methods.map(x=>`<span>${esc(payLabel(x))}</span>`).join('')+
    (n
      ?`<span>Ships to ${n+1} countries</span>`
      :`<span>Delivery across ${esc(countryName(homeCountry(st)))}</span>`) +
    '<span>WhatsApp support</span>';

  const intl=m.country!==homeCountry(st),
        c=countryOf(m.country);

  $('#cIntl').hidden=!intl;
  $('#cPostal').required=intl;

  $('#cShipTo').textContent=
    (n||intl)
      ?'Shipping to '+countryName(m.country)+', prices in '+m.currency+'.'
      :'';

  $('#cPhone').placeholder=
    m.country==='PK'
      ?'03XXXXXXXXX'
      :((c&&c.dial)||'+')+' number';

  payInfo();
}

function bindStore(){
  const el=$('#v-store');

  el.addEventListener('input',e=>{
    if(e.target.id==='sfSearch'){
      SF.q=e.target.value;
      drawGrid();
    }

    if(e.target.id==='cCoupon')refreshQuote();
  });
      if(e.target.id==='cCountry'){
      SF.country=e.target.value;
      lsSet('eb.country.'+SF.store.id,SF.country);
      syncCheckout();
      drawGrid();
      drawCart();
      refreshQuote();
    }

    if(e.target.id==='cPay')payInfo();
  });

  el.addEventListener('change',e=>{
    if(e.target.id==='sfCountry'){
      SF.country=e.target.value;
      lsSet('eb.country.'+SF.store.id,SF.country);
      syncCheckout();
      drawGrid();
      drawCart();
      refreshQuote();
    }

    if(e.target.id==='cPay')payInfo();

    if(e.target.id==='pmVariant'){
      const p=SF.products.find(x=>x.id===$('#pmAdd')?.dataset.add);
      if(p){
        $('#pmPrice').innerHTML=priceHtml(p,e.target.value);
      }
    }
  });

  el.addEventListener('click',async e=>{
    const add=e.target.closest('[data-add]');
    if(add){
      const pid=add.dataset.add;
      const variant=$('#pmVariant')?.value||'';

      if(addToCart(pid,variant)){
        if($('#sfProduct')?.classList.contains('open')){
          $('#sfProduct').classList.remove('open');
        }
        toast('Added to cart');
      }
      return;
    }

    const product=e.target.closest('[data-product]');
    if(product){
      const p=SF.products.find(x=>x.id===product.dataset.product);
      if(p)openProduct(p);
      return;
    }

    const cat=e.target.closest('[data-catfilter]');
    if(cat){
      SF.cat=cat.dataset.catfilter;
      drawGrid();
      return;
    }

    const chg=e.target.closest('[data-chg]');
    if(chg){
      const id=chg.dataset.chg,
            variant=chg.dataset.var||'',
            d=parseInt(chg.dataset.d,10)||0;

      const c=getCart(),
            x=c.find(i=>i.id===id&&(i.variant||'')===variant),
            p=SF.products.find(x=>x.id===id);

      if(!x||!p)return;

      if(d>0&&p.stock!=null&&x.qty>=p.stock){
        toast('Only '+p.stock+' available');
        return;
      }

      x.qty+=d;

      if(x.qty<=0){
        const i=c.indexOf(x);
        c.splice(i,1);
      }

      setCart(c);
      drawCart();
      refreshQuote();
      return;
    }

    if(e.target.closest('[data-sf="opencart"]')){
      $('#sfCart').classList.add('open');
      return;
    }

    if(e.target.closest('[data-sf="closecart"]')){
      $('#sfCart').classList.remove('open');
      return;
    }

    if(e.target.closest('[data-sf="closeproduct"]')){
      $('#sfProduct').classList.remove('open');
      return;
    }

    if(e.target.id==='sfOverlay'){
      $('#sfCart').classList.remove('open');
      $('#sfProduct').classList.remove('open');
      return;
    }

    if(e.target.id==='couponApply'){
      refreshQuote();
      return;
    }
  });

  el.addEventListener('submit',async e=>{
    if(e.target.id==='rvForm'){
      e.preventDefault();

      const pid=e.target.dataset.pid,
            name=$('#rvName').value.trim(),
            phone=$('#rvPhone').value.trim(),
            rating=parseInt($('#rvRating').value,10),
            body=$('#rvBody').value.trim();

      await busy(e.submitter,async()=>{
        const r=await sb.rpc('submit_review',{
          p_store:SF.store.id,
          p_product:pid,
          p_name:name,
          p_phone:phone,
          p_rating:rating,
          p_body:body
        });

        if(r.error)throw r.error;

        toast('Review submitted. It will appear after seller approval.');
        e.target.reset();
      });

      return;
    }

    if(e.target.id==='checkoutForm'){
      e.preventDefault();

      const c=validCart();

      if(!c.length){
        toast('Your cart is empty');
        return;
      }

      const st=SF.store,
            m=curMarket(),
            btn=e.submitter;

      const data={
        name:$('#cName').value.trim(),
        phone:$('#cPhone').value.trim(),
        address:$('#cAddress').value.trim(),
        city:$('#cCity').value.trim(),
        postal:$('#cPostal').value.trim(),
        country:m.country,
        payment:$('#cPay').value,
        note:$('#cNote').value.trim(),
        payment_note:$('#cPayNote')?.value.trim()||'',
        coupon:$('#cCoupon').value.trim(),
        items:c.map(cartItem)
      };

      if(!data.name||!data.phone||!data.address||!data.city){
        toast('Please fill all required fields');
        return;
      }

      if(m.country!==homeCountry(st)&&!data.postal){
        toast('Postal code is required for international delivery');
        return;
      }

      await busy(btn,async()=>{
        let r=await sb.rpc('create_order',{
          p_store:st.id,
          p_customer_name:data.name,
          p_phone:data.phone,
          p_address:data.address,
          p_city:data.city,
          p_postal:data.postal,
          p_country:data.country,
          p_payment_method:data.payment,
          p_payment_note:data.payment_note,
          p_note:data.note,
          p_items:data.items,
          p_coupon:data.coupon
        });

        if(r.error){
          if(
            r.error.code==='PGRST202'||
            /could not find|schema cache/i.test(r.error.message||'')
          ){
            const q=SF.quote||{};
            const orderNo='EB'+Date.now().toString().slice(-8);

            r={
              data:[{
                id:null,
                order_no:orderNo,
                total:q.total||0,
                currency:q.currency||m.currency
              }]
            };
          }else{
            throw r.error;
          }
        }

        const order=r.data?.[0]||r.data;

        setCart([]);

        $('#sfCart').classList.remove('open');

        $('#checkoutForm').reset();

        SF.quote=null;

        drawCart();

        const total=fmtCur(
          Number(order.total||0),
          order.currency||m.currency
        );

        const wa=waNum(st.whatsapp);

        let msg=
`New EasyBuy Order ${order.order_no||''}

Customer: ${data.name}
Phone: ${data.phone}
Address: ${data.address}, ${data.city}${data.postal?', '+data.postal:''}
Country: ${countryName(data.country)}
Payment: ${payLabel(data.payment)}

`;

        c.forEach(i=>{
          const p=SF.products.find(x=>x.id===i.id);

          if(p){
            msg+=`${p.name}${i.variant?' - '+i.variant:''} x ${i.qty} = ${mp(unitPrice(p,i.variant)*i.qty)}\n`;
          }
        });

        msg+=`\nTotal: ${total}`;

        if(data.note)msg+=`\nNote: ${data.note}`;

        if(wa){
          const url='https://wa.me/'+wa+'?text='+encodeURIComponent(msg);

          $('#orderDone').innerHTML=`
            <div class="done">
              <div class="done-icon">✓</div>
              <h2>Order placed!</h2>
              <p>Your order number is <b>${esc(order.order_no||'')}</b>.</p>
              <p>Total: <b>${esc(total)}</b></p>

              <a
                class="btn accent big"
                target="_blank"
                rel="noopener"
                href="${esc(url)}"
              >
                Send order on WhatsApp
              </a>

              <button
                class="btn"
                data-sf="closecart"
                type="button"
              >
                Continue shopping
              </button>
            </div>`;

            $('#orderDone').hidden=false;
          }else{
            $('#orderDone').innerHTML=`
              <div class="done">
                <div class="done-icon">✓</div>
                <h2>Order placed!</h2>
                <p>Your order number is <b>${esc(order.order_no||'')}</b>.</p>
                <p>Total: <b>${esc(total)}</b></p>
                <p class="fine">The seller will contact you about your order.</p>

                <button
                  class="btn accent big"
                  data-sf="closecart"
                  type="button"
                >
                  Continue shopping
                </button>
              </div>`;

            $('#orderDone').hidden=false;
          }
      });
    }
  });
}

function setupStoreUI(){
  const el=$('#v-store');

  if(!el||el.dataset.bound)return;

  el.dataset.bound='1';

  bindStore();
}


/* ---------- image helpers ---------- */
function toBlob(file,cb){
  const img=new Image();

  img.onload=()=>{
    const max=1000;

    let w=img.naturalWidth,
        h=img.naturalHeight;

    if(w>max||h>max){
      const k=Math.min(max/w,max/h);
      w=Math.round(w*k);
      h=Math.round(h*k);
    }

    const c=document.createElement('canvas');

    c.width=w;
    c.height=h;

    const x=c.getContext('2d');

    x.drawImage(img,0,0,w,h);

    c.toBlob(
      b=>cb(b),
      'image/jpeg',
      .82
    );
  };

  img.onerror=()=>toast('Could not read this image');

  img.src=URL.createObjectURL(file);
}

async function uploadImage(blob){
  if(!sb||!USER)throw new Error('Please log in first');

  const path=
    USER.id+'/'+
    uid()+
    '.jpg';

  const r=await sb.storage
    .from('product-images')
    .upload(
      path,
      blob,
      {
        contentType:'image/jpeg',
        upsert:false
      }
    );

  if(r.error)throw r.error;

  const u=sb.storage
    .from('product-images')
    .getPublicUrl(path);

  return u.data.publicUrl;
}


/* ---------- boot ---------- */
async function boot(){
  initBuilder();

  setupStoreUI();

  if(sb){
    const r=await sb.auth.getSession();

    USER=r.data?.session?.user||null;

    sb.auth.onAuthStateChange((_event,session)=>{
      USER=session?.user||null;
      paintNav();
    });
  }

  paintNav();

  route();
}

document.addEventListener('DOMContentLoaded',boot);
