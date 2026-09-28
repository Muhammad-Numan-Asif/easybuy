/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-PK');
const uid=()=>Math.random().toString(36).slice(2,8);
const CATS={Pets:'🐾',Fashion:'👗',Electronics:'🎧',Home:'🏠',Beauty:'💄',Other:'🛍️'};
const COLORS=['#0a7d55','#1f6f9f','#d8452e','#7a4dd8','#c98a00','#c2185b','#26332e'];
const STATUSES=['New','Confirmed','Shipped','Delivered','Cancelled'];

const slugify=s=>{
  let b=(s||'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,24)
    .replace(/-+$/,'');
  if(b.length<3)b=(b+'-shop').replace(/^-/,'');
  return b;
};

const slugPreview=s=>
  (s||'').toLowerCase()
  .replace(/[^a-z0-9]+/g,'')
  .slice(0,24)||'yourstore';

function ink(hex){
  const n=parseInt(hex.slice(1),16);
  const r=n>>16;
  const g=(n>>8)&255;
  const b=n&255;
  return (0.299*r+0.587*g+0.114*b)>165
    ?'#10231d'
    :'#ffffff';
}

function waNum(p){
  let d=String(p||'').replace(/\D/g,'');
  if(d.startsWith('0'))d='92'+d.slice(1);
  return d;
}

let toastT;

function toast(m){
  const t=$('#toast');
  if(!t)return;
  t.textContent=m;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),3200);
}

const ok=r=>{
  if(r.error)throw r.error;
  return r.data;
};

async function busy(btn,fn){
  if(btn)btn.disabled=true;
  try{
    return await fn();
  }catch(e){
    console.error(e);
    toast(e.message||'Something went wrong');
  }finally{
    if(btn)btn.disabled=false;
  }
}

const lsGet=k=>{
  try{
    return localStorage.getItem(k);
  }catch(e){
    return null;
  }
};

const lsSet=(k,v)=>{
  try{
    localStorage.setItem(k,v);
  }catch(e){}
};

const lsDel=k=>{
  try{
    localStorage.removeItem(k);
  }catch(e){}
};


/* ---------- supabase ---------- */
const CFG=window.EASYBUY_CONFIG||{};

const configured=!!(
  CFG.SUPABASE_URL &&
  CFG.SUPABASE_ANON_KEY &&
  !/^PASTE/.test(CFG.SUPABASE_URL) &&
  window.supabase
);

const sb=configured
  ?window.supabase.createClient(
      CFG.SUPABASE_URL,
      CFG.SUPABASE_ANON_KEY
    )
  :null;

let USER=null;


/* ---------- router ---------- */

function navigate(hash){
  const next=hash||'#/';

  if(location.hash===next){
    route();
    return;
  }

  location.hash=next;
}

