/* ===================================================================
   DIKKOS EMPANADAS — main.js (sitio público)
   El panel de administrador vive aparte, en admin.html/admin.js.
=================================================================== */
(function(){
  "use strict";

  var D = window.Dikkos;

  gsap.registerPlugin(ScrollTrigger);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =================================================================
     CATÁLOGO
  ================================================================= */
  var PRODUCTS = D.loadProducts();
  var currentFilter = 'todas';

  function getProduct(id){
    id = Number(id);
    for (var i=0; i<PRODUCTS.length; i++){ if (PRODUCTS[i].id === id) return PRODUCTS[i]; }
    return null;
  }

  function cardHTML(p){
    var badge = p.badge
      ? '<span class="product-badge'+(p.badgeType==='gold' ? ' is-gold' : '')+'">'+D.escapeHtml(p.badge)+'</span>'
      : '';
    return (
      '<div class="product-card" data-cat="'+p.cat+'">' +
        '<div class="product-media">'+D.mediaHTML(p)+badge+'</div>' +
        '<div class="product-body">' +
          '<h3>'+D.escapeHtml(p.name)+'</h3>' +
          '<p>'+D.escapeHtml(p.desc)+'</p>' +
          '<div class="product-foot">' +
            '<span class="product-price">'+D.formatPrice(p.price)+'</span>' +
            '<button class="product-add" type="button" data-id="'+p.id+'" aria-label="Agregar '+D.escapeHtml(p.name)+' al carrito">' +
              '<svg><use href="#icon-cart"/></svg>Agregar' +
            '</button>' +
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
     CARRITO DE COMPRAS
     -> Estado guardado en localStorage (CART_KEY) como [{id, qty}].
     -> Al confirmar, el pedido se guarda en Firestore y se abre el
        chat en vivo para ese pedido.
  ================================================================= */
  var CART_KEY = 'dikkos_cart_v1';
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
    resetCartSuccess();
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
        '<div class="cart-item-media">'+D.mediaHTML(p)+'</div>' +
        '<div class="cart-item-info">' +
          '<h4>'+D.escapeHtml(p.name)+'</h4>' +
          '<span class="cart-item-price">'+D.formatPrice(p.price)+' c/u</span>' +
        '</div>' +
        '<button class="cart-item-remove" type="button" aria-label="Eliminar '+D.escapeHtml(p.name)+'"><svg><use href="#icon-trash"/></svg></button>' +
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
    total.textContent = D.formatPrice(cartTotal());
  }

  function openCart(){ openPanel(document.getElementById('cartDrawer')); }

  function showCartSuccess(name, total){
    document.getElementById('cartDrawer').classList.add('is-order-success');
    document.getElementById('cartCheckoutForm').hidden = true;
    document.getElementById('cartSuccessMsg').textContent =
      'Gracias' + (name ? ', ' + name : '') + '. Tu pedido por ' + D.formatPrice(total) +
      ' fue recibido. Te contactaremos pronto para confirmar la entrega.';
    document.getElementById('cartSuccess').hidden = false;
  }

  function resetCartSuccess(){
    document.getElementById('cartDrawer').classList.remove('is-order-success');
    document.getElementById('cartCheckoutForm').hidden = false;
    document.getElementById('cartSuccess').hidden = true;
  }

  function handleCheckout(){
    if (!CART.length) return;
    var nameEl = document.getElementById('custName');
    var phoneEl = document.getElementById('custPhone');
    var addressEl = document.getElementById('custAddress');
    var errEl = document.getElementById('cartOrderError');
    var btn = document.getElementById('cartCheckout');
    var name = nameEl.value.trim();
    var phone = phoneEl.value.trim();
    var address = addressEl.value.trim();

    if (!name || !phone){
      errEl.textContent = 'Escribe tu nombre y teléfono para continuar.';
      errEl.hidden = false;
      return;
    }
    if (!D.firebaseReady()){
      errEl.textContent = 'Los pedidos en línea aún no están activados. Vuelve a intentarlo más tarde.';
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

    btn.disabled = true;
    D.db().collection('orders').add({
      items: itemsSnapshot,
      total: total,
      customerName: name,
      phone: phone,
      address: address,
      paymentMethod: method,
      status: 'nuevo',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(docRef){
      if (method === 'online' && PAYMENT_LINK){
        window.open(PAYMENT_LINK, '_blank', 'noopener');
      }
      CART = [];
      saveCart();
      renderCart();
      showCartSuccess(name, total);
      startChat(docRef.id, name);
      nameEl.value = '';
      phoneEl.value = '';
      addressEl.value = '';
    }).catch(function(err){
      console.error('No se pudo guardar el pedido en Firestore:', err);
      errEl.textContent = 'No pudimos enviar tu pedido. Intenta de nuevo.';
      errEl.hidden = false;
    }).finally(function(){
      btn.disabled = false;
    });
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
    var successClose = document.getElementById('cartSuccessClose');
    var heroCartBtn = document.getElementById('heroCartBtn');

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (heroCartBtn) heroCartBtn.addEventListener('click', openCart);
    if (closeBtn) closeBtn.addEventListener('click', closeAllPanels);
    if (emptyCta) emptyCta.addEventListener('click', closeAllPanels);
    if (clearBtn) clearBtn.addEventListener('click', clearCart);
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
    if (successClose) successClose.addEventListener('click', function(){ resetCartSuccess(); closeAllPanels(); });

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
     PANEL / MODAL HELPERS (compartidos por carrito y chat)
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
    document.querySelectorAll('.cart-drawer.is-open, .chat-panel.is-open').forEach(function(el){
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('no-scroll');
  }

  function initPanels(){
    var overlay = document.getElementById('uiOverlay');
    if (overlay) overlay.addEventListener('click', closeAllPanels);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeAllPanels();
    });
  }

  /* =================================================================
     CHAT EN VIVO
     -> Al confirmar un pedido se crea (o reabre) una conversación
        ligada a ese orderId en Firestore: chats/{orderId}/messages.
        El equipo Dikkos responde desde admin.html; los mensajes
        llegan en tiempo real a ambos lados por onSnapshot.
  ================================================================= */
  var CHAT_ORDER_KEY = 'dikkos_chat_order_id';
  var chatOrderId = null;
  var chatCustomerName = '';
  var chatUnsub = null;
  var chatOpenedAt = 0;

  function chatMsgHTML(msg){
    var mine = msg.sender === 'customer';
    return (
      '<div class="chat-msg ' + (mine ? 'is-customer' : 'is-admin') + '">' +
        D.escapeHtml(msg.text) +
        '<span class="chat-msg-meta">' + (mine ? 'Tú' : 'Dikkos') + '</span>' +
      '</div>'
    );
  }

  function renderChatMessages(list){
    var box = document.getElementById('chatMessages');
    if (!box) return;
    box.innerHTML = list.length
      ? list.map(chatMsgHTML).join('')
      : '<p class="chat-empty-note">Escríbenos lo que necesites sobre tu pedido.</p>';
    box.scrollTop = box.scrollHeight;
  }

  function updateChatBadge(list){
    var badge = document.getElementById('chatBadge');
    var panel = document.getElementById('chatPanel');
    if (!badge || !panel) return;
    var panelOpen = panel.classList.contains('is-open');
    var unseen = list.filter(function(m){
      return m.sender === 'admin' && m.createdAt && typeof m.createdAt.toMillis === 'function' && m.createdAt.toMillis() > chatOpenedAt;
    }).length;
    badge.textContent = unseen;
    badge.hidden = panelOpen || unseen === 0;
  }

  function subscribeChat(orderId){
    if (chatUnsub) chatUnsub();
    chatUnsub = D.db().collection('chats').doc(orderId).collection('messages')
      .orderBy('createdAt')
      .onSnapshot(function(snap){
        var list = snap.docs.map(function(d){ return d.data(); });
        renderChatMessages(list);
        updateChatBadge(list);
      }, function(err){
        console.error('No se pudo cargar el chat:', err);
        renderChatMessages([]);
      });
  }

  function openChatPanel(){
    if (!chatOrderId) return;
    chatOpenedAt = Date.now();
    openPanel(document.getElementById('chatPanel'));
    document.getElementById('chatBadge').hidden = true;
  }

  function startChat(orderId, name){
    chatOrderId = orderId;
    chatCustomerName = name;
    try { localStorage.setItem(CHAT_ORDER_KEY, orderId); } catch(e){}
    document.getElementById('chatFloat').hidden = false;
    D.db().collection('chats').doc(orderId).set({
      customerName: name,
      lastMessage: '',
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      unreadForAdmin: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true }).catch(function(err){ console.error('No se pudo crear el chat:', err); });
    subscribeChat(orderId);
    openChatPanel();
  }

  function sendChatMessage(text){
    text = text.trim();
    if (!text || !chatOrderId || !D.firebaseReady()) return;
    var db = D.db();
    db.collection('chats').doc(chatOrderId).collection('messages').add({
      sender: 'customer',
      senderName: chatCustomerName,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    db.collection('chats').doc(chatOrderId).set({
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      unreadForAdmin: true,
      customerName: chatCustomerName
    }, { merge:true });
  }

  function initChat(){
    var floatBtn = document.getElementById('chatFloat');
    var closeBtn = document.getElementById('chatClose');
    var form = document.getElementById('chatForm');
    var input = document.getElementById('chatInput');
    if (!floatBtn) return;

    floatBtn.addEventListener('click', openChatPanel);
    if (closeBtn) closeBtn.addEventListener('click', closeAllPanels);
    if (form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        sendChatMessage(input.value);
        input.value = '';
      });
    }

    if (D.firebaseReady()){
      try {
        var savedId = localStorage.getItem(CHAT_ORDER_KEY);
        if (savedId){
          chatOrderId = savedId;
          floatBtn.hidden = false;
          subscribeChat(savedId);
        }
      } catch(e){}
    }
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

    /* Progreso estrictamente lineal y monótono (nunca retrocede):
       avanza a velocidad constante hasta PRE_LOAD_CAP mientras la
       página sigue cargando, y solo cruza a 100 una vez que el evento
       'load' real ya se disparó — así el 100% siempre coincide con
       la carga completa, sin importar si la red es rápida o lenta. */
    var RATE_PER_SEC = 46;
    var PRE_LOAD_CAP = 90;
    var progress = 0;
    var pageLoaded = document.readyState === 'complete';

    if (!pageLoaded){
      window.addEventListener('load', function(){ pageLoaded = true; });
    }

    function render(v){
      var rv = Math.round(v);
      pct.textContent = rv;
      fill.style.width = rv + '%';
    }

    function finish(){
      gsap.to(pre, {
        yPercent:-100, duration:.9, ease:'power4.inOut', delay:.15,
        onComplete:function(){
          pre.style.display = 'none';
          done();
        }
      });
    }

    /* lastTime empieza null y se fija con el timestamp del propio rAF en
       el primer frame (en vez de un performance.now() externo) — mezclar
       ambos relojes puede dar un primer delta negativo en algunos
       navegadores, lo que hacía que el contador bajara de 0% a -1%. */
    var lastTime = null;
    function tick(now){
      if (lastTime === null) lastTime = now;
      var deltaSec = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      var cap = pageLoaded ? 100 : PRE_LOAD_CAP;
      if (progress < cap){
        progress = Math.min(cap, progress + RATE_PER_SEC * deltaSec);
        render(progress);
      }
      if (progress >= 100){
        finish();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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

    D.initFirebase();
    initCatalog();
    initCart();
    initPanels();
    initChat();
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
