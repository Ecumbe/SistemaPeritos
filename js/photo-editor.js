/* ================================================================
   js/photo-editor.js (v3.1 - Con SunEditor + Fix Ortografía)
   - Zoom visual
   - Panel lateral persistente
   - BOTÓN: "Convertir en Etiqueta"
   - MEJORA: SunEditor en descripción CON CORRECTOR ORTOGRÁFICO
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
  // Modal con PANEL LATERAL + BOTÓN ETIQUETA
  // ===========================================================
  function injectUI() {
    if (document.getElementById("sp-pe-modal")) return;
    const html = `
      <div id="sp-pe-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:none;">
        <div id="sp-pe-modal" style="width:98%;height:96%;margin:1vh auto;background:#1f2937;border-radius:12px;display:flex;overflow:hidden;border:1px solid #4b5563;">

          <div id="sp-desc-panel" style="width:320px;background:#111827;color:white;display:flex;flex-direction:column;padding:15px;transition:.3s;border-right:1px solid #374151;">
            <label style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#e5e7eb;">Descripción de la imagen:</label>
            <!-- Contenedor para SunEditor -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
                <textarea id="sp-pe-desc" style="width:100%; height:100%; display:none;"></textarea>
            </div>
            <small style="color:#9ca3af;margin-top:5px;">Esta descripción aparecerá en el informe.</small>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
            
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 15px;background:#111827;color:#fff;border-bottom:1px solid #374151;">
              
              <div style="display:flex;gap:10px;align-items:center;">
                <button id="sp-desc-toggle" style="background:#374151;border:1px solid #4b5563;color:#e5e7eb;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px;">
                  <i class="fa-solid fa-list"></i> Panel Texto
                </button>
                
                <button id="sp-btn-label" style="background:#3b82f6;border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;display:flex;align-items:center;gap:5px;" title="Convierte el texto seleccionado en una etiqueta blanca">
                  <i class="fa-solid fa-tag"></i> Convertir en Etiqueta
                </button>
              </div>

              <div style="display:flex;gap:15px;align-items:center;">
                <div style="display:flex;align-items:center;gap:8px;">
                   <label style="font-size:13px;color:#9ca3af;">Zoom:</label>
                   <input type="range" id="sp-zoom" min="25" max="200" value="100" step="5" style="cursor:pointer;width:100px;">
                   <span id="sp-zoom-label" style="font-size:13px;width:35px;text-align:right;">100%</span>
                </div>

                <button id="sp-pe-save" style="background:#10b981;border:none;color:white;padding:6px 15px;border-radius:6px;font-weight:600;cursor:pointer;">
                  <i class="fa-solid fa-check"></i> Guardar
                </button>
                <button id="sp-pe-close" style="background:#ef4444;border:none;color:white;padding:6px 15px;border-radius:6px;font-weight:600;cursor:pointer;">
                  <i class="fa-solid fa-times"></i>
                </button>
              </div>
            </div>

            <div id="sp-pe-body" style="flex:1;overflow:hidden;min-height:0;background:#000;"></div>
          </div>

        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  }

  // ===========================================================
  // Configuración del Editor de IMAGEN (TUI)
  // ===========================================================
  function createEditor(container, base64) {
    const theme = {
      "menu.backgroundColor": "#1f2937",
      "menu.normalIcon.color": "#9ca3af",
      "menu.activeIcon.color": "#fff",
      "submenu.backgroundColor": "#111827",
      "submenu.normalLabel.color": "#e5e7eb",
      "submenu.activeLabel.color": "#fff",
      "common.backgroundColor": "#000000" 
    };

    const localeEs = {
      "Load": "Cargar", "Download": "Descargar", "Save": "Guardar",
      "Undo": "Deshacer", "Redo": "Rehacer", "Reset": "Restablecer",
      "Delete": "Eliminar", "DeleteAll": "Borrar todo", "Crop": "Recortar",
      "Flip": "Voltear", "Rotate": "Rotar", "Draw": "Dibujar",
      "Shape": "Formas", "Icon": "Iconos", "Text": "Texto",
      "Mask": "Máscara", "Filter": "Filtros", "Bold": "Negrita",
      "Italic": "Cursiva", "Underline": "Subrayado", "Color": "Color",
      "Stroke": "Trazo", "Fill": "Relleno", "Grayscale": "Grises",
      "Sepia": "Sepia", "Sepia2": "Sepia 2", "Blur": "Desenfoque",
      "Sharpen": "Nitidez", "Invert": "Invertir", "Pixelate": "Pixelar",
      "Noise": "Ruido", "Emboss": "Relieve"
    };

    const editor = new tui.ImageEditor(container, {
      includeUI: {
        loadImage: { path: base64, name: "imagen" },
        theme,
        locale: localeEs,
        menu: ["crop","flip","rotate","draw","shape","text","icon"],
        initMenu: "draw",
        menuBarPosition: "bottom",
      },
      cssMaxWidth: 2000,
      cssMaxHeight: 2000,
      usageStatistics: false
    });

    // Zoom Visual
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

    const ensureFit = () => {
      try { editor._graphics.fitCanvas(); } catch (_) {}
      const c = editor._graphics?._canvas;
      const box = container.getBoundingClientRect();
      if (c && (c.getWidth() < 50 || c.getHeight() < 50)) {
        c.setWidth(Math.max(600, box.width - 40));
        c.setHeight(Math.max(400, box.height - 120));
        c.calcOffset();
      }
    };
    setTimeout(ensureFit, 300);

    return editor;
  }

  // ===========================================================
  // Helper: Crear SunEditor en el panel lateral
  // ===========================================================
  let descEditorInstance = null;

  function initSunEditorDesc(initialValue) {
    // Si ya existe, lo destruimos para recrearlo limpio
    if (descEditorInstance) {
      try { descEditorInstance.destroy(); } catch(e){}
      descEditorInstance = null;
    }

    const Sun = window.SUNEDITOR || window.SunEditor;
    if (!Sun) {
        // Fallback si no carga
        const ta = document.getElementById("sp-pe-desc");
        ta.style.display = "block";
        ta.value = initialValue;
        return;
    }

    // Configuración compacta para el panel lateral
    descEditorInstance = Sun.create('sp-pe-desc', {
        mode: 'classic',
        width: '100%',
        height: '100%',
        minHeight: '200px',
        // Barra de herramientas simplificada
        buttonList: [
            ['bold', 'underline', 'italic'],
            ['list'],
            ['removeFormat']
        ],
        lang: (window.SUNEDITOR_LANG && window.SUNEDITOR_LANG['es']) ? window.SUNEDITOR_LANG['es'] : undefined,
        // Estilo oscuro integrado
       iframeAttributes: { 
        style: 'background-color: #1f2937; color: #e2e8f0; font-family: Arial, sans-serif; font-size: 13.5px;',
        lang: 'es',         // <--- AGREGAR ESTA LÍNEA
        spellcheck: 'true'  // <--- AGREGAR ESTA LÍNEA
    },
        icons: {
            bold: '<i class="fa-solid fa-bold"></i>',
            underline: '<i class="fa-solid fa-underline"></i>',
            italic: '<i class="fa-solid fa-italic"></i>',
            list_number: '<i class="fa-solid fa-list-ol"></i>',
            list_bullets: '<i class="fa-solid fa-list-ul"></i>'
        }
    });

    // Cargar valor inicial
    descEditorInstance.setContents(initialValue);

    // --- [CORRECCIÓN] ACTIVAR CORRECTOR ORTOGRÁFICO EN EL EDITOR ---
    descEditorInstance.onload = () => {
        if (descEditorInstance.core.context.element.wysiwyg) {
            // Forzamos los atributos en el cuerpo editable
            descEditorInstance.core.context.element.wysiwyg.setAttribute('spellcheck', 'true');
            descEditorInstance.core.context.element.wysiwyg.setAttribute('lang', 'es');
            console.log("✅ Corrector activado en descripción de foto.");
        }
    };
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
      const toggleBtn = document.getElementById("sp-desc-toggle");
      const labelBtn = document.getElementById("sp-btn-label");
      const panel = document.getElementById("sp-desc-panel");
      const zoomRange = document.getElementById("sp-zoom");
      const zoomLabel = document.getElementById("sp-zoom-label");

      modal.style.display = "block";
      container.innerHTML = "";
      
      if(zoomRange) { zoomRange.value = 100; zoomLabel.textContent = "100%"; }

      // Recuperar descripción actual (puede ser HTML o texto plano)
      const currentDesc = imgEl.dataset.description || "";
      
      // Inicializar SunEditor con esa descripción
      initSunEditorDesc(currentDesc);

      const editor = createEditor(container, imgEl.dataset.base64 || imgEl.src);

      // Botón Etiqueta
      labelBtn.onclick = () => {
        const canvas = editor._graphics.getCanvas();
        const activeObj = canvas.getActiveObject();
        if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) {
            activeObj.set({
                backgroundColor: '#ffffff',
                fill: '#000000',
                fontWeight: 'bold',
                padding: 5 
            });
            canvas.requestRenderAll(); 
        } else {
            alert("Primero selecciona un texto para convertirlo en etiqueta.");
        }
      };

      toggleBtn.onclick = () => {
        panel.style.width = panel.style.width === "0px" ? "320px" : "0px";
        if(panel.style.width === "0px") {
             panel.style.padding = "0";
             panel.style.borderRight = "none";
        } else {
             panel.style.padding = "15px";
             panel.style.borderRight = "1px solid #374151";
        }
      };

      document.getElementById("sp-pe-save").onclick = () => {
        try {
          const dataURL = editor.toDataURL({ format: "jpeg", quality: 0.9 });
          
          // Obtener contenido del editor (HTML)
          let descHTML = "";
          if (descEditorInstance) {
              descHTML = descEditorInstance.getContents();
          } else {
              // Fallback
              descHTML = document.getElementById("sp-pe-desc").value;
          }

          imgEl.dataset.base64 = dataURL;
          imgEl.src = dataURL;
          imgEl.dataset.description = descHTML; // Guardamos HTML

          // Pasamos texto plano para el botón de resumen visual, pero guardamos HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = descHTML;
          // Fix para que no se rompa si descHTML es null/undefined
          const plainText = tempDiv.textContent || tempDiv.innerText || "";

          onSave?.({ dataURL, description: descHTML }); 

          modal.style.display = "none";
          editor.destroy?.();
          if(descEditorInstance) { descEditorInstance.destroy(); descEditorInstance = null; }

        } catch (e) {
          console.error(e);
          alert("Error al guardar cambios.");
        }
      };

      document.getElementById("sp-pe-close").onclick = () => {
        modal.style.display = "none";
        editor.destroy?.();
        if(descEditorInstance) { descEditorInstance.destroy(); descEditorInstance = null; }
      };
    }
  };

})();
