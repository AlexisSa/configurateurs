/**
 * oxatis-bridge.js — à coller sur xeilom.fr
 * Design → Code personnalisé → Fin de page (toutes les pages)
 *
 * 1. Panier : reçoit XEILOM_ADD_TO_CART depuis l’iframe configurateurs.
 * 2. Tarif : répond à coffret-request-context avec le catid Oxatis du client connecté.
 */
(function () {
  "use strict";

  var ADD_TYPE = "XEILOM_ADD_TO_CART";
  var RESULT_TYPE = "XEILOM_ADD_TO_CART_RESULT";
  var CONTEXT_TYPE = "coffret-context";
  var REQUEST_CONTEXT_TYPE = "coffret-request-context";
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

  function getOxatisCategoryId() {
    var user = window.oxInfos && window.oxInfos.oxUser;
    if (!user || !user.catid || !user.catid.length) return null;
    return user.catid[0];
  }

  function sendPricingContext(target, origin) {
    if (!target || !origin) return;
    var categoryId = getOxatisCategoryId();
    if (categoryId == null) return;
    try {
      target.postMessage(
        { type: CONTEXT_TYPE, categoryId: categoryId },
        origin,
      );
    } catch (e) {
      /* ignore */
    }
  }

  /** Pousse le catid vers toutes les iframes configurateurs déjà chargées. */
  function broadcastPricingContext() {
    var categoryId = getOxatisCategoryId();
    if (categoryId == null) return;
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      try {
        var src = frame.src || "";
        var allowed = false;
        for (var j = 0; j < PROD_ORIGINS.length; j++) {
          if (src.indexOf(PROD_ORIGINS[j]) === 0) allowed = true;
        }
        for (var k = 0; k < DEV_ORIGINS.length; k++) {
          if (src.indexOf(DEV_ORIGINS[k]) === 0) allowed = true;
        }
        if (!allowed || !frame.contentWindow) continue;
        var origin = new URL(src).origin;
        sendPricingContext(frame.contentWindow, origin);
      } catch (e) {
        /* ignore cross-origin / invalid src */
      }
    }
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

  function handleMessage(event) {
    var data = event.data;
    if (!data || !data.type) return;

    if (data.type === REQUEST_CONTEXT_TYPE) {
      if (!isAllowedOrigin(event.origin)) return;
      sendPricingContext(event.source, event.origin);
      return;
    }

    handleAddToCart(event);
  }

  window.addEventListener("message", handleMessage);

  // oxInfos.catid arrive souvent après le premier paint / load iframe
  broadcastPricingContext();
  var attempts = 0;
  var retryTimer = setInterval(function () {
    broadcastPricingContext();
    attempts += 1;
    if (attempts >= 20) clearInterval(retryTimer);
  }, 500);
})();
