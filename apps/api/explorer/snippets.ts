export type SnippetLanguage = "curl" | "javascript" | "python";

export const SNIPPET_LANGUAGES: {
  value: SnippetLanguage;
  label: string;
  syntax: string;
}[] = [
  { value: "curl", label: "cURL", syntax: "bash" },
  { value: "javascript", label: "JavaScript", syntax: "javascript" },
  { value: "python", label: "Python", syntax: "python" },
];

export type SnippetRequest = {
  method: string;
  url: string;
  /** A JSON document, or null for requests without a body. */
  body: string | null;
  /** Whether to show an Authorization header. The sample never embeds a real token. */
  withToken: boolean;
};

const TOKEN_PLACEHOLDER = "$WESTRIDE_API_KEY";

function compactJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

function pythonLiteral(body: string): string {
  // JSON is valid Python apart from these three literals.
  return body
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None");
}

export function buildSnippet(language: SnippetLanguage, request: SnippetRequest): string {
  const { method, url, body, withToken } = request;

  switch (language) {
    case "curl": {
      const lines = [`curl${method === "GET" ? "" : ` -X ${method}`} ${url}`];
      if (withToken) {
        lines.push(`  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}"`);
      }
      if (body !== null) {
        lines.push(`  -H "Content-Type: application/json"`);
        lines.push(`  -d '${compactJson(body)}'`);
      }
      return lines.join(" \\\n");
    }

    case "javascript": {
      const headers = [`accept: "application/json"`];
      if (withToken) {
        headers.push(`authorization: \`Bearer \${process.env.WESTRIDE_API_KEY}\``);
      }
      if (body !== null) {
        headers.push(`"content-type": "application/json"`);
      }
      const init = [
        method === "GET" ? null : `method: "${method}"`,
        `headers: { ${headers.join(", ")} }`,
        body !== null ? `body: JSON.stringify(${body})` : null,
      ].filter(Boolean);
      return `const response = await fetch("${url}", {
  ${init.join(",\n  ")},
});
const payload = await response.json();

if (!response.ok) {
  throw new Error(payload.error.message);
}

console.log(payload.data);`;
    }

    case "python": {
      const lines = ["import os", "import requests", ""];
      const args = [`"${url}"`];
      const headers: string[] = [];
      if (withToken) {
        headers.push(`"Authorization": f"Bearer {os.environ['WESTRIDE_API_KEY']}"`);
      }
      if (headers.length > 0) {
        args.push(`headers={${headers.join(", ")}}`);
      }
      if (body !== null) {
        args.push(`json=${pythonLiteral(body)}`);
      }
      lines.push(`response = requests.${method.toLowerCase()}(${args.join(", ")})`);
      lines.push("payload = response.json()", "");
      lines.push("if not response.ok:", '    raise RuntimeError(payload["error"]["message"])', "");
      lines.push('print(payload["data"])');
      return lines.join("\n");
    }
  }
}
