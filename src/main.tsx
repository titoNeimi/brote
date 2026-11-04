import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// La mini ventana no carga el store: así una sola ventana escribe los datos.
const isMini = new URLSearchParams(location.search).has("mini");
const { default: Root }: { default: ComponentType } = isMini ? await import("./MiniApp") : await import("./App");
if (isMini) document.documentElement.classList.add("mini-root");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
