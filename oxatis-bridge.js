/**
 * oxatis-bridge.js — à coller sur xeilom.fr
 * Design → Code personnalisé → Fin de page (toutes les pages)
 *
 * Reçoit XEILOM_ADD_TO_CART depuis l’iframe configurateurs et appelle
 * l’API panier Oxatis native, puis renvoie XEILOM_ADD_TO_CART_RESULT.
 */
(function () {
  "use strict";

  var ADD_TYPE = "XEILOM_ADD_TO_CART";
  var RESULT_TYPE = "XEILOM_ADD_TO_CART_RESULT";
  var AJAX_GAP_MS = 400;

  /** Origines iframe autorisées (schéma + host, sans chemin). */
  var PROD_ORIGINS = [
    "https://configurateurs.vercel.app",
  ];

  var DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  function allowedOrigins() {
    return PROD_ORIGINS.concat(DEV_ORIGINS);
  }

  function isAllowedOrigin(origin) {
    return allowedOrigins().indexOf(origin) !== -1;
  }

  function normalizeItems(data) {
    var items = [];
    if (data.items && data.items.length) {
      for (var i = 0; i < data.items.length; i++) {
        var raw = data.items[i];
        var id = Number(raw.productId);
        var qty = Math.max(1, Math.floor(Number(raw.quantity) || 1));
        if (id > 0) items.push({ productId: id, quantity: qty });
      }
    } else if (data.productId) {
      var singleId = Number(data.productId);
      var singleQty = Math.max(1, Math.floor(Number(data.quantity) || 1));
      if (singleId > 0) items.push({ productId: singleId, quantity: singleQty });
    }
    return items;
  }

  function cartQuery(item) {
    return "ItmID=" + item.productId + "&itemQty=" + item.quantity;
  }

  function fallbackRedirect(items) {
    var params = items.map(cartQuery).join("&");
    window.location.href = "/PBShoppingCart.asp?" + params;
  }

  function ajaxAddAccessory(item) {
    return new Promise(function (resolve) {
      var url =
        "/PBShoppingCart.asp?ajaxmode=1&cartRelatedProducts=1&" + cartQuery(item);
      try {
        fetch(url, { credentials: "same-origin", method: "GET" })
          .then(function () {
            resolve(true);
          })
          .catch(function () {
            resolve(false);
          });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function nativeAddMain(item) {
    var qs = cartQuery(item);
    var id = item.productId;

    try {
      if (typeof window.OxAddToCart === "function") {
        window.OxAddToCart(id, qs);
        return "OxAddToCart";
      }
    } catch (e1) {
      /* continue */
    }

    try {
      if (window.oxCart && typeof window.oxCart.oxAddToCart === "function") {
        window.oxCart.oxAddToCart(id, qs);
        return "oxCart.oxAddToCart";
      }
    } catch (e2) {
      /* continue */
    }

    try {
      if (typeof window.AddToCart === "function") {
        window.AddToCart(id);
        return "AddToCart";
      }
    } catch (e3) {
      /* continue */
    }

    fallbackRedirect([item]);
    return "redirect";
  }

  function reply(source, origin, payload) {
    try {
      source.postMessage(payload, origin);
    } catch (e) {
      /* ignore */
    }
  }

  function handleAddToCart(event) {
    var data = event.data;
    if (!data || data.type !== ADD_TYPE) return;
    if (!isAllowedOrigin(event.origin)) return;

    var items = normalizeItems(data);
    if (!items.length) {
      reply(event.source, event.origin, {
        type: RESULT_TYPE,
        success: false,
        error: "Aucun produit valide",
      });
      return;
    }

    var main = items[0];
    var accessories = items.slice(1);
    var methods = [];

    var chain = Promise.resolve();
    for (var i = 0; i < accessories.length; i++) {
      (function (acc) {
        chain = chain
          .then(function () {
            return ajaxAddAccessory(acc);
          })
          .then(function (ok) {
            methods.push("ajax:" + acc.productId + (ok ? "" : ":fail"));
            return delay(AJAX_GAP_MS);
          });
      })(accessories[i]);
    }

    chain
      .then(function () {
        var method = nativeAddMain(main);
        methods.push(method);
        reply(event.source, event.origin, {
          type: RESULT_TYPE,
          success: true,
          productId: main.productId,
          itemCount: items.length,
          method: methods.join("+"),
        });
      })
      .catch(function () {
        reply(event.source, event.origin, {
          type: RESULT_TYPE,
          success: false,
          productId: main.productId,
          error: "Échec ajout panier",
        });
      });
  }

  window.addEventListener("message", handleAddToCart);
})();
