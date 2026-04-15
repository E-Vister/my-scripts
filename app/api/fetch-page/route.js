export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return Response.json({ error: "URL не указан" }, { status: 400 });
    }

    try {
        const pageUrl = new URL(url);
        const apiUrl = `${pageUrl.origin}/api.php?action=parse&page=${encodeURIComponent(pageUrl.pathname.replace("/wiki/", ""))}&prop=text&format=json`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.error) {
            return Response.json({ error: data.error.info }, { status: 400 });
        }

        return Response.json({ html: data.parse.text["*"] });
    } catch {
        return Response.json({ error: "Не удалось загрузить страницу" }, { status: 500 });
    }
}