function route(){

  const hash=(location.hash||'#/').replace(/^#?/,'#');

  const parts=hash.split('/');

  const section=parts[1]||'';

  let v=
    section==='dashboard'
      ?'dashboard'
      :section==='s'
      ?'store'
      :section==='login'
      ?'login'
      :section==='track'
      ?'track'
      :'home';

  if(v==='dashboard'&&!USER){

    AUTH.note='Log in to open your seller dashboard.';

    if(hash!=='#/login'){
      navigate('#/login');
      return;
    }

    v='login';
    AUTH.mode='login';
  }

  $$('[data-view]').forEach(el=>{
    el.hidden=el.id!==`v-${v}`;
  });

  const header=$('#siteHeader');
  const footer=$('#siteFooter');

  if(header)header.hidden=v==='store';
  if(footer)footer.hidden=v==='store';

  $$('.nav-links a[data-nav]').forEach(a=>{
    a.classList.toggle('on',a.dataset.nav===v);
  });

  if(v==='home'){
    renderHome();
  }else if(v==='login'){
    renderLogin();
  }else if(v==='dashboard'&&USER){
    loadDash();
  }else if(v==='store'){
    renderStore(parts[2]);
  }else if(v==='track'){
    renderTrack();
  }

  window.scrollTo({
    top:0,
    left:0,
    behavior:'auto'
  });
}

window.addEventListener('hashchange',route);

function paintNav(){

  const b=$('#navAuth');

  if(b){
    b.textContent=USER?'Log out':'Log in';

    b.setAttribute(
      'aria-label',
      USER
        ?'Log out of EasyBuy'
        :'Log in to EasyBuy'
    );
  }

  $$('.nav-links a[data-nav]').forEach(a=>{
    a.setAttribute(
      'aria-current',
      a.classList.contains('on')
        ?'page'
        :'false'
    );
  });
}


/* ---------- auth ---------- */

const AUTH={
  mode:'signup',
  note:''
};

function renderLogin(){

  const su=AUTH.mode==='signup';
  const pend=readPending();

  $('#v-login').innerHTML=`
    <div class="wrap auth">
      <form class="builder" id="authForm">

        <h2>
          ${su?'Create your seller account':'Log in'}
        </h2>

        <p class="fine" style="margin:0 0 16px">
          ${esc(
            pend
              ?'Aap ka store "'+pend.name+'" account banate hi ban jayega.'
              :AUTH.note||'Email aur password se account banta hai.'
          )}
        </p>

        <label>
          Email
          <input
            id="aEmail"
            type="email"
            autocomplete="email"
            required
          >
        </label>

        <label>
          Password (6+ characters)
          <input
            id="aPass"
            type="password"
            minlength="6"
            autocomplete="${su?'new-password':'current-password'}"
            required
          >
        </label>

        <button
          class="btn primary big"
          type="submit"
        >
          ${su?'Create account':'Log in'}
        </button>

        <p class="fine">
          <button
            class="linkbtn"
            type="button"
            data-auth="toggle"
          >
            ${
              su
                ?'Already have an account? Log in'
                :'New here? Create an account'
            }
          </button>
        </p>

        <p
          class="fine"
          id="aMsg"
          role="alert"
        ></p>

      </form>
    </div>
  `;
}

function readPending(){
  try{
    return JSON.parse(
      lsGet('eb.pending')||'null'
    );
  }catch(e){
    return null;
  }
}

async function afterAuth(){

  AUTH.note='';

  const pend=readPending();

  if(pend){

    lsDel('eb.pending');

    try{

      const st=await createStore(pend);

      MY.active=st.id;

      toast(
        'Store ban gaya. Ab pehla product add karo.'
      );

      D.tab='products';

    }catch(e){

      toast(e.message);
    }
  }

  navigate('#/dashboard');
}

async function createStore(d){

  let base=slugify(d.name);

  for(let i=0;i<5;i++){

    const slug=
      i===0
        ?base
        :(base.slice(0,24)+'-'+uid().slice(0,3));

    const r=await sb
      .from('stores')
      .insert({
        slug,
        name:d.name,
        category:d.cat,
        color:d.color,
        whatsapp:d.wa||'',
        tagline:
          'Welcome to '+d.name+
          '. Order online and pay in cash when it arrives.'
      })
      .select()
      .single();

    if(!r.error)return r.data;

    if(r.error.code!=='23505'){
      throw r.error;
    }
  }

  throw new Error(
    'Could not find a free store link. Try a different name.'
  );
}


document.addEventListener('submit',async e=>{

  if(e.target.id!=='authForm')return;

  e.preventDefault();

  if(!sb){
    toast(
      'Add your Supabase keys in config.js first'
    );
    return;
  }

  const email=$('#aEmail').value.trim();
  const password=$('#aPass').value;
  const msg=$('#aMsg');

  msg.textContent='';

  await busy(
    e.target.querySelector(
      'button[type=submit]'
    ),
    async()=>{

      if(AUTH.mode==='signup'){

        const r=await sb.auth.signUp({
          email,
          password
        });

        if(r.error){
          msg.textContent=r.error.message;
          return;
        }

        if(r.data.session){

          USER=r.data.session.user;

          paintNav();

          await afterAuth();

        }else{

          msg.textContent=
            'Account ban gaya. Email mein confirmation link aaya hoga, usay kholo aur phir Log in karo.';
        }

      }else{

        const r=
          await sb.auth.signInWithPassword({
            email,
            password
          });

        if(r.error){
          msg.textContent=r.error.message;
          return;
        }

        USER=r.data.user;

        paintNav();

        await afterAuth();
      }
    }
  );
});


document.addEventListener('click',async e=>{

  const t=e.target.closest('[data-auth]');

  if(
    t &&
    t.dataset.auth==='toggle'
  ){
    AUTH.mode=
      AUTH.mode==='signup'
        ?'login'
        :'signup';

    renderLogin();
  }

  const authBtn=e.target.closest('#navAuth');

  if(authBtn){

    if(USER){

      await sb.auth.signOut();

      USER=null;

      paintNav();

      toast('Logged out');

      navigate('#/');

    }else{

      AUTH.mode='login';

      navigate('#/login');
    }
  }
});


/* ---------- home ---------- */

const B={
  cat:'Pets',
  color:COLORS[0]
};

function initBuilder(){

  $('#bCats').innerHTML=
    Object.keys(CATS)
      .map(c=>`
        <button
          type="button"
          class="chip"
          data-cat="${c}"
          aria-pressed="${c===B.cat}"
        >
          ${CATS[c]} ${c}
        </button>
      `)
      .join('');

  $('#bColors').innerHTML=
    COLORS
      .map(c=>`
        <button
          type="button"
          class="sw"
          data-color="${c}"
          style="background:${c}"
          aria-label="Colour ${c}"
          aria-pressed="${c===B.color}"
        ></button>
      `)
      .join('');

  $('#bCats').addEventListener(
    'click',
    e=>{
      const b=e.target.closest('[data-cat]');

      if(!b)return;

      B.cat=b.dataset.cat;

      $$('#bCats .chip').forEach(x=>{
        x.setAttribute(
          'aria-pressed',
          x===b
        );
      });

      preview();
    }
  );

  $('#bColors').addEventListener(
    'click',
    e=>{
      const b=e.target.closest('[data-color]');

      if(!b)return;

      B.color=b.dataset.color;

      $$('#bColors .sw').forEach(x=>{
        x.setAttribute(
          'aria-pressed',
          x===b
        );
      });

      preview();
    }
  );

  $('#bName').addEventListener(
    'input',
    preview
  );

  $('#builder').addEventListener(
    'submit',
    async e=>{

      e.preventDefault();

      const name=$('#bName').value.trim();

      if(!name){

        toast(
          'Pehle store ka naam likho'
        );

        $('#bName').focus();

        return;
      }

      const draft={
        name,
        cat:B.cat,
        color:B.color,
        wa:$('#bWa').value.trim()
      };

      if(!sb){

        toast(
          'Add your Supabase keys in config.js first'
        );

        return;
      }

      if(!USER){

        lsSet(
          'eb.pending',
          JSON.stringify(draft)
        );

        AUTH.mode='signup';

        navigate('#/login');

        return;
      }

      await busy(
        e.submitter,
        async()=>{

          const st=
            await createStore(draft);

          MY.active=st.id;

          D.tab='products';

          toast(
            'Store ban gaya. Ab pehla product add karo.'
          );

          navigate('#/dashboard');
        }
      );
    }
  );

  $('#navCreate').addEventListener(
    'click',
    e=>{

      if(
        (location.hash||'#/')==='#/' ||
        location.hash===''
      ){

        e.preventDefault();

        $('#builderTop').scrollIntoView({
          behavior:'smooth',
          block:'start'
        });

        $('#bName').focus({
          preventScroll:true
        });
      }
    }
  );

  preview();
}

function preview(){

  const name=
    $('#bName').value.trim()||
    'Your store';

  const f=$('#frame');

  f.style.setProperty(
    '--accent',
    B.color
  );

  f.style.setProperty(
    '--on-accent',
    ink(B.color)
  );

  $('#pvName').textContent=name;

  $('#pvBand').textContent=name;

  $('#pvUrl').textContent=
    slugPreview(
      $('#bName').value
    )+'.easybuy.pk';

  const e=CATS[B.cat];

  const prices=[
    '1,499',
    '2,999',
    '799'
  ];

  $('#pvGrid').innerHTML=
    prices
      .map(p=>`
        <div class="pv-tile">

          <div class="pv-pic">
            ${e}
          </div>

          <div class="pv-txt">
            <s></s>
            <s></s>
            <strong>
              Rs. ${p}
            </strong>
          </div>

        </div>
      `)
      .join('');
}

async function renderHome(){

  const box=$('#storeList');

  if(!sb){

    box.innerHTML=
      '<p class="sub">Supabase keys add karne ke baad yahan live stores dikhenge.</p>';

    return;
  }

  try{

    const list=ok(
      await sb
        .from('stores')
        .select(
          'slug,name,category,color'
        )
        .order(
          'created_at',
          {ascending:false}
        )
        .limit(12)
    );

    box.innerHTML=
      list.length
        ?list.map(s=>`
          <div class="store-row">

            <div
              class="store-dot"
              style="background:${esc(s.color)};color:${ink(s.color)}"
            >
              ${CATS[s.category]||'🛍️'}
            </div>

            <div>
              <b>${esc(s.name)}</b>
              <small>${esc(s.category)}</small>
            </div>

            <a
              class="btn small"
              href="#/s/${esc(s.slug)}"
            >
              Visit store
            </a>

          </div>
        `).join('')
        :'<p class="sub">Abhi koi store nahi bana. Pehla store aap ka ho sakta hai.</p>';

  }catch(e){

    box.innerHTML=
      '<p class="sub">Stores load nahi ho sake: '+
      esc(e.message)+
      '</p>';
  }
}


/* ---------- dashboard ---------- */

const MY={
  stores:[],
  active:null,
  products:[],
  orders:[]
};

const D={
  tab:'overview',
  loading:false
};

function curS(){
  return MY.stores.find(
    s=>s.id===MY.active
  )||MY.stores[0]||null;
}
/* ---------- dashboard data ---------- */

async function loadDash(){

  if(!sb || !USER){
    renderLogin();
    return;
  }

  D.loading=true;

  try{

    MY.stores=ok(
      await sb
        .from('stores')
        .select('*')
        .eq('owner_id',USER.id)
        .order('created_at',{ascending:false})
    );

    if(!MY.stores.length){

      MY.active=null;
      renderDash();

      D.loading=false;
      return;
    }

    if(
      !MY.active ||
      !MY.stores.some(s=>s.id===MY.active)
    ){
      MY.active=MY.stores[0].id;
    }

    await loadStoreData();

    renderDash();

  }catch(e){

    console.error(e);

    toast(
      e.message||'Dashboard load failed'
    );

  }finally{

    D.loading=false;
  }
}


async function loadStoreData(){

  const st=curS();

  if(!st)return;

  MY.products=ok(
    await sb
      .from('products')
      .select('*')
      .eq('store_id',st.id)
      .order('created_at',{ascending:false})
  );

  MY.orders=ok(
    await sb
      .from('orders')
      .select('*')
      .eq('store_id',st.id)
      .order('created_at',{ascending:false})
  );
}


function renderDash(){

  const el=$('#v-dashboard');

  if(!el)return;

  const st=curS();

  if(!st){

    el.innerHTML=`
      <div class="wrap empty">
        <h2>Create your first store</h2>
        <p>
          Start selling online with EasyBuy.
        </p>
        <a
          class="btn primary"
          href="#/"
        >
          Create store
        </a>
      </div>
    `;

    return;
  }

  const tabs=[
    ['overview','Overview'],
    ['products','Products'],
    ['orders','Orders'],
    ['settings','Settings']
  ];

  el.innerHTML=`
    <div class="dash-shell">

      <aside class="dash-side">

        <div class="dash-brand">
          <span
            class="dash-logo"
            style="
              background:${esc(st.color||'#008060')};
              color:${ink(st.color||'#008060')}
            "
          >
            ${CATS[st.category]||'🛍️'}
          </span>

          <div>
            <strong>${esc(st.name)}</strong>
            <small>Seller dashboard</small>
          </div>
        </div>

        <nav class="dash-nav">
          ${tabs.map(t=>`
            <button
              type="button"
              class="${D.tab===t[0]?'on':''}"
              data-dtab="${t[0]}"
            >
              ${t[1]}
            </button>
          `).join('')}
        </nav>

        <a
          class="dash-store-link"
          href="#/s/${esc(st.slug)}"
          target="_blank"
          rel="noopener"
        >
          View store ↗
        </a>

      </aside>

      <main class="dash-main">

        <div class="dash-top">

          <div>
            <p class="eyebrow">SELLER DASHBOARD</p>
            <h1>${esc(st.name)}</h1>
            <p class="sub">
              Manage products, orders and your online store.
            </p>
          </div>

          <div class="dash-actions">

            <button
              class="btn"
              type="button"
              data-dash="refresh"
            >
              Refresh
            </button>

            <a
              class="btn primary"
              href="#/s/${esc(st.slug)}"
              target="_blank"
              rel="noopener"
            >
              View store
            </a>

          </div>

        </div>

        <div id="dashContent"></div>

      </main>

    </div>
  `;

  drawDashContent();
}


function drawDashContent(){

  const box=$('#dashContent');

  if(!box)return;

  if(D.tab==='overview'){
    drawOverview(box);
  }else if(D.tab==='products'){
    drawProducts(box);
  }else if(D.tab==='orders'){
    drawOrders(box);
  }else if(D.tab==='settings'){
    drawSettings(box);
  }
}


/* ---------- overview ---------- */

function drawOverview(box){

  const st=curS();

  const totalOrders=MY.orders.length;

  const revenue=MY.orders
    .filter(o=>o.status!=='Cancelled')
    .reduce(
      (sum,o)=>sum+Number(
        o.total||o.amount||0
      ),
      0
    );

  const pending=MY.orders.filter(
    o=>!['Delivered','Cancelled'].includes(
      o.status
    )
  ).length;

  const low=MY.products.filter(
    p=>lowStock(p)
  ).length;

  box.innerHTML=`

    <div class="stats">

      <div class="stat">
        <span>Orders</span>
        <strong>${totalOrders}</strong>
        <small>Total orders</small>
      </div>

      <div class="stat">
        <span>Revenue</span>
        <strong>${money(revenue)}</strong>
        <small>Non-cancelled orders</small>
      </div>

      <div class="stat">
        <span>Pending</span>
        <strong>${pending}</strong>
        <small>Orders needing action</small>
      </div>

      <div class="stat">
        <span>Products</span>
        <strong>${MY.products.length}</strong>
        <small>${low} low-stock</small>
      </div>

    </div>

    <section class="dash-card">

      <div class="section-head">

        <div>
          <h2>Recent orders</h2>
          <p class="fine">
            Your latest customer orders.
          </p>
        </div>

        <button
          class="btn small"
          type="button"
          data-dtab="orders"
        >
          View all
        </button>

      </div>

      ${
        MY.orders.length
        ?`
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

                ${MY.orders.slice(0,6).map(o=>`

                  <tr>

                    <td>
                      <strong>
                        ${esc(
                          o.customer_name||
                          o.name||
                          'Customer'
                        )}
                      </strong>
                    </td>

                    <td>
                      ${money(
                        o.total||
                        o.amount||
                        0
                      )}
                    </td>

                    <td>
                      <span class="status">
                        ${esc(
                          o.status||'New'
                        )}
                      </span>
                    </td>

                    <td>
                      ${formatDate(
                        o.created_at
                      )}
                    </td>

                  </tr>

                `).join('')}

              </tbody>
            </table>
          </div>
        `
        :`
          <div class="empty small-empty">
            <h3>No orders yet</h3>
            <p>
              Orders will appear here when customers buy from your store.
            </p>
          </div>
        `
      }

    </section>

    <section class="dash-card">

      <div class="section-head">

        <div>
          <h2>Store link</h2>
          <p class="fine">
            Share this link with your customers.
          </p>
        </div>

        <button
          class="btn small"
          type="button"
          data-dash="copy"
          data-copy="${location.origin}${location.pathname}#/s/${esc(st.slug)}"
        >
          Copy link
        </button>

      </div>

      <div class="store-url">
        ${esc(
          location.origin+
          location.pathname+
          '#/s/'+
          st.slug
        )}
      </div>

    </section>
  `;
}


function formatDate(v){

  if(!v)return '—';

  try{

    return new Date(v).toLocaleDateString(
      'en-PK',
      {
        day:'2-digit',
        month:'short',
        year:'numeric'
      }
    );

  }catch(e){

    return '—';
  }
}


/* ---------- products ---------- */

function drawProducts(box){

  box.innerHTML=`

    <section class="dash-card">

      <div class="section-head">

        <div>
          <h2>Products</h2>
          <p class="fine">
            Add and manage the products customers can buy.
          </p>
        </div>

        <button
          class="btn primary"
          type="button"
          data-product-form="new"
        >
          + Add product
        </button>

      </div>

      <div class="product-admin-list">

        ${
          MY.products.length
          ?MY.products.map(p=>`

            <article class="admin-product">

              <div class="admin-product-img">

                ${
                  p.image_url
                  ?`
                    <img
                      src="${esc(p.image_url)}"
                      alt="${esc(p.name)}"
                      loading="lazy"
                    >
                  `
                  :(CATS[p.category]||'🛍️')
                }

              </div>

              <div class="admin-product-info">

                <h3>
                  ${esc(p.name)}
                </h3>

                <p class="fine">
                  ${esc(p.category||'Uncategorized')}
                </p>

                <strong>
                  ${money(p.price)}
                </strong>

                ${
                  p.stock!=null
                  ?`
                    <small>
                      Stock: ${p.stock}
                    </small>
                  `
                  :''
                }

              </div>

              <div class="admin-product-actions">

                <span class="status">
                  ${
                    p.is_active
                    ?'Active'
                    :'Hidden'
                  }
                </span>

                <button
                  class="btn small"
                  type="button"
                  data-product-form="${p.id}"
                >
                  Edit
                </button>

                <button
                  class="btn small danger"
                  type="button"
                  data-product-delete="${p.id}"
                >
                  Delete
                </button>

              </div>

            </article>

          `).join('')
          :`
            <div class="empty small-empty">

              <h3>No products yet</h3>

              <p>
                Add your first product to start selling.
              </p>

              <button
                class="btn primary"
                type="button"
                data-product-form="new"
              >
                Add first product
              </button>

            </div>
          `
        }

      </div>

    </section>

    ${
      D.form
      ?productForm()
      :''
    }

  `;
}


function productForm(){

  const p=D.form||{};

  return `

    <section class="dash-card product-editor">

      <div class="section-head">

        <div>
          <h2>
            ${p.id?'Edit product':'Add product'}
          </h2>

          <p class="fine">
            Keep product information clear and accurate.
          </p>
        </div>

        <button
          class="btn small"
          type="button"
          data-product-cancel
        >
          Cancel
        </button>

      </div>

      <form id="pForm">

        <div class="form-grid">

          <label>
            Product name
            <input
              id="pName"
              required
              maxlength="120"
              value="${esc(p.name||'')}"
              placeholder="e.g. Premium Pet Bowl"
            >
          </label>

          <label>
            Price
            <input
              id="pPrice"
              type="number"
              min="0"
              step="1"
              required
              value="${p.price||''}"
              placeholder="1499"
            >
          </label>

          <label>
            Compare-at price
            <input
              id="pOld"
              type="number"
              min="0"
              step="1"
              value="${p.old_price||''}"
              placeholder="1999"
            >
          </label>

          <label>
            Category
            <input
              id="pCat"
              maxlength="60"
              value="${esc(p.category||'')}"
              placeholder="Pets"
            >
          </label>

          <label>
            SKU
            <input
              id="pSku"
              maxlength="60"
              value="${esc(p.sku||'')}"
              placeholder="PET-001"
            >
          </label>

          <label>
            Stock
            <input
              id="pStock"
              type="number"
              min="0"
              step="1"
              value="${
                p.stock==null
                  ?''
                  :p.stock
              }"
              placeholder="Leave empty for unlimited"
            >
          </label>

        </div>

        <label>
          Description
          <textarea
            id="pDesc"
            maxlength="2000"
            placeholder="Describe the product..."
          >${esc(p.description||'')}</textarea>
        </label>

        <label>
          Product image URL
          <input
            id="pImage"
            type="url"
            value="${esc(p.image_url||'')}"
            placeholder="https://..."
          >
        </label>

        <label>
          Variants
          <textarea
            id="pVariants"
            placeholder="Color | Blue | 1499
Color | Black | 1599"
          >${
            Array.isArray(p.variants)
            ?p.variants.map(v=>[
              v.name||'',
              v.option||'',
              v.price||''
            ].join(' | ')).join('\n')
            :''
          }</textarea>

          <small class="fine">
            One variant per line:
            Name | Option | Price
          </small>

        </label>

        <label>
          Product status
          <select id="pActive">

            <option
              value="true"
              ${p.is_active!==false?'selected':''}
            >
              Active
            </option>

            <option
              value="false"
              ${p.is_active===false?'selected':''}
            >
              Hidden
            </option>

          </select>
        </label>

        <div class="form-actions">

          <button
            class="btn"
            type="button"
            data-product-cancel
          >
            Cancel
          </button>

          <button
            class="btn primary"
            type="submit"
          >
            Save product
          </button>

        </div>

      </form>

    </section>
  `;
}


function formatOrderStatus(status){

  return STATUSES.includes(status)
    ?status
    :'New';
}


/* ---------- orders ---------- */

function drawOrders(box){

  box.innerHTML=`

    <section class="dash-card">

      <div class="section-head">

        <div>
          <h2>Orders</h2>

          <p class="fine">
            Manage customer orders and update their status.
          </p>

        </div>

      </div>

      ${
        MY.orders.length
        ?`
          <div class="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>

              </thead>

              <tbody>

                ${MY.orders.map(o=>`

                  <tr>

                    <td>
                      <strong>
                        ${esc(
                          o.customer_name||
                          o.name||
                          'Customer'
                        )}
                      </strong>

                      <small>
                        ${esc(
                          o.city||''
                        )}
                      </small>
                    </td>

                    <td>
                      ${esc(
                        o.phone||
                        o.customer_phone||
                        '—'
                      )}
                    </td>

                    <td>
                      ${money(
                        o.total||
                        o.amount||
                        0
                      )}
                    </td>

                    <td>
                      ${esc(
                        payLabel(
                          o.payment_method||
                          o.payment||
                          'cod'
                        )
                      )}
                    </td>

                    <td>

                      <select
                        class="order-status"
                        data-order-status="${o.id}"
                      >

                        ${STATUSES.map(s=>`

                          <option
                            value="${s}"
                            ${
                              formatOrderStatus(
                                o.status
                              )===s
                              ?'selected'
                              :''
                            }
                          >
                            ${s}
                          </option>

                        `).join('')}

                      </select>

                    </td>

                    <td>
                      ${formatDate(o.created_at)}
                    </td>

                  </tr>

                `).join('')}

              </tbody>

            </table>

          </div>
        `
        :`
          <div class="empty small-empty">

            <h3>No orders yet</h3>

            <p>
              Customer orders will appear here.
            </p>

          </div>
        `
      }

    </section>

  `;
}


/* ---------- settings ---------- */

function drawSettings(box){

  const st=curS();

  box.innerHTML=`

    <section class="dash-card">

      <div class="section-head">

        <div>
          <h2>Store settings</h2>
          <p class="fine">
            Update your storefront information.
          </p>
        </div>

      </div>

      <form id="sForm">

        <div class="form-grid">

          <label>
            Store name
            <input
              id="sName"
              required
              maxlength="100"
              value="${esc(st.name||'')}"
            >
          </label>

          <label>
            WhatsApp number
            <input
              id="sWa"
              inputmode="tel"
              value="${esc(st.whatsapp||'')}"
              placeholder="923001234567"
            >
          </label>

        </div>

        <label>
          Tagline
          <input
            id="sTag"
            maxlength="180"
            value="${esc(st.tagline||'')}"
            placeholder="Quality products delivered to your door."
          >
        </label>

        <label>
          Store description
          <textarea
            id="sDesc"
            maxlength="2000"
          >${esc(st.description||'')}</textarea>
        </label>

        <div>

          <p class="fine">
            Store colour
          </p>

          <div
            class="color-picker"
            id="sColors"
          >

            ${COLORS.map(c=>`

              <button
                type="button"
                class="sw"
                data-scolor="${c}"
                style="background:${c}"
                aria-label="Choose ${c}"
                aria-pressed="${
                  c===(st.color||COLORS[0])
                }"
              ></button>

            `).join('')}

          </div>

        </div>

        <div class="form-actions">

          <button
            class="btn primary"
            type="submit"
          >
            Save settings
          </button>

        </div>

      </form>

    </section>

    <section class="dash-card">

      <div class="section-head">

        <div>
          <h2>Store link</h2>
          <p class="fine">
            Your public EasyBuy store.
          </p>
        </div>

      </div>

      <div class="store-url">
        ${location.origin}${location.pathname}#/s/${esc(st.slug)}
      </div>

    </section>

  `;
}


