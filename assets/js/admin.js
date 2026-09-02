/* ===================================================================
   DIKKOS EMPANADAS — admin.js (panel administrador, admin.html)
=================================================================== */
(function(){
  "use strict";

  var D = window.Dikkos;
  D.initFirebase();

  /* =================================================================
     LOGIN / SESIÓN
     -> Cualquier usuario de Firebase Authentication del proyecto se
        trata como administrador (sin roles): así varios agentes del
        equipo pueden loguearse, cada uno con su propia cuenta creada
        en la consola de Firebase.
  ================================================================= */
  function showAuthView(){
    document.getElementById('adminAuthView').hidden = false;
    document.getElementById('adminShell').hidden = true;
  }

  function showShell(){
    document.getElementById('adminAuthView').hidden = true;
    document.getElementById('adminShell').hidden = false;
    var user = D.auth().currentUser;
    document.getElementById('agentEmail').textContent = user ? user.email : '';
  }

  function initAuth(){
    var notice = document.getElementById('firebaseSetupNotice');
    var form = document.getElementById('adminLoginForm');
    var errEl = document.getElementById('adminError');
    var logoutBtn = document.getElementById('adminLogout');

    if (!D.firebaseReady()){
      notice.hidden = false;
      form.hidden = true;
      showAuthView();
      return;
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('adminUser').value.trim();
      var pass = document.getElementById('adminPass').value;
      errEl.hidden = true;
      D.auth().signInWithEmailAndPassword(email, pass).then(function(){
        form.reset();
      }).catch(function(){
        errEl.hidden = false;
      });
    });

    logoutBtn.addEventListener('click', function(){ D.auth().signOut(); });

    D.auth().onAuthStateChanged(function(user){
      if (user){
        showShell();
        subscribeOrders();
        subscribeChats();
      } else {
        showAuthView();
        unsubscribeOrders();
        unsubscribeChats();
      }
    });
  }

  /* =================================================================
     NAVEGACIÓN DE SECCIONES
  ================================================================= */
  function initNav(){
    var nav = document.getElementById('adminNav');
    var sidebar = document.getElementById('adminSidebar');
    var burger = document.getElementById('adminBurger');
    var title = document.getElementById('adminSectionTitle');
    var labels = { pedidos:'Pedidos', productos:'Productos', finanzas:'Finanzas', chats:'Chats' };

    nav.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-section]');
      if (!btn) return;
      var section = btn.dataset.section;
      nav.querySelectorAll('button').forEach(function(b){ b.classList.toggle('is-active', b === btn); });
      document.querySelectorAll('.admin-section').forEach(function(sec){
        sec.classList.toggle('is-active', sec.dataset.section === section);
      });
      title.textContent = labels[section] || '';
      sidebar.classList.remove('is-open');
      if (section === 'finanzas') renderFinance();
    });

    if (burger) burger.addEventListener('click', function(){ sidebar.classList.toggle('is-open'); });
  }

  /* =================================================================
     PEDIDOS
  ================================================================= */
  var ORDERS = [];
  var ordersUnsub = null;

  function orderRowHTML(order){
    var statusOptions = D.ORDER_STATUSES.map(function(s){
      return '<option value="'+s.value+'"'+(order.status===s.value?' selected':'')+'>'+s.label+'</option>';
    }).join('');
    var itemsList = (order.items || []).map(function(it){
      return '<li>'+it.qty+'x '+D.escapeHtml(it.name)+' — '+D.formatPrice(it.price*it.qty)+'</li>';
    }).join('');
    return (
      '<div class="order-row status-'+(order.status||'nuevo')+'" data-id="'+order._id+'">' +
        '<div class="order-row-head">' +
          '<div><h4>'+D.escapeHtml(order.customerName||'Sin nombre')+'</h4>' +
            '<span class="order-meta">'+D.escapeHtml(order.phone||'')+' · '+D.timeAgo(order.createdAt)+'</span></div>' +
          '<span class="order-status-badge">'+D.orderStatusLabel(order.status)+'</span>' +
        '</div>' +
        '<ul class="order-items">'+itemsList+'</ul>' +
        (order.address ? '<div class="order-address">📍 '+D.escapeHtml(order.address)+'</div>' : '') +
        '<div class="order-row-foot">' +
          '<span class="order-total">Total: '+D.formatPrice(order.total||0)+'</span>' +
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
    var badge = document.getElementById('ordersNewBadge');
    var n = ORDERS.filter(function(o){ return o.status === 'nuevo'; }).length;
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  function subscribeOrders(){
    if (!D.firebaseReady() || ordersUnsub) return;
    ordersUnsub = D.db().collection('orders').orderBy('createdAt', 'desc').onSnapshot(function(snap){
      ORDERS = snap.docs.map(function(doc){
        var d = doc.data();
        d._id = doc.id;
        return d;
      });
      renderOrders();
      renderFinance();
    }, function(err){
      console.error('No se pudieron cargar los pedidos:', err);
      renderOrders();
    });
  }

  function unsubscribeOrders(){
    if (ordersUnsub){ ordersUnsub(); ordersUnsub = null; }
    ORDERS = [];
  }

  function initOrders(){
    var list = document.getElementById('adminOrdersList');
    list.addEventListener('change', function(e){
      var select = e.target.closest('.order-status-select');
      if (!select) return;
      var row = select.closest('.order-row');
      D.db().collection('orders').doc(row.dataset.id).update({ status: select.value }).catch(function(err){
        console.error('No se pudo actualizar el pedido:', err);
      });
    });
  }

  /* =================================================================
     PRODUCTOS (localStorage) + subida de fotos a Firebase Storage
  ================================================================= */
  var PRODUCTS = D.loadProducts();

  function getProduct(id){
    id = Number(id);
    for (var i=0; i<PRODUCTS.length; i++){ if (PRODUCTS[i].id === id) return PRODUCTS[i]; }
    return null;
  }

  function adminRowHTML(p){
    return (
      '<div class="admin-product-row" data-id="'+p.id+'">' +
        '<div class="thumb">'+D.mediaHTML(p)+'</div>' +
        '<div class="info"><h4>'+D.escapeHtml(p.name)+'</h4><span>'+p.cat+'</span></div>' +
        '<div class="price">'+D.formatPrice(p.price)+'</div>' +
        '<div class="admin-row-actions">' +
          '<button class="row-edit" type="button" aria-label="Editar '+D.escapeHtml(p.name)+'"><svg><use href="#icon-pencil"/></svg></button>' +
          '<button class="row-delete" type="button" aria-label="Eliminar '+D.escapeHtml(p.name)+'"><svg><use href="#icon-trash"/></svg></button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderProducts(){
    var list = document.getElementById('adminProductList');
    list.innerHTML = PRODUCTS.length
      ? PRODUCTS.map(adminRowHTML).join('')
      : '<p class="admin-empty-note">No hay productos. Agrega el primero con "+ Nuevo producto".</p>';
  }

  function setImgPreview(product){
    var box = document.getElementById('prodImgPreview');
    if (product && product.img) box.innerHTML = '<img src="'+product.img+'" alt="">';
    else if (product && product.emoji) box.textContent = product.emoji;
    else box.textContent = '🧡';
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
    setImgPreview(product);
    title.textContent = product ? 'Editar producto' : 'Nuevo producto';
    openModal(document.getElementById('productEditorModal'));
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

    D.saveProducts(PRODUCTS);
    renderProducts();
    closeModal(document.getElementById('productEditorModal'));
  }

  function uploadProductImage(file){
    if (!file) return;
    if (!D.storage()){
      window.alert('Firebase Storage no está disponible. Pega una URL de imagen en su lugar.');
      return;
    }
    var progressWrap = document.getElementById('prodImgProgress');
    var progressBar = progressWrap.querySelector('span');
    var safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    var path = 'products/' + Date.now() + '-' + safeName;
    var task = D.storage().ref(path).put(file);

    progressWrap.classList.add('is-active');
    progressBar.style.width = '0%';

    task.on('state_changed', function(snap){
      var pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      progressBar.style.width = pct + '%';
    }, function(err){
      console.error('No se pudo subir la imagen:', err);
      progressWrap.classList.remove('is-active');
      window.alert('No se pudo subir la imagen. Intenta de nuevo.');
    }, function(){
      task.snapshot.ref.getDownloadURL().then(function(url){
        document.getElementById('prodImg').value = url;
        document.getElementById('prodImgPreview').innerHTML = '<img src="'+url+'" alt="">';
        progressWrap.classList.remove('is-active');
      });
    });
  }

  function initProducts(){
    renderProducts();
    var addBtn = document.getElementById('adminAddProduct');
    var restoreBtn = document.getElementById('adminRestore');
    var list = document.getElementById('adminProductList');
    var editorForm = document.getElementById('productEditorForm');
    var editorClose = document.getElementById('productEditorClose');
    var editorCancel = document.getElementById('productEditorCancel');
    var imgFile = document.getElementById('prodImgFile');

    addBtn.addEventListener('click', function(){ openProductEditor(null); });

    restoreBtn.addEventListener('click', function(){
      if (!window.confirm('¿Restaurar el catálogo original? Se perderán tus cambios guardados en este navegador.')) return;
      localStorage.removeItem(D.PRODUCTS_KEY);
      PRODUCTS = D.cloneProducts(D.DEFAULT_PRODUCTS);
      renderProducts();
    });

    list.addEventListener('click', function(e){
      var row = e.target.closest('.admin-product-row');
      if (!row) return;
      var id = row.dataset.id;
      if (e.target.closest('.row-edit')){
        openProductEditor(getProduct(id));
      } else if (e.target.closest('.row-delete')){
        var p = getProduct(id);
        if (p && window.confirm('¿Eliminar "'+p.name+'" del catálogo?')){
          PRODUCTS = PRODUCTS.filter(function(item){ return item.id !== Number(id); });
          D.saveProducts(PRODUCTS);
          renderProducts();
        }
      }
    });

    editorClose.addEventListener('click', function(){ closeModal(document.getElementById('productEditorModal')); });
    editorCancel.addEventListener('click', function(){ closeModal(document.getElementById('productEditorModal')); });
    editorForm.addEventListener('submit', saveProductFromForm);
    if (imgFile){
      imgFile.addEventListener('change', function(){
        if (imgFile.files && imgFile.files[0]) uploadProductImage(imgFile.files[0]);
      });
    }
  }

  /* ---------- Modal del editor de producto ---------- */
  function openModal(el){
    document.getElementById('uiOverlay').classList.add('is-open');
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeModal(el){
    document.getElementById('uiOverlay').classList.remove('is-open');
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }
  function initModal(){
    var overlay = document.getElementById('uiOverlay');
    var modal = document.getElementById('productEditorModal');
    overlay.addEventListener('click', function(){ closeModal(modal); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeModal(modal);
    });
  }

  /* =================================================================
     FINANZAS — calculado en vivo a partir de ORDERS (misma
     suscripción que Pedidos, sin consultas extra a Firestore).
  ================================================================= */
  function renderFinance(){
    var revenueOrders = ORDERS.filter(function(o){ return o.status !== 'cancelado'; });
    var revenue = revenueOrders.reduce(function(sum, o){ return sum + (o.total || 0); }, 0);
    var count = ORDERS.length;
    var avg = revenueOrders.length ? revenue / revenueOrders.length : 0;
    var todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    var today = ORDERS.filter(function(o){
      return o.createdAt && typeof o.createdAt.toDate === 'function' && o.createdAt.toDate() >= todayStart;
    }).length;

    document.getElementById('statRevenue').textContent = D.formatPrice(revenue);
    document.getElementById('statCount').textContent = count;
    document.getElementById('statAvg').textContent = D.formatPrice(avg);
    document.getElementById('statToday').textContent = today;

    renderRevenueChart(revenueOrders);
    renderTransactions();
  }

  function renderRevenueChart(revenueOrders){
    var wrap = document.getElementById('revenueChartWrap');
    if (!wrap) return;
    var days = 14;
    var buckets = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--){
      var d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      buckets.push({ date: d, total: 0 });
    }
    revenueOrders.forEach(function(o){
      if (!o.createdAt || typeof o.createdAt.toDate !== 'function') return;
      var od = o.createdAt.toDate();
      for (var j = 0; j < buckets.length; j++){
        var b = buckets[j];
        var next = new Date(b.date); next.setDate(next.getDate() + 1);
        if (od >= b.date && od < next){ b.total += (o.total || 0); break; }
      }
    });

    var max = Math.max.apply(null, buckets.map(function(b){ return b.total; }).concat([1]));
    var w = 640, h = 160, padL = 8, padB = 20, barGap = 6;
    var barW = (w - padL * 2) / buckets.length - barGap;
    var svg = '<svg viewBox="0 0 ' + w + ' ' + (h + padB) + '" width="100%" style="max-width:' + w + 'px" role="img" aria-label="Ingresos por día">';
    svg += '<line class="chart-axis-line" x1="' + padL + '" y1="' + h + '" x2="' + (w - padL) + '" y2="' + h + '"/>';
    buckets.forEach(function(b, i){
      var barH = max > 0 ? Math.round((b.total / max) * (h - 14)) : 0;
      var x = padL + i * (barW + barGap);
      var y = h - barH;
      var label = b.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      svg += '<rect class="chart-bar" data-total="' + b.total + '" data-label="' + label + '" x="' + x.toFixed(1) + '" y="' + y + '" width="' + Math.max(barW, 1).toFixed(1) + '" height="' + Math.max(barH, 2) + '" rx="4"/>';
      if (i % 2 === 0){
        svg += '<text class="chart-tick" x="' + (x + barW / 2).toFixed(1) + '" y="' + (h + 13) + '" text-anchor="middle">' + label + '</text>';
      }
    });
    svg += '</svg><div class="chart-tooltip" id="chartTooltip"></div>';
    wrap.innerHTML = svg;

    var tooltip = document.getElementById('chartTooltip');
    wrap.querySelectorAll('.chart-bar').forEach(function(bar){
      bar.addEventListener('mouseenter', function(){
        tooltip.textContent = bar.dataset.label + ': ' + D.formatPrice(Number(bar.dataset.total));
        tooltip.classList.add('is-visible');
      });
      bar.addEventListener('mousemove', function(e){
        var rect = wrap.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left) + 'px';
        tooltip.style.top = (e.clientY - rect.top) + 'px';
      });
      bar.addEventListener('mouseleave', function(){ tooltip.classList.remove('is-visible'); });
    });
  }

  function renderTransactions(){
    var body = document.getElementById('transactionsBody');
    if (!body) return;
    if (!ORDERS.length){
      body.innerHTML = '<tr><td colspan="6" class="admin-empty-note">Aún no hay transacciones.</td></tr>';
      return;
    }
    body.innerHTML = ORDERS.map(function(o){
      var date = (o.createdAt && typeof o.createdAt.toDate === 'function')
        ? o.createdAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '—';
      var itemsCount = (o.items || []).reduce(function(s, it){ return s + it.qty; }, 0);
      return (
        '<tr>' +
          '<td>' + date + '</td>' +
          '<td>' + D.escapeHtml(o.customerName || '—') + '</td>' +
          '<td>' + itemsCount + '</td>' +
          '<td class="t-total">' + D.formatPrice(o.total || 0) + '</td>' +
          '<td>' + (o.paymentMethod === 'online' ? 'En línea' : 'Contra entrega') + '</td>' +
          '<td><span class="t-status">' + D.orderStatusLabel(o.status) + '</span></td>' +
        '</tr>'
      );
    }).join('');
  }

  /* =================================================================
     CHATS — bandeja compartida: cualquier agente logueado ve y
     responde cualquier conversación.
  ================================================================= */
  var CHATS = [];
  var chatsUnsub = null;
  var activeChatId = null;
  var activeChatMsgUnsub = null;

  function chatListRowHTML(chat){
    var time = chat.lastMessageAt ? D.timeAgo(chat.lastMessageAt) : '';
    return (
      '<button type="button" class="chat-list-row' + (chat._id === activeChatId ? ' is-active' : '') + '" data-id="' + chat._id + '">' +
        '<div class="chat-list-row-top"><h4>' + D.escapeHtml(chat.customerName || 'Cliente') + (chat.unreadForAdmin ? '<span class="chat-list-unread"></span>' : '') + '</h4><span class="chat-list-time">' + time + '</span></div>' +
        '<div class="chat-list-preview">' + D.escapeHtml(chat.lastMessage || 'Sin mensajes aún') + '</div>' +
      '</button>'
    );
  }

  function renderChatsList(){
    var list = document.getElementById('chatsList');
    if (!list) return;
    list.innerHTML = CHATS.length
      ? CHATS.map(chatListRowHTML).join('')
      : '<p class="admin-empty-note">Aún no hay conversaciones.</p>';
    var badge = document.getElementById('chatsNewBadge');
    var n = CHATS.filter(function(c){ return c.unreadForAdmin; }).length;
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  function subscribeChats(){
    if (!D.firebaseReady() || chatsUnsub) return;
    chatsUnsub = D.db().collection('chats').orderBy('lastMessageAt', 'desc').onSnapshot(function(snap){
      CHATS = snap.docs.map(function(doc){
        var d = doc.data();
        d._id = doc.id;
        return d;
      });
      renderChatsList();
    }, function(err){
      console.error('No se pudieron cargar los chats:', err);
      renderChatsList();
    });
  }

  function unsubscribeChats(){
    if (chatsUnsub){ chatsUnsub(); chatsUnsub = null; }
    if (activeChatMsgUnsub){ activeChatMsgUnsub(); activeChatMsgUnsub = null; }
    CHATS = [];
    activeChatId = null;
  }

  function adminChatMsgHTML(msg){
    var mine = msg.sender === 'admin';
    return (
      '<div class="chat-msg ' + (mine ? 'is-admin' : 'is-customer') + '">' +
        D.escapeHtml(msg.text) +
        '<span class="chat-msg-meta">' + (mine ? D.escapeHtml(msg.senderName || 'Dikkos') : 'Cliente') + '</span>' +
      '</div>'
    );
  }

  function openChat(chatId){
    activeChatId = chatId;
    var chat = CHATS.filter(function(c){ return c._id === chatId; })[0];
    document.getElementById('chatsEmptyState').hidden = true;
    document.getElementById('chatsActiveState').hidden = false;
    document.getElementById('chatCustomerName').textContent = chat ? (chat.customerName || 'Cliente') : '';
    renderChatsList();

    D.db().collection('chats').doc(chatId).set({ unreadForAdmin: false }, { merge: true }).catch(function(){});

    if (activeChatMsgUnsub) activeChatMsgUnsub();
    activeChatMsgUnsub = D.db().collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt')
      .onSnapshot(function(snap){
        var box = document.getElementById('adminChatMessages');
        var list = snap.docs.map(function(d){ return d.data(); });
        box.innerHTML = list.length
          ? list.map(adminChatMsgHTML).join('')
          : '<p class="chat-empty-note">Aún no hay mensajes.</p>';
        box.scrollTop = box.scrollHeight;
      });
  }

  function sendAdminMessage(text){
    text = text.trim();
    if (!text || !activeChatId) return;
    var db = D.db();
    var agent = D.auth().currentUser ? D.auth().currentUser.email : 'Dikkos';
    db.collection('chats').doc(activeChatId).collection('messages').add({
      sender: 'admin',
      senderName: agent,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    db.collection('chats').doc(activeChatId).set({
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      unreadForCustomer: true
    }, { merge: true });
  }

  function initChats(){
    var list = document.getElementById('chatsList');
    var form = document.getElementById('adminChatForm');
    var input = document.getElementById('adminChatInput');
    list.addEventListener('click', function(e){
      var row = e.target.closest('.chat-list-row');
      if (!row) return;
      openChat(row.dataset.id);
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      sendAdminMessage(input.value);
      input.value = '';
    });
  }

  /* =================================================================
     INIT
  ================================================================= */
  document.addEventListener('DOMContentLoaded', function(){
    initAuth();
    initNav();
    initOrders();
    initProducts();
    initModal();
    initChats();
  });

})();
