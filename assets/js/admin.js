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
  var SECTION_LABELS = { pedidos:'Pedidos', productos:'Productos', finanzas:'Finanzas', chats:'Chats' };

  function activateSection(section){
    var nav = document.getElementById('adminNav');
    var title = document.getElementById('adminSectionTitle');
    nav.querySelectorAll('button[data-section]').forEach(function(b){ b.classList.toggle('is-active', b.dataset.section === section); });
    document.querySelectorAll('.admin-section').forEach(function(sec){
      sec.classList.toggle('is-active', sec.dataset.section === section);
    });
    title.textContent = SECTION_LABELS[section] || '';
    document.getElementById('adminSidebar').classList.remove('is-open');
    if (section === 'finanzas') renderFinance();
  }

  function initNav(){
    var nav = document.getElementById('adminNav');
    var sidebar = document.getElementById('adminSidebar');
    var burger = document.getElementById('adminBurger');

    nav.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-section]');
      if (!btn) return;
      activateSection(btn.dataset.section);
    });

    if (burger) burger.addEventListener('click', function(){ sidebar.classList.toggle('is-open'); });
  }

  /* =================================================================
     TEMA DEL PANEL (Claro / Oscuro / Neón fosforescente)
     -> Se guarda en localStorage y se aplica como atributo en <html>;
        admin.html ya lo lee antes de pintar (ver script inline en
        <head>) para evitar parpadeos al cargar.
  ================================================================= */
  var THEME_KEY = 'dikkos_admin_theme';

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e){}
    document.querySelectorAll('.theme-option').forEach(function(btn){
      btn.classList.toggle('is-active', btn.dataset.theme === theme);
    });
  }

  function initTheme(){
    var toggleBtn = document.getElementById('themeToggleBtn');
    var menu = document.getElementById('themeMenu');
    if (!toggleBtn || !menu) return;
    var current = document.documentElement.getAttribute('data-theme') || 'light';

    document.querySelectorAll('.theme-option').forEach(function(btn){
      btn.classList.toggle('is-active', btn.dataset.theme === current);
      btn.addEventListener('click', function(){
        applyTheme(btn.dataset.theme);
        menu.hidden = true;
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });

    toggleBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var willOpen = menu.hidden;
      if (willOpen) closeSearchResults();
      menu.hidden = !willOpen;
      toggleBtn.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', function(e){
      if (!menu.hidden && !menu.contains(e.target) && e.target !== toggleBtn){
        menu.hidden = true;
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* =================================================================
     BÚSQUEDA GLOBAL — un solo lugar para encontrar secciones, acciones
     rápidas, pedidos, productos y chats en todo el panel.
  ================================================================= */
  var searchFlatResults = [];
  var searchSelectedIndex = -1;

  function flashHighlight(el){
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.classList.remove('search-flash');
    void el.offsetWidth;
    el.classList.add('search-flash');
    setTimeout(function(){ el.classList.remove('search-flash'); }, 1600);
  }

  function buildSearchResults(term){
    term = term.trim().toLowerCase();
    if (!term) return null;
    var groups = { secciones:[], acciones:[], pedidos:[], productos:[], chats:[] };

    [
      { label:'Pedidos', section:'pedidos' },
      { label:'Productos', section:'productos' },
      { label:'Finanzas', section:'finanzas' },
      { label:'Chats', section:'chats' }
    ].forEach(function(s){
      if (s.label.toLowerCase().indexOf(term) > -1){
        groups.secciones.push({ label:s.label, run:function(){ activateSection(s.section); } });
      }
    });

    [
      { label:'Nuevo pedido', run:function(){ activateSection('pedidos'); openOrderEditor(null); } },
      { label:'Nuevo producto', run:function(){ activateSection('productos'); openProductEditor(null); } },
      { label:'Restaurar catálogo', run:function(){ activateSection('productos'); var btn = document.getElementById('adminRestore'); if (btn) btn.click(); } },
      { label:'Cambiar apariencia del panel', run:function(){ var btn = document.getElementById('themeToggleBtn'); if (btn) btn.click(); } },
      { label:'Cerrar sesión', run:function(){ D.auth().signOut(); } }
    ].forEach(function(a){
      if (a.label.toLowerCase().indexOf(term) > -1) groups.acciones.push(a);
    });

    ORDERS.forEach(function(o){
      var hay = ((o.customerName||'') + ' ' + (o.phone||'') + ' ' + o._id).toLowerCase();
      if (hay.indexOf(term) === -1) return;
      groups.pedidos.push({
        label: o.customerName || 'Sin nombre',
        meta: shortOrderId(o._id),
        run:function(){
          activateSection('pedidos');
          var input = document.getElementById('ordersSearch');
          input.value = o.customerName || o._id;
          ordersSearchTerm = input.value;
          renderOrders();
          flashHighlight(document.querySelector('#adminOrdersList tr[data-id="'+o._id+'"]'));
        }
      });
    });

    PRODUCTS.forEach(function(p){
      if (p.name.toLowerCase().indexOf(term) === -1) return;
      groups.productos.push({
        label: p.name,
        meta: D.formatPrice(p.price),
        run:function(){
          activateSection('productos');
          flashHighlight(document.querySelector('.admin-product-row[data-id="'+p.id+'"]'));
        }
      });
    });

    CHATS.forEach(function(c){
      var hay = ((c.customerName||'') + ' ' + (c.lastMessage||'')).toLowerCase();
      if (hay.indexOf(term) === -1) return;
      groups.chats.push({
        label: c.customerName || 'Cliente',
        meta: c.lastMessage || '',
        run:function(){ activateSection('chats'); openChat(c._id); }
      });
    });

    return groups;
  }

  function renderSearchResults(term){
    var wrap = document.getElementById('globalSearchResults');
    var groups = buildSearchResults(term);
    searchFlatResults = [];
    searchSelectedIndex = -1;
    if (!groups){
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }
    var groupDefs = [
      { key:'secciones', label:'Secciones' },
      { key:'acciones', label:'Acciones' },
      { key:'pedidos', label:'Pedidos' },
      { key:'productos', label:'Productos' },
      { key:'chats', label:'Chats' }
    ];
    var html = '';
    groupDefs.forEach(function(g){
      var items = groups[g.key];
      if (!items || !items.length) return;
      html += '<div class="gsr-group-label">'+g.label+'</div>';
      items.slice(0, 6).forEach(function(item){
        var idx = searchFlatResults.length;
        searchFlatResults.push(item);
        html += '<button type="button" class="gsr-item" data-idx="'+idx+'"><strong>'+D.escapeHtml(item.label)+'</strong>'+(item.meta ? '<span class="gsr-item-meta">'+D.escapeHtml(item.meta)+'</span>' : '')+'</button>';
      });
    });
    wrap.innerHTML = searchFlatResults.length ? html : '<p class="gsr-empty">Sin resultados para "'+D.escapeHtml(term.trim())+'".</p>';
    wrap.hidden = false;
  }

  function closeSearchResults(){
    var wrap = document.getElementById('globalSearchResults');
    wrap.hidden = true;
    wrap.innerHTML = '';
    searchFlatResults = [];
    searchSelectedIndex = -1;
  }

  function runSearchResult(idx){
    var item = searchFlatResults[idx];
    if (!item) return;
    item.run();
    closeSearchResults();
    var input = document.getElementById('globalSearchInput');
    input.value = '';
    input.blur();
  }

  function updateSearchSelection(){
    document.querySelectorAll('.gsr-item').forEach(function(el, i){
      el.classList.toggle('is-selected', i === searchSelectedIndex);
    });
  }

  function initGlobalSearch(){
    var input = document.getElementById('globalSearchInput');
    var wrap = document.getElementById('globalSearchResults');
    if (!input || !wrap) return;

    input.addEventListener('input', function(){ renderSearchResults(input.value); });
    input.addEventListener('focus', function(){
      var menu = document.getElementById('themeMenu');
      if (menu) menu.hidden = true;
      if (input.value.trim()) renderSearchResults(input.value);
    });

    input.addEventListener('keydown', function(e){
      if (wrap.hidden) return;
      if (e.key === 'ArrowDown'){
        e.preventDefault();
        searchSelectedIndex = Math.min(searchFlatResults.length - 1, searchSelectedIndex + 1);
        updateSearchSelection();
      } else if (e.key === 'ArrowUp'){
        e.preventDefault();
        searchSelectedIndex = Math.max(0, searchSelectedIndex - 1);
        updateSearchSelection();
      } else if (e.key === 'Enter'){
        e.preventDefault();
        runSearchResult(searchSelectedIndex > -1 ? searchSelectedIndex : 0);
      } else if (e.key === 'Escape'){
        closeSearchResults();
        input.blur();
      }
    });

    wrap.addEventListener('click', function(e){
      var btn = e.target.closest('.gsr-item');
      if (!btn) return;
      runSearchResult(Number(btn.dataset.idx));
    });

    document.addEventListener('click', function(e){
      if (!wrap.hidden && !wrap.contains(e.target) && e.target !== input){
        closeSearchResults();
      }
    });

    document.addEventListener('keydown', function(e){
      if (e.key !== '/') return;
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      input.focus();
    });
  }

  /* =================================================================
     PEDIDOS
     -> Tabla con búsqueda, filtros y selección múltiple. El admin
        puede crear pedidos a mano (ej. uno telefónico), editarlos por
        completo o borrarlos (borrar un pedido borra también su chat).
  ================================================================= */
  var ORDERS = [];
  var ordersUnsub = null;
  var ordersSearchTerm = '';
  var ordersStatusFilterValue = 'todos';
  var ordersPayFilterValue = 'todos';
  var selectedOrderIds = {};

  function shortOrderId(id){ return '#' + id.slice(0, 6).toUpperCase(); }

  function formatOrderDate(ts){
    if (!ts || typeof ts.toDate !== 'function') return '—';
    return ts.toDate().toLocaleString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'numeric', minute:'2-digit' });
  }

  function getFilteredOrders(){
    var term = ordersSearchTerm.trim().toLowerCase();
    return ORDERS.filter(function(o){
      if (ordersStatusFilterValue !== 'todos' && o.status !== ordersStatusFilterValue) return false;
      if (ordersPayFilterValue !== 'todos' && o.paymentMethod !== ordersPayFilterValue) return false;
      if (term){
        var hay = ((o.customerName||'') + ' ' + (o.phone||'') + ' ' + o._id).toLowerCase();
        if (hay.indexOf(term) === -1) return false;
      }
      return true;
    });
  }

  function orderRowHTML(order){
    var statusOptions = D.ORDER_STATUSES.map(function(s){
      return '<option value="'+s.value+'"'+(order.status===s.value?' selected':'')+'>'+s.label+'</option>';
    }).join('');
    var checked = selectedOrderIds[order._id] ? ' checked' : '';
    return (
      '<tr class="status-'+(order.status||'nuevo')+'" data-id="'+order._id+'">' +
        '<td><input type="checkbox" class="order-check" aria-label="Seleccionar pedido"'+checked+'></td>' +
        '<td class="t-id">'+shortOrderId(order._id)+'</td>' +
        '<td class="t-name">'+D.escapeHtml(order.customerName||'Sin nombre')+'</td>' +
        '<td>'+D.escapeHtml(order.phone||'—')+'</td>' +
        '<td class="t-total">'+D.formatPrice(order.total||0)+'</td>' +
        '<td><span class="pay-tag">'+(order.paymentMethod==='online' ? 'En línea' : 'Contra entrega')+'</span></td>' +
        '<td><select class="status-select status-'+(order.status||'nuevo')+'" aria-label="Estado del pedido">'+statusOptions+'</select></td>' +
        '<td>'+formatOrderDate(order.createdAt)+'</td>' +
        '<td class="col-actions"><div class="admin-row-actions" style="display:inline-flex;">' +
          '<button class="row-edit" type="button" aria-label="Editar pedido"><svg><use href="#icon-pencil"/></svg></button>' +
          '<button class="row-delete" type="button" aria-label="Eliminar pedido"><svg><use href="#icon-trash"/></svg></button>' +
        '</div></td>' +
      '</tr>'
    );
  }

  function updateOrdersBulkBar(){
    var ids = Object.keys(selectedOrderIds).filter(function(id){ return selectedOrderIds[id]; });
    document.getElementById('ordersBulkBar').hidden = ids.length === 0;
    document.getElementById('ordersBulkCount').textContent = ids.length + (ids.length === 1 ? ' seleccionado' : ' seleccionados');
  }

  function renderOrders(){
    var list = document.getElementById('adminOrdersList');
    if (!list) return;
    var filtered = getFilteredOrders();
    list.innerHTML = filtered.map(orderRowHTML).join('');

    var emptyNote = document.getElementById('ordersEmptyNote');
    emptyNote.hidden = filtered.length > 0;
    emptyNote.textContent = ORDERS.length ? 'Ningún pedido coincide con la búsqueda.' : 'Aún no han llegado pedidos.';

    var badge = document.getElementById('ordersNewBadge');
    var n = ORDERS.filter(function(o){ return o.status === 'nuevo'; }).length;
    badge.textContent = n;
    badge.hidden = n === 0;

    var selectAll = document.getElementById('ordersSelectAll');
    selectAll.checked = filtered.length > 0 && filtered.every(function(o){ return selectedOrderIds[o._id]; });
    updateOrdersBulkBar();
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
    selectedOrderIds = {};
  }

  function deleteOrder(id){
    var db = D.db();
    db.collection('chats').doc(id).collection('messages').get().then(function(snap){
      return Promise.all(snap.docs.map(function(d){ return d.ref.delete(); }));
    }).then(function(){
      return db.collection('chats').doc(id).delete().catch(function(){});
    }).then(function(){
      return db.collection('orders').doc(id).delete();
    }).catch(function(err){
      console.error('No se pudo eliminar el pedido:', err);
      window.alert('No se pudo eliminar el pedido. Intenta de nuevo.');
    });
  }

  function initOrders(){
    var tbody = document.getElementById('adminOrdersList');
    var search = document.getElementById('ordersSearch');
    var statusFilter = document.getElementById('ordersStatusFilter');
    var payFilter = document.getElementById('ordersPayFilter');
    var selectAll = document.getElementById('ordersSelectAll');
    var bulkDeleteBtn = document.getElementById('ordersBulkDelete');
    var addBtn = document.getElementById('adminAddOrder');

    search.addEventListener('input', function(){ ordersSearchTerm = search.value; renderOrders(); });
    statusFilter.addEventListener('change', function(){ ordersStatusFilterValue = statusFilter.value; renderOrders(); });
    payFilter.addEventListener('change', function(){ ordersPayFilterValue = payFilter.value; renderOrders(); });

    selectAll.addEventListener('change', function(){
      getFilteredOrders().forEach(function(o){ selectedOrderIds[o._id] = selectAll.checked; });
      renderOrders();
    });

    tbody.addEventListener('change', function(e){
      var row = e.target.closest('tr');
      if (!row) return;
      var id = row.dataset.id;
      if (e.target.classList.contains('order-check')){
        selectedOrderIds[id] = e.target.checked;
        updateOrdersBulkBar();
        var filtered = getFilteredOrders();
        selectAll.checked = filtered.length > 0 && filtered.every(function(o){ return selectedOrderIds[o._id]; });
        return;
      }
      if (e.target.classList.contains('status-select')){
        D.db().collection('orders').doc(id).update({ status: e.target.value }).catch(function(err){
          console.error('No se pudo actualizar el pedido:', err);
        });
      }
    });

    tbody.addEventListener('click', function(e){
      var row = e.target.closest('tr');
      if (!row) return;
      var id = row.dataset.id;
      var order = ORDERS.filter(function(o){ return o._id === id; })[0];
      if (e.target.closest('.row-edit')){
        openOrderEditor(order);
      } else if (e.target.closest('.row-delete')){
        if (order && window.confirm('¿Eliminar el pedido de "'+(order.customerName||'este cliente')+'"? Esto también borra su chat.')){
          deleteOrder(id);
        }
      }
    });

    bulkDeleteBtn.addEventListener('click', function(){
      var ids = Object.keys(selectedOrderIds).filter(function(id){ return selectedOrderIds[id]; });
      if (!ids.length) return;
      if (!window.confirm('¿Eliminar ' + ids.length + ' pedido(s) seleccionados? Esto también borra sus chats.')) return;
      ids.forEach(deleteOrder);
      selectedOrderIds = {};
    });

    addBtn.addEventListener('click', function(){ openOrderEditor(null); });

    document.getElementById('orderEditorClose').addEventListener('click', function(){ closeModal(document.getElementById('orderEditorModal')); });
    document.getElementById('orderEditorCancel').addEventListener('click', function(){ closeModal(document.getElementById('orderEditorModal')); });
    document.getElementById('orderAddItemRow').addEventListener('click', function(){ addOrderItemRow(null); });
    document.getElementById('orderEditorForm').addEventListener('submit', saveOrderFromForm);
    initOrderItemsBuilder();
  }

  /* ---------- Editor de pedido: lista de productos dinámica ---------- */
  function orderItemRowHTML(item){
    item = item || {};
    var fallback = PRODUCTS[0];
    var selectedId = item.id != null && getProduct(item.id) ? Number(item.id) : (fallback ? fallback.id : '');
    var qty = item.qty || 1;
    var price = item.price != null ? item.price : (getProduct(selectedId) ? getProduct(selectedId).price : 0);
    var options = PRODUCTS.map(function(p){
      return '<option value="'+p.id+'"'+(selectedId===p.id?' selected':'')+'>'+D.escapeHtml(p.name)+'</option>';
    }).join('');
    return (
      '<div class="order-item-row">' +
        '<select class="oi-product">'+options+'</select>' +
        '<input type="number" class="oi-qty" min="1" value="'+qty+'" aria-label="Cantidad">' +
        '<input type="number" class="oi-price" min="0" step="100" value="'+price+'" aria-label="Precio unitario">' +
        '<span class="oi-subtotal">'+D.formatPrice(price*qty)+'</span>' +
        '<button class="oi-remove" type="button" aria-label="Quitar producto">&times;</button>' +
      '</div>'
    );
  }

  function addOrderItemRow(item){
    var builder = document.getElementById('orderItemsBuilder');
    var wrap = document.createElement('div');
    wrap.innerHTML = orderItemRowHTML(item);
    builder.appendChild(wrap.firstChild);
    updateOrderTotal();
  }

  function updateOrderTotal(){
    var builder = document.getElementById('orderItemsBuilder');
    var total = 0;
    builder.querySelectorAll('.order-item-row').forEach(function(row){
      var qty = Number(row.querySelector('.oi-qty').value) || 0;
      var price = Number(row.querySelector('.oi-price').value) || 0;
      row.querySelector('.oi-subtotal').textContent = D.formatPrice(qty * price);
      total += qty * price;
    });
    document.getElementById('orderTotalDisplay').textContent = D.formatPrice(total);
  }

  function initOrderItemsBuilder(){
    var builder = document.getElementById('orderItemsBuilder');
    builder.addEventListener('change', function(e){
      if (e.target.classList.contains('oi-product')){
        var row = e.target.closest('.order-item-row');
        var p = getProduct(e.target.value);
        if (p) row.querySelector('.oi-price').value = p.price;
      }
      updateOrderTotal();
    });
    builder.addEventListener('input', function(e){
      if (e.target.classList.contains('oi-qty') || e.target.classList.contains('oi-price')) updateOrderTotal();
    });
    builder.addEventListener('click', function(e){
      if (e.target.closest('.oi-remove')){
        e.target.closest('.order-item-row').remove();
        updateOrderTotal();
      }
    });
  }

  function openOrderEditor(order){
    var form = document.getElementById('orderEditorForm');
    form.reset();
    document.getElementById('orderId').value = order ? order._id : '';
    document.getElementById('orderCustomerName').value = order ? (order.customerName || '') : '';
    document.getElementById('orderPhone').value = order ? (order.phone || '') : '';
    document.getElementById('orderAddress').value = order ? (order.address || '') : '';
    document.getElementById('orderPayMethod').value = order ? (order.paymentMethod || 'contra_entrega') : 'contra_entrega';
    document.getElementById('orderStatus').value = order ? (order.status || 'nuevo') : 'nuevo';

    var builder = document.getElementById('orderItemsBuilder');
    builder.innerHTML = '';
    if (order && order.items && order.items.length){
      order.items.forEach(function(it){ addOrderItemRow(it); });
    } else {
      addOrderItemRow(null);
    }
    updateOrderTotal();

    document.getElementById('orderEditorTitle').textContent = order ? 'Editar pedido' : 'Nuevo pedido';
    openModal(document.getElementById('orderEditorModal'));
  }

  function saveOrderFromForm(e){
    e.preventDefault();
    var id = document.getElementById('orderId').value;
    var name = document.getElementById('orderCustomerName').value.trim();
    var phone = document.getElementById('orderPhone').value.trim();
    if (!name || !phone) return;

    var items = [];
    document.querySelectorAll('#orderItemsBuilder .order-item-row').forEach(function(row){
      var pid = Number(row.querySelector('.oi-product').value);
      var qty = Number(row.querySelector('.oi-qty').value) || 0;
      var price = Number(row.querySelector('.oi-price').value) || 0;
      var p = getProduct(pid);
      if (qty > 0 && p) items.push({ id: pid, name: p.name, price: price, qty: qty });
    });
    if (!items.length){
      window.alert('Agrega al menos un producto al pedido.');
      return;
    }
    var total = items.reduce(function(s, it){ return s + it.price * it.qty; }, 0);

    var data = {
      customerName: name,
      phone: phone,
      address: document.getElementById('orderAddress').value.trim(),
      paymentMethod: document.getElementById('orderPayMethod').value,
      status: document.getElementById('orderStatus').value,
      items: items,
      total: total
    };

    var db = D.db();
    var promise = id
      ? db.collection('orders').doc(id).update(data)
      : db.collection('orders').add(Object.assign({}, data, { createdAt: firebase.firestore.FieldValue.serverTimestamp() }));

    promise.then(function(){
      closeModal(document.getElementById('orderEditorModal'));
    }).catch(function(err){
      console.error('No se pudo guardar el pedido:', err);
      window.alert('No se pudo guardar el pedido. Intenta de nuevo.');
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

  /* ---------- Modales (editor de producto y de pedido, comparten overlay) ---------- */
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
  function closeAnyModal(){
    document.querySelectorAll('.ui-modal.is-open').forEach(closeModal);
  }
  function initModal(){
    document.getElementById('uiOverlay').addEventListener('click', closeAnyModal);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeAnyModal();
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

  function deleteChat(chatId){
    var db = D.db();
    db.collection('chats').doc(chatId).collection('messages').get().then(function(snap){
      return Promise.all(snap.docs.map(function(d){ return d.ref.delete(); }));
    }).then(function(){
      return db.collection('chats').doc(chatId).delete();
    }).then(function(){
      if (activeChatId === chatId){
        activeChatId = null;
        if (activeChatMsgUnsub){ activeChatMsgUnsub(); activeChatMsgUnsub = null; }
        document.getElementById('chatsActiveState').hidden = true;
        document.getElementById('chatsEmptyState').hidden = false;
      }
    }).catch(function(err){
      console.error('No se pudo eliminar el chat:', err);
      window.alert('No se pudo eliminar la conversación. Intenta de nuevo.');
    });
  }

  function initChats(){
    var list = document.getElementById('chatsList');
    var form = document.getElementById('adminChatForm');
    var input = document.getElementById('adminChatInput');
    var deleteBtn = document.getElementById('chatsDeleteBtn');
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
    deleteBtn.addEventListener('click', function(){
      if (!activeChatId) return;
      if (window.confirm('¿Eliminar esta conversación? Esto no borra el pedido asociado.')) deleteChat(activeChatId);
    });
  }

  /* =================================================================
     INIT
  ================================================================= */
  document.addEventListener('DOMContentLoaded', function(){
    initAuth();
    initNav();
    initTheme();
    initGlobalSearch();
    initOrders();
    initProducts();
    initModal();
    initChats();
  });

})();
