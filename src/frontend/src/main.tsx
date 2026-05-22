import React from "react";
import ReactDom from "react-dom/client";
import App from "./App";
import "./styles/input.css";

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");
const root = ReactDom.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
