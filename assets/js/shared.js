/* ===================================================================
   DIKKOS EMPANADAS — shared.js
   -------------------------------------------------------------------
   Utilidades compartidas entre el sitio público (main.js) y el panel
   de administrador (admin.js): datos de productos, conexión a
   Firebase, formato de precios y helpers de pedidos/chat. Se carga
   después de firebase-config.js y antes de main.js / admin.js, y
   expone todo bajo el objeto global window.Dikkos.
=================================================================== */
(function(){
  "use strict";

  /* ---------- Catálogo de fábrica ----------
     El admin puede agregar/editar/borrar productos desde el panel;
     esos cambios se guardan en localStorage (PRODUCTS_KEY) y
     sobrescriben esta lista solo en el navegador donde se editaron.
     img: ruta o URL a una foto del producto. emoji: se usa si no hay
     foto. price: número entero en pesos colombianos (sin puntos ni $). */
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
  var PRODUCTS_KEY = 'dikkos_products_v1';

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

  function saveProducts(products){
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  function formatPrice(n){
    return '$' + Math.round(n).toLocaleString('es-CO');
  }

  function mediaHTML(p){
    return p.img
      ? '<img src="'+p.img+'" alt="'+escapeHtml(p.name)+'" loading="lazy">'
      : '<div class="product-emoji">'+(p.emoji||'🧡')+'</div>';
  }

  // Escapa texto que viene de un usuario (nombre, teléfono, mensajes de
  // chat...) antes de insertarlo con innerHTML, para que nadie pueda
  // meter HTML/JS a través de un campo de un formulario público.
  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

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

  /* ---------- Firebase ----------
     Backend real compartido por el sitio público y el panel: pedidos
     y chats viven en Firestore, no en el navegador de cada quien.
     Configura tu proyecto en assets/js/firebase-config.js. Mientras
     no lo hagas, firebaseReady() da false y el resto del sitio sigue
     funcionando igual (catálogo, carrito local, etc). */
  var FB_PLACEHOLDER = 'PON_AQUI_TU_API_KEY';
  var fbAuth = null, fbDb = null, fbStorage = null;

  function firebaseReady(){ return !!(fbAuth && fbDb); }

  function initFirebase(){
    if (typeof FIREBASE_CONFIG === 'undefined') return;
    if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === FB_PLACEHOLDER) return;
    if (typeof firebase === 'undefined') return;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
      if (firebase.storage) fbStorage = firebase.storage();
    } catch(e){
      console.error('No se pudo iniciar Firebase:', e);
    }
  }

  window.Dikkos = {
    DEFAULT_PRODUCTS: DEFAULT_PRODUCTS,
    PRODUCTS_KEY: PRODUCTS_KEY,
    cloneProducts: cloneProducts,
    loadProducts: loadProducts,
    saveProducts: saveProducts,
    formatPrice: formatPrice,
    mediaHTML: mediaHTML,
    escapeHtml: escapeHtml,
    ORDER_STATUSES: ORDER_STATUSES,
    orderStatusLabel: orderStatusLabel,
    timeAgo: timeAgo,
    initFirebase: initFirebase,
    firebaseReady: firebaseReady,
    auth: function(){ return fbAuth; },
    db: function(){ return fbDb; },
    storage: function(){ return fbStorage; }
  };
})();
