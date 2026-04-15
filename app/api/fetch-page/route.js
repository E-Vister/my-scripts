export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) return Response.json({ error: "URL не указан" }, { status: 400 });

    try {
        const pageUrl = new URL(url);
        const pathParts = pageUrl.pathname.split("/").filter(Boolean);

        const isLang = pathParts[0] !== "wiki";
        const lang = isLang ? pathParts[0] : null;
        const pageName = decodeURIComponent(
            isLang ? pathParts.slice(2).join("/") : pathParts.slice(1).join("/")
        );

        const apiBase = lang
            ? `${pageUrl.origin}/${lang}/api.php`
            : `${pageUrl.origin}/api.php`;

        const apiUrl = `${apiBase}?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.error) return Response.json({ error: data.error.info }, { status: 400 });

        return Response.json({ html: data.parse.text["*"] });
    } catch {
        return Response.json({ error: "Не удалось загрузить страницу" }, { status: 500 });
    }
}