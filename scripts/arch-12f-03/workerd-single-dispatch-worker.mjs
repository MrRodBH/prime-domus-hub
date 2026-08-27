const seenRequestIds = new Set();

export default {
  fetch(request) {
    const requestId = request.headers.get("x-rm-prime-request-id")?.trim();
    if (request.method !== "POST" || !requestId) {
      return new Response("invalid_probe_request", { status: 400 });
    }

    const replay = seenRequestIds.has(requestId);
    if (!replay) {
      seenRequestIds.add(requestId);
    }

    console.log(
      JSON.stringify({
        event: "arch_12f_03_dispatch",
        requestId,
        replay,
      }),
    );

    return Response.json({ requestId, replay }, { status: replay ? 409 : 200 });
  },
};
