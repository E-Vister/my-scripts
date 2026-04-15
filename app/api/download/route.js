export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) return Response.json({ error: "URL не указан" }, { status: 400 });

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    const filename = url.match(/([^/]+\.ogg)/i)?.[1] || "audio.ogg";

    return new Response(buffer, {
        headers: {
            "Content-Type": "audio/ogg",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}