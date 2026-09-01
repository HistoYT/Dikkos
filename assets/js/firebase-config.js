/* ===================================================================
   DIKKOS EMPANADAS — configuración de Firebase
   -------------------------------------------------------------------
   Este archivo conecta el sitio con TU proyecto de Firebase (gratis).
   Sin esto, el login de administrador y el panel de pedidos quedan
   desactivados (el resto del sitio funciona igual).

   PASOS (una sola vez, ~10 minutos):

   1. Ve a https://console.firebase.google.com y crea un proyecto
      nuevo (gratis, no pide tarjeta para el plan Spark).

   2. En el menú lateral: Compilación > Authentication > "Comenzar".
      Pestaña "Sign-in method" > habilita "Correo electrónico/contraseña".
      Luego pestaña "Users" > "Agregar usuario": pon tu correo y una
      contraseña segura. Ese será tu login del panel administrador.

   3. En el menú lateral: Compilación > Firestore Database > "Crear
      base de datos" (elige el modo producción y la región más
      cercana, ej. nam5 o southamerica-east1).

   4. Dentro de Firestore, pestaña "Reglas", reemplaza el contenido
      por esto y publica:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /orders/{orderId} {
              allow create: if true;
              allow read, update, delete: if request.auth != null;
            }
          }
        }

      (Cualquier cliente puede CREAR un pedido; solo alguien logueado
      con el correo/contraseña del paso 2 puede VER o EDITAR pedidos.)

   5. En el ícono de engranaje (arriba a la izquierda) > "Configuración
      del proyecto" > baja hasta "Tus apps" > ícono web "</>" > registra
      una app (no necesitas Firebase Hosting). Te va a mostrar un
      objeto firebaseConfig como el de abajo: copia esos valores reales
      y reemplaza los que están aquí.

   6. Guarda este archivo y recarga la página. El ícono de candado en
      el header ya debería dejarte entrar con el correo/contraseña
      del paso 2, y los pedidos que hagan los clientes van a aparecer
      en vivo en la pestaña "Pedidos" del panel.
=================================================================== */
var FIREBASE_CONFIG = {
  apiKey: "PON_AQUI_TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx"
};
