import { NextResponse } from "next/server";

/** Hôtes autorisés pour le proxy images PDF (évite open-proxy). */
const ALLOWED_HOSTS = new Set([
  "www.xeilom.fr",
  "xeilom.fr",
]);

/**
 * Proxy image same-origin — les CDN Oxatis n’envoient pas de CORS,
 * donc jsPDF / canvas ne peuvent pas charger les URLs directement.
 *
 * GET /api/pdf-image?url=https://www.xeilom.fr/...
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "url manquante" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "url invalide" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "protocole interdit" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "hôte non autorisé" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*,*/*" },
      // Pas de credentials : image publique catalogue
      cache: "force-cache",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `upstream ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "pas une image" }, { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch échoué" }, { status: 502 });
  }
}