/* ---------- dashboard state ---------- */

D.form=null;
D.file=null;
D.color=null;


function editProduct(id){

  const p=MY.products.find(
    x=>x.id===id
  );

  if(!p)return;

  D.form={
    ...p,
    variants:Array.isArray(p.variants)
      ?p.variants
      :[]
  };

  D.file=null;

  drawDashContent();

  setTimeout(()=>{
    $('#pName')?.focus();
  },50);
}


function newProduct(){

  D.form={
    id:null,
    name:'',
    price:'',
    old_price:'',
    category:curS()?.category||'',
    description:'',
    image_url:'',
    sku:'',
    stock:null,
    variants:[],
    is_active:true
  };

  D.file=null;

  drawDashContent();

  setTimeout(()=>{
    $('#pName')?.focus();
  },50);
}


/* ---------- dashboard events ---------- */

document.addEventListener(
  'click',
  async e=>{

    const tab=e.target.closest(
      '[data-dtab]'
    );

    if(tab){

      D.tab=tab.dataset.dtab;

      drawDashContent();

      $$('.dash-nav button').forEach(b=>{
        b.classList.toggle(
          'on',
          b.dataset.dtab===D.tab
        );
      });

      return;
    }

    const dashTab=e.target.closest(
      '[data-dtab]'
    );

    if(
      dashTab &&
      $('#v-dashboard')?.hidden===false
    ){

      D.tab=dashTab.dataset.dtab;

      drawDashContent();

      return;
    }

    const pf=e.target.closest(
      '[data-product-form]'
    );

    if(pf){

      if(pf.dataset.productForm==='new'){
        newProduct();
      }else{
        editProduct(
          pf.dataset.productForm
        );
      }

      return;
    }

    if(
      e.target.closest(
        '[data-product-cancel]'
      )
    ){

      D.form=null;

      drawDashContent();

      return;
    }

    const del=e.target.closest(
      '[data-product-delete]'
    );

    if(del){

      const id=
        del.dataset.productDelete;

      const p=
        MY.products.find(
          x=>x.id===id
        );

      if(
        !p ||
        !confirm(
          `Delete "${p.name}"?`
        )
      )return;

      await busy(
        del,
        async()=>{

          ok(
            await sb
              .from('products')
              .delete()
              .eq('id',id)
          );

          await loadStoreData();

          drawDashContent();

          toast(
            'Product deleted'
          );
        }
      );

      return;
    }

    const refresh=e.target.closest(
      '[data-dash="refresh"]'
    );

    if(refresh){

      await busy(
        refresh,
        async()=>{

          await loadDash();

          toast(
            'Dashboard refreshed'
          );
        }
      );

      return;
    }

    const copy=e.target.closest(
      '[data-dash="copy"]'
    );

    if(copy){

      const value=
        copy.dataset.copy||'';

      try{

        await navigator.clipboard.writeText(
          value
        );

        toast(
          'Store link copied'
        );

      }catch(err){

        toast(
          'Could not copy the link'
        );
      }

      return;
    }

    const color=e.target.closest(
      '[data-scolor]'
    );

    if(color){

      D.color=color.dataset.scolor;

      $$('#sColors [data-scolor]').forEach(b=>{
        b.setAttribute(
          'aria-pressed',
          b===color
        );
      });

      return;
    }

    const orderStatus=e.target.closest(
      '[data-order-status]'
    );

    if(orderStatus){

      const id=
        orderStatus.dataset.orderStatus;

      const status=
        orderStatus.value;

      await busy(
        orderStatus,
        async()=>{

          ok(
            await sb
              .from('orders')
              .update({status})
              .eq('id',id)
          );

          const order=
            MY.orders.find(
              x=>x.id===id
            );

          if(order){
            order.status=status;
          }

          toast(
            'Order status updated'
          );
        }
      );

      return;
    }
  }
);


