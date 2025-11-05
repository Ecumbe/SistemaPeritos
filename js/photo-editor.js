/* ================================================================
   js/photo-editor.js (versión estable)
   - Español UI
   - Zoom visual sin recorte
   - Movimiento con manito (Ctrl/Alt)
   - Panel lateral de descripción (persistente)
   - Imagen se ajusta y se VE SIEMPRE al abrir
   ================================================================ */

(function () {
  const CDN = {
    fabric: "https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js",
    snippet: "https://cdn.jsdelivr.net/npm/tui-code-snippet@2.3.0/dist/tui-code-snippet.min.js",
    colorPickerJS: "https://cdn.jsdelivr.net/npm/tui-color-picker@2.2.8/dist/tui-color-picker.min.js",
    colorPickerCSS: "https://cdn.jsdelivr.net/npm/tui-color-picker@2.2.8/dist/tui-color-picker.min.css",
    imageEditorJS: "https://cdn.jsdelivr.net/npm/tui-image-editor@3.15.3/dist/tui-image-editor.min.js",
    imageEditorCSS: "https://cdn.jsdelivr.net/npm/tui-image-editor@3.15.3/dist/tui-image-editor.min.css",
  };

  const loaded = new Set();
  async function loadScript(src) {
    if (loaded.has(src) || document.querySelector(`script[src="${src}"]`)) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => { loaded.add(src); resolve(); };
      s.onerror = () => reject(new Error("No se pudo cargar: " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureDeps() {
    await loadScript(CDN.fabric);
    await loadScript(CDN.snippet);

    const link1 = document.createElement("link");
    link1.rel = "stylesheet";
    link1.href = CDN.colorPickerCSS;
    document.head.appendChild(link1);
    await loadScript(CDN.colorPickerJS);

    const link2 = document.createElement("link");
    link2.rel = "stylesheet";
    link2.href = CDN.imageEditorCSS;
    document.head.appendChild(link2);
    await loadScript(CDN.imageEditorJS);
  }

  // ===========================================================
  // Modal con PANEL LATERAL PARA DESCRIPCIÓN
  // ===========================================================
  function injectUI() {
    if (document.getElementById("sp-pe-modal")) return;
    const html = `
      <div id="sp-pe-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:none;">
        <div id="sp-pe-modal" style="width:95%;height:94%;margin:1% auto;background:#111827;border-radius:12px;display:flex;overflow:hidden;">

          <!-- PANEL LATERAL DESCRIPCIÓN (IZQ) -->
          <div id="sp-desc-panel" style="width:280px;background:#1f2937;color:white;display:flex;flex-direction:column;padding:10px;transition:.3s;">
            <label style="font-size:15px;margin-bottom:6px;">Descripción de la imagen:</label>
            <textarea id="sp-pe-desc" style="flex:1;border-radius:6px;padding:8px;background:#0f172a;color:white;border:1px solid #334155;resize:none;"></textarea>
          </div>

          <!-- EDITOR + HEADER -->
          <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
            <div style="display:flex;justify-content:flex-end;align-items:center;padding:10px;background:#1f2937;color:#fff;gap:10px;">
              <button id="sp-desc-toggle" style="background:#374151;border:none;color:white;padding:6px 10px;border-radius:6px;cursor:pointer;">Ocultar Panel</button>
              <label style="font-size:14px;">Zoom:</label>
              <input type="range" id="sp-zoom" min="25" max="200" value="100" step="5" style="cursor:pointer;">
              <span id="sp-zoom-label" style="font-size:13px;">100%</span>
              <button id="sp-pe-save" style="background:#10b981;border:none;color:white;padding:6px 12px;border-radius:6px;">Guardar</button>
              <button id="sp-pe-close" style="background:#ef4444;border:none;color:white;padding:6px 12px;border-radius:6px;">Cerrar</button>
            </div>

            <div id="sp-pe-body" style="flex:1;overflow:hidden;min-height:0;"></div>
          </div>

        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  }

  // ===========================================================
  // Crear instancia del editor (ES en menú)
  // ===========================================================
  function createEditor(container, base64) {
    const theme = {
      "menu.backgroundColor": "#0b1220",
      "menu.normalIcon.color": "#9ca3af",
      "menu.activeIcon.color": "#fff",
      "submenu.backgroundColor": "#111827",
      "submenu.normalLabel.color": "#e5e7eb",
      "submenu.activeLabel.color": "#fff"
    };

    const localeEs = {
      "Load": "Cargar",
      "Download": "Download",
      "Save": "Guardar",
      "Undo": "Deshacer",
      "Redo": "Rehacer",
      "Reset": "Restablecer",
      "Delete": "Eliminar",
      "DeleteAll": "Eliminar todo",
      "Crop": "Recortar",
      "Flip": "Voltear",
      "Rotate": "Rotar",
      "Draw": "Dibujar",
      "Shape": "Formas",
      "Icon": "Iconos",
      "Text": "Texto",
      "Mask": "Máscara",
      "Filter": "Filtros",
      "Bold": "Negrita",
      "Italic": "Cursiva",
      "Underline": "Subrayado",
      "Color": "Color",
      "Stroke": "Trazo",
      "Fill": "Relleno",
      "Grayscale": "Escala de grises",
      "Sepia": "Sepia",
      "Sepia2": "Sepia 2",
      "Blur": "Desenfoque",
      "Sharpen": "Nitidez",
      "Invert": "Invertir",
      "Pixelate": "Pixelar",
      "Noise": "Ruido",
      "Emboss": "Relieve",
      "Remove White": "Eliminar blanco",
      "Distance": "Distancia",
      "Threshold": "Umbral",
      "Tint": "Tinte",
      "Multiply": "Multiplicar",
      "Blend": "Mezclar"
    };

    const editor = new tui.ImageEditor(container, {
      includeUI: {
        loadImage: { path: base64, name: "imagen" },
        theme,
        locale: localeEs,
        menu: ["crop","flip","rotate","draw","shape","icon","text","filter"],
        initMenu: "draw",
        menuBarPosition: "bottom",
      },
      cssMaxWidth: 2000,
      cssMaxHeight: 2000,
      usageStatistics: false
    });

    // ========= ZOOM VISUAL (no recorta)
    const zoomRange = document.getElementById("sp-zoom");
    const zoomLabel = document.getElementById("sp-zoom-label");
    const wrap = container.querySelector(".tui-image-editor-canvas-container");
    if (wrap && zoomRange) {
      zoomRange.addEventListener("input", () => {
        const z = zoomRange.value / 100;
        wrap.style.transform = `scale(${z})`;
        wrap.style.transformOrigin = "center center";
        zoomLabel.textContent = zoomRange.value + "%";
      });
    }

    // ========= MOVIMIENTO CON MANITO (Ctrl/Alt + arrastrar)
    const canvas = editor._graphics?._canvas;
    if (canvas) {
      let isPan = false, x = 0, y = 0;
      canvas.on("mouse:down", e => {
        if (e.e.ctrlKey || e.e.altKey || e.e.metaKey) { isPan = true; x = e.e.clientX; y = e.e.clientY; canvas.setCursor("grab"); }
      });
      canvas.on("mouse:move", e => {
        if (isPan) {
          const vpt = canvas.viewportTransform;
          vpt[4] += e.e.clientX - x; vpt[5] += e.e.clientY - y;
          canvas.requestRenderAll();
          x = e.e.clientX; y = e.e.clientY;
        }
      });
      canvas.on("mouse:up", () => { isPan = false; canvas.setCursor("default"); });
    }

    // ========= AJUSTE PARA QUE SIEMPRE SE VEA LA IMAGEN =========
    // Espera a que el canvas tenga tamaño, luego ajusta
    const ensureFit = () => {
      try {
        // Primero intenta el ajuste nativo
        editor._graphics.fitCanvas();
      } catch (_) {}

      // Fallback: forzar un resize si el canvas está fuera de vista
      const c = editor._graphics?._canvas;
      const box = container.getBoundingClientRect();
      if (c && (c.getWidth() < 50 || c.getHeight() < 50)) {
        c.setWidth(Math.max(600, box.width - 40));
        c.setHeight(Math.max(400, box.height - 120));
        c.calcOffset();
        c.requestRenderAll();
      }
    };

    // Reintenta unas veces hasta que esté listo
    let tries = 0;
    const tick = () => {
      const ok = container.querySelector("canvas");
      if (ok || tries > 20) {
        setTimeout(ensureFit, 100);
      } else {
        tries++;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    return editor;
  }

  // ===========================================================
  // API Pública
  // ===========================================================
  window.PhotoEditor = {
    async open({ imgEl, title = "Editor de Imagen", onSave }) {
      await ensureDeps();
      injectUI();

      const modal = document.getElementById("sp-pe-backdrop");
      const container = document.getElementById("sp-pe-body");
      const descInput = document.getElementById("sp-pe-desc");
      const toggleBtn = document.getElementById("sp-desc-toggle");
      const panel = document.getElementById("sp-desc-panel");

      modal.style.display = "block";
      container.innerHTML = "";

      // Cargar descripción previa (persistente)
      descInput.value = imgEl.dataset.description || "";

      const editor = createEditor(container, imgEl.dataset.base64 || imgEl.src);

      toggleBtn.onclick = () => {
        panel.style.width = panel.style.width === "0px" ? "280px" : "0px";
      };

      document.getElementById("sp-pe-save").onclick = () => {
        try {
          const dataURL = editor.toDataURL({ format: "jpeg", quality: 0.9 });
          const desc = descInput.value.trim();

          // Persistencia en la tarjeta
          imgEl.dataset.base64 = dataURL;
          imgEl.src = dataURL;
          imgEl.dataset.description = desc;   // <— se mantiene y no se borra

          onSave?.({ dataURL, description: desc });

          modal.style.display = "none";
          editor.destroy?.();
        } catch (e) {
          console.error(e);
          alert("Error al guardar cambios.");
        }
      };

      document.getElementById("sp-pe-close").onclick = () => {
        modal.style.display = "none";
        editor.destroy?.();
      };
    }
  };
})();
