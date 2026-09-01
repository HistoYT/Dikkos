/* ===================================================================
   DIKKOS EMPANADAS — main.js
=================================================================== */
(function(){
  "use strict";

  gsap.registerPlugin(ScrollTrigger);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =================================================================
     CATALOG DATA
     -> Catálogo de fábrica. El admin puede agregar/editar/borrar
        productos desde el panel; esos cambios se guardan en
        localStorage (PRODUCTS_KEY) y sobrescriben esta lista de
        fábrica solo en el navegador donde se editaron.
     -> img: ruta a una foto del producto. emoji: se usa si no hay foto.
     -> price: número entero en pesos colombianos (sin puntos ni $).
  ================================================================= */
  var DEFAULT_PRODUCTS = [
    { id:1,  cat:'tradicionales', name:'Empanada de Carne',     desc:'La clásica: carne de res sazonada a fuego lento.',            price:3500,  img:'assets/img/catalog/food-tray.jpg',    badge:'Popular', badgeType:'gold' },
    { id:2,  cat:'tradicionales', name:'Empanada de Pollo',     desc:'Pollo desmechado con el toque Dikkos.',                        price:3500,  img:'assets/img/catalog/food-closeup.jpg' },
    { id:3,  cat:'tradicionales', name:'Empanada Mixta',        desc:'Carne y pollo juntos en una sola mordida.',                    price:4000,  img:'assets/img/catalog/food-tray.jpg' },
    { id:4,  cat:'tradicionales', name:'Empanada de Queso',     desc:'Queso derretido, sencilla y deliciosa.',                       price:3500,  img:'assets/img/catalog/food-closeup.jpg' },
    { id:5,  cat:'especiales',    name:'Empanada Especial Dikkos', desc:'Nuestra receta secreta de la casa. Algo único.',            price:4500,  img:'assets/img/catalog/food-tray.jpg',    badge:'Estrella', badgeType:'red' },
    { id:6,  cat:'especiales',    name:'Empanada Hawaiana',     desc:'Piña y queso: dulce y salada a la vez.',                       price:4000,  img:'assets/img/catalog/food-closeup.jpg', badge:'Nueva', badgeType:'gold' },
    { id:7,  cat:'especiales',    name:'Empanada BBQ',          desc:'Carne desmechada bañada en salsa BBQ de la casa.',             price:4500,  img:'assets/img/catalog/food-tray.jpg' },
    { id:8,  cat:'combos',        name:'Combo Fut x6',          desc:'6 empanadas surtidas, ideales para ver el partido.',           price:19000, img:'assets/img/catalog/food-closeup.jpg', badge:'Popular', badgeType:'gold' },
    { id:9,  cat:'combos',        name:'Combo Dikkos x12',      desc:'12 empanadas surtidas + salsa de la casa.',                    price:36000, img:'assets/img/catalog/food-tray.jpg' },
    { id:10, cat:'combos',        name:'Combo Pareja',          desc:'4 empanadas + 2 bebidas bien frías.',                          price:17000, img:'assets/img/catalog/food-closeup.jpg' },
    { id:11, cat:'bebidas',       name:'Limonada de Coco',      desc:'Refrescante, cremosa y bien fría.',                            price:5000,  emoji:'🥥' },
    { id:12, cat:'bebidas',       name:'Gaseosa',               desc:'Bien fría para acompañar tu pedido.',                          price:2500,  emoji:'🥤' }
  ];
  var WA_NUMBER = '573015729100';
  var PRODUCTS_KEY = 'dikkos_products_v1';
  var CART_KEY = 'dikkos_cart_v1';

  function cloneProducts(list){ return list.map(function(p){ return Object.assign({}, p); }); }

  function loadProducts(){
    try {
      var raw = localStorage.getItem(PRODUCTS_KEY);
      if (raw){
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch(e){}
    return cloneProducts(DEFAULT_PRODUCTS);
  }

  var PRODUCTS = loadProducts();
  var currentFilter = 'todas';

  function saveProducts(){
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(PRODUCTS));
  }

  function getProduct(id){
    id = Number(id);
    for (var i=0; i<PRODUCTS.length; i++){ if (PRODUCTS[i].id === id) return PRODUCTS[i]; }
    return null;
  }

  function formatPrice(n){
    return '$' + Math.round(n).toLocaleString('es-CO');
  }

  function waLink(p){
    var msg = 'Hola Dikkos! 🧡 Quiero pedir: ' + p.name + ' (' + formatPrice(p.price) + '). ¿Está disponible?';
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  function mediaHTML(p){
    return p.img
      ? '<img src="'+p.img+'" alt="'+p.name+'" loading="lazy">'
      : '<div class="product-emoji">'+(p.emoji||'🧡')+'</div>';
  }

  function cardHTML(p){
    var badge = p.badge
      ? '<span class="product-badge'+(p.badgeType==='gold' ? ' is-gold' : '')+'">'+p.badge+'</span>'
      : '';
    return (
      '<div class="product-card" data-cat="'+p.cat+'">' +
        '<div class="product-media">'+mediaHTML(p)+badge+'</div>' +
        '<div class="product-body">' +
          '<h3>'+p.name+'</h3>' +
          '<p>'+p.desc+'</p>' +
          '<div class="product-foot">' +
            '<span class="product-price">'+formatPrice(p.price)+'</span>' +
            '<div class="product-actions">' +
              '<button class="product-add" type="button" data-id="'+p.id+'" aria-label="Agregar '+p.name+' al carrito"><svg><use href="#icon-cart"/></svg></button>' +
              '<a class="product-order" href="'+waLink(p)+'" target="_blank" rel="noopener">' +
                '<svg><use href="#icon-whatsapp"/></svg>Pedir' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderCatalog(filter){
    if (filter) currentFilter = filter;
    var grid = document.getElementById('catalogGrid');
    if (!grid) return;
    var list = currentFilter === 'todas' ? PRODUCTS : PRODUCTS.filter(function(p){ return p.cat === currentFilter; });
    grid.innerHTML = list.map(cardHTML).join('');
    gsap.fromTo(grid.querySelectorAll('.product-card'),
      { opacity:0, y:26 },
      { opacity:1, y:0, duration:.55, ease:'power3.out', stagger:.05 }
    );
  }

  function initCatalog(){
    renderCatalog('todas');
    var filters = document.getElementById('catalogFilters');
    var grid = document.getElementById('catalogGrid');

    if (filters){
      filters.addEventListener('click', function(e){
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filters.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        renderCatalog(btn.dataset.filter);
      });
    }

    if (grid){
      grid.addEventListener('click', function(e){
        var btn = e.target.closest('.product-add');
        if (!btn) return;
        addToCart(btn.dataset.id);
        btn.classList.add('is-added');
        setTimeout(function(){ btn.classList.remove('is-added'); }, 500);
      });
    }
  }

  /* =================================================================
     FIREBASE (Authentication + Firestore)
     -> Backend real para el panel de administrador: el login del admin
        y los pedidos de los clientes viven en Firebase, no en este
        navegador, así que cualquier pedido llega al admin sin importar
        desde qué celular/computador lo hizo el cliente.
     -> Configura tu proyecto en assets/js/firebase-config.js. Mientras
        no lo hagas, el login y los pedidos quedan desactivados (el
        resto del sitio —catálogo, carrito, WhatsApp— sigue funcionando).
  ================================================================= */
  var FB_PLACEHOLDER = 'PON_AQUI_TU_API_KEY';
  var fbAuth = null, fbDb = null;

  function firebaseReady(){ return !!(fbAuth && fbDb); }

  function initFirebase(){
    if (typeof FIREBASE_CONFIG === 'undefined') return;
    if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === FB_PLACEHOLDER) return;
    if (typeof firebase === 'undefined') return;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
    } catch(e){
      console.error('No se pudo iniciar Firebase:', e);
    }
  }

  /* =================================================================
     CARRITO DE COMPRAS
     -> Estado guardado en localStorage (CART_KEY) como [{id, qty}].
     -> Al confirmar, el pedido se guarda en Firestore (para el panel
        del admin) y además se abre WhatsApp con el detalle, que sigue
        siendo el canal directo de contacto con el cliente.
  ================================================================= */
  var CART = [];
  var checkoutPayMethod = 'contra_entrega';
  var PAYMENT_LINK = ''; // Pega aquí tu link de pago (Wompi, ePayco, PayU, Mercado Pago...) cuando lo tengas.

  function loadCart(){
    try {
      var raw = localStorage.getItem(CART_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch(e){ return []; }
  }

  function saveCart(){
    localStorage.setItem(CART_KEY, JSON.stringify(CART));
  }

  function cartCount(){
    return CART.reduce(function(sum, item){ return sum + item.qty; }, 0);
  }

  function cartTotal(){
    return CART.reduce(function(sum, item){
      var p = getProduct(item.id);
      return p ? sum + p.price * item.qty : sum;
    }, 0);
  }

  function addToCart(id){
    id = Number(id);
    if (!getProduct(id)) return;
    var entry = CART.filter(function(i){ return i.id === id; })[0];
    if (entry) entry.qty += 1;
    else CART.push({ id:id, qty:1 });
    saveCart();
    renderCart();
    openCart();
  }

  function setQty(id, qty){
    id = Number(id);
    var entry = CART.filter(function(i){ return i.id === id; })[0];
    if (!entry) return;
    entry.qty = qty;
    if (entry.qty <= 0) CART = CART.filter(function(i){ return i.id !== id; });
    saveCart();
    renderCart();
  }

  function removeFromCart(id){
    id = Number(id);
    CART = CART.filter(function(i){ return i.id !== id; });
    saveCart();
    renderCart();
  }

  function clearCart(){
    if (!CART.length) return;
    if (!window.confirm('¿Vaciar todo el carrito?')) return;
    CART = [];
    saveCart();
    renderCart();
  }

  function cartItemHTML(item){
    var p = getProduct(item.id);
    if (!p) return '';
    return (
      '<div class="cart-item" data-id="'+p.id+'">' +
        '<div class="cart-item-media">'+mediaHTML(p)+'</div>' +
        '<div class="cart-item-info">' +
          '<h4>'+p.name+'</h4>' +
          '<span class="cart-item-price">'+formatPrice(p.price)+' c/u</span>' +
        '</div>' +
        '<button class="cart-item-remove" type="button" aria-label="Eliminar '+p.name+'"><svg><use href="#icon-trash"/></svg></button>' +
        '<div class="cart-item-qty">' +
          '<button class="qty-btn qty-minus" type="button" aria-label="Quitar uno"><svg><use href="#icon-minus"/></svg></button>' +
          '<span class="qty-val">'+item.qty+'</span>' +
          '<button class="qty-btn qty-plus" type="button" aria-label="Agregar uno"><svg><use href="#icon-plus"/></svg></button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderCart(){
    var drawer = document.getElementById('cartDrawer');
    var items = document.getElementById('cartItems');
    var count = document.getElementById('cartCount');
    var total = document.getElementById('cartTotal');
    if (!drawer || !items) return;

    items.innerHTML = CART.map(cartItemHTML).join('');
    drawer.classList.toggle('is-cart-empty', CART.length === 0);

    var n = cartCount();
    count.textContent = n;
    count.classList.toggle('is-visible', n > 0);
    total.textContent = formatPrice(cartTotal());
  }

  function openCart(){ openPanel(document.getElementById('cartDrawer')); }

  function handleCheckout(){
    if (!CART.length) return;
    var nameEl = document.getElementById('custName');
    var phoneEl = document.getElementById('custPhone');
    var addressEl = document.getElementById('custAddress');
    var errEl = document.getElementById('cartOrderError');
    var name = nameEl.value.trim();
    var phone = phoneEl.value.trim();
    var address = addressEl.value.trim();

    if (!name || !phone){
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    var itemsSnapshot = CART.map(function(item){
      var p = getProduct(item.id);
      return { id:item.id, name: p ? p.name : 'Producto', price: p ? p.price : 0, qty: item.qty };
    });
    var total = cartTotal();
    var method = checkoutPayMethod;

    if (method === 'online' && PAYMENT_LINK){
      window.open(PAYMENT_LINK, '_blank', 'noopener');
    }

    var waMsg = 'Hola Dikkos! 🧡 Quiero hacer este pedido:\n' +
      itemsSnapshot.map(function(it){ return '- ' + it.qty + 'x ' + it.name + ' (' + formatPrice(it.price * it.qty) + ')'; }).join('\n') +
      '\n\nTotal: ' + formatPrice(total) +
      '\nNombre: ' + name +
      '\nTeléfono: ' + phone +
      (address ? '\nDirección: ' + address : '') +
      '\nPago: ' + (method === 'online' ? 'En línea' : 'Contra entrega');
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(waMsg), '_blank', 'noopener');

    if (firebaseReady()){
      fbDb.collection('orders').add({
        items: itemsSnapshot,
        total: total,
        customerName: name,
        phone: phone,
        address: address,
        paymentMethod: method,
        status: 'nuevo',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function(err){ console.error('No se pudo guardar el pedido en Firestore:', err); });
    }

    CART = [];
    saveCart();
    renderCart();
    nameEl.value = '';
    phoneEl.value = '';
    addressEl.value = '';
    closeAllPanels();
  }

  function initCart(){
    CART = loadCart();
    renderCart();

    var cartBtn = document.getElementById('cartBtn');
    var closeBtn = document.getElementById('cartClose');
    var items = document.getElementById('cartItems');
    var clearBtn = document.getElementById('cartClear');
    var emptyCta = document.getElementById('cartEmptyCta');
    var checkoutBtn = document.getElementById('cartCheckout');
    var payMethod = document.getElementById('payMethod');

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeAllPanels);
    if (emptyCta) emptyCta.addEventListener('click', closeAllPanels);
    if (clearBtn) clearBtn.addEventListener('click', clearCart);
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

    ['custName', 'custPhone'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function(){ document.getElementById('cartOrderError').hidden = true; });
    });

    if (payMethod){
      payMethod.addEventListener('click', function(e){
        var btn = e.target.closest('.pay-option');
        if (!btn) return;
        payMethod.querySelectorAll('.pay-option').forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        checkoutPayMethod = btn.dataset.method;
      });
    }

    if (items){
      items.addEventListener('click', function(e){
        var row = e.target.closest('.cart-item');
        if (!row) return;
        var id = row.dataset.id;
        if (e.target.closest('.qty-plus')){
          var entry = CART.filter(function(i){ return i.id === Number(id); })[0];
          setQty(id, entry ? entry.qty + 1 : 1);
        } else if (e.target.closest('.qty-minus')){
          var entry2 = CART.filter(function(i){ return i.id === Number(id); })[0];
          if (entry2) setQty(id, entry2.qty - 1);
        } else if (e.target.closest('.cart-item-remove')){
          removeFromCart(id);
        }
      });
    }
  }

  /* =================================================================
     PANEL / MODAL HELPERS (compartidos por carrito y admin)
  ================================================================= */
  function openPanel(el){
    if (!el) return;
    document.getElementById('uiOverlay').classList.add('is-open');
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeAllPanels(){
    document.getElementById('uiOverlay').classList.remove('is-open');
    document.querySelectorAll('.cart-drawer.is-open, .ui-modal.is-open').forEach(function(el){
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('no-scroll');
  }

  // Closes a single panel, leaving any panel underneath it (e.g. the
  // admin panel behind the product editor) open and visible.
  function closePanel(el){
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.cart-drawer.is-open, .ui-modal.is-open')){
      document.getElementById('uiOverlay').classList.remove('is-open');
      document.body.classList.remove('no-scroll');
    }
  }

  function initPanels(){
    var overlay = document.getElementById('uiOverlay');
    if (overlay) overlay.addEventListener('click', closeAllPanels);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeAllPanels();
    });
  }

  /* =================================================================
     ADMINISTRADOR
     -> El login usa Firebase Authentication (correo/contraseña real,
        creado por ti en la consola de Firebase — ver
        assets/js/firebase-config.js). Ya no hay contraseña alguna
        escrita en este archivo.
     -> Los PRODUCTOS se siguen editando en localStorage (no dependen
        de Firebase). Los PEDIDOS viven en Firestore y llegan en vivo
        a esta pestaña sin importar desde qué dispositivo pidió el
        cliente.
  ================================================================= */
  var isAdminLoggedIn = false;
  var currentAdminTab = 'pedidos';

  function setAdminUI(){
    var btn = document.getElementById('adminBtn');
    if (btn) btn.classList.toggle('is-authed', isAdminLoggedIn);
  }

  function openAdminEntry(){
    var notice = document.getElementById('firebaseSetupNotice');
    var form = document.getElementById('adminLoginForm');
    if (!firebaseReady()){
      notice.hidden = false;
      form.hidden = true;
      openPanel(document.getElementById('adminLoginModal'));
      return;
    }
    notice.hidden = true;
    form.hidden = false;
    if (isAdminLoggedIn) openAdminPanel();
    else openPanel(document.getElementById('adminLoginModal'));
  }

  function openAdminPanel(){
    renderAdminList();
    renderOrders();
    setAdminTab('pedidos');
    openPanel(document.getElementById('adminPanelModal'));
  }

  function setAdminTab(tab){
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(function(btn){
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    var showOrders = tab === 'pedidos';
    document.getElementById('adminProductActions').hidden = showOrders;
    document.querySelectorAll('#adminPanelModal > .admin-note[data-tab="productos"]').forEach(function(el){
      el.hidden = showOrders;
    });
    document.getElementById('adminProductList').hidden = showOrders;
    document.getElementById('ordersFirebaseNotice').hidden = !showOrders || firebaseReady();
    document.getElementById('adminOrdersList').hidden = !showOrders || !firebaseReady();
  }

  function initAdminTabs(){
    var tabs = document.getElementById('adminTabs');
    if (!tabs) return;
    tabs.addEventListener('click', function(e){
      var btn = e.target.closest('.admin-tab');
      if (!btn) return;
      setAdminTab(btn.dataset.tab);
    });
  }

  /* ---------- PEDIDOS (Firestore) ---------- */
  var ORDERS = [];
  var ordersUnsub = null;
  var ORDER_STATUSES = [
    { value:'nuevo', label:'Nuevo' },
    { value:'preparando', label:'En preparación' },
    { value:'listo', label:'Listo' },
    { value:'entregado', label:'Entregado' },
    { value:'cancelado', label:'Cancelado' }
  ];

  function orderStatusLabel(value){
    var match = ORDER_STATUSES.filter(function(s){ return s.value === value; })[0];
    return match ? match.label : ORDER_STATUSES[0].label;
  }

  function timeAgo(ts){
    if (!ts || typeof ts.toDate !== 'function') return 'justo ahora';
    var mins = Math.round((Date.now() - ts.toDate().getTime()) / 60000);
    if (mins < 1) return 'justo ahora';
    if (mins < 60) return 'hace ' + mins + ' min';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return 'hace ' + hrs + ' h';
    return 'hace ' + Math.round(hrs / 24) + ' d';
  }

  function orderRowHTML(order){
    var statusOptions = ORDER_STATUSES.map(function(s){
      return '<option value="'+s.value+'"'+(order.status===s.value?' selected':'')+'>'+s.label+'</option>';
    }).join('');
    var itemsList = (order.items || []).map(function(it){
      return '<li>'+it.qty+'x '+it.name+' — '+formatPrice(it.price*it.qty)+'</li>';
    }).join('');
    return (
      '<div class="order-row status-'+(order.status||'nuevo')+'" data-id="'+order._id+'">' +
        '<div class="order-row-head">' +
          '<div><h4>'+(order.customerName||'Sin nombre')+'</h4>' +
            '<span class="order-meta">'+(order.phone||'')+' · '+timeAgo(order.createdAt)+'</span></div>' +
          '<span class="order-status-badge">'+orderStatusLabel(order.status)+'</span>' +
        '</div>' +
        '<ul class="order-items">'+itemsList+'</ul>' +
        (order.address ? '<div class="order-address">📍 '+order.address+'</div>' : '') +
        '<div class="order-row-foot">' +
          '<span class="order-total">Total: '+formatPrice(order.total||0)+'</span>' +
          '<span class="order-pay">'+(order.paymentMethod==='online' ? 'Pago en línea' : 'Contra entrega')+'</span>' +
        '</div>' +
        '<select class="order-status-select" aria-label="Estado del pedido">'+statusOptions+'</select>' +
      '</div>'
    );
  }

  function renderOrders(){
    var list = document.getElementById('adminOrdersList');
    if (!list) return;
    list.innerHTML = ORDERS.length
      ? ORDERS.map(orderRowHTML).join('')
      : '<p class="admin-empty-note">Aún no han llegado pedidos.</p>';
    updateOrdersBadge();
  }

  function updateOrdersBadge(){
    var badge = document.getElementById('ordersNewBadge');
    if (!badge) return;
    var n = ORDERS.filter(function(o){ return o.status === 'nuevo'; }).length;
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  function subscribeOrders(){
    if (!firebaseReady() || ordersUnsub) return;
    ordersUnsub = fbDb.collection('orders').orderBy('createdAt', 'desc').onSnapshot(function(snap){
      ORDERS = snap.docs.map(function(doc){
        var d = doc.data();
        d._id = doc.id;
        return d;
      });
      renderOrders();
    }, function(err){
      console.error('No se pudieron cargar los pedidos:', err);
    });
  }

  function unsubscribeOrders(){
    if (ordersUnsub){ ordersUnsub(); ordersUnsub = null; }
    ORDERS = [];
    updateOrdersBadge();
  }

  function initOrders(){
    var list = document.getElementById('adminOrdersList');
    if (!list) return;
    list.addEventListener('change', function(e){
      var select = e.target.closest('.order-status-select');
      if (!select || !firebaseReady()) return;
      var row = select.closest('.order-row');
      fbDb.collection('orders').doc(row.dataset.id).update({ status: select.value }).catch(function(err){
        console.error('No se pudo actualizar el pedido:', err);
      });
    });
  }

  /* ---------- PRODUCTOS (localStorage) ---------- */
  function adminRowHTML(p){
    return (
      '<div class="admin-product-row" data-id="'+p.id+'">' +
        '<div class="thumb">'+mediaHTML(p)+'</div>' +
        '<div class="info"><h4>'+p.name+'</h4><span>'+p.cat+'</span></div>' +
        '<div class="price">'+formatPrice(p.price)+'</div>' +
        '<div class="admin-row-actions">' +
          '<button class="row-edit" type="button" aria-label="Editar '+p.name+'"><svg><use href="#icon-pencil"/></svg></button>' +
          '<button class="row-delete" type="button" aria-label="Eliminar '+p.name+'"><svg><use href="#icon-trash"/></svg></button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderAdminList(){
    var list = document.getElementById('adminProductList');
    if (!list) return;
    list.innerHTML = PRODUCTS.length
      ? PRODUCTS.map(adminRowHTML).join('')
      : '<p class="admin-empty-note">No hay productos. Agrega el primero con "+ Nuevo producto".</p>';
  }

  function openProductEditor(product){
    var form = document.getElementById('productEditorForm');
    var title = document.getElementById('productEditorTitle');
    form.reset();
    document.getElementById('prodId').value = product ? product.id : '';
    document.getElementById('prodName').value = product ? product.name : '';
    document.getElementById('prodCat').value = product ? product.cat : 'tradicionales';
    document.getElementById('prodDesc').value = product ? product.desc : '';
    document.getElementById('prodPrice').value = product ? product.price : '';
    document.getElementById('prodEmoji').value = product && product.emoji ? product.emoji : '';
    document.getElementById('prodImg').value = product && product.img ? product.img : '';
    document.getElementById('prodBadge').value = product && product.badge ? product.badge : '';
    document.getElementById('prodBadgeType').value = product && product.badgeType ? product.badgeType : 'gold';
    title.textContent = product ? 'Editar producto' : 'Nuevo producto';
    openPanel(document.getElementById('productEditorModal'));
  }

  function saveProductFromForm(e){
    e.preventDefault();
    var id = document.getElementById('prodId').value;
    var price = Number(document.getElementById('prodPrice').value);
    if (!price || price < 0) return;

    var data = {
      cat: document.getElementById('prodCat').value,
      name: document.getElementById('prodName').value.trim(),
      desc: document.getElementById('prodDesc').value.trim(),
      price: price,
      emoji: document.getElementById('prodEmoji').value.trim(),
      img: document.getElementById('prodImg').value.trim(),
      badge: document.getElementById('prodBadge').value.trim(),
      badgeType: document.getElementById('prodBadgeType').value
    };
    if (!data.name || !data.desc) return;
    if (!data.img) delete data.img;
    if (!data.emoji) delete data.emoji;
    if (!data.badge){ delete data.badge; delete data.badgeType; }

    if (id){
      var existing = getProduct(id);
      if (existing) Object.assign(existing, data);
    } else {
      var nextId = PRODUCTS.reduce(function(max, p){ return Math.max(max, p.id); }, 0) + 1;
      data.id = nextId;
      PRODUCTS.push(data);
    }

    saveProducts();
    renderCatalog();
    renderAdminList();
    closePanel(document.getElementById('productEditorModal'));
  }

  function initAdmin(){
    setAdminUI();

    var adminBtn = document.getElementById('adminBtn');
    var loginForm = document.getElementById('adminLoginForm');
    var loginClose = document.getElementById('adminLoginClose');
    var loginError = document.getElementById('adminError');
    var panelClose = document.getElementById('adminPanelClose');
    var logoutBtn = document.getElementById('adminLogout');
    var addBtn = document.getElementById('adminAddProduct');
    var restoreBtn = document.getElementById('adminRestore');
    var productList = document.getElementById('adminProductList');
    var editorForm = document.getElementById('productEditorForm');
    var editorClose = document.getElementById('productEditorClose');
    var editorCancel = document.getElementById('productEditorCancel');

    if (adminBtn) adminBtn.addEventListener('click', openAdminEntry);
    if (loginClose) loginClose.addEventListener('click', closeAllPanels);
    if (panelClose) panelClose.addEventListener('click', closeAllPanels);
    if (editorClose) editorClose.addEventListener('click', function(){ closePanel(document.getElementById('productEditorModal')); });
    if (editorCancel) editorCancel.addEventListener('click', function(){ closePanel(document.getElementById('productEditorModal')); });

    if (loginForm){
      loginForm.addEventListener('submit', function(e){
        e.preventDefault();
        if (!firebaseReady()) return;
        var email = document.getElementById('adminUser').value.trim();
        var pass = document.getElementById('adminPass').value;
        loginError.hidden = true;
        fbAuth.signInWithEmailAndPassword(email, pass).then(function(){
          loginForm.reset();
          closeAllPanels();
          openAdminPanel();
        }).catch(function(){
          loginError.hidden = false;
        });
      });
    }

    if (logoutBtn){
      logoutBtn.addEventListener('click', function(){
        if (firebaseReady()) fbAuth.signOut();
        closeAllPanels();
      });
    }

    if (addBtn) addBtn.addEventListener('click', function(){ openProductEditor(null); });

    if (restoreBtn){
      restoreBtn.addEventListener('click', function(){
        if (!window.confirm('¿Restaurar el catálogo original? Se perderán tus cambios guardados en este navegador.')) return;
        localStorage.removeItem(PRODUCTS_KEY);
        PRODUCTS = cloneProducts(DEFAULT_PRODUCTS);
        renderCatalog();
        renderAdminList();
      });
    }

    if (productList){
      productList.addEventListener('click', function(e){
        var row = e.target.closest('.admin-product-row');
        if (!row) return;
        var id = row.dataset.id;
        if (e.target.closest('.row-edit')){
          openProductEditor(getProduct(id));
        } else if (e.target.closest('.row-delete')){
          var p = getProduct(id);
          if (p && window.confirm('¿Eliminar "'+p.name+'" del catálogo?')){
            PRODUCTS = PRODUCTS.filter(function(item){ return item.id !== Number(id); });
            saveProducts();
            renderCatalog();
            renderAdminList();
          }
        }
      });
    }

    if (editorForm) editorForm.addEventListener('submit', saveProductFromForm);
  }

  function initAdminAuth(){
    if (!firebaseReady()){ setAdminUI(); return; }
    fbAuth.onAuthStateChanged(function(user){
      isAdminLoggedIn = !!user;
      setAdminUI();
      if (isAdminLoggedIn) subscribeOrders();
      else unsubscribeOrders();
    });
  }

  /* =================================================================
     PRELOADER — falling empanadas + progress
  ================================================================= */
  function initPreloader(done){
    var pre = document.getElementById('preloader');
    var rain = document.getElementById('preloaderRain');
    var pct = document.getElementById('preloaderPct');
    var fill = document.getElementById('preloaderFill');

    if (!pre){ done(); return; }

    if (reduceMotion){
      pre.style.display = 'none';
      done();
      return;
    }

    var pieces = 16;
    for (var i=0; i<pieces; i++){
      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS,'svg');
      svg.setAttribute('viewBox','0 0 100 56');
      svg.classList.add('rain-piece');
      var use = document.createElementNS(svgNS,'use');
      use.setAttributeNS('http://www.w3.org/1999/xlink','href','#icon-empanada');
      use.setAttribute('href','#icon-empanada');
      svg.appendChild(use);
      var left = Math.random()*100;
      var size = 20 + Math.random()*28;
      svg.style.left = left+'%';
      svg.style.width = size+'px';
      rain.appendChild(svg);

      gsap.set(svg, { y:'-20vh', rotation: Math.random()*360, opacity:.3+Math.random()*.6 });
      gsap.to(svg, {
        y:'120vh',
        rotation:'+='+(Math.random()>0.5 ? 340 : -340),
        x:'+='+(Math.random()*80-40),
        duration: 3.5 + Math.random()*3,
        delay: Math.random()*2.5,
        repeat:-1,
        ease:'none'
      });
    }

    var progress = { val:0 };
    var tl = gsap.timeline();
    tl.to(progress, {
      val:92, duration:1.8, ease:'power2.out',
      onUpdate:function(){
        var v = Math.round(progress.val);
        pct.textContent = v;
        fill.style.width = v+'%';
      }
    });

    window.addEventListener('load', function(){
      gsap.to(progress, {
        val:100, duration:.5, ease:'power1.out',
        onUpdate:function(){
          var v = Math.round(progress.val);
          pct.textContent = v;
          fill.style.width = v+'%';
        },
        onComplete:function(){
          gsap.to(pre, {
            yPercent:-100, duration:.9, ease:'power4.inOut', delay:.15,
            onComplete:function(){
              pre.style.display = 'none';
              done();
            }
          });
        }
      });
    });
  }

  /* =================================================================
     HERO INTRO
  ================================================================= */
  function heroIntro(){
    gsap.timeline({ defaults:{ ease:'power4.out' } })
      .to('.reveal-word', { y:'0%', duration:1, stagger:.06 })
      .to('.hero-eyebrow, .hero-sub, .hero-actions', { opacity:1, y:0, duration:.9, stagger:.12 }, '-=.6');

    document.querySelectorAll('.floaty').forEach(function(el, i){
      if (reduceMotion) return;
      gsap.to(el, { y:'+=24', rotation:'+=10', duration:2.6+i*.4, ease:'sine.inOut', yoyo:true, repeat:-1 });
    });
    document.querySelectorAll('.cta-float').forEach(function(el, i){
      if (reduceMotion) return;
      gsap.to(el, { y:'+=30', rotation:'+=16', duration:3+i*.5, ease:'sine.inOut', yoyo:true, repeat:-1 });
    });
  }

  /* =================================================================
     GENERIC SCROLL REVEALS
  ================================================================= */
  function initReveals(){
    ScrollTrigger.batch('.reveal', {
      start:'top 88%',
      once:true,
      onEnter:function(batch){
        gsap.to(batch, { opacity:1, y:0, duration:.9, ease:'power3.out', stagger:.1 });
      }
    });
  }

  /* =================================================================
     STAT COUNTERS
  ================================================================= */
  function initCounters(){
    document.querySelectorAll('.stat-num').forEach(function(el){
      var target = parseFloat(el.dataset.count) || 0;
      ScrollTrigger.create({
        trigger: el, start:'top 90%', once:true,
        onEnter:function(){
          var obj = { val:0 };
          gsap.to(obj, {
            val: target, duration:1.6, ease:'power2.out',
            onUpdate:function(){ el.textContent = Math.floor(obj.val); }
          });
        }
      });
    });
  }

  /* =================================================================
     PROCESS — pinned horizontal scroll (desktop only)
  ================================================================= */
  function initProcess(){
    var mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', function(){
      var track = document.getElementById('processTrack');
      if (!track) return;
      var getDistance = function(){ return track.scrollWidth - window.innerWidth + 80; };
      var tween = gsap.to(track, {
        x: function(){ return -getDistance(); },
        ease:'none',
        scrollTrigger:{
          trigger:'.process',
          start:'top top',
          end: function(){ return '+=' + getDistance(); },
          pin:true,
          scrub:.6,
          invalidateOnRefresh:true
        }
      });
      return function(){ tween.kill(); };
    });
  }

  /* =================================================================
     SCROLL MASCOT — rolling empanada travels down the page
  ================================================================= */
  function initScrollMascot(){
    var mascot = document.getElementById('scrollMascot');
    if (!mascot || reduceMotion) return;
    ScrollTrigger.create({
      trigger: document.documentElement,
      start:'top top',
      end:'bottom bottom',
      scrub:.4,
      onUpdate:function(self){
        var p = self.progress;
        var vh = window.innerHeight;
        var travel = Math.max(vh - 170, 0);
        var y = 120 + p*travel;
        var x = Math.sin(p*Math.PI*10)*36;
        var rot = p*360*8;
        gsap.set(mascot, { y:y, x:x, rotation:rot });
      }
    });
  }

  /* =================================================================
     HEADER + MOBILE NAV
  ================================================================= */
  function initHeader(){
    var header = document.getElementById('siteHeader');
    var nav = document.getElementById('mainNav');
    var burger = document.getElementById('hamburger');

    window.addEventListener('scroll', function(){
      header.classList.toggle('is-scrolled', window.scrollY > 60);
    }, { passive:true });

    function closeNav(){
      nav.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded','false');
      document.body.classList.remove('no-scroll');
    }

    burger.addEventListener('click', function(){
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });

    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', closeNav);
    });
  }

  /* =================================================================
     WHATSAPP FLOAT VISIBILITY
  ================================================================= */
  function initWhatsappFloat(){
    var float = document.getElementById('whatsappFloat');
    if (!float) return;
    ScrollTrigger.create({
      trigger:'.hero',
      start:'bottom top',
      onEnter:function(){ float.classList.add('is-visible'); },
      onLeaveBack:function(){ float.classList.remove('is-visible'); }
    });
  }

  /* =================================================================
     LIGHTBOX
  ================================================================= */
  function initLightbox(){
    var lightbox = document.getElementById('lightbox');
    var img = document.getElementById('lightboxImg');
    var closeBtn = document.getElementById('lightboxClose');
    if (!lightbox) return;

    document.querySelectorAll('.g-item[data-full]').forEach(function(item){
      item.addEventListener('click', function(){
        img.src = item.dataset.full;
        img.alt = item.querySelector('img') ? item.querySelector('img').alt : '';
        lightbox.classList.add('is-open');
      });
    });

    function close(){ lightbox.classList.remove('is-open'); }
    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', function(e){ if (e.target === lightbox) close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  }

  /* =================================================================
     SMOOTH SCROLL (Lenis + GSAP ScrollTrigger)
  ================================================================= */
  function initSmoothScroll(){
    if (reduceMotion || typeof Lenis === 'undefined') return;
    var lenis = new Lenis({ duration:1.1, smoothWheel:true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(time){ lenis.raf(time*1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* =================================================================
     ANCHOR LINKS (account for fixed header)
  ================================================================= */
  function initAnchors(){
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 84;
        window.scrollTo({ top:top, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* =================================================================
     INIT
  ================================================================= */
  document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('year').textContent = new Date().getFullYear();

    initFirebase();
    initCatalog();
    initCart();
    initPanels();
    initAdmin();
    initAdminTabs();
    initOrders();
    initAdminAuth();
    initHeader();
    initAnchors();
    initLightbox();
    initWhatsappFloat();

    initPreloader(function(){
      initSmoothScroll();
      heroIntro();
      initReveals();
      initCounters();
      initProcess();
      initScrollMascot();
      ScrollTrigger.refresh();
    });
  });

})();
