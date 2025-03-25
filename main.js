export function web4_get() {
    const request = JSON.parse(env.input()).request;
    let path = request.path || "/";

    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    if (path === "/") {
      path = "/index.html";
    }

    let content = env.get_content_base64(path);

    if (!content && !path.endsWith(".html")) {
      content = env.get_content_base64(`${path}.html`);
    }

    let response;
    if (content) {
      response = {
        contentType: "text/html; charset=UTF-8",
        body: content,
      };
    } else {
      response = {
        contentType: "text/plain",
        status: 404,
        body: env.base64_encode("Not Found"),
      };
    }

    env.value_return(JSON.stringify(response));
  }
