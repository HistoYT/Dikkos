/* ===================================================================
   DIKKOS EMPANADAS — configuración de Firebase
   -------------------------------------------------------------------
   Proyecto ya creado y conectado: dikkos-empanadas
   https://console.firebase.google.com/project/dikkos-empanadas/overview

   Ya están listos: el proyecto, Firestore (con las reglas de
   seguridad publicadas) y esta configuración de la app web.

   Solo falta UN paso manual (Google no lo expone por API, hay que
   hacer clic en la consola una sola vez):

   1. Entra a https://console.firebase.google.com/project/dikkos-empanadas/authentication
   2. Haz clic en "Comenzar" / "Get started".
   3. En la pestaña "Sign-in method", habilita "Correo electrónico/contraseña".
   4. En la pestaña "Users", clic en "Agregar usuario" y crea tu login
      de administrador (tu correo + una contraseña segura que solo tú
      conozcas). Ese es el correo/contraseña que vas a usar en el
      candado del sitio para entrar al panel.

   Con eso, el candado del header y el panel de pedidos quedan
   funcionando en vivo — no hay que tocar este archivo de nuevo.
=================================================================== */
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyDcuTewwYKolPIqNL7j9jOMBdcDbOK_dJo",
  authDomain: "dikkos-empanadas.firebaseapp.com",
  projectId: "dikkos-empanadas",
  storageBucket: "dikkos-empanadas.firebasestorage.app",
  messagingSenderId: "1055895153798",
  appId: "1:1055895153798:web:55fb13d48a8c01ce7d3507"
};
