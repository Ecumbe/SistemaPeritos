// js/wizard.js
// Lógica del Wizard (Pasos 1–4) + SunEditor + Autosave + Generación de documentos
// MEJORAS: Autocompletado Efímero + Reordenamiento de Fotos (Sortable) + Fix Ortografía

(function () {

  let loggedInUser = null;
  let swalDark = null;
  let Toast = null;
  let maxStepAchieved = 1;
  let currentReportId = null;
  let saveTimeout = null; // Variable para el debounce del autosave

  // Referencias DOM
  let wizardStepper, step1Div, step2Div, step3Div, step4Div;
  let btnGuardar;

  // Variables para los editores SunEditor
  let editorReferencia, editorObjeto, editorReconocimiento, editorConclusiones;

  /* ==========================================================
     MEJORA 1: MEMORIA EFÍMERA (AUTOCOMPLETADO TEMPORAL)
     Se borra al recargar la página o dar clic en "Nuevo Informe"
  ========================================================== */
  const memoriaEfimera = {
    lugares: new Set(),
    fiscales: new Set()
  };

  function registrarEnMemoria(tipo, valor) {
    if (!valor || valor.trim().length < 3) return;
    memoriaEfimera[tipo].add(valor.trim());
    actualizarDatalist(tipo);
  }

  function actualizarDatalist(tipo) {
    let idList = `list-efimera-${tipo}`;
    let datalist = document.getElementById(idList);

    // Si no existe, lo creamos dinámicamente
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = idList;
      document.body.appendChild(datalist);
    }

    datalist.innerHTML = '';
    memoriaEfimera[tipo].forEach(val => {
      const option = document.createElement('option');
      option.value = val;
      datalist.appendChild(option);
    });
  }

  function limpiarMemoriaEfimera() {
    memoriaEfimera.lugares.clear();
    memoriaEfimera.fiscales.clear();
    console.log("🧹 Memoria efímera borrada.");
  }

  /* ==========================================================
     INICIALIZACIÓN PRINCIPAL
  ========================================================== */
  function initWizard(options) {
    loggedInUser = options.loggedInUser;
    swalDark = options.swalDark;
    Toast = options.Toast;

    wizardStepper = document.getElementById('main-wizard-stepper');
    step1Div = document.getElementById('wizard-step-1');
    step2Div = document.getElementById('wizard-step-2');
    step3Div = document.getElementById('wizard-step-3');
    step4Div = document.getElementById('wizard-step-4');
    btnGuardar = document.getElementById('btn-guardar-y-subir-fotos');

    // 1. Inicializar Editores Ricos
    initRichTextEditors();

    // 2. Inicializar Eventos y Lógica Base
    inicializarEventosStepper();
    inicializarPaso1();
    inicializarBotonesNavegacion();
    inicializarBotonesGeneradores();
    inicializarBotonGuardar();

    // 3. Chequea si hay borrador (autosave en la nube)
    checkForCloudDraft();

    // --- ACTIVAR AUTOCOMPLETADO EFÍMERO ---
    const inputLugar = document.getElementById('tabla-lugar-hechos');
    if (inputLugar) {
      inputLugar.setAttribute('list', 'list-efimera-lugares');
      inputLugar.addEventListener('change', (e) => registrarEnMemoria('lugares', e.target.value));
    }

    const inputFiscal = document.getElementById('tabla-agente-fiscal');
    if (inputFiscal) {
      inputFiscal.setAttribute('list', 'list-efimera-fiscales');
      inputFiscal.addEventListener('change', (e) => registrarEnMemoria('fiscales', e.target.value));
    }

    // --- ACTIVAR ARRASTRAR Y SOLTAR (Drag & Drop) ---
    initSortableObserver();
  }

  /* ==========================================================
     MEJORA 2: DRAG & DROP (SORTABLE JS)
     Observa el contenedor de láminas para activar el arrastre en nuevas fotos
  ========================================================== */
  function initSortableObserver() {
    const container = document.getElementById('laminas-container');
    // Si no existe el contenedor o la librería Sortable, no hacemos nada
    if (!container || typeof Sortable === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('lamina-card')) {
            const photoContainer = node.querySelector('.lamina-fotos-container');
            if (photoContainer) makeSortable(photoContainer);
          }
        });
      });
    });
    observer.observe(container, { childList: true });
  }

  function makeSortable(el) {
    new Sortable(el, {
      animation: 150,
      ghostClass: 'bg-primary', // Clase visual al arrastrar
      handle: '.card-img-top',  // Se arrastra desde la imagen
      onEnd: function (evt) {
        // Al soltar, re-numeramos visualmente "Fotografía N° 1, 2..."
        const allInputs = el.querySelectorAll('.foto-title-input');
        allInputs.forEach((input, index) => {
          input.value = `Fotografía N° ${index + 1}`;
        });
        showNavButtons(); // Habilitar botón guardar porque hubo cambios
      }
    });
    // Evitar conflicto: permitir seleccionar texto en los inputs sin iniciar arrastre
    el.querySelectorAll('input, textarea').forEach(inp => {
        inp.addEventListener('mousedown', (e) => e.stopPropagation());
    });
  }

  /* ==========================================================
     SUNEDITOR (Rich Text) - CON ESPERA AUTOMÁTICA & FIX ORTOGRAFÍA
  ========================================================== */
  // REEMPLAZAR TODA LA FUNCIÓN initRichTextEditors en wizard.js

