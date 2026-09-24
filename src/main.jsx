import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { router } from "./router";
import { store } from "./store";
import InstallPrompt from "./components/InstallPrompt";
import "antd/dist/reset.css";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <InstallPrompt />
      <ToastContainer position="top-right" autoClose={2500} />
    </Provider>
  </React.StrictMode>
);
