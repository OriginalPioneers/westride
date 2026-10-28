import "./styles.css";
import { hydrateRoot } from "react-dom/client";
import { HomePage } from "./page";

const root = document.getElementById("root");
const serverUrl = root?.dataset.serverUrl;
if (!root || !serverUrl) {
  throw new Error("Missing #root element or its server URL.");
}

hydrateRoot(root, <HomePage serverUrl={serverUrl} />);
