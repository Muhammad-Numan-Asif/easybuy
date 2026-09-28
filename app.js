/* ============================================================
   EASYBUY — APP.JS
   Professional Store Builder / Seller Dashboard
   ============================================================ */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const esc = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const money = (value) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  const CATS = {
    Pets: "P",
    Fashion: "F",
    Electronics: "E",
    Home: "H",
    Beauty: "B",
    Other: "O"
  };

  const COLORS = [
    "#0d9463",
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#0891b2",
    "#334155"
  ];

  const state = {
    user: null,
    stores: [],
    currentStore: null,
    products: [],
    orders: [],
    cart: [],
    selectedCategory: "Pets",
    selectedColor: COLORS[0]
  };

  /* ------------------------------------------------------------
     SUPABASE
     ------------------------------------------------------------ */

  const supabaseClient = window.supabase;
  const config = window.EASYBUY_CONFIG || {};

  let db = null;

  if (
    supabaseClient &&
    config.url &&
    config.anonKey
  ) {
    db = supabaseClient.createClient(
      config.url,
      config.anonKey
    );
  }

  /* ------------------------------------------------------------
     TOAST
     ------------------------------------------------------------ */

  function toast(message, type = "success") {
    let container = $("#toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const item = document.createElement("div");
    item.className = `toast toast-${type}`;
    item.textContent = message;

    container.appendChild(item);

    setTimeout(() => {
      item.classList.add("toast-hide");

      setTimeout(() => item.remove(), 250);
    }, 3000);
  }

  /* ------------------------------------------------------------
     AUTH
     ------------------------------------------------------------ */

  async function loadSession() {
    if (!db) return;

    const {
      data: { session }
    } = await db.auth.getSession();

    state.user = session?.user || null;
  }

  async function signup(email, password) {
    if (!db) {
      toast("Supabase is not configured.", "error");
      return;
    }

    const { data, error } = await db.auth.signUp({
      email,
      password
    });

    if (error) {
      toast(error.message, "error");
      return;
    }

    state.user = data.user;

    toast(
      "Account created successfully. Check your email if confirmation is required."
    );

    location.hash = "#/dashboard";
  }

  async function login(email, password) {
    if (!db) {
      toast("Supabase is not configured.", "error");
      return;
    }

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast(error.message, "error");
      return;
    }

    state.user = data.user;

    toast("Welcome back.");

    location.hash = "#/dashboard";
  }

  async function logout() {
    if (db) {
      await db.auth.signOut();
    }

    state.user = null;
    state.currentStore = null;

    location.hash = "#/";
  }

  /* ------------------------------------------------------------
     STORES
     ------------------------------------------------------------ */

  async function loadStores() {
    if (!db) return [];

    const { data, error } = await db
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    state.stores = data || [];
    return state.stores;
  }

  async function loadMyStores() {
    if (!db || !state.user) return [];

    const { data, error } = await db
      .from("stores")
      .select("*")
      .eq("owner_id", state.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    state.stores = data || [];

    return state.stores;
  }

  async function createStore(payload) {
    if (!db || !state.user) {
      toast("Please sign in before creating a store.", "error");
      location.hash = "#/login";
      return null;
    }

    const slug =
      payload.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `store-${Date.now()}`;

    const row = {
      owner_id: state.user.id,
      name: payload.name,
      slug,
      category: payload.category,
      color: payload.color,
      whatsapp: payload.whatsapp,
      status: "active"
    };

    const { data, error } = await db
      .from("stores")
      .insert(row)
      .select()
      .single();

    if (error) {
      toast(error.message, "error");
      return null;
    }

    state.currentStore = data;
    state.stores.unshift(data);

    toast("Store created successfully.");

    return data;
  }

  async function getStoreBySlug(slug) {
    if (!db) return null;

    const { data, error } = await db
      .from("stores")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return data;
  }

  /* ------------------------------------------------------------
     PRODUCTS
     ------------------------------------------------------------ */

  async function loadProducts(storeId) {
    if (!db || !storeId) return [];

    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    state.products = data || [];

    return state.products;
  }

  async function createProduct(product) {
    if (!db || !state.currentStore) {
      toast("Select a store first.", "error");
      return null;
    }

    const row = {
      store_id: state.currentStore.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price || 0),
      compare_price: Number(product.compare_price || 0),
      stock: Number(product.stock || 0),
      image_url: product.image_url || "",
      category: product.category || "Other",
      status: "active"
    };

    const { data, error } = await db
      .from("products")
      .insert(row)
      .select()
      .single();

    if (error) {
      toast(error.message, "error");
      return null;
    }

    state.products.unshift(data);

    toast("Product added successfully.");

    return data;
  }

  async function updateProduct(id, changes) {
    if (!db) return null;

    const { data, error } = await db
      .from("products")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast(error.message, "error");
      return null;
    }

    const index = state.products.findIndex(
      (product) => product.id === id
    );

    if (index !== -1) {
      state.products[index] = data;
    }

    toast("Product updated.");

    return data;
  }

  async function deleteProduct(id) {
    if (!db) return;

    const confirmed = confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    const { error } = await db
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast(error.message, "error");
      return;
    }

    state.products = state.products.filter(
      (product) => product.id !== id
    );

    toast("Product deleted.");

    renderDashboard();
  }

  /* ------------------------------------------------------------
     ORDERS
     ------------------------------------------------------------ */

  async function loadOrders(storeId) {
    if (!db || !storeId) return [];

    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    state.orders = data || [];

    return state.orders;
  }

  async function updateOrderStatus(id, status) {
    if (!db) return;

    const { data, error } = await db
      .from("orders")
      .update({
        status
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast(error.message, "error");
      return;
    }

    const index = state.orders.findIndex(
      (order) => order.id === id
    );

    if (index !== -1) {
      state.orders[index] = data;
    }

    toast("Order status updated.");

    renderDashboard();
  }

  /* ------------------------------------------------------------
     BUILDER
     ------------------------------------------------------------ */

  function initBuilder() {
    const cats = $("#bCats");
    const colors = $("#bColors");

    if (!cats || !colors) return;

    cats.innerHTML = Object.keys(CATS)
      .map(
        (cat) => `
          <button
            type="button"
            class="chip ${cat === state.selectedCategory ? "active" : ""}"
            data-category="${esc(cat)}"
          >
            <span class="chip-icon">${esc(CATS[cat])}</span>
            ${esc(cat)}
          </button>
        `
      )
      .join("");

    colors.innerHTML = COLORS.map(
      (color) => `
        <button
          type="button"
          class="swatch ${
            color === state.selectedColor ? "active" : ""
          }"
          data-color="${color}"
          style="--swatch:${color}"
          aria-label="Select brand color ${color}"
        ></button>
      `
    ).join("");

    $$(".chip", cats).forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedCategory =
          button.dataset.category;

        $$(".chip", cats).forEach((item) =>
          item.classList.remove("active")
        );

        button.classList.add("active");

        updatePreview();
      });
    });

    $$(".swatch", colors).forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedColor =
          button.dataset.color;

        $$(".swatch", colors).forEach((item) =>
          item.classList.remove("active")
        );

        button.classList.add("active");

        updatePreview();
      });
    });

    const name = $("#bName");
    const whatsapp = $("#bWa");

    name?.addEventListener("input", updatePreview);
    whatsapp?.addEventListener("input", updatePreview);

    $("#builder")?.addEventListener(
      "submit",
      handleBuilderSubmit
    );

    updatePreview();
  }

  function updatePreview() {
    const name =
      $("#bName")?.value.trim() || "Your store";

    const previewName = $("#pvName");
    const previewBand = $("#pvBand");
    const previewUrl = $("#pvUrl");
    const frame = $("#frame");

    if (previewName) {
      previewName.textContent = name;
    }

    if (previewBand) {
      previewBand.textContent = name;
    }

    if (previewUrl) {
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") ||
        "yourstore";

      previewUrl.textContent =
        `${slug}.easybuy.pk`;
    }

    if (frame) {
      frame.style.setProperty(
        "--preview-brand",
        state.selectedColor
      );
    }

    renderPreviewProducts();
  }

  function renderPreviewProducts() {
    const grid = $("#pvGrid");

    if (!grid) return;

    const products = [
      {
        name: "Featured product",
        price: "Rs. 1,499"
      },
      {
        name: "New arrival",
        price: "Rs. 2,199"
      },
      {
        name: "Best seller",
        price: "Rs. 899"
      },
      {
        name: "Popular choice",
        price: "Rs. 1,799"
      }
    ];

    grid.innerHTML = products
      .map(
        (product, index) => `
          <div class="pv-card">
            <div class="pv-pic">${index + 1}</div>
            <b>${esc(product.name)}</b>
            <span>${esc(product.price)}</span>
          </div>
        `
      )
      .join("");
  }

  async function handleBuilderSubmit(event) {
    event.preventDefault();

    const name =
      $("#bName")?.value.trim();

    const whatsapp =
      $("#bWa")?.value.trim();

    if (!name) {
      toast("Please enter your store name.", "error");
      $("#bName")?.focus();
      return;
    }

    if (!whatsapp) {
      toast("Please enter your WhatsApp number.", "error");
      $("#bWa")?.focus();
      return;
    }

    if (!state.user) {
      localStorage.setItem(
        "eb.pending",
        JSON.stringify({
          name,
          whatsapp,
          category: state.selectedCategory,
          color: state.selectedColor
        })
      );

      toast(
        "Please sign in or create an account to continue."
      );

      location.hash = "#/login";
      return;
    }

    const store = await createStore({
      name,
      whatsapp,
      category: state.selectedCategory,
      color: state.selectedColor
    });

    if (store) {
      location.hash =
        `#/dashboard/${store.slug}`;
    }
  }

  async function processPendingStore() {
    const raw =
      localStorage.getItem("eb.pending");

    if (!raw || !state.user) return;

    try {
      const pending = JSON.parse(raw);

      const store = await createStore(pending);

      localStorage.removeItem("eb.pending");

      if (store) {
        location.hash =
          `#/dashboard/${store.slug}`;
      }
    } catch (error) {
      console.error(error);
    }
  }

  /* ------------------------------------------------------------
     HOME
     ------------------------------------------------------------ */

  async function renderHome() {
    document.body.dataset.page = "home";

    initBuilder();

    const stores = await loadStores();

    renderStoreList(stores);
  }

  function renderStoreList(stores) {
    const container = $("#storeList");

    if (!container) return;

    if (!stores.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No public stores yet</h3>
          <p>Be one of the first sellers to launch on EasyBuy.</p>
        </div>
      `;

      return;
    }

    container.innerHTML = stores
      .slice(0, 12)
      .map(
        (store) => `
          <a
            class="store-card"
            href="#/s/${encodeURIComponent(store.slug)}"
          >
            <div
              class="store-dot"
              style="--store-color:${esc(
                store.color || "#0d9463"
              )}"
            >
              ${esc(
                CATS[store.category] || "O"
              )}
            </div>

            <div class="store-card-info">
              <b>${esc(store.name)}</b>
              <span>${esc(
                store.category || "Online Store"
              )}</span>
            </div>

            <span class="store-arrow">View store</span>
          </a>
        `
      )
      .join("");
  }

  /* ------------------------------------------------------------
     LOGIN PAGE
     ------------------------------------------------------------ */

  function renderLogin() {
    document.body.dataset.page = "login";

    const root = $("#app");

    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <a class="auth-brand" href="#/">EasyBuy</a>

          <div class="auth-heading">
            <span class="section-kicker">Seller account</span>
            <h1>Welcome back</h1>
            <p>
              Sign in to manage your store, products and orders.
            </p>
          </div>

          <form id="loginForm" class="auth-form">
            <label>
              Email
              <input
                type="email"
                id="loginEmail"
                required
                autocomplete="email"
                placeholder="you@example.com"
              >
            </label>

            <label>
              Password
              <input
                type="password"
                id="loginPassword"
                required
                autocomplete="current-password"
                placeholder="Enter your password"
              >
            </label>

            <button class="btn primary big" type="submit">
              Sign in
            </button>
          </form>

          <div class="auth-divider">
            <span>New to EasyBuy?</span>
          </div>

          <form id="signupForm" class="auth-form">
            <button
              class="btn secondary big"
              type="submit"
            >
              Create an account
            </button>
          </form>

          <a class="auth-back" href="#/">Back to EasyBuy</a>
        </section>
      </main>
    `;

    $("#loginForm")?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const email =
          $("#loginEmail").value.trim();

        const password =
          $("#loginPassword").value;

        await login(email, password);
      }
    );

    $("#signupForm")?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const email =
          $("#loginEmail").value.trim();

        const password =
          $("#loginPassword").value;

        if (!email || !password) {
          toast(
            "Enter your email and password first.",
            "error"
          );

          return;
        }

        await signup(email, password);
      }
    );
  }

  /* ------------------------------------------------------------
     DASHBOARD
     ------------------------------------------------------------ */

  async function renderDashboard(slug = null) {
    document.body.dataset.page = "dashboard";

    if (!state.user) {
      location.hash = "#/login";
      return;
    }

    await loadMyStores();

    let store = null;

    if (slug) {
      store =
        state.stores.find(
          (item) => item.slug === slug
        ) || null;
    }

    if (!store) {
      store = state.stores[0] || null;
    }

    if (!store) {
      renderEmptyDashboard();
      return;
    }

    state.currentStore = store;

    await Promise.all([
      loadProducts(store.id),
      loadOrders(store.id)
    ]);

    renderDashboardShell();
  }

  function renderEmptyDashboard() {
    const root = $("#app");

    if (!root) return;

    root.innerHTML = `
      <main class="empty-page">
        <div class="empty-state large">
          <span class="section-kicker">Seller dashboard</span>
          <h1>Create your first store</h1>
          <p>
            Your dashboard will appear here after you launch your EasyBuy store.
          </p>
          <a href="#/" class="btn primary">
            Create a store
          </a>
        </div>
      </main>
    `;
  }

  function renderDashboardShell() {
    const root = $("#app");

    if (!root) return;

    const store = state.currentStore;

    root.innerHTML = `
      <div class="dashboard-layout">

        <aside class="dash-side">
          <div class="dash-brand">
            <a href="#/">EasyBuy</a>
          </div>

          <div class="dash-store">
            <div class="dash-store-mark">
              ${esc(
                CATS[store.category] || "O"
              )}
            </div>

            <div>
              <b>${esc(store.name)}</b>
              <span>${esc(
                store.category || "Online Store"
              )}</span>
            </div>
          </div>

          <nav class="side-nav">
            <button
              class="active"
              data-dash-tab="overview"
            >
              Overview
            </button>

            <button data-dash-tab="products">
              Products
            </button>

            <button data-dash-tab="orders">
              Orders
            </button>

            <button data-dash-tab="analytics">
              Analytics & tools
            </button>

            <button data-dash-tab="settings">
              Settings
            </button>
          </nav>

          <div class="side-bottom">
            <a
              href="#/s/${encodeURIComponent(
                store.slug
              )}"
              class="btn secondary full"
            >
              View storefront
            </a>

            <button
              class="side-logout"
              id="logoutBtn"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main class="dash-main">
          <header class="dash-top">
            <div>
              <span class="section-kicker">
                Seller dashboard
              </span>

              <h1 id="dashTitle">
                Overview
              </h1>
            </div>

            <div class="dash-actions">
              <a
                href="#/s/${encodeURIComponent(
                  store.slug
                )}"
                class="btn secondary"
              >
                View store
              </a>

              <button
                class="btn primary"
                id="addProductTop"
              >
                Add product
              </button>
            </div>
          </header>

          <section id="dashboardContent"></section>
        </main>
      </div>
    `;

    $("#logoutBtn")?.addEventListener(
      "click",
      logout
    );

    $$(".side-nav button").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".side-nav button").forEach(
          (item) =>
            item.classList.remove("active")
        );

        button.classList.add("active");

        const tab =
          button.dataset.dashTab;

        renderDashboardTab(tab);
      });
    });

    $("#addProductTop")?.addEventListener(
      "click",
      () => openProductModal()
    );

    renderDashboardTab("overview");
  }

  function renderDashboardTab(tab) {
    const titleMap = {
      overview: "Overview",
      products: "Products",
      orders: "Orders",
      analytics: "Analytics & tools",
      settings: "Settings"
    };

    $("#dashTitle").textContent =
      titleMap[tab] || "Overview";

    if (tab === "overview") {
      renderOverview();
    } else if (tab === "products") {
      renderProductsTab();
    } else if (tab === "orders") {
      renderOrdersTab();
    } else if (tab === "analytics") {
      renderAnalyticsTab();
    } else if (tab === "settings") {
      renderSettingsTab();
    }
  }

  function renderOverview() {
    const products =
      state.products || [];

    const orders =
      state.orders || [];

    const revenue = orders.reduce(
      (total, order) =>
        total +
        Number(
          order.total ||
            order.amount ||
            0
        ),
      0
    );

    const pending =
      orders.filter(
        (order) =>
          !["Delivered", "Cancelled"].includes(
            order.status
          )
      ).length;

    $("#dashboardContent").innerHTML = `
      <div class="dash-stats">
        <div class="stat-card">
          <span>Revenue</span>
          <strong>${money(revenue)}</strong>
          <small>Total order value</small>
        </div>

        <div class="stat-card">
          <span>Orders</span>
          <strong>${orders.length}</strong>
          <small>All store orders</small>
        </div>

        <div class="stat-card">
          <span>Products</span>
          <strong>${products.length}</strong>
          <small>Active catalog items</small>
        </div>

        <div class="stat-card">
          <span>Pending</span>
          <strong>${pending}</strong>
          <small>Orders requiring attention</small>
        </div>
      </div>

      <div class="dashboard-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <span class="section-kicker">
                Recent activity
              </span>
              <h2>Latest orders</h2>
            </div>

            <button
              class="btn text"
              data-open-tab="orders"
            >
              View all
            </button>
          </div>

          ${renderRecentOrders()}
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <span class="section-kicker">
                Catalog
              </span>
              <h2>Products</h2>
            </div>

            <button
              class="btn text"
              data-open-tab="products"
            >
              Manage
            </button>
          </div>

          ${renderRecentProducts()}
        </section>
      </div>
    `;

    $$("[data-open-tab]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const tab =
              button.dataset.openTab;

            const navButton = $(
              `[data-dash-tab="${tab}"]`
            );

            navButton?.click();
          }
        );
      }
    );
  }

  function renderRecentOrders() {
    if (!state.orders.length) {
      return `
        <div class="empty-inline">
          <b>No orders yet</b>
          <span>New customer orders will appear here.</span>
        </div>
      `;
    }

    return `
      <div class="mini-list">
        ${state.orders
          .slice(0, 5)
          .map(
            (order) => `
              <div class="mini-row">
                <div>
                  <b>Order #${esc(
                    order.order_number ||
                      order.id
                  )}</b>
                  <span>${esc(
                    order.customer_name ||
                      order.customer ||
                      "Customer"
                  )}</span>
                </div>

                <div>
                  <strong>${money(
                    order.total ||
                      order.amount
                  )}</strong>
                  <span class="status">
                    ${esc(
                      order.status ||
                        "New"
                    )}
                  </span>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderRecentProducts() {
    if (!state.products.length) {
      return `
        <div class="empty-inline">
          <b>Your catalog is empty</b>
          <span>Add your first product to start selling.</span>
        </div>
      `;
    }

    return `
      <div class="mini-list">
        ${state.products
          .slice(0, 5)
          .map(
            (product) => `
              <div class="mini-row">
                <div class="product-mini">
                  <div class="product-thumb">
                    ${
                      product.image_url
                        ? `<img src="${esc(
                            product.image_url
                          )}" alt="">`
                        : esc(
                            CATS[
                              product.category
                            ] || "O"
                          )
                    }
                  </div>

                  <div>
                    <b>${esc(
                      product.name
                    )}</b>
                    <span>Stock: ${Number(
                      product.stock || 0
                    )}</span>
                  </div>
                </div>

                <strong>
                  ${money(product.price)}
                </strong>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------
     PRODUCTS TAB
     ------------------------------------------------------------ */

  function renderProductsTab() {
    $("#dashboardContent").innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="section-kicker">
              Catalog management
            </span>
            <h2>Products</h2>
            <p class="sub">
              Add, update and manage everything customers can buy.
            </p>
          </div>

          <button
            class="btn primary"
            id="addProductBtn"
          >
            Add product
          </button>
        </div>

        ${
          state.products.length
            ? `
              <div class="product-table">
                ${state.products
                  .map(
                    (product) => `
                      <div class="product-table-row">
                        <div class="product-mini">
                          <div class="product-thumb">
                            ${
                              product.image_url
                                ? `<img src="${esc(
                                    product.image_url
                                  )}" alt="">`
                                : esc(
                                    CATS[
                                      product.category
                                    ] || "O"
                                  )
                            }
                          </div>

                          <div>
                            <b>${esc(
                              product.name
                            )}</b>
                            <span>${esc(
                              product.category ||
                                "Other"
                            )}</span>
                          </div>
                        </div>

                        <span>
                          ${money(product.price)}
                        </span>

                        <span>
                          ${Number(
                            product.stock || 0
                          )} in stock
                        </span>

                        <div class="table-actions">
                          <button
                            class="btn small secondary"
                            data-edit-product="${
                              product.id
                            }"
                          >
                            Edit
                          </button>

                          <button
                            class="btn small danger"
                            data-delete-product="${
                              product.id
                            }"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `
              <div class="empty-state">
                <h3>No products yet</h3>
                <p>
                  Add your first product to start building your catalog.
                </p>
              </div>
            `
        }
      </section>
    `;

    $("#addProductBtn")?.addEventListener(
      "click",
      () => openProductModal()
    );

    $$("[data-delete-product]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            deleteProduct(
              button.dataset.deleteProduct
            )
        );
      }
    );

    $$("[data-edit-product]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const product =
              state.products.find(
                (item) =>
                  String(item.id) ===
                  String(
                    button.dataset
                      .editProduct
                  )
              );

            if (product) {
              openProductModal(product);
            }
          }
        );
      }
    );
  }

  /* ------------------------------------------------------------
     PRODUCT MODAL
     ------------------------------------------------------------ */

  function openProductModal(product = null) {
    const existing =
      $("#productModal");

    existing?.remove();

    const editing = Boolean(product);

    const modal =
      document.createElement("div");

    modal.id = "productModal";
    modal.className = "modal-backdrop";

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <span class="section-kicker">
              ${editing ? "Edit product" : "New product"}
            </span>

            <h2>
              ${editing ? "Update product" : "Add a product"}
            </h2>
          </div>

          <button
            class="modal-close"
            id="closeProductModal"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form id="productForm" class="modal-form">

          <label>
            Product name
            <input
              id="productName"
              required
              value="${esc(
                product?.name || ""
              )}"
              placeholder="e.g. Classic Cotton T-Shirt"
            >
          </label>

          <label>
            Description
            <textarea
              id="productDescription"
              rows="4"
              placeholder="Describe your product"
            >${esc(
              product?.description || ""
            )}</textarea>
          </label>

          <div class="form-grid-2">
            <label>
              Price
              <input
                id="productPrice"
                type="number"
                min="0"
                required
                value="${product?.price || ""}"
                placeholder="1499"
              >
            </label>

            <label>
              Compare-at price
              <input
                id="productCompare"
                type="number"
                min="0"
                value="${
                  product?.compare_price || ""
                }"
                placeholder="1999"
              >
            </label>
          </div>

          <div class="form-grid-2">
            <label>
              Stock
              <input
                id="productStock"
                type="number"
                min="0"
                required
                value="${product?.stock ?? 0}"
              >
            </label>

            <label>
              Category
              <select id="productCategory">
                ${Object.keys(CATS)
                  .map(
                    (category) =>
                      `<option
                        value="${esc(category)}"
                        ${
                          product?.category ===
                          category
                            ? "selected"
                            : ""
                        }
                      >
                        ${esc(category)}
                      </option>`
                  )
                  .join("")}
              </select>
            </label>
          </div>

          <label>
            Product image URL
            <input
              id="productImage"
              type="url"
              value="${esc(
                product?.image_url || ""
              )}"
              placeholder="https://..."
            >
          </label>

          <div class="modal-actions">
            <button
              type="button"
              class="btn secondary"
              id="cancelProductModal"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="btn primary"
            >
              ${
                editing
                  ? "Save changes"
                  : "Add product"
              }
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    $("#closeProductModal").onclick =
      () => modal.remove();

    $("#cancelProductModal").onclick =
      () => modal.remove();

    $("#productForm").addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const payload = {
          name:
            $("#productName").value.trim(),

          description:
            $("#productDescription").value.trim(),

          price:
            Number(
              $("#productPrice").value
            ),

          compare_price:
            Number(
              $("#productCompare").value || 0
            ),

          stock:
            Number(
              $("#productStock").value || 0
            ),

          category:
            $("#productCategory").value,

          image_url:
            $("#productImage").value.trim()
        };

        if (editing) {
          await updateProduct(
            product.id,
            payload
          );
        } else {
          await createProduct(payload);
        }

        modal.remove();

        renderDashboardTab("products");
      }
    );
  }

  /* ------------------------------------------------------------
     ORDERS TAB
     ------------------------------------------------------------ */

  function renderOrdersTab() {
    $("#dashboardContent").innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="section-kicker">
              Order management
            </span>

            <h2>Orders</h2>

            <p class="sub">
              Review customer orders and update fulfillment status.
            </p>
          </div>
        </div>

        ${
          state.orders.length
            ? `
              <div class="orders-list">
                ${state.orders
                  .map(
                    (order) => `
                      <article class="order-card">
                        <div class="order-main">
                          <span class="section-kicker">
                            Order #${esc(
                              order.order_number ||
                                order.id
                            )}
                          </span>

                          <h3>
                            ${esc(
                              order.customer_name ||
                                order.customer ||
                                "Customer"
                            )}
                          </h3>

                          <p>
                            ${esc(
                              order.customer_phone ||
                                order.phone ||
                                ""
                            )}
                          </p>
                        </div>

                        <div class="order-value">
                          <strong>
                            ${money(
                              order.total ||
                                order.amount
                            )}
                          </strong>

                          <select
                            data-order-status="${
                              order.id
                            }"
                          >
                            ${[
                              "New",
                              "Confirmed",
                              "Shipped",
                              "Delivered",
                              "Cancelled"
                            ]
                              .map(
                                (status) =>
                                  `<option
                                    value="${status}"
                                    ${
                                      order.status ===
                                      status
                                        ? "selected"
                                        : ""
                                    }
                                  >
                                    ${status}
                                  </option>`
                              )
                              .join("")}
                          </select>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            `
            : `
              <div class="empty-state">
                <h3>No orders yet</h3>
                <p>
                  Customer orders will appear here when your store starts receiving sales.
                </p>
              </div>
            `
        }
      </section>
    `;

    $$("[data-order-status]").forEach(
      (select) => {
        select.addEventListener(
          "change",
          () =>
            updateOrderStatus(
              select.dataset.orderStatus,
              select.value
            )
        );
      }
    );
  }

  /* ------------------------------------------------------------
     ANALYTICS
     ------------------------------------------------------------ */

  function renderAnalyticsTab() {
    const orders =
      state.orders || [];

    const products =
      state.products || [];

    const revenue =
      orders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.total ||
              order.amount ||
              0
          ),
        0
      );

    const delivered =
      orders.filter(
        (order) =>
          order.status === "Delivered"
      ).length;

    const cancelled =
      orders.filter(
        (order) =>
          order.status === "Cancelled"
      ).length;

    $("#dashboardContent").innerHTML = `
      <div class="dash-stats">
        <div class="stat-card">
          <span>Total revenue</span>
          <strong>${money(revenue)}</strong>
          <small>Based on recorded orders</small>
        </div>

        <div class="stat-card">
          <span>Average order value</span>
          <strong>
            ${
              orders.length
                ? money(
                    revenue /
                      orders.length
                  )
                : money(0)
            }
          </strong>
          <small>Across all orders</small>
        </div>

        <div class="stat-card">
          <span>Delivered</span>
          <strong>${delivered}</strong>
          <small>Successfully completed orders</small>
        </div>

        <div class="stat-card">
          <span>Cancelled</span>
          <strong>${cancelled}</strong>
          <small>Cancelled orders</small>
        </div>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="section-kicker">
              Store health
            </span>
            <h2>Commerce overview</h2>
          </div>
        </div>

        <div class="health-grid">
          <div>
            <span>Catalog size</span>
            <strong>${products.length}</strong>
          </div>

          <div>
            <span>Orders</span>
            <strong>${orders.length}</strong>
          </div>

          <div>
            <span>Completion rate</span>
            <strong>
              ${
                orders.length
                  ? Math.round(
                      (delivered /
                        orders.length) *
                        100
                    )
                  : 0
              }%
            </strong>
          </div>
        </div>
      </section>
    `;
  }

  /* ------------------------------------------------------------
     SETTINGS
     ------------------------------------------------------------ */

  function renderSettingsTab() {
    const store =
      state.currentStore;

    $("#dashboardContent").innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <span class="section-kicker">
              Store settings
            </span>

            <h2>Commerce settings</h2>

            <p class="sub">
              Manage the basic information customers use to contact and identify your business.
            </p>
          </div>
        </div>

        <form id="storeSettingsForm" class="settings-form">

          <div class="form-grid-2">

            <label>
              Store name
              <input
                id="settingsName"
                value="${esc(
                  store.name || ""
                )}"
                required
              >
            </label>

            <label>
              WhatsApp number
              <input
                id="settingsWhatsapp"
                value="${esc(
                  store.whatsapp || ""
                )}"
                placeholder="03XXXXXXXXX"
              >
            </label>

          </div>

          <div class="form-grid-2">

            <label>
              Category
              <select id="settingsCategory">
                ${Object.keys(CATS)
                  .map(
                    (category) =>
                      `<option
                        value="${esc(category)}"
                        ${
                          store.category ===
                          category
                            ? "selected"
                            : ""
                        }
                      >
                        ${esc(category)}
                      </option>`
                  )
                  .join("")}
              </select>
            </label>

            <label>
              Brand color
              <input
                id="settingsColor"
                type="color"
                value="${esc(
                  store.color ||
                    "#0d9463"
                )}"
              >
            </label>

          </div>

          <label>
            Bank details
            <textarea
              id="settingsBank"
              rows="4"
              placeholder="Optional payment or bank information"
            >${esc(
              store.bank_details || ""
            )}</textarea>
          </label>

          <div class="modal-actions">
            <button
              class="btn primary"
              type="submit"
            >
              Save commerce settings
            </button>
          </div>

        </form>
      </section>
    `;

    $("#storeSettingsForm")
      ?.addEventListener(
        "submit",
        saveStoreSettings
      );
  }

  async function saveStoreSettings(event) {
    event.preventDefault();

    if (!db || !state.currentStore) {
      return;
    }

    const changes = {
      name:
        $("#settingsName").value.trim(),

      whatsapp:
        $("#settingsWhatsapp").value.trim(),

      category:
        $("#settingsCategory").value,

      color:
        $("#settingsColor").value,

      bank_details:
        $("#settingsBank").value.trim()
    };

    const { data, error } =
      await db
        .from("stores")
        .update(changes)
        .eq(
          "id",
          state.currentStore.id
        )
        .select()
        .single();

    if (error) {
      toast(error.message, "error");
      return;
    }

    state.currentStore = data;

    const index =
      state.stores.findIndex(
        (store) =>
          store.id === data.id
      );

    if (index !== -1) {
      state.stores[index] = data;
    }

    toast(
      "Commerce settings saved successfully."
    );

    renderDashboardShell();
  }

  /* ------------------------------------------------------------
     STOREFRONT
     ------------------------------------------------------------ */

  async function renderStore(slug) {
    document.body.dataset.page =
      "storefront";

    const store =
      await getStoreBySlug(slug);

    if (!store) {
      renderNotFound();
      return;
    }

    state.currentStore = store;

    const products =
      await loadProducts(store.id);

    const root = $("#app");

    if (!root) return;

    root.innerHTML = `
      <div
        class="storefront"
        style="--store-brand:${esc(
          store.color || "#0d9463"
        )}"
      >

        <header class="storefront-head">
          <div class="wrap store-head-inner">
            <a class="store-brand" href="#/">
              <span class="store-brand-mark">
                ${esc(
                  CATS[
                    store.category
                  ] || "O"
                )}
              </span>

              <span>
                <b>${esc(
                  store.name
                )}</b>
                <small>${esc(
                  store.category ||
                    "Online Store"
                )}</small>
              </span>
            </a>

            <div class="store-actions">
              <button
                class="btn secondary"
                id="storeCartBtn"
              >
                Cart
                <span id="cartCount">0</span>
              </button>
            </div>
          </div>
        </header>

        <main>

          <section class="store-hero">
            <div class="wrap">
              <span class="section-kicker">
                ${esc(
                  store.category ||
                    "Online Store"
                )}
              </span>

              <h1>
                ${esc(store.name)}
              </h1>

              <p>
                Quality products, simple ordering and Cash on Delivery across Pakistan.
              </p>

              <a
                href="#products"
                class="btn primary"
              >
                Shop products
              </a>
            </div>
          </section>

          <section
            class="wrap storefront-products"
            id="products"
          >
            <div class="section-head">
              <div>
                <span class="section-kicker">
                  Collection
                </span>

                <h2>Products</h2>
              </div>

              <p class="sub">
                Browse the latest products from ${esc(
                  store.name
                )}.
              </p>
            </div>

            ${
              products.length
                ? `
                  <div class="store-product-grid">
                    ${products
                      .map(
                        (product) =>
                          renderStoreProduct(
                            product
                          )
                      )
                      .join("")}
                  </div>
                `
                : `
                  <div class="empty-state">
                    <h3>No products available</h3>
                    <p>
                      This store has not added products yet.
                    </p>
                  </div>
                `
            }
          </section>

        </main>

        <footer class="storefront-foot">
          <div class="wrap">
            <b>${esc(
              store.name
            )}</b>

            <span>
              Powered by EasyBuy
            </span>
          </div>
        </footer>

      </div>
    `;

    state.cart = [];

    updateCartCount();

    $("#storeCartBtn")
      ?.addEventListener(
        "click",
        openCart
      );

    $$("[data-add-cart]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            addToCart(
              button.dataset.addCart
            )
        );
      }
    );
  }

  function renderStoreProduct(product) {
    return `
      <article class="store-product-card">

        <div class="store-product-image">

          ${
            product.image_url
              ? `
                <img
                  src="${esc(
                    product.image_url
                  )}"
                  alt="${esc(
                    product.name
                  )}"
                  loading="lazy"
                >
              `
              : `
                <span>
                  ${esc(
                    CATS[
                      product.category
                    ] || "O"
                  )}
                </span>
              `
          }

        </div>

        <div class="store-product-info">

          <span class="product-category">
            ${esc(
              product.category ||
                "Product"
            )}
          </span>

          <h3>
            ${esc(product.name)}
          </h3>

          ${
            product.description
              ? `
                <p>
                  ${esc(
                    product.description
                  )}
                </p>
              `
              : ""
          }

          <div class="product-bottom">

            <strong>
              ${money(
                product.price
              )}
            </strong>

            <button
              class="btn primary small"
              data-add-cart="${
                product.id
              }"
              ${
                Number(
                  product.stock || 0
                ) <= 0
                  ? "disabled"
                  : ""
              }
            >
              ${
                Number(
                  product.stock || 0
                ) <= 0
                  ? "Out of stock"
                  : "Add to cart"
              }
            </button>

          </div>

        </div>

      </article>
    `;
  }

  /* ------------------------------------------------------------
     CART
     ------------------------------------------------------------ */

  function addToCart(productId) {
    const product =
      state.products.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );

    if (!product) return;

    const existing =
      state.cart.find(
        (item) =>
          String(item.id) ===
          String(product.id)
      );

    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({
        ...product,
        quantity: 1
      });
    }

    updateCartCount();

    toast(
      `${product.name} added to cart.`
    );
  }

  function updateCartCount() {
    const count =
      state.cart.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0),
        0
      );

    const element =
      $("#cartCount");

    if (element) {
      element.textContent = count;
    }
  }

  function openCart() {
    const existing =
      $("#cartModal");

    existing?.remove();

    const modal =
      document.createElement("div");

    modal.id = "cartModal";
    modal.className = "modal-backdrop";

    const total =
      state.cart.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
            Number(
              item.quantity || 0
            ),
        0
      );

    modal.innerHTML = `
      <div class="modal-card cart-modal">

        <div class="modal-head">
          <div>
            <span class="section-kicker">
              Shopping cart
            </span>

            <h2>Your cart</h2>
          </div>

          <button
            class="modal-close"
            id="closeCart"
          >
            ×
          </button>
        </div>

        ${
          state.cart.length
            ? `
              <div class="cart-list">
                ${state.cart
                  .map(
                    (item) => `
                      <div class="cart-row">
                        <div>
                          <b>${esc(
                            item.name
                          )}</b>

                          <span>
                            ${money(
                              item.price
                            )}
                          </span>
                        </div>

                        <div class="cart-qty">
                          <button
                            data-cart-minus="${
                              item.id
                            }"
                          >
                            −
                          </button>

                          <span>
                            ${item.quantity}
                          </span>

                          <button
                            data-cart-plus="${
                              item.id
                            }"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>

              <div class="cart-total">
                <span>Total</span>
                <strong>${money(
                  total
                )}</strong>
              </div>

              <button
                class="btn primary big full"
                id="checkoutBtn"
              >
                Continue to checkout
              </button>
            `
            : `
              <div class="empty-state">
                <h3>Your cart is empty</h3>
                <p>
                  Add products from the store to continue.
                </p>
              </div>
            `
        }

      </div>
    `;

    document.body.appendChild(modal);

    $("#closeCart").onclick =
      () => modal.remove();

    $$("[data-cart-plus]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const item =
              state.cart.find(
                (product) =>
                  String(
                    product.id
                  ) ===
                  String(
                    button.dataset
                      .cartPlus
                  )
              );

            if (item) {
              item.quantity += 1;
              openCart();
              updateCartCount();
            }
          }
        );
      }
    );

    $$("[data-cart-minus]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const item =
              state.cart.find(
                (product) =>
                  String(
                    product.id
                  ) ===
                  String(
                    button.dataset
                      .cartMinus
                  )
              );

            if (!item) return;

            item.quantity -= 1;

            if (item.quantity <= 0) {
              state.cart =
                state.cart.filter(
                  (product) =>
                    String(
                      product.id
                    ) !==
                    String(
                      button.dataset
                        .cartMinus
                    )
                );
            }

            openCart();
            updateCartCount();
          }
        );
      }
    );

    $("#checkoutBtn")
      ?.addEventListener(
        "click",
        () => {
          modal.remove();
          openCheckout();
        }
      );
  }

  /* ------------------------------------------------------------
     CHECKOUT
     ------------------------------------------------------------ */

  function openCheckout() {
    const existing =
      $("#checkoutModal");

    existing?.remove();

    if (!state.cart.length) {
      toast(
        "Your cart is empty.",
        "error"
      );

      return;
    }

    const modal =
      document.createElement("div");

    modal.id = "checkoutModal";
    modal.className = "modal-backdrop";

    const total =
      state.cart.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
            Number(
              item.quantity || 0
            ),
        0
      );

    modal.innerHTML = `
      <div class="modal-card">

        <div class="modal-head">
          <div>
            <span class="section-kicker">
              Checkout
            </span>

            <h2>Complete your order</h2>
          </div>

          <button
            class="modal-close"
            id="closeCheckout"
          >
            ×
          </button>
        </div>

        <form id="checkoutForm" class="modal-form">

          <label>
            Full name
            <input
              id="checkoutName"
              required
              placeholder="Your full name"
            >
          </label>

          <label>
            Phone number
            <input
              id="checkoutPhone"
              required
              inputmode="tel"
              placeholder="03XXXXXXXXX"
            >
          </label>

          <label>
            Delivery address
            <textarea
              id="checkoutAddress"
              rows="4"
              required
              placeholder="Complete delivery address"
            ></textarea>
          </label>

          <div class="checkout-summary">
            <span>Cash on Delivery</span>
            <strong>${money(
              total
            )}</strong>
          </div>

          <button
            class="btn primary big"
            type="submit"
          >
            Place order
          </button>

        </form>
      </div>
    `;

    document.body.appendChild(modal);

    $("#closeCheckout").onclick =
      () => modal.remove();

    $("#checkoutForm").addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        await placeOrder({
          customer_name:
            $("#checkoutName").value.trim(),

          customer_phone:
            $("#checkoutPhone").value.trim(),

          address:
            $("#checkoutAddress").value.trim()
        });

        modal.remove();
      }
    );
  }

  async function placeOrder(customer) {
    if (!db || !state.currentStore) {
      toast(
        "Unable to place this order right now.",
        "error"
      );

      return;
    }

    const total =
      state.cart.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
            Number(
              item.quantity || 0
            ),
        0
      );

    const orderNumber =
      String(Date.now()).slice(-6);

    const row = {
      store_id:
        state.currentStore.id,

      order_number:
        orderNumber,

      customer_name:
        customer.customer_name,

      customer_phone:
        customer.customer_phone,

      address:
        customer.address,

      total,

      status: "New",

      payment_method:
        "Cash on Delivery"
    };

    const { data, error } =
      await db
        .from("orders")
        .insert(row)
        .select()
        .single();

    if (error) {
      toast(error.message, "error");
      return;
    }

    state.orders.unshift(data);

    state.cart = [];

    updateCartCount();

    toast(
      `Order #${orderNumber} placed successfully.`
    );
  }

  /* ------------------------------------------------------------
     404
     ------------------------------------------------------------ */

  function renderNotFound() {
    const root = $("#app");

    if (!root) return;

    root.innerHTML = `
      <main class="empty-page">
        <div class="empty-state large">
          <span class="section-kicker">
            EasyBuy
          </span>

          <h1>Store not found</h1>

          <p>
            The storefront you are looking for does not exist or is no longer available.
          </p>

          <a
            href="#/"
            class="btn primary"
          >
            Back to EasyBuy
          </a>
        </div>
      </main>
    `;
  }

  /* ------------------------------------------------------------
     ROUTER
     ------------------------------------------------------------ */

  async function router() {
    const hash =
      location.hash || "#/";

    const parts =
      hash
        .replace(/^#\/?/, "")
        .split("/")
        .filter(Boolean);

    const route =
      parts[0] || "";

    if (route === "") {
      await renderHome();
      return;
    }

    if (route === "login") {
      renderLogin();
      return;
    }

    if (route === "dashboard") {
      await renderDashboard(
        parts[1] || null
      );

      return;
    }

    if (route === "s") {
      await renderStore(
        decodeURIComponent(
          parts[1] || ""
        )
      );

      return;
    }

    renderNotFound();
  }

  /* ------------------------------------------------------------
     START APP
     ------------------------------------------------------------ */

  async function init() {
    await loadSession();

    if (db) {
      db.auth.onAuthStateChange(
        async (_event, session) => {
          state.user =
            session?.user || null;

          if (
            state.user &&
            localStorage.getItem(
              "eb.pending"
            )
          ) {
            await processPendingStore();
          }
        }
      );
    }

    window.addEventListener(
      "hashchange",
      router
    );

    await router();

    if (
      state.user &&
      localStorage.getItem(
        "eb.pending"
      )
    ) {
      await processPendingStore();
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    init
  );
})();