/* ---------- dashboard forms ---------- */

document.addEventListener(
  'submit',
  async e=>{

    if(e.target.id==='pForm'){

      e.preventDefault();

      const st=curS();

      if(!st)return;

      const btn=
        e.submitter||
        e.target.querySelector(
          'button[type=submit]'
        );

      await busy(
        btn,
        async()=>{

          const price=
            Math.max(
              0,
              parseInt(
                $('#pPrice').value,
                10
              )||0
            );

          const image_url=
            $('#pImage').value.trim();

          const variants=
            $('#pVariants').value
              .split('\n')
              .map(
                x=>x.trim()
              )
              .filter(Boolean)
              .map(line=>{

                const a=
                  line
                    .split('|')
                    .map(
                      v=>v.trim()
                    );

                return {
                  name:a[0]||'',
                  option:a[1]||'',
                  price:
                    parseInt(
                      a[2],
                      10
                    )||price
                };
              });

          const row={
            store_id:st.id,
            name:$('#pName').value.trim(),
            price,
            old_price:
              parseInt(
                $('#pOld').value,
                10
              )||0,
            category:
              $('#pCat').value.trim(),
            description:
              $('#pDesc').value.trim(),
            image_url,
            is_active:
              $('#pActive').value==='true',
            sku:
              $('#pSku').value.trim(),
            stock:
              $('#pStock').value.trim()===''
                ?null
                :Math.max(
                  0,
                  parseInt(
                    $('#pStock').value,
                    10
                  )||0
                ),
            variants
          };

          if(!row.name){
            throw new Error(
              'Product name is required.'
            );
          }

          if(
            D.form &&
            D.form.id
          ){

            ok(
              await sb
                .from('products')
                .update(row)
                .eq(
                  'id',
                  D.form.id
                )
            );

          }else{

            ok(
              await sb
                .from('products')
                .insert(row)
            );
          }

          D.form=null;

          await loadStoreData();

          drawDashContent();

          toast(
            'Product saved'
          );
        }
      );

      return;
    }

    if(e.target.id==='sForm'){

      e.preventDefault();

      const st=curS();

      if(!st)return;

      const btn=
        e.submitter||
        e.target.querySelector(
          'button[type=submit]'
        );

      await busy(
        btn,
        async()=>{

          const upd={
            name:
              $('#sName').value.trim()||
              st.name,

            whatsapp:
              $('#sWa').value.trim(),

            tagline:
              $('#sTag').value.trim(),

            description:
              $('#sDesc').value.trim()
          };

          if(D.color){
            upd.color=D.color;
          }

          ok(
            await sb
              .from('stores')
              .update(upd)
              .eq(
                'id',
                st.id
              )
          );

          D.color=null;

          await loadDash();

          toast(
            'Settings saved'
          );
        }
      );

      return;
    }
  }
);


/* ---------- international helpers ---------- */

const COUNTRIES=[

  {
    code:'PK',
    name:'Pakistan',
    cur:'PKR',
    dial:'+92'
  },

  {
    code:'US',
    name:'United States',
    cur:'USD',
    dial:'+1'
  },

  {
    code:'GB',
    name:'United Kingdom',
    cur:'GBP',
    dial:'+44'
  },

  {
    code:'CA',
    name:'Canada',
    cur:'CAD',
    dial:'+1'
  },

  {
    code:'AU',
    name:'Australia',
    cur:'AUD',
    dial:'+61'
  },

  {
    code:'NZ',
    name:'New Zealand',
    cur:'NZD',
    dial:'+64'
  },

  {
    code:'AE',
    name:'United Arab Emirates',
    cur:'AED',
    dial:'+971'
  },

  {
    code:'SA',
    name:'Saudi Arabia',
    cur:'SAR',
    dial:'+966'
  },

  {
    code:'QA',
    name:'Qatar',
    cur:'QAR',
    dial:'+974'
  },

  {
    code:'KW',
    name:'Kuwait',
    cur:'KWD',
    dial:'+965'
  },

  {
    code:'OM',
    name:'Oman',
    cur:'OMR',
    dial:'+968'
  },

  {
    code:'BH',
    name:'Bahrain',
    cur:'BHD',
    dial:'+973'
  },

  {
    code:'DE',
    name:'Germany',
    cur:'EUR',
    dial:'+49'
  },

  {
    code:'FR',
    name:'France',
    cur:'EUR',
    dial:'+33'
  },

  {
    code:'IT',
    name:'Italy',
    cur:'EUR',
    dial:'+39'
  },

  {
    code:'ES',
    name:'Spain',
    cur:'EUR',
    dial:'+34'
  },

  {
    code:'NL',
    name:'Netherlands',
    cur:'EUR',
    dial:'+31'
  },

  {
    code:'IE',
    name:'Ireland',
    cur:'EUR',
    dial:'+353'
  },

  {
    code:'TR',
    name:'Turkey',
    cur:'TRY',
    dial:'+90'
  },

  {
    code:'MY',
    name:'Malaysia',
    cur:'MYR',
    dial:'+60'
  },

  {
    code:'SG',
    name:'Singapore',
    cur:'SGD',
    dial:'+65'
  }

];


