import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionWorkshop } from "./Workshop";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <MotionWorkshop />
  </BrowserRouter>,
);
