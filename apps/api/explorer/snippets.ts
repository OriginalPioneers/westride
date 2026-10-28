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

export function buildSnippet(
  language: SnippetLanguage,
  method: string,
  url: string,
): string {
  switch (language) {
    case "curl":
      return method === "GET"
        ? `curl ${url}`
        : `curl -X ${method} ${url}`;
    case "javascript":
      return `const response = await fetch("${url}"${
        method === "GET" ? "" : `, { method: "${method}" }`
      });
const body = await response.json();

if (!response.ok) {
  throw new Error(body.error.message);
}

console.log(body);`;
    case "python":
      return `import requests

response = requests.${method.toLowerCase()}("${url}")
body = response.json()

if not response.ok:
    raise RuntimeError(body["error"]["message"])

print(body)`;
  }
}