const countryOf=c=>
  COUNTRIES.find(
    x=>x.code===c
  );


const countryName=c=>
  (
    countryOf(c)||
    {name:c}
  ).name;


function decOf(c){

  c=(c||'').toUpperCase();

  if(
    [
      'PKR',
      'JPY',
      'KRW',
      'VND',
      'CLP',
      'ISK',
      'UGX'
    ].includes(c)
  ){
    return 0;
  }

  if(
    [
      'KWD',
      'BHD',
      'OMR',
      'JOD',
      'TND'
    ].includes(c)
  ){
    return 3;
  }

  return 2;
}


function fmtCur(n,cur){

  cur=(cur||'PKR').toUpperCase();

  if(cur==='PKR'){
    return money(n);
  }

  const d=decOf(cur);

  try{

    return new Intl.NumberFormat(
      'en',
      {
        style:'currency',
        currency:cur,
        currencyDisplay:'code',
        minimumFractionDigits:d,
        maximumFractionDigits:d
      }
    )
    .format(n)
    .replace(/\u00a0/g,' ');

  }catch(e){

    return cur+
      ' '+
      Number(n).toFixed(d);
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


const cartKey=()=>
  'eb.cart.'+
  SF.store.id;


function getCart(){

  try{

    const c=
      JSON.parse(
        lsGet(cartKey())||
        '[]'
      );

    return Array.isArray(c)
      ?c
      :[];

  }catch(e){

    return [];
  }
}


function setCart(c){

  lsSet(
    cartKey(),
    JSON.stringify(c)
  );
}


const PAY={
  cod:'Cash on Delivery',
  bank:'Bank transfer',
  easypaisa:'Easypaisa',
  jazzcash:'JazzCash'
};


const payLabel=m=>
  PAY[m]||m;


const varLabel=v=>
  [
    v&&v.name,
    v&&v.option
  ]
  .map(
    x=>String(x||'').trim()
  )
  .filter(Boolean)
  .join(' / ');


const isSold=p=>
  p.stock!=null&&
  p.stock<=0;


const lowStock=p=>
  p.stock!=null&&
  p.stock>0&&
  p.stock<=5;


const stars=n=>{

  const k=Math.round(n);

  return '★'.repeat(k)+
    '☆'.repeat(5-k);
};


function unitPrice(p,variant){

  if(
    variant&&
    Array.isArray(p.variants)
  ){

    const v=
      p.variants.find(
        x=>varLabel(x)===variant
      );

    if(
      v&&
      v.price>0
    ){
      return v.price;
    }
  }

  return p.price;
}


const homeCountry=st=>
  st.home_country||'PK';


function marketList(st){

  const h={
    country:homeCountry(st),
    currency:st.currency||'PKR',
    rate:1,
    shipping:st.shipping_fee||0,
    free_min:st.free_shipping_min||0,

    payment_methods:
      (
        Array.isArray(
          st.payment_methods
        )&&
        st.payment_methods.length
      )
      ?st.payment_methods
      :['cod'],

    home:true
  };

  return [
    h,
    ...(Array.isArray(st.markets)
      ?st.markets
      :[])
  ];
}


function curMarket(){

  const l=
    marketList(
      SF.store
    );

  return l.find(
    m=>m.country===SF.country
  )||l[0];
}


function mp(base){

  const m=curMarket();

  const d=
    decOf(m.currency);

  const k=
    Math.pow(10,d);

  return fmtCur(
    Math.round(
      base*m.rate*k
    )/k,
    m.currency
  );
}


function priceHtml(p,variant){

  const vs=
    Array.isArray(p.variants)
      ?p.variants
      :[];

  if(variant){
    return mp(
      unitPrice(
        p,
        variant
      )
    );
  }

  if(vs.length){

    const prices=
      vs.map(
        v=>v.price>0
          ?v.price
          :p.price
      );

    const lo=
      Math.min(...prices);

    const hi=
      Math.max(...prices);

    return (
      lo===hi
        ?''
        :'From '
    )+
      mp(lo);
  }

  return mp(p.price)+
    (
      p.old_price>p.price
      ?`<s>${mp(p.old_price)}</s>`
      :''
    );
}


function ratingOf(pid){

  const r=
    SF.reviews.filter(
      x=>x.product_id===pid
    );

  return r.length
    ?{
        avg:
          r.reduce(
            (a,b)=>a+b.rating,
            0
          )/r.length,

        n:r.length
      }
    :null;
}


function validCart(){

  return getCart().filter(
    i=>
      SF.products.some(
        p=>p.id===i.id
      )
  );
}


const cartItem=i=>({
  product_id:i.id,
  qty:i.qty,
  variant:i.variant||''
});


function addToCart(
  pid,
  variant
){

  const p=
    SF.products.find(
      x=>x.id===pid
    );

  if(!p)return false;

  if(isSold(p)){

    toast(
      p.name+
      ' is sold out'
    );

    return false;
  }

  const vs=
    Array.isArray(p.variants)
      ?p.variants
      :[];

  if(
    vs.length&&
    !variant
  ){

    toast(
      'Please choose an option first'
    );

    return false;
  }

  const c=getCart();

  const inCart=
    c
      .filter(
        i=>i.id===pid
      )
      .reduce(
        (a,b)=>a+b.qty,
        0
      );

  if(
    p.stock!=null&&
    inCart+1>p.stock
  ){

    toast(
      'Only '+
      p.stock+
      ' available'
    );

    return false;
  }

  const x=
    c.find(
      i=>
        i.id===pid&&
        (i.variant||'')===
        (variant||'')
    );

  if(x){

    x.qty=
      Math.min(
        99,
        x.qty+1
      );

  }else{

    c.push({
      id:pid,
      qty:1,
      variant:variant||''
    });
  }

  setCart(c);

  drawCart();

  return true;
}


/* ---------- storefront rendering ---------- */

async function renderStore(slug){

  const el=$('#v-store');

  el.innerHTML=`
    <div
      class="wrap empty"
      style="padding-top:80px"
    >
      Loading store...
    </div>
  `;

  let st=null;
  let prods=[];
  let revs=[];

  try{

    if(!sb){

      throw new Error(
        'Supabase keys are missing in config.js'
      );
    }

    st=ok(
      await sb
        .from('stores')
        .select('*')
        .eq(
          'slug',
          slug||''
        )
        .maybeSingle()
    );

    if(st){

      prods=ok(
        await sb
          .from('products')
          .select('*')
          .eq(
            'store_id',
            st.id
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'created_at'
          )
      );

      const rr=
        await sb.rpc(
          'get_reviews',
          {
            p_store:st.id
          }
        );

      revs=
        rr.error
          ?[]
          :(rr.data||[]);
    }

  }catch(e){

    el.innerHTML=`
      <div
        class="wrap empty"
        style="padding-top:80px"
      >

        <h2>
          Could not load this store
        </h2>

        <p>
          ${esc(e.message)}
        </p>

        <a
          class="btn primary"
          href="#/"
        >
          Back to EasyBuy
        </a>

      </div>
    `;

    return;
  }

  if(!st){

    el.innerHTML=`
      <div
        class="wrap empty"
        style="padding-top:80px"
      >

        <h2>
          Store not found
        </h2>

        <p>
          Check the link, or ask the seller to send it again.
        </p>

        <a
          class="btn primary"
          href="#/"
        >
          Back to EasyBuy
        </a>

      </div>
    `;

    return;
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
    const saved=
      lsGet(
        'eb.country.'+
        st.id
      );

    const ml=
      marketList(st);

    SF.country=
      ml.some(
        m=>m.country===saved
      )
      ?saved
      :homeCountry(st);
  }

  const methods=
    Array.isArray(
      st.payment_methods
    )&&
    st.payment_methods.length
      ?st.payment_methods
      :['cod'];

  document.title=
    st.name+
    ' on EasyBuy';

  el.style.setProperty(
    '--accent',
    st.color
  );

  el.style.setProperty(
    '--on-accent',
    ink(st.color)
  );

  el.innerHTML=`

    <div class="eb-bar">

      You are viewing
      ${esc(st.name)}
      on EasyBuy.

      <a href="#/dashboard">
        Seller dashboard
      </a>

      <a href="#/">
        EasyBuy home
      </a>

    </div>

    <header class="sf-head">

      <div class="wrap sf-nav">

        <strong class="sf-logo">
          ${esc(st.name)}
        </strong>

        <div class="sf-right">

          ${
            (st.markets||[]).length
            ?`
              <select
                id="sfCountry"
                aria-label="Ship to country"
              >

                ${
                  marketList(st)
                    .map(m=>`

                      <option
                        value="${esc(m.country)}"
                        ${
                          m.country===SF.country
                          ?'selected'
                          :''
                        }
                      >
                        ${esc(
                          countryName(
                            m.country
                          )
                        )}
                        (${esc(m.currency)})
                      </option>

                    `)
                    .join('')
                }

              </select>
            `
            :''
          }

          <button
            class="btn accent"
            data-sf="opencart"
          >
            Cart
            <span id="sfCount">
              0
            </span>
          </button>

        </div>

      </div>

    </header>

    <section class="sf-hero">

      <div class="wrap">

        <h1>
          ${esc(st.name)}
        </h1>

        <p>
          ${esc(st.tagline||'')}
        </p>

        <div
          class="sf-trust"
          id="sfTrust"
        ></div>

      </div>

    </section>

    <div class="wrap sf-main">

      <input
        class="search"
        id="sfSearch"
        type="search"
        placeholder="Search products"
        aria-label="Search products"
      >

      <div class="sf-tools">

        <div
          class="cat-filter"
          id="sfCats"
        ></div>

      </div>

      <div
        class="grid"
        id="sfGrid"
      ></div>

    </div>

    <footer class="sf-foot">

      <div class="wrap">
        Store powered by EasyBuy.
      </div>

    </footer>

    <div
      class="drawer"
      id="sfDrawer"
    >

      <aside
        class="sheet"
        role="dialog"
        aria-label="Your cart"
      >

        <div class="sheet-head">

          <h2>
            Your cart
          </h2>

          <button
            class="btn small"
            data-sf="closecart"
            aria-label="Close cart"
          >
            Close
          </button>

        </div>

        <div id="sfItems"></div>

        <div id="sfQuote"></div>

        <form
          id="sfForm"
          style="margin-top:18px"
        >

          <h3
            style="font-size:19px;margin-bottom:10px"
          >
            Delivery details
          </h3>

          <label>
            Full name
            <input
              id="cName"
              autocomplete="name"
              required
            >
          </label>

          <label>
            Phone
            <input
              id="cPhone"
              inputmode="tel"
              autocomplete="tel"
              placeholder="03XXXXXXXXX"
              required
            >
          </label>

          <p
            class="fine"
            id="cShipTo"
          ></p>

          <label>
            City
            <input
              id="cCity"
              autocomplete="address-level2"
              required
            >
          </label>

          <label>
            Full address
            <input
              id="cAddr"
              autocomplete="street-address"
              required
            >
          </label>

          <div id="cIntl" hidden>

            <label>
              State / province
              <input
                id="cState"
                autocomplete="address-level1"
              >
            </label>

            <label>
              Postal code
              <input
                id="cPostal"
                autocomplete="postal-code"
              >
            </label>

          </div>

          <label>
            Coupon code (optional)

            <input
              id="cCoupon"
              autocomplete="off"
              placeholder="e.g. SAVE10"
            >

          </label>

          <p
            class="fine"
            id="couponMsg"
          ></p>

          <label>
            Payment method

            <select id="cPay"></select>

          </label>

          <div id="payInfo"></div>

          <button
            class="btn accent big"
            type="submit"
            id="placeBtn"
          >
            Place order
          </button>

          <a
            class="fine"
            href="#/track"
            data-track-store
            style="display:block;margin-top:12px"
          >
            Track an existing order
          </a>

        </form>

      </aside>

    </div>

    <div
      class="modal"
      id="sfDone"
    >

      <div class="box">

        <h2 id="doneTitle">
          Order placed
        </h2>

        <p id="doneText"></p>

        <a
          class="btn primary"
          id="doneWa"
          target="_blank"
          rel="noopener"
          href="#"
        >
          Send order on WhatsApp
        </a>

        <button
          class="btn"
          data-sf="closedone"
        >
          Continue shopping
        </button>

      </div>

    </div>

    <div
      class="modal product-modal"
      id="sfProduct"
    >

      <div class="box">

        <div class="sheet-head">

          <h2>
            Product
          </h2>

          <button
            class="btn small"
            data-sf="closeproduct"
          >
            Close
          </button>

        </div>

        <div id="pmBody"></div>

      </div>

    </div>
  `;

  syncCheckout();

  drawGrid();

  drawCart();
}
/* ---------- storefront products ---------- */

function drawGrid(){

  const grid=$('#sfGrid');

  if(!grid)return;

  const q=(SF.q||'').toLowerCase().trim();
  const cat=SF.cat||'';

  const products=
    SF.products.filter(p=>{

      const text=[
        p.name,
        p.description,
        p.category,
        p.sku
      ]
      .join(' ')
      .toLowerCase();

      const matchesQ=
        !q||
        text.includes(q);

      const matchesCat=
        !cat||
        p.category===cat;

      return matchesQ&&matchesCat;
    });

  drawCategories();

  if(!products.length){

    grid.innerHTML=`
      <div class="empty">
        <h3>No products found</h3>
        <p>
          Try another search or category.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML=
    products
      .map(productCard)
      .join('');
}


function drawCategories(){

  const box=$('#sfCats');

  if(!box)return;

  const cats=[
    ...new Set(
      SF.products
        .map(p=>p.category)
        .filter(Boolean)
    )
  ];

  box.innerHTML=`

    <button
      type="button"
      class="chip ${!SF.cat?'on':''}"
      data-scat=""
    >
      All
    </button>

    ${cats.map(c=>`

      <button
        type="button"
        class="chip ${SF.cat===c?'on':''}"
        data-scat="${esc(c)}"
      >
        ${esc(c)}
      </button>

    `).join('')}

  `;
}


function productCard(p){

  const rating=ratingOf(p.id);

  const variants=
    Array.isArray(p.variants)
      ?p.variants
      :[];

  const sold=isSold(p);

  const stockText=
    sold
      ?'Sold out'
      :lowStock(p)
      ?`Only ${p.stock} left`
      :'In stock';

  return `

    <article
      class="product-card"
      data-product="${p.id}"
    >

      <button
        type="button"
        class="product-media"
        data-sf-product="${p.id}"
        aria-label="View ${esc(p.name)}"
      >

        ${
          p.image_url
          ?`
            <img
              src="${esc(p.image_url)}"
              alt="${esc(p.name)}"
              loading="lazy"
            >
          `
          :`
            <span>
              ${CATS[p.category]||'🛍️'}
            </span>
          `
        }

        ${
          sold
          ?`
            <span class="product-badge">
              Sold out
            </span>
          `
          :''
        }

      </button>

      <div class="product-body">

        <p class="fine">
          ${esc(p.category||'')}
        </p>

        <h3>
          ${esc(p.name)}
        </h3>

        ${
          p.description
          ?`
            <p class="product-desc">
              ${esc(
                String(p.description)
                  .slice(0,110)
              )}
              ${
                String(p.description).length>110
                  ?'…'
                  :''
              }
            </p>
          `
          :''
        }

        <div class="product-price">

          <strong>
            ${priceHtml(p)}
          </strong>

        </div>

        ${
          rating
          ?`
            <div class="rating">
              <span>
                ${stars(rating.avg)}
              </span>
              <small>
                ${rating.avg.toFixed(1)}
                (${rating.n})
              </small>
            </div>
          `
          :''
        }

        <small
          class="stock-text ${
            sold
              ?'sold'
              :lowStock(p)
              ?'low'
              :''
          }"
        >
          ${stockText}
        </small>

        ${
          variants.length
          ?`
            <select
              class="variant-select"
              data-variant-for="${p.id}"
              aria-label="Choose option"
            >

              <option value="">
                Choose option
              </option>

              ${variants.map(v=>`

                <option
                  value="${esc(varLabel(v))}"
                >
                  ${esc(varLabel(v))}
                  ${
                    v.price
                    ?' — '+mp(v.price)
                    :''
                  }
                </option>

              `).join('')}

            </select>
          `
          :''
        }

        <button
          type="button"
          class="btn accent full"
          data-add="${p.id}"
          ${sold?'disabled':''}
        >
          ${sold?'Sold out':'Add to cart'}
        </button>

      </div>

    </article>
  `;
}


/* ---------- product modal ---------- */

function openProduct(pid){

  const p=
    SF.products.find(
      x=>x.id===pid
    );

  if(!p)return;

  const modal=$('#sfProduct');
  const body=$('#pmBody');

  if(!modal||!body)return;

  const rating=ratingOf(p.id);

  const reviews=
    SF.reviews.filter(
      r=>r.product_id===p.id
    );

  const variants=
    Array.isArray(p.variants)
      ?p.variants
      :[];

  body.innerHTML=`

    <div class="pm-grid">

      <div class="pm-image">

        ${
          p.image_url
          ?`
            <img
              src="${esc(p.image_url)}"
              alt="${esc(p.name)}"
            >
          `
          :`
            <span>
              ${CATS[p.category]||'🛍️'}
            </span>
          `
        }

      </div>

      <div class="pm-info">

        <p class="fine">
          ${esc(p.category||'')}
        </p>

        <h2>
          ${esc(p.name)}
        </h2>

        ${
          rating
          ?`
            <div class="rating">
              ${stars(rating.avg)}
              <small>
                ${rating.avg.toFixed(1)}
                · ${rating.n} review${
                  rating.n===1?'':'s'
                }
              </small>
            </div>
          `
          :''
        }

        <div class="pm-price">
          ${priceHtml(p)}
        </div>

        ${
          p.description
          ?`
            <div class="pm-description">
              ${esc(p.description)}
            </div>
          `
          :''
        }

        ${
          variants.length
          ?`
            <label>
              Choose option

              <select
                id="pmVariant"
              >

                <option value="">
                  Select an option
                </option>

                ${variants.map(v=>`

                  <option
                    value="${esc(varLabel(v))}"
                  >
                    ${esc(varLabel(v))}
                    ${
                      v.price
                      ?' — '+mp(v.price)
                      :''
                    }
                  </option>

                `).join('')}

              </select>

            </label>
          `
          :''
        }

        <button
          type="button"
          class="btn accent big full"
          data-pm-add="${p.id}"
          ${isSold(p)?'disabled':''}
        >
          ${
            isSold(p)
              ?'Sold out'
              :'Add to cart'
          }
        </button>

        ${
          p.sku
          ?`
            <p class="fine">
              SKU: ${esc(p.sku)}
            </p>
          `
          :''
        }

      </div>

    </div>

    <section class="pm-reviews">

      <div class="section-head">

        <div>
          <h3>
            Customer reviews
          </h3>

          <p class="fine">
            ${
              rating
              ?`${rating.n} review${rating.n===1?'':'s'}`
              :'No reviews yet'
            }
          </p>
        </div>

      </div>

      ${
        reviews.length
        ?reviews.map(r=>`

          <article class="review">

            <div class="review-top">

              <strong>
                ${esc(
                  r.customer_name||
                  r.name||
                  'Customer'
                )}
              </strong>

              <span>
                ${stars(
                  Number(r.rating)||0
                )}
              </span>

            </div>

            <p>
              ${esc(
                r.comment||
                r.review||
                ''
              )}
            </p>

            <small>
              ${formatDate(r.created_at)}
            </small>

          </article>

        `).join('')
        :`
          <div class="empty small-empty">
            <p>
              Be the first customer to leave a review.
            </p>
          </div>
        `
      }

    </section>
  `;

  modal.classList.add('show');
  modal.hidden=false;
}


function closeProduct(){

  const modal=$('#sfProduct');

  if(!modal)return;

  modal.classList.remove('show');
  modal.hidden=true;
}


/* ---------- cart ---------- */

function drawCart(){

  const items=$('#sfItems');
  const count=$('#sfCount');

  if(!items)return;

  const cart=
    validCart();

  const totalQty=
    cart.reduce(
      (a,b)=>a+Number(b.qty||0),
      0
    );

  if(count){
    count.textContent=
      totalQty;
  }

  if(!cart.length){

    items.innerHTML=`
      <div class="empty small-empty">

        <h3>
          Your cart is empty
        </h3>

        <p>
          Add a product to get started.
        </p>

      </div>
    `;

    drawQuote();

    return;
  }

  items.innerHTML=
    cart.map((item,index)=>{

      const p=
        SF.products.find(
          x=>x.id===item.id
        );

      if(!p)return '';

      const price=
        unitPrice(
          p,
          item.variant
        );

      return `

        <article class="cart-item">

          <div class="cart-thumb">

            ${
              p.image_url
              ?`
                <img
                  src="${esc(p.image_url)}"
                  alt=""
                >
              `
              :CATS[p.category]||'🛍️'
            }

          </div>

          <div class="cart-info">

            <strong>
              ${esc(p.name)}
            </strong>

            ${
              item.variant
              ?`
                <small>
                  ${esc(item.variant)}
                </small>
              `
              :''
            }

            <span>
              ${mp(price)}
            </span>

            <div class="qty">

              <button
                type="button"
                data-cart-dec="${index}"
                aria-label="Decrease quantity"
              >
                −
              </button>

              <b>
                ${item.qty}
              </b>

              <button
                type="button"
                data-cart-inc="${index}"
                aria-label="Increase quantity"
              >
                +
              </button>

            </div>

          </div>

          <button
            type="button"
            class="remove"
            data-cart-remove="${index}"
            aria-label="Remove item"
          >
            ×
          </button>

        </article>
      `;

    }).join('');

  drawQuote();
}


function cartSubtotal(){

  return validCart()
    .reduce(
      (sum,item)=>{

        const p=
          SF.products.find(
            x=>x.id===item.id
          );

        if(!p)return sum;

        return sum+
          unitPrice(
            p,
            item.variant
          )*
          Number(item.qty||0);

      },
      0
    );
}


function cartQty(){

  return validCart()
    .reduce(
      (a,b)=>a+Number(b.qty||0),
      0
    );
}


function drawQuote(){

  const box=$('#sfQuote');

  if(!box)return;

  const sub=
    cartSubtotal();

  const qty=
    cartQty();

  const m=
    curMarket();

  const freeMin=
    Number(
      m.free_min||0
    );

  const shipping=
    freeMin>0&&sub>=freeMin
      ?0
      :Number(m.shipping||0);

  const total=
    sub+shipping;

  box.innerHTML=`

    <div class="quote">

      <div>
        <span>Items</span>
        <strong>${qty}</strong>
      </div>

      <div>
        <span>Subtotal</span>
        <strong>${mp(sub)}</strong>
      </div>

      <div>

        <span>
          Shipping
          ${
            freeMin>0
            ?`
              <small>
                ${
                  sub<freeMin
                  ?`Free over ${mp(freeMin)}`
                  :'Free'
                }
              </small>
            `
            :''
          }
        </span>

        <strong>
          ${
            shipping
              ?mp(shipping)
              :'Free'
          }
        </strong>

      </div>

      <div class="total">

        <span>
          Total
        </span>

        <strong>
          ${mp(total)}
        </strong>

      </div>

    </div>
  `;
}


/* ---------- checkout ---------- */

function syncCheckout(){

  const m=
    curMarket();

  const ship=$('#cShipTo');
  const intl=$('#cIntl');
  const pay=$('#cPay');

  if(ship){

    ship.textContent=
      'Shipping to '+
      countryName(m.country)+
      ' · '+
      m.currency;
  }

  if(intl){

    intl.hidden=
      m.country==='PK';
  }

  if(pay){

    const methods=
      Array.isArray(
        m.payment_methods
      )&&
      m.payment_methods.length
        ?m.payment_methods
        :['cod'];

    pay.innerHTML=
      methods
        .map(x=>`

          <option value="${esc(x)}">
            ${esc(payLabel(x))}
          </option>

        `)
        .join('');

    drawPaymentInfo();
  }

  drawQuote();
}


function drawPaymentInfo(){

  const box=$('#payInfo');
  const pay=$('#cPay');

  if(!box||!pay)return;

  const method=
    pay.value;

  const st=
    SF.store;

  let html='';

  if(method==='cod'){

    html=`
      <div class="payment-note">
        Pay in cash when your order arrives.
      </div>
    `;

  }else if(
    method==='easypaisa'||
    method==='jazzcash'
  ){

    const number=
      st[method+'_number']||
      st.payment_number||
      st.whatsapp||
      '';

    html=`
      <div class="payment-note">

        <strong>
          ${esc(payLabel(method))}
        </strong>

        ${
          number
          ?`
            <span>
              Account:
              ${esc(number)}
            </span>
          `
          :`
            <span>
              Seller will contact you for payment details.
            </span>
          `
        }

      </div>
    `;

  }else if(method==='bank'){

    html=`
      <div class="payment-note">

        <strong>
          Bank transfer
        </strong>

        ${
          st.bank_name||
          st.bank_account||
          st.bank_iban
          ?`
            ${
              st.bank_name
              ?`<span>Bank: ${esc(st.bank_name)}</span>`
              :''
            }

            ${
              st.bank_account
              ?`<span>Account: ${esc(st.bank_account)}</span>`
              :''
            }

            ${
              st.bank_iban
              ?`<span>IBAN: ${esc(st.bank_iban)}</span>`
              :''
            }
          `
          :`
            <span>
              Seller will contact you with bank details.
            </span>
          `
        }

      </div>
    `;

  }else{

    html=`
      <div class="payment-note">
        ${esc(payLabel(method))}
      </div>
    `;
  }

  box.innerHTML=html;
}


async function placeOrder(e){

  e.preventDefault();

  const cart=
    validCart();

  if(!cart.length){

    toast(
      'Your cart is empty'
    );

    return;
  }

  const name=
    $('#cName').value.trim();

  const phone=
    $('#cPhone').value.trim();

  const city=
    $('#cCity').value.trim();

  const address=
    $('#cAddr').value.trim();

  const state=
    $('#cState')?.value.trim()||'';

  const postal=
    $('#cPostal')?.value.trim()||'';

  const payment=
    $('#cPay').value;

  if(
    !name||
    !phone||
    !city||
    !address
  ){

    toast(
      'Please complete your delivery details.'
    );

    return;
  }

  const m=
    curMarket();

  const sub=
    cartSubtotal();

  const shipping=
    Number(
      m.free_min||0
    )>0&&
    sub>=Number(m.free_min)
      ?0
      :Number(m.shipping||0);

  const total=
    sub+shipping;

  const items=
    cart.map(item=>{

      const p=
        SF.products.find(
          x=>x.id===item.id
        );

      return {
        product_id:item.id,
        name:p?.name||'Product',
        qty:Number(item.qty||1),
        variant:item.variant||'',
        price:unitPrice(
          p,
          item.variant
        )
      };
    });

  const row={

    store_id:SF.store.id,

    customer_name:name,

    customer_phone:phone,

    city,

    address,

    state,

    postal_code:postal,

    payment_method:payment,

    currency:m.currency,

    subtotal:sub,

    shipping,

    total,

    items,

    status:'New'
  };

  const btn=
    $('#placeBtn');

  await busy(
    btn,
    async()=>{

      const r=
        await sb
          .from('orders')
          .insert(row)
          .select()
          .single();

      if(r.error){
        throw r.error;
      }

      const order=r.data;

      setCart([]);

      $('#sfForm').reset();

      syncCheckout();

      drawCart();

      showOrderDone(
        order,
        name,
        phone,
        address,
        city,
        items,
        total,
        payment
      );
    }
  );
}


function showOrderDone(
  order,
  name,
  phone,
  address,
  city,
  items,
  total,
  payment
){

  const modal=
    $('#sfDone');

  if(!modal)return;

  const id=
    order?.id||
    order?.order_id||
    uid();

  const shortId=
    String(id).slice(0,8).toUpperCase();

  $('#doneTitle').textContent=
    'Order placed successfully';

  $('#doneText').innerHTML=`
    Thank you,
    <strong>${esc(name)}</strong>.<br>
    Your order number is
    <strong>#${esc(shortId)}</strong>.<br>
    Total:
    <strong>${mp(total)}</strong>
  `;

  const wa=
    waNum(
      SF.store.whatsapp
    );

  const lines=[
    `New order #${shortId}`,
    `Store: ${SF.store.name}`,
    `Customer: ${name}`,
    `Phone: ${phone}`,
    `City: ${city}`,
    `Address: ${address}`,
    `Payment: ${payLabel(payment)}`,
    `Total: ${mp(total)}`,
    '',
    'Items:',
    ...items.map(
      x=>
        `${x.name} x${x.qty}`+
        (
          x.variant
          ?` (${x.variant})`
          :''
        )
    )
  ];

  const href=
    wa
    ?`https://wa.me/${wa}?text=${
      encodeURIComponent(
        lines.join('\n')
      )
    }`
    :'#';

  const waBtn=
    $('#doneWa');

  if(waBtn){

    waBtn.href=href;

    waBtn.hidden=!wa;
  }

  modal.hidden=false;
  modal.classList.add('show');
}


/* ---------- track order ---------- */

function renderTrack(){

  const el=$('#v-login');

  if(!el)return;

  $$('[data-view]').forEach(
    x=>x.hidden=true
  );

  el.hidden=false;

  el.innerHTML=`

    <div class="wrap auth">

      <form
        class="builder"
        id="trackForm"
      >

        <h2>
          Track your order
        </h2>

        <p class="fine">
          Enter your order number and phone number.
        </p>

        <label>
          Order number
          <input
            id="trackId"
            required
            placeholder="Order ID"
          >
        </label>

        <label>
          Phone number
          <input
            id="trackPhone"
            inputmode="tel"
            required
            placeholder="03XXXXXXXXX"
          >
        </label>

        <button
          class="btn primary big"
          type="submit"
        >
          Track order
        </button>

        <div id="trackResult"></div>

        <a
          class="fine"
          href="#/"
        >
          ← Back to EasyBuy
        </a>

      </form>

    </div>
  `;
}


document.addEventListener(
  'submit',
  async e=>{

    if(e.target.id!=='trackForm'){
      return;
    }

    e.preventDefault();

    const id=
      $('#trackId').value.trim();

    const phone=
      $('#trackPhone').value.trim();

    const result=
      $('#trackResult');

    if(!id||!phone)return;

    await busy(
      e.submitter,
      async()=>{

        const r=
          await sb
            .from('orders')
            .select(
              'id,status,total,currency,created_at,customer_name,customer_phone,city'
            )
            .eq(
              'id',
              id
            )
            .eq(
              'customer_phone',
              phone
            )
            .maybeSingle();

        if(r.error){
          throw r.error;
        }

        if(!r.data){

          result.innerHTML=`
            <div class="payment-note">
              No matching order was found.
            </div>
          `;

          return;
        }

        const o=r.data;

        result.innerHTML=`

          <div class="track-card">

            <strong>
              Order #${esc(
                String(o.id).slice(0,8).toUpperCase()
              )}
            </strong>

            <span>
              Status:
              <b>
                ${esc(o.status||'New')}
              </b>
            </span>

            <span>
              Total:
              ${fmtCur(
                o.total||0,
                o.currency||'PKR'
              )}
            </span>

            <span>
              Date:
              ${formatDate(o.created_at)}
            </span>

          </div>
        `;
      }
    );
  }
);


/* ---------- storefront events ---------- */

document.addEventListener(
  'input',
  e=>{

    if(e.target.id==='sfSearch'){

      SF.q=e.target.value;

      drawGrid();
    }
  }
);


document.addEventListener(
  'change',
  e=>{

    if(e.target.id==='sfCountry'){

      SF.country=
        e.target.value;

      if(SF.store){

        lsSet(
          'eb.country.'+
          SF.store.id,
          SF.country
        );
      }

      syncCheckout();

      drawGrid();

      return;
    }

    if(
      e.target.id==='cPay'
    ){

      drawPaymentInfo();

      return;
    }

    const select=
      e.target.closest(
        '[data-variant-for]'
      );

    if(select){

      return;
    }
  }
);


document.addEventListener(
  'click',
  async e=>{

    const cat=
      e.target.closest(
        '[data-scat]'
      );

    if(cat){

      SF.cat=
        cat.dataset.scat||'';

      drawGrid();

      return;
    }

    const add=
      e.target.closest(
        '[data-add]'
      );

    if(add){

      const id=
        add.dataset.add;

      const variantEl=
        document.querySelector(
          `[data-variant-for="${CSS.escape(id)}"]`
        );

      const variant=
        variantEl
          ?variantEl.value
          :'';

      if(
        addToCart(
          id,
          variant
        )
      ){

        toast(
          'Added to cart'
        );
      }

      return;
    }

    const prod=
      e.target.closest(
        '[data-sf-product]'
      );

    if(prod){

      openProduct(
        prod.dataset.sfProduct
      );

      return;
    }

    const pmAdd=
      e.target.closest(
        '[data-pm-add]'
      );

    if(pmAdd){

      const variant=
        $('#pmVariant')?.value||'';

      if(
        addToCart(
          pmAdd.dataset.pmAdd,
          variant
        )
      ){

        toast(
          'Added to cart'
        );

        closeProduct();
      }

      return;
    }

    if(
      e.target.closest(
        '[data-sf="opencart"]'
      )
    ){

      openCart();

      return;
    }

    if(
      e.target.closest(
        '[data-sf="closecart"]'
      )
    ){

      closeCart();

      return;
    }

    if(
      e.target.closest(
        '[data-sf="closeproduct"]'
      )
    ){

      closeProduct();

      return;
    }

    if(
      e.target.closest(
        '[data-sf="closedone"]'
      )
    ){

      closeDone();

      return;
    }

    const dec=
      e.target.closest(
        '[data-cart-dec]'
      );

    if(dec){

      changeCartQty(
        Number(
          dec.dataset.cartDec
        ),
        -1
      );

      return;
    }

    const inc=
      e.target.closest(
        '[data-cart-inc]'
      );

    if(inc){

      changeCartQty(
        Number(
          inc.dataset.cartInc
        ),
        1
      );

      return;
    }

    const rem=
      e.target.closest(
        '[data-cart-remove]'
      );

    if(rem){

      removeCartItem(
        Number(
          rem.dataset.cartRemove
        )
      );

      return;
    }

    const track=
      e.target.closest(
        '[data-track-store]'
      );

    if(track){

      closeCart();

      return;
    }
  }
);


function openCart(){

  const d=$('#sfDrawer');

  if(!d)return;

  d.hidden=false;

  d.classList.add('show');

  document.body.classList.add(
    'drawer-open'
  );

  drawCart();
}


function closeCart(){

  const d=$('#sfDrawer');

  if(!d)return;

  d.classList.remove('show');

  document.body.classList.remove(
    'drawer-open'
  );

  setTimeout(()=>{
    d.hidden=true;
  },200);
}


function closeDone(){

  const m=$('#sfDone');

  if(!m)return;

  m.classList.remove('show');

  setTimeout(()=>{
    m.hidden=true;
  },200);
}


function changeCartQty(
  index,
  delta
){

  const cart=
    getCart();

  const item=
    cart[index];

  if(!item)return;

  const p=
    SF.products.find(
      x=>x.id===item.id
    );

  if(!p)return;

  const next=
    Number(item.qty||0)+
    delta;

  if(next<=0){

    cart.splice(
      index,
      1
    );

  }else{

    if(
      p.stock!=null&&
      next>p.stock
    ){

      toast(
        `Only ${p.stock} available`
      );

      return;
    }

    item.qty=
      Math.min(
        99,
        next
      );
  }

  setCart(cart);

  drawCart();
}


function removeCartItem(index){

  const cart=
    getCart();

  if(
    index<0||
    index>=cart.length
  )return;

  cart.splice(
    index,
    1
  );

  setCart(cart);

  drawCart();

  toast(
    'Item removed'
  );
}


/* ---------- checkout submit binding ---------- */

document.addEventListener(
  'submit',
  e=>{

    if(
      e.target.id==='sfForm'
    ){

      placeOrder(e);
    }
  }
);


/* ---------- keyboard / modal helpers ---------- */

document.addEventListener(
  'keydown',
  e=>{

    if(e.key!=='Escape'){
      return;
    }

    closeProduct();
    closeCart();
    closeDone();
  }
);


document.addEventListener(
  'click',
  e=>{

    if(
      e.target.id==='sfDrawer'
    ){
      closeCart();
    }

    if(
      e.target.id==='sfProduct'
    ){
      closeProduct();
    }

    if(
      e.target.id==='sfDone'
    ){
      closeDone();
    }
  }
);


/* ---------- app setup ---------- */

async function initAuth(){

  if(!sb){

    paintNav();

    return;
  }

  try{

    const session=
      await sb.auth.getSession();

    USER=
      session.data.session?.user||
      null;

    paintNav();

    sb.auth.onAuthStateChange(
      (_event,session)=>{

        USER=
          session?.user||
          null;

        paintNav();

        if(
          location.hash==='#/dashboard'&&
          !USER
        ){

          navigate('#/login');

        }else if(
          location.hash==='#/dashboard'&&
          USER
        ){

          loadDash();
        }
      }
    );

  }catch(e){

    console.error(
      'Auth error:',
      e
    );
  }
}


function setupState(){

  document.body.classList.toggle(
    'is-unconfigured',
    !configured
  );

  const banner=
    $('#setupBanner');

  if(banner){

    banner.hidden=
      configured;
  }
}


function init(){

  setupState();

  initBuilder();

  initAuth();

  route();

  if(
    !location.hash
  ){
    navigate('#/');
  }
}


if(
  document.readyState==='loading'
){

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

}else{

  init();
}