function initRichTextEditors() {
    const Sun = window.SUNEDITOR || window.SunEditor;
    if (typeof Sun === 'undefined') {
        if (!window.sunEditorRetries) window.sunEditorRetries = 0;
        window.sunEditorRetries++;
        if (window.sunEditorRetries < 20) {
            setTimeout(initRichTextEditors, 100);
            return;
        } else {
            console.error("⚠️ SunEditor no cargó.");
            return;
        }
    }

    const toolbarOptions = [
        ['bold', 'underline', 'italic'],
        ['list'],
        ['removeFormat'],
        ['undo', 'redo']
    ];

    // ESTA ES LA CLAVE: Función que fuerza la ortografía al cargar
    const forceSpellCheck = (editor) => {
        editor.onload = (core, reload) => {
            // 1. Acceder al elemento editable (el <body> del iframe)
            const editable = core.context.element.wysiwyg;
            
            // 2. Inyectar atributos a la fuerza
            editable.setAttribute('spellcheck', 'true');
            editable.setAttribute('lang', 'es');
            
            // 3. Acceder al Iframe padre y forzar también
            const iframe = core.context.element.wysiwygFrame;
            if(iframe) {
                iframe.setAttribute('spellcheck', 'true'); 
            }

            // 4. EL TRUCO FINAL: Poner el foco momentáneamente para despertar al navegador
            // Esto obliga a Chrome/Edge a escanear el texto
            try { core.focus(); } catch(e) {}
            
            console.log("✅ Corrector FORZADO en:", core.context.element.originTextarea.id);
        };
    };

    const commonConfig = {
        width: '100%',
        height: 'auto',
        minHeight: '150px',
        buttonList: toolbarOptions,
        mode: 'classic',
        // Aunque lo ponemos aquí, el onload de arriba es el que asegura que funcione
        iframeAttributes: { 
            style: 'background-color: #ffffff; color: #111111; font-family: Arial, sans-serif; font-size: 13.5px;',
            lang: 'es',
            spellcheck: 'true'
        },
        icons: {
            bold: '<i class="fa-solid fa-bold"></i>',
            underline: '<i class="fa-solid fa-underline"></i>',
            italic: '<i class="fa-solid fa-italic"></i>',
            list_number: '<i class="fa-solid fa-list-ol"></i>',
            list_bullets: '<i class="fa-solid fa-list-ul"></i>'
        }
    };

    try {
        const createIfExist = (id, config) => {
            const el = document.getElementById(id);
            if (el && el.tagName === 'TEXTAREA' && !el.style.display.includes('none')) {
                const editor = Sun.create(id, config);
                // APLICAMOS LA FUERZA BRUTA AQUÍ
                forceSpellCheck(editor);
                
                editor.onChange = () => { if (window.Wizard) window.Wizard.showNavButtons(); };
                return editor;
            }
            return null;
        };

        if (!editorReferencia) editorReferencia = createIfExist('informe-referencia', commonConfig);
        if (!editorObjeto) editorObjeto = createIfExist('informe-objeto', { ...commonConfig, minHeight: '100px' });
        if (!editorReconocimiento) editorReconocimiento = createIfExist('informe-reconocimiento', { ...commonConfig, minHeight: '300px' });
        if (!editorConclusiones) editorConclusiones = createIfExist('informe-conclusiones', { ...commonConfig, minHeight: '150px' });

    } catch (e) {
        console.error("Error al iniciar SunEditor:", e);
    }
}

  /* ==========================================================
     STEPPER & NAVEGACIÓN (CON FIX ORTOGRAFÍA EN GITHUB)
  ========================================================== */

  function updateWizardStepper(stepNumber) {
    if (!wizardStepper) return;
    const stepList = wizardStepper.querySelector('.step-wizard-list');
    const stepItems = wizardStepper.querySelectorAll('.step-wizard-item');
    if (!stepList || !stepItems.length) return;

    let progressPercent = "0%";
    if (stepNumber === 2) progressPercent = "26.6%";
    if (stepNumber === 3) progressPercent = "53.3%";
    if (stepNumber === 4) progressPercent = "80%";

    stepList.style.setProperty('--wizard-progress', progressPercent);

    stepItems.forEach(item => {
      item.classList.remove('active', 'completed', 'disabled');
      const itemStep = parseInt(item.id.split('-').pop());
      if (itemStep < stepNumber) item.classList.add('completed');
      else if (itemStep === stepNumber) item.classList.add('active');
      if (itemStep > maxStepAchieved) item.classList.add('disabled');
    });
  }

  function navigateToStep(stepNumber) {
    if (stepNumber > maxStepAchieved) return;

    ['wizard-step-1', 'wizard-step-2', 'wizard-step-3', 'wizard-step-4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('d-none');
    });

    const targetDiv = document.getElementById(`wizard-step-${stepNumber}`);
    if (targetDiv) targetDiv.classList.remove('d-none');

    if (stepNumber === 2) popularFormularioPaso2();
    if (stepNumber === 3) popularFormularioPaso3();

    updateWizardStepper(stepNumber);

    if (stepNumber > 1) {
      autoSaveDraft();
    }

    // --- [MEJORA 3: FIX ORTOGRAFÍA AL NAVEGAR] ---
    // Esto soluciona el problema en GitHub Pages donde los campos ocultos pierden el spellcheck
    setTimeout(() => {
        const inputsVisibles = targetDiv.querySelectorAll('textarea, input[type="text"]');
        inputsVisibles.forEach(input => {
            // Truco: Apagar y prender el atributo fuerza al navegador a re-escanear
            input.setAttribute('spellcheck', 'false'); 
            input.setAttribute('lang', 'es');
            
            setTimeout(() => {
                input.setAttribute('spellcheck', 'true');
            }, 50);
        });
        console.log(`✅ Corrector reactivado para paso ${stepNumber}`);
    }, 300); 
  }

  function inicializarEventosStepper() {
    if (!wizardStepper) return;
    wizardStepper.addEventListener('click', (e) => {
      const stepItem = e.target.closest('.step-wizard-item');
      if (stepItem && !stepItem.classList.contains('disabled')) {
        const stepNumber = parseInt(stepItem.id.split('-').pop());
        navigateToStep(stepNumber);
      }
    });
  }

  /* ==========================================================
     AUTOSAVE (Borrador en la nube)
  ========================================================== */

  async function autoSaveDraft() {
    if (maxStepAchieved < 2) return;
    const currentData = gatherAllTextData();
    currentData.savedStep = maxStepAchieved;

    try {
      const data = await API.guardarBorrador(loggedInUser, currentData);
      if (data.status === 'success' && Toast) {
        Toast.fire({ icon: 'success', title: 'Borrador auto-guardado' });
      }
    } catch (err) {
      console.error('Error auto-save', err);
    }
  }

  async function checkForCloudDraft() {
    try {
      const data = await API.cargarBorrador(loggedInUser);
      if (data.status === 'success' && data.found) {
        const draft = data.draft;
        Swal.fire({
          title: 'Recuperación de Sesión',
          text: `Encontramos un informe pendiente (IF: ${draft.datosFlagrancia.if_number}). ¿Deseas continuar donde lo dejaste?`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Sí, recuperar',
          cancelButtonText: 'No, descartar',
          customClass: swalDark
        }).then((result) => {
          if (result.isConfirmed) {
            restoreDraft(draft);
          }
          else if (result.dismiss === Swal.DismissReason.cancel) {
            // Borrar borrador de la nube
            API.borrarBorrador(loggedInUser)
              .then(() => console.log("Borrador eliminado en la nube."))
              .catch(err => console.error("Error al borrar borrador:", err));
          }
        });
      }
    } catch (e) {
      console.error('Error checking draft', e);
    }
  }

  function restoreDraft(draft) {
    localStorage.setItem('datosFlagrancia', JSON.stringify(draft.datosFlagrancia));

    const triggerEl = document.querySelector('#nuevo-tab-original');
    if (triggerEl && window.bootstrap) {
      const tabInstance = bootstrap.Tab.getOrCreateInstance(triggerEl);
      tabInstance.show();
    }

    if (draft.datosOficio) {
      setValue('oficio-anio', draft.datosOficio.oficioAnio);
      setValue('oficio-numero', draft.datosOficio.oficioNumero);
      setValue('oficio-fecha', draft.datosOficio.oficioFecha);
      setValue('oficio-asunto-numero', draft.datosOficio.oficioAsunto);
      setValue('oficio-tratamiento', draft.datosOficio.oficioTratamiento);
      setValue('oficio-fiscal-nombre', draft.datosOficio.oficioFiscalNombre);
      setValue('oficio-fiscal-unidad', draft.datosOficio.oficioFiscalUnidad);
      setValue('oficio-agente-nombre', draft.datosOficio.oficioAgenteNombre);
      setValue('oficio-agente-grado', draft.datosOficio.oficioAgenteGrado);
    }

    if (draft.datosCuerpo) {
      setValue('informe-referencia', draft.datosCuerpo.referencia);
      setValue('informe-fecha-referencia', draft.datosCuerpo.fechaReferencia);
      setValue('informe-objeto', draft.datosCuerpo.objeto);
      setValue('informe-fundamentos-tecnicos', draft.datosCuerpo.fundamentosTecnicos);
      setValue('informe-fundamentos-legales', draft.datosCuerpo.fundamentosLegales);
      setValue('informe-reconocimiento', draft.datosCuerpo.reconocimiento);
      setValue('informe-conclusiones', draft.datosCuerpo.conclusiones);
      popularFormularioPaso3();
    }

    maxStepAchieved = draft.savedStep || 2;
    navigateToStep(maxStepAchieved);
  }

  function setValue(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v || '';
  }

  /* ==========================================================
     PASO 1: Búsqueda IF
  ========================================================== */

  function inicializarPaso1() {
    const searchBtn = document.getElementById("if-search-btn");
    const searchInput = document.getElementById("if-search-input");
    const loader = document.getElementById("if-search-loader");
    const resultsCard = document.getElementById("if-search-results-card");
    const resultsContent = document.getElementById("if-search-results-content");
    const btnContinuarPaso1 = document.getElementById("if-search-continuar");

    if (!searchBtn) return;

    searchBtn.addEventListener('click', async () => {
      const ifNumber = (searchInput.value || '').trim();
      if (!ifNumber) {
        Swal.fire({
          icon: 'error',
          title: 'Campo Vacío',
          text: 'Por favor, ingrese un N° de Instrucción Fiscal.',
          customClass: swalDark
        });
        return;
      }

      loader.classList.remove('d-none');
      resultsCard.classList.add('d-none');
      btnContinuarPaso1.classList.add('d-none');
      searchBtn.disabled = true;

      try {
        const data = await API.buscarFlagrancia(ifNumber);
        loader.classList.add('d-none');
        searchBtn.disabled = false;

        if (data.status === 'success') {
          const d = data.data;
          // --- [NUEVO BLOQUE: LÓGICA DE COLOR DINÁMICO] ---
          const headerCard = resultsCard.querySelector('.card-header');
          const icon = headerCard.querySelector('i');
          const strongText = headerCard.querySelector('strong');

          // Limpiamos clases anteriores para evitar conflictos
          headerCard.classList.remove('bg-success', 'bg-danger');
          
          if (d.cumplimiento === 'SI') {
              // CASO: YA CUMPLIDO (VERDE)
              headerCard.classList.add('bg-success');
              icon.className = 'fa-solid fa-check-circle me-2';
              strongText.textContent = 'Datos Encontrados - CUMPLIDO';
          } else {
              // CASO: PENDIENTE / NO CUMPLIDO (ROJO)
              headerCard.classList.add('bg-danger');
              icon.className = 'fa-solid fa-exclamation-circle me-2'; // Cambiamos ícono a alerta
              strongText.textContent = 'Datos Encontrados - PENDIENTE';
          }
          // ----------------------------------------------------

          resultsContent.innerHTML = `
            <p class="result-item"><strong>IF N°:</strong> ${d.if_number}</p>
            <p class="result-item"><strong>Delito:</strong> ${d.delito}</p>
            <p class="result-item"><strong>Detenido/Sosp.:</strong> ${d.detenido}</p>
            <p class="result-item"><strong>Fiscal:</strong> ${d.fiscal}</p>
            <p class="result-item"><strong>Unidad Fiscalía:</strong> ${d.unidad_fiscalia}</p>
            <p class="result-item"><strong>Fecha Infracción:</strong> ${d.fecha_infraccion}</p>
            <p class="result-item"><strong>Fecha Delegación:</strong> ${d.fecha_delegacion}</p>
            <p class="result-item"><strong>Cumplimiento:</strong> ${d.cumplimiento}</p> <!-- Opcional: Mostrar el dato -->
          `;
          resultsCard.classList.remove('d-none');
          btnContinuarPaso1.classList.remove('d-none');
          localStorage.setItem('datosFlagrancia', JSON.stringify(d));
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: data.message, customClass: swalDark });
        }
      } catch (error) {
        loader.classList.add('d-none');
        searchBtn.disabled = false;
        Swal.fire({
          icon: 'error',
          title: 'Error de Conexión',
          text: 'No se pudo conectar.',
          customClass: swalDark
        });
      }
    });

    if (btnContinuarPaso1) {
      btnContinuarPaso1.addEventListener('click', () => {
        maxStepAchieved = Math.max(maxStepAchieved, 2);
        navigateToStep(2);
      });
    }
  }

  /* ==========================================================
     PASO 2 / 3: Oficio + Tabla
  ========================================================== */

  function popularFormularioPaso2(isReset = false) {
    const datos = JSON.parse(localStorage.getItem('datosFlagrancia') || 'null');
    if (!isReset && datos) {
      setValue('oficio-fiscal-nombre', datos.fiscal);
      setValue('oficio-fiscal-unidad', datos.unidad_fiscalia);
      setValue('oficio-agente-nombre', datos.agente ? datos.agente.trim() : '');

      const gradoSelect = document.getElementById('oficio-agente-grado');
      if (gradoSelect) {
        const gradoAgente = datos.grado ? datos.grado.trim().toUpperCase() : '';
        for (let i = 0; i < gradoSelect.options.length; i++) {
          if (gradoSelect.options[i].value === gradoAgente) {
            gradoSelect.selectedIndex = i;
            break;
          }
        }
      }
    } else if (isReset) {
      setValue('oficio-fiscal-nombre', '');
      setValue('oficio-fiscal-unidad', '');
      setValue('oficio-agente-nombre', '');
      const gradoSelect = document.getElementById('oficio-agente-grado');
      if (gradoSelect) gradoSelect.selectedIndex = 0;
    }

    const anioInput = document.getElementById('oficio-anio');
    const fechaInput = document.getElementById('oficio-fecha');
    if (anioInput) anioInput.value = new Date().getFullYear();
    if (fechaInput) fechaInput.value = formatearFecha(new Date());

    const ids = ['oficio-anio', 'oficio-numero', 'oficio-fecha', 'oficio-asunto-numero'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.removeEventListener('input', actualizarCuerpoOficio);
        el.addEventListener('input', actualizarCuerpoOficio);
      }
    });
    actualizarCuerpoOficio();
  }

  function popularFormularioPaso3() {
    const datosFlag = JSON.parse(localStorage.getItem('datosFlagrancia') || 'null');

    const oficioAnio = getValue('oficio-anio') || new Date().getFullYear();
    const oficioNumero = getValue('oficio-numero') || '';
    const oficioFecha = getValue('oficio-fecha') || formatearFecha(new Date());
    const oficioAsunto = getValue('oficio-asunto-numero') || '';

    const agenteNombre = getValue('oficio-agente-nombre') || '';
    const agenteGrado = getValue('oficio-agente-grado') || '';
    const peritoCompleto = `${agenteGrado} DE POLICIA ${agenteNombre}`.trim();

    setValue('tabla-if-nro', datosFlag ? datosFlag.if_number : '');
    setValue('tabla-fecha-informe', oficioFecha);
    setValue('tabla-perito', peritoCompleto);
    setValue('tabla-informe-nro', `PN-ZONA8-JINVPJ-UDF-${oficioAnio}-${oficioNumero}`);
    setValue('tabla-delito', datosFlag ? datosFlag.delito : '');
    setValue('tabla-agente-fiscal', datosFlag ? datosFlag.fiscal : '');
    setValue('tabla-procesado', datosFlag ? datosFlag.detenido : '');
    setValue('tabla-ref-oficio', `FPG-FEIFO${oficioAsunto}`);

    setValue('tabla-fecha-aprehension',
      (datosFlag && datosFlag.fecha_infraccion) ? datosFlag.fecha_infraccion : formatearFecha(new Date())
    );
    setValue('informe-fecha-referencia',
      (datosFlag && datosFlag.fecha_delegacion) ? datosFlag.fecha_delegacion : formatearFecha(new Date())
    );

    actualizarCuerpoOficio();

    const ft = "El reconocimiento del lugar  es un  acto procesal que se cumplen por orden de autoridad competente y previa posesión ante la misma, tiene como fin la percepción y comprobación de los efectos materiales que el hecho investigado hubiere dejado, mediante la fijación de la actividad, motivo de la diligencia, así como también la búsqueda minuciosa de indicios, huellas, rastros o vestigios que indicaran directamente la existencia de un delito, al tratarse de un hecho que no produjo efectos materiales, o hubiere sido alterado o el tiempo hubiese cambiado, se describirá el estado existente, para tal efecto se utilizara las técnicas de observación y fijación adecuadas a lo solicitado por la autoridad competente.";
    const fl = "El COIP en su Art. 460 sobre el Reconocimiento del Lugar de los hechos manifiesta: La o el fiscal con el apoyo del personal del Sistema especializado integral de investigación, de medicina legal y ciencias forenses, o el personal competente en materia de tránsito, cuando sea relevante para la investigación, reconocerá el lugar de los hechos.";

    const elFT = document.getElementById('informe-fundamentos-tecnicos');
    if (elFT && !elFT.value) elFT.value = ft;

    const elFL = document.getElementById('informe-fundamentos-legales');
    if (elFL && !elFL.value) elFL.value = fl;
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function actualizarCuerpoOficio() {
    const anio = getValue('oficio-anio');
    const numero = getValue('oficio-numero');
    const fecha = getValue('oficio-fecha');
    const asunto = getValue('oficio-asunto-numero');
    const d = JSON.parse(localStorage.getItem('datosFlagrancia') || 'null');

    setValue('tabla-informe-nro', `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`);
    setValue('tabla-ref-oficio', `FPG-FEIFO${asunto}`);

    setText('cuerpo-oficio-nro', `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`);
    setText('cuerpo-oficio-fecha', fecha);
    setText('cuerpo-oficio-asunto', `FPG-FEIFO${asunto}`);

    if (d) {
      setText('cuerpo-if-nro', d.if_number);
      setText('cuerpo-detenido-nombre', d.detenido);
      setText('cuerpo-delito-nombre', d.delito);
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  function formatearFecha(date) {
    if (!date || isNaN(date.getTime())) return "";
    const options = { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' };
    return `Guayaquil, ${date.toLocaleDateString('es-EC', options)}`;
  }

  /* ==========================================================
     BOTONES DE NAVEGACIÓN PASO 2/3/4
  ========================================================== */

  function inicializarBotonesNavegacion() {
    const btnReg1 = document.getElementById('btn-regresar-paso1');
    const btnCont3 = document.getElementById('btn-continuar-paso3');
    const btnReg2 = document.getElementById('btn-regresar-paso2');
    const btnCont4 = document.getElementById('btn-continuar-paso4');
    const btnReg3 = document.getElementById('btn-regresar-paso3');

    if (btnReg1) btnReg1.addEventListener('click', () => navigateToStep(1));
    if (btnCont3) btnCont3.addEventListener('click', () => {
      maxStepAchieved = Math.max(maxStepAchieved, 3);
      navigateToStep(3);
    });
    if (btnReg2) btnReg2.addEventListener('click', () => navigateToStep(2));

    if (btnCont4) btnCont4.addEventListener('click', () => {
      const recoContent = editorReconocimiento ? editorReconocimiento.getContents() : getValue('informe-reconocimiento');
      
      if (!recoContent || !recoContent.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Campo Vacío',
          text: 'El reconocimiento está vacío. ¿Continuar?',
          showCancelButton: true,
          confirmButtonText: 'Sí',
          customClass: swalDark
        }).then((result) => {
          if (result.isConfirmed) {
            maxStepAchieved = Math.max(maxStepAchieved, 4);
            navigateToStep(4);
          }
        });
      } else {
        maxStepAchieved = Math.max(maxStepAchieved, 4);
        navigateToStep(4);
      }
    });

    if (btnReg3) btnReg3.addEventListener('click', () => {
      showNavButtons();
      navigateToStep(3);
    });
  }

  /* ==========================================================
     BOTONES GENERADORES (Paso 3) - ADAPTADO A SUNEDITOR
  ========================================================== */

  function inicializarBotonesGeneradores() {
    const generators = [
      {
        btn: 'btn-generar-referencia',
        target: 'informe-referencia',
        tmpl: (d) =>
          `Mediante Oficio Nro.- ${d.ref}, de fecha ${d.fecha}, suscrito por la ${d.fiscal}, FISCAL DE LO PENAL DEL GUAYAS ${d.unidad}, dirigido al señor JEFE DEL SISTEMA ESPECIALIZADO INTEGRAL DE INVESTIGACIÓN, MEDICINA LEGAL Y CIENCIAS FORENSES DEL GUAYAS.`
      },
      {
        btn: 'btn-generar-objeto',
        target: 'informe-objeto',
        tmpl: (d) =>
          `Pedido textual: “EL RECONOCIMIENTO DEL LUGAR DE LOS HECHOS”, que se hacen constar en el Parte Policial, de fecha ${d.fechaAp}, en contra de los procesados (a) ${d.proc}.`
      },
      {
        btn: 'btn-generar-conclusion',
        target: 'informe-conclusiones',
        tmpl: (d) =>
          `Se determina que el lugar de los hechos, suscrito en el parte de aprehensión, de fecha ${d.fechaAp}, en contra de la ciudadana hoy procesada ${d.proc}, (SI EXISTE) y se encuentra ubicado en el ${d.lugar}, misma que fue fijada y fotografiada y descriptivamente se encuentra detallada.`
      }
    ];

    generators.forEach(gen => {
      const btn = document.getElementById(gen.btn);
      if (btn) {
        btn.addEventListener('click', () => {
          const data = {
            ref: getValue('tabla-ref-oficio'),
            fecha: getValue('informe-fecha-referencia'),
            fiscal: getValue('oficio-fiscal-nombre'),
            unidad: `FISCALÍA ESPECIALIZADA EN INVESTIGACIÓN DE ${getValue('oficio-fiscal-unidad')}`,
            fechaAp: getValue('tabla-fecha-aprehension'),
            proc: getValue('tabla-procesado'),
            lugar: getValue('tabla-lugar-hechos')
          };
          
          const textoGenerado = gen.tmpl(data);

          if (gen.target === 'informe-referencia' && editorReferencia) {
             editorReferencia.setContents(textoGenerado);
          } else if (gen.target === 'informe-objeto' && editorObjeto) {
             editorObjeto.setContents(textoGenerado);
          } else if (gen.target === 'informe-conclusiones' && editorConclusiones) {
             editorConclusiones.setContents(textoGenerado);
          } else {
             const el = document.getElementById(gen.target);
             if (el) el.value = textoGenerado;
          }
        });
      }
    });
  }

  /* ==========================================================
     GUARDAR Y SUBIR (Texto + Fotos)
  ========================================================== */

  function inicializarBotonGuardar() {
    if (!btnGuardar) return;

    btnGuardar.addEventListener('click', async () => {
      Swal.fire({
        title: 'Guardando...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        customClass: swalDark
      });

      const textData = gatherAllTextData();
      const photos = (window.Fotos && window.Fotos.gatherAllPhotoData)
        ? window.Fotos.gatherAllPhotoData()
        : [];

      try {
        // 1. Guardar Texto
        const data = await API.guardarInformeCompleto(textData);
        if (data.status !== 'success') throw new Error(data.message || 'Error al guardar informe');

        currentReportId = data.reportId;

        // 2. Subir Fotos
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (!p.base64 || !p.base64.startsWith('data:image')) continue;

          Swal.update({ text: `Subiendo foto ${i + 1}/${photos.length}` });

          await API.subirFoto({
            reportId: currentReportId,
            laminaNum: p.laminaNum,
            titulo: p.titulo,
            descripcion: p.descripcion,
            base64Data: p.base64.split(',')[1]
          });
        }

        Swal.fire({
          icon: 'success',
          title: 'Guardado Correctamente',
          text: `ID: ${currentReportId}`,
          customClass: swalDark
        });

        showPostSaveButtons(currentReportId);

        if (window.App && typeof window.App.loadLastOficios === 'function') {
          window.App.loadLastOficios();
        }

      } catch (e) {
        console.error(e);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: e.message,
          customClass: swalDark
        });
      }
    });

    // Botón imprimir
    const btnPrint = document.getElementById('btn-imprimir-documento');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        if (!currentReportId) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No hay informe guardado.',
            customClass: swalDark
          });
          return;
        }
        handlePrintMenu(currentReportId);
      });
    }

    // Botón Nuevo Informe (Limpiar campos y memoria)
    const btnNew = document.getElementById('btn-nuevo-informe');
    if (btnNew) {
      btnNew.onclick = () => {
          limpiarMemoriaEfimera(); // Borramos la memoria de autocompletado
          window.location.reload();
      };
    }
  }

  function gatherAllTextData() {
    return {
      datosFlagrancia: JSON.parse(localStorage.getItem('datosFlagrancia') || 'null'),
      datosOficio: {
        oficioAnio: getValue('oficio-anio'),
        oficioNumero: getValue('oficio-numero'),
        oficioFecha: getValue('oficio-fecha'),
        oficioAsunto: getValue('oficio-asunto-numero'),
        oficioTratamiento: getValue('oficio-tratamiento'),
        oficioFiscalNombre: getValue('oficio-fiscal-nombre'),
        oficioFiscalUnidad: getValue('oficio-fiscal-unidad'),
        oficioAgenteNombre: getValue('oficio-agente-nombre'),
        oficioAgenteGrado: getValue('oficio-agente-grado'),
        creadoPor: loggedInUser
      },
      datosCuerpo: {
        tabla_if_nro: getValue('tabla-if-nro'),
        tabla_fecha_informe: getValue('tabla-fecha-informe'),
        tabla_informe_nro: getValue('tabla-informe-nro'),
        tabla_delito: getValue('tabla-delito'),
        tabla_lugar_hechos: getValue('tabla-lugar-hechos'),
        tabla_fecha_aprehension: getValue('tabla-fecha-aprehension'),
        tabla_agente_fiscal: getValue('tabla-agente-fiscal'),
        tabla_procesado: getValue('tabla-procesado'),
        tabla_ref_oficio: getValue('tabla-ref-oficio'),
        tabla_perito: getValue('tabla-perito'),
        tabla_cod_reg: getValue('tabla-cod-reg'),
        
        referencia: editorReferencia ? editorReferencia.getContents() : getValue('informe-referencia'),
        fechaReferencia: getValue('informe-fecha-referencia'),
        objeto: editorObjeto ? editorObjeto.getContents() : getValue('informe-objeto'),
        
        fundamentosTecnicos: getValue('informe-fundamentos-tecnicos'),
        fundamentosLegales: getValue('informe-fundamentos-legales'),
        
        reconocimiento: editorReconocimiento ? editorReconocimiento.getContents() : getValue('informe-reconocimiento'),
        conclusiones: editorConclusiones ? editorConclusiones.getContents() : getValue('informe-conclusiones')
      }
    };
  }

  function showNavButtons() {
    const btnPrint = document.getElementById('btn-imprimir-documento');
    const btnNew = document.getElementById('btn-nuevo-informe');
    if (btnPrint) btnPrint.classList.add('d-none');
    if (btnNew) btnNew.classList.add('d-none');
    if (btnGuardar) btnGuardar.classList.remove('d-none');
  }

  function showPostSaveButtons(id) {
    const btnPrint = document.getElementById('btn-imprimir-documento');
    const btnNew = document.getElementById('btn-nuevo-informe');
    if (btnPrint) btnPrint.classList.remove('d-none');
    if (btnNew) btnNew.classList.remove('d-none');
    currentReportId = id;
  }

  /* ==========================================================
     IMPRESIÓN / GENERAR DOCUMENTO
  ========================================================== */

  function handlePrintMenu(reportId) {
    Swal.fire({
      title: 'Opciones de Documento',
      html: `
        <div class="d-grid gap-2">
          <button id="swal-btn-preview" class="btn btn-info text-white" style="font-size: 1.1rem; padding: 10px;">
            <i class="fa-solid fa-eye me-2"></i> Visualizar PDF
          </button>
          <button id="swal-btn-down-pdf" class="btn btn-danger" style="font-size: 1.1rem; padding: 10px;">
            <i class="fa-solid fa-file-pdf me-2"></i> Descargar PDF
          </button>
          <button id="swal-btn-down-word" class="btn btn-primary" style="font-size: 1.1rem; padding: 10px;">
            <i class="fa-solid fa-file-word me-2"></i> Descargar WORD
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: swalDark,
      didOpen: () => {
        document.getElementById('swal-btn-preview').onclick = () => {
          Swal.close();
          generarDocumento('pdf', reportId, 'preview');
        };
        document.getElementById('swal-btn-down-pdf').onclick = () => {
          Swal.close();
          generarDocumento('pdf', reportId, 'download');
        };
        document.getElementById('swal-btn-down-word').onclick = () => {
          Swal.close();
          generarDocumento('word', reportId, 'download');
        };
      }
    });
  }

  async function generarDocumento(format, reportId, mode) {
    Swal.fire({
      title: `Generando ${format.toUpperCase()}...`,
      text: 'Esto puede tomar un momento...',
      allowOutsideClick: false,
      customClass: swalDark,
      didOpen: () => Swal.showLoading()
    });

    try {
      const data = await API.generarDocumentoBackend({
        reportId,
        format,
        user: loggedInUser
      });

      if (data.status === 'success') {
        Swal.close();
        downloadFileFromBase64(data.base64Data, data.fileName, data.mimeType, format, mode);
      } else {
        throw new Error(data.message || 'Error desconocido en el backend.');
      }
    } catch (error) {
      console.error('Error en generarDocumento:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de Conexión',
        text: `No se pudo generar el documento: ${error.message}`,
        customClass: swalDark
      });
    }
  }

  function downloadFileFromBase64(base64Data, fileName, mimeType, format, mode) {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (mode === 'preview' && format === 'pdf') {
        window.open(blobUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) {
      console.error('Error descarga:', e);
      Swal.fire({
        icon: 'error',
        title: 'Error de Descarga',
        text: 'Hubo un problema al crear el archivo.',
        customClass: swalDark
      });
    }
  }

  // Exponer funciones necesarias a foto.js y otros
  window.Wizard = {
    initWizard,
    navigateToStep,
    showNavButtons,
    gatherAllTextData,
    handlePrintMenu,
    getCurrentReportId: () => currentReportId,
    swalDark
  };

})();

/* ==========================================================
   MANEJO DEL MODAL DE AGENDAMIENTO
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
  
  const agBuscarBtn = document.getElementById("agendamiento-if-search-btn");
  const agInput = document.getElementById("agendamiento-if-input");
  const agLoader = document.getElementById("agendamiento-if-search-loader");
  const agResults = document.getElementById("agendamiento-if-search-results-card");

  if (agBuscarBtn) {
    agBuscarBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const ifNum = agInput.value.trim();
      if (!ifNum) {
        Swal.fire({
          icon: "warning",
          title: "Ingrese un número de IF",
          text: "Debe escribir el número de IF para buscar",
          customClass: swalDark
        });
        return;
      }

      agLoader.classList.remove("d-none");
      agResults.classList.add("d-none");

      try {
        const data = await API.buscarFlagrancia(ifNum);
        agLoader.classList.add("d-none");

        if (data.status === "success" && data.data) {
          const d = data.data;

          document.getElementById("agendamiento-if-nro-hidden").value = d.if_number;
          document.getElementById("agendamiento-delito").value = d.delito;
          document.getElementById("agendamiento-detenido").value = d.detenido;
          document.getElementById("agendamiento-fiscal").value = d.fiscal;
          document.getElementById("agendamiento-fiscalia").value = d.unidad_fiscalia;

          agResults.classList.remove("d-none");

          const btnGuardarAgenda = document.getElementById("btn-guardar-agendamiento");
          if (btnGuardarAgenda) btnGuardarAgenda.disabled = false;

        } else {
          Swal.fire({
            icon: "error",
            title: "Sin resultados",
            text: data.message || "No se encontraron datos para este IF.",
            customClass: swalDark
          });
        }

      } catch (err) {
        agLoader.classList.add("d-none");
        console.error(err);

        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudo realizar la búsqueda.",
          customClass: swalDark
        });
      }
    });
  }
});

/* ==========================================================
   GUARDAR AGENDAMIENTO
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
  const loggedInUser = localStorage.getItem("sistemaPeritosUser");

  const btnGuardarAg = document.getElementById("btn-guardar-agendamiento");

  if (btnGuardarAg) {
    btnGuardarAg.addEventListener("click", async () => {
      const ifNum = document.getElementById("agendamiento-if-nro-hidden").value;
      const delito = document.getElementById("agendamiento-delito").value;
      const detenido = document.getElementById("agendamiento-detenido").value;
      const fiscal = document.getElementById("agendamiento-fiscal").value;
      const fiscalia = document.getElementById("agendamiento-fiscalia").value;
      const fecha = document.getElementById("agendamiento-fecha").value;
      const hora = document.getElementById("agendamiento-hora").value;

      if (!fecha || !hora) {
        Swal.fire({
          icon: "warning",
          title: "Datos incompletos",
          text: "Debe seleccionar fecha y hora",
          customClass: swalDark
        });
        return;
      }

      Swal.fire({
        icon: "info",
        title: "Guardando",
        text: "Procesando agendamiento...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: swalDark
      });

      try {
        const cuerpo = {
          if_nro: ifNum,
          delito,
          detenido,
          fiscal,
          unidad_fiscalia: fiscalia,
          fecha_audiencia: fecha,
          hora_audiencia: hora,
          creado_por: loggedInUser
        };

        const resp = await API.guardarAgendamiento(loggedInUser, cuerpo);

        if (resp.status === "success") {
          Swal.fire({
            icon: "success",
            title: "Agendado",
            text: "Se guardó el agendamiento correctamente",
            customClass: swalDark
          });

          const modalEl = document.getElementById("modal-agendamiento");
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal.hide();

          document.getElementById("form-agendamiento").reset();
          document.getElementById("agendamiento-if-search-results-card").classList.add("d-none");
          
          if (window.cargarAgendamientosDeHoy) window.cargarAgendamientosDeHoy();

        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: resp.message,
            customClass: swalDark
          });
        }

      } catch (err) {
        console.error(err);

        Swal.fire({
          icon: "error",
          title: "Error inesperado",
          text: "No se pudo guardar el agendamiento",
          customClass: swalDark
        });
      }
    });
  }
});

/* ==========================================================
   ACTUALIZAR AGENDAMIENTO (REAGENDAR)
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
  const loggedInUser = localStorage.getItem("sistemaPeritosUser");
  
  const btnGuardarCambios = document.getElementById("btn-actualizar-reagenda");

  if (!btnGuardarCambios) return;

  btnGuardarCambios.addEventListener("click", async () => {
    const id = document.getElementById("reagendar-id").value;
    const fecha = document.getElementById("reagendar-fecha").value;
    const hora = document.getElementById("reagendar-hora").value;

    if (!fecha || !hora) {
      Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "Debe establecer nueva fecha y hora",
        customClass: swalDark
      });
      return;
    }

    Swal.fire({
      icon: "info",
      title: "Actualizando agendamiento...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: swalDark
    });

    try {
      const resp = await API.reagendarAudiencia(loggedInUser, id, fecha, hora);

      if (resp.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Actualizado",
          text: "Se modificó la hora/fecha correctamente",
          customClass: swalDark
        });

        const modalEl = document.getElementById("modal-reagendar");
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        if (window.cargarAgendamientosDeHoy) window.cargarAgendamientosDeHoy();

      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: resp.message,
          customClass: swalDark
        });
      }

    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Error en servidor",
        text: "No se pudo actualizar el agendamiento",
        customClass: swalDark
      });
    }
  });
});

/* ==========================================================
   DETECTAR SI EL USUARIO QUIERE VER AGENDAMIENTOS DE HOY
   (Funciona en tiempo real)
========================================================== */
// Este bloque usualmente se maneja en app.js, pero lo mantenemos aquí si así estaba tu lógica original
// para no romper nada.
/* ==========================================================
   DETECTAR SI EL USUARIO QUIERE VER AGENDAMIENTOS DE HOY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
  const loggedInUser = localStorage.getItem("sistemaPeritosUser");
  
  const btnHoy = document.getElementById("btn-mostrar-hoy");
  if (!btnHoy) return;

  btnHoy.addEventListener("click", async () => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");

    // Ajuste de zona horaria simple para coincidir con backend
    const fechaHoy = `${yyyy}-${mm}-${dd}`;

    Swal.fire({
      icon: "info",
      title: "Cargando agendamientos...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: swalDark
    });

    try {
      // Nota: Asegúrate de que tu API tenga este método expuesto o usa getAgendamientosPorFecha
      const resp = await API.getAgendamientosPorFecha(loggedInUser, fechaHoy);

      if (resp.status === "success" && resp.results && resp.results.length > 0) {
        Swal.close();
        renderAgendamientos(resp.results);
      } else {
        Swal.fire({
          icon: "warning",
          title: "Sin agendamientos",
          text: "No hay agendamientos para hoy.",
          customClass: swalDark
        });
        renderAgendamientos([]); // Limpiar vista
      }

    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo cargar los agendamientos.",
        customClass: swalDark
      });
    }
  });
});

/* ==========================================================
   BUSQUEDA MANUAL DE AGENDAMIENTO (INPUT)
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
  const loggedInUser = localStorage.getItem("sistemaPeritosUser");

  const btnBuscar = document.getElementById("agendamiento-search-btn");
  const inputBuscar = document.getElementById("agendamiento-search-input");

  if (!btnBuscar || !inputBuscar) return;

  btnBuscar.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const value = inputBuscar.value.trim();
    if (!value) {
      Swal.fire({
        icon: "warning",
        title: "Ingrese un número",
        text: "Debe escribir un número de IF para buscar",
        customClass: swalDark
      });
      return;
    }

    Swal.fire({
      icon: "info",
      title: "Buscando agendamientos...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: swalDark
    });

    try {
      const resp = await API.buscarAgendamientos(loggedInUser, value);

      if (resp.status === "success" && resp.results && resp.results.length > 0) {
        Swal.close();
        renderAgendamientos(resp.results);
      } else {
        Swal.fire({
          icon: "warning",
          title: "Sin resultados",
          text: "No se encontraron agendamientos con ese número.",
          customClass: swalDark
        });
        renderAgendamientos([]);
      }

    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo completar la búsqueda.",
        customClass: swalDark
      });
    }
  });
});

/* ==========================================================
   BUSCAR AGENDAMIENTOS POR FECHA DEL CALENDARIO
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
  const loggedInUser = localStorage.getItem("sistemaPeritosUser");

  const calendario = document.getElementById("agendamiento-calendario-input");

  if (!calendario) return;

  calendario.addEventListener("change", async () => {
    const fecha = calendario.value;
    
    if (!fecha) return;

    Swal.fire({
      icon: "info",
      title: "Cargando agendamientos...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: swalDark
    });

    try {
      const resp = await API.getAgendamientosPorFecha(loggedInUser, fecha);

      if (resp.status === "success" && resp.results && resp.results.length > 0) {
        Swal.close();
        renderAgendamientos(resp.results);
      } else {
        Swal.fire({
          icon: "warning",
          title: "Sin resultados",
          text: "No hay agendamientos en esa fecha.",
          customClass: swalDark
        });
        renderAgendamientos([]);
      }

    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar la información.",
        customClass: swalDark
      });
    }
  });
});

/* ==========================================================
   RENDER DE LOS AGENDAMIENTOS EN EL PANEL LATERAL
========================================================== */

// Esta función debe ser global o accesible por los listeners anteriores
function renderAgendamientos(lista) {
  const cont = document.getElementById("agendamiento-realtime-box");
  if (!cont) return;

  cont.innerHTML = "";

  if(!lista || lista.length === 0) {
      cont.innerHTML = '<p class="text-white-50 text-center mt-3">No hay datos para mostrar.</p>';
      return;
  }

  // Ordenar por hora
  lista.sort((a, b) => (a.hora_audiencia > b.hora_audiencia ? 1 : -1));

  lista.forEach((item) => {
    const div = document.createElement("div");
    div.classList.add("agendamiento-card-item"); // Usar la clase CSS que definimos en style.css

    // Formatear fecha para visualización
    let fechaStr = item.fecha_audiencia;
    if (fechaStr && !fechaStr.includes('/')) {
        const dateObj = new Date(fechaStr);
        if (!isNaN(dateObj)) {
             fechaStr = dateObj.toLocaleDateString('es-EC', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
        }
    }

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="mb-0 text-info">${item.hora_audiencia}</h5>
          <button class="btn btn-outline-warning btn-sm btn-reagendar" 
                  data-id="${item.agendamiento_id}"
                  data-if="${item.if_nro}"
                  data-fecha="${item.fecha_audiencia.split('T')[0]}"
                  data-hora="${item.hora_audiencia}">
            <i class="fa-solid fa-calendar-check"></i>
          </button>
      </div>
      <p><strong>IF:</strong> ${item.if_nro}</p>
      <p><strong>Delito:</strong> ${item.delito}</p>
      <p><strong>Detenido:</strong> ${item.detenido}</p>
      <p><strong>Fiscal:</strong> ${item.fiscal}</p>
      <small>${fechaStr}</small>
    `;

    cont.appendChild(div);
  });

  // Asignar eventos a botones de reagendar dinámicamente
  document.querySelectorAll(".btn-reagendar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const ifNro = btn.dataset.if;
      const fecha = btn.dataset.fecha;
      const hora = btn.dataset.hora;
      
      abrirReagendar(id, ifNro, fecha, hora);
    });
  });
}

/* ==========================================================
   FUNCION PARA ABRIR MODAL DE REAGENDAR
========================================================== */

function abrirReagendar(id, ifNro, fecha, hora) {
    const modalEl = document.getElementById("modal-reagendar");
    if(!modalEl) return;

    document.getElementById("reagendar-id").value = id;
    const displayIf = document.getElementById("reagendar-if-display");
    if(displayIf) displayIf.textContent = ifNro;
    
    document.getElementById("reagendar-fecha").value = fecha;
    document.getElementById("reagendar-hora").value = hora;

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

// Exponer window.cargarAgendamientosDeHoy si quieres que sea accesible globalmente
window.cargarAgendamientosDeHoy = function() {
    const btnHoy = document.getElementById("btn-mostrar-hoy");
    if(btnHoy) btnHoy.click();

};




