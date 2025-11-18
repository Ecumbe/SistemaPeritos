// Se ejecuta cuando todo el HTML de app.html está cargado
document.addEventListener("DOMContentLoaded", () => {

    // =================================================================
    // 0. CONFIGURACIÓN INICIAL
    // =================================================================
    
    // ⚠️ PEGA AQUÍ TU URL DEL SCRIPT
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwfKYrojdS7bbGy0ioSHASxgfacOjSsWOzucfAOUyZHjVb9v00_nT-f0IJDdMHlTo6ThA/exec"; 

    // Guardamos la URL para otros scripts
    localStorage.setItem("GAS_API_URL", GAS_API_URL);

    // Constantes de estilo
    const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };
    
    // Configuración de notificaciones (Toast)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#1f2937',
        color: '#fff',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    // =================================================================
    // 1. SEGURIDAD Y SESIÓN
    // =================================================================
    const loggedInUser = localStorage.getItem("sistemaPeritosUser"); 
    const loggedInFullName = localStorage.getItem("sistemaPeritosFullName"); 

    if (!loggedInUser || !loggedInFullName) {
        window.location.href = "index.html";
        return;
    }

    // Mostrar nombre de usuario
    const userGreeting = document.getElementById("user-greeting");
    if (userGreeting) {
        userGreeting.innerHTML = `<i class="fa-solid fa-user-check"></i> Bienvenido, <strong>${loggedInFullName}</strong>`;
    }
    const reportCountSpan = document.getElementById("report-count");

    // Botón Cerrar Sesión
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            Swal.fire({
                title: '¿Estás seguro?',
                text: "¿Deseas cerrar la sesión?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, cerrar sesión',
                cancelButtonText: 'Cancelar',
                customClass: swalDark
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem("sistemaPeritosUser");
                    localStorage.removeItem("sistemaPeritosFullName");
                    localStorage.removeItem("GAS_API_URL"); 
                    window.location.href = "index.html";
                }
            });
        });
    }

    // =================================================================
    // 2. INICIALIZACIÓN DEL SISTEMA
    // =================================================================
    (async function initSystem() {
        try {
            // 1. Cargar Estadísticas Generales
            const payload = { action: "getUserStats", user: loggedInUser };
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                if(reportCountSpan) reportCountSpan.textContent = String(data.reportCount).padStart(2, '0');
                
                // 2. Cargar Dashboard Personal (KPIs)
                loadDashboardStats(); 
                
                // 3. Cargar Últimos 5 Informes (Pestaña Buscar)
                loadRecentReports();

                // 4. Cargar Últimos Oficios Utilizados (Nuevo Widget)
                loadLastOficios();

                // 5. Chequear si hay borrador pendiente (Auto-Recuperación)
                checkForCloudDraft(); 
            }
        } catch (error) {
            console.error("Error inicio:", error);
            if(reportCountSpan) reportCountSpan.textContent = "--";
        }
    })();

    async function loadDashboardStats() {
        try {
            const payloadStats = { action: "getUserDashboardStats", user: loggedInUser };
            const respStats = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payloadStats),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const statsData = await respStats.json();
            if (statsData.status === 'success') {
                const elSi = document.getElementById("user-si");
                const elNo = document.getElementById("user-no");
                const elTotal = document.getElementById("user-total");
                const elRange = document.getElementById("user-range");
                
                if(elSi) elSi.textContent = statsData.kpis.totalSI;
                if(elNo) elNo.textContent = statsData.kpis.totalNO;
                if(elTotal) elTotal.textContent = statsData.kpis.totalGeneral;
                if(elRange) elRange.textContent = statsData.dateRange;
            }
        } catch (err) { console.log("Stats error", err); }
    }

    // --- [NUEVO] FUNCIÓN PARA CARGAR LOS ÚLTIMOS 10 OFICIOS ---
    async function loadLastOficios() {
        const container = document.getElementById('container-ultimos-oficios');
        if (!container) return; 

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: "getLastOficios" }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();

            if (data.status === 'success') {
                container.innerHTML = ''; 
                if (data.data.length === 0) {
                    container.innerHTML = '<small class="text-white-50">No hay oficios registrados aún.</small>';
                } else {
                    data.data.forEach(oficio => {
                        const badge = document.createElement('span');
                        badge.className = 'badge bg-dark border border-secondary text-warning me-2 mb-2 p-2';
                        badge.style.fontSize = '0.9rem';
                        badge.innerHTML = `<i class="fa-solid fa-hashtag text-white-50 me-1"></i> ${oficio}`;
                        container.appendChild(badge);
                    });
                }
            }
        } catch (error) {
            console.error("Error fetch oficios:", error);
            if(container) container.innerHTML = '<small class="text-danger">Error al cargar datos.</small>';
        }
    }

    // =================================================================
    // 3. SISTEMA DE AUTO-GUARDADO (CLOUD DRAFTS)
    // =================================================================
    
    async function autoSaveDraft() {
        if (maxStepAchieved < 2) return; 
        const currentData = gatherAllTextData();
        currentData.savedStep = maxStepAchieved; 

        const payload = {
            action: "guardarBorrador",
            user: loggedInUser,
            draft: currentData
        };

        fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow'
        }).then(res => res.json()).then(data => {
            if(data.status === 'success') {
                Toast.fire({ icon: 'success', title: 'Borrador auto-guardado' });
            }
        }).catch(err => console.error("Error auto-save", err));
    }

    async function checkForCloudDraft() {
        const payload = { action: "cargarBorrador", user: loggedInUser };
        try {
            const res = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const data = await res.json();
            
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
                });
            }
        } catch (e) { console.error("Error checking draft", e); }
    }

    function restoreDraft(draft) {
        localStorage.setItem('datosFlagrancia', JSON.stringify(draft.datosFlagrancia));
        
        const triggerEl = document.querySelector('#nuevo-tab-original'); 
        if(triggerEl) {
             const tabInstance = bootstrap.Tab.getOrCreateInstance(triggerEl);
             tabInstance.show();
        }

        if (draft.datosOficio) {
            if(document.getElementById('oficio-anio')) document.getElementById('oficio-anio').value = draft.datosOficio.oficioAnio || '';
            if(document.getElementById('oficio-numero')) document.getElementById('oficio-numero').value = draft.datosOficio.oficioNumero || '';
            if(document.getElementById('oficio-fecha')) document.getElementById('oficio-fecha').value = draft.datosOficio.oficioFecha || '';
            if(document.getElementById('oficio-asunto-numero')) document.getElementById('oficio-asunto-numero').value = draft.datosOficio.oficioAsunto || '';
            if(document.getElementById('oficio-tratamiento')) document.getElementById('oficio-tratamiento').value = draft.datosOficio.oficioTratamiento || '';
            if(document.getElementById('oficio-fiscal-nombre')) document.getElementById('oficio-fiscal-nombre').value = draft.datosOficio.oficioFiscalNombre || '';
            if(document.getElementById('oficio-fiscal-unidad')) document.getElementById('oficio-fiscal-unidad').value = draft.datosOficio.oficioFiscalUnidad || '';
            if(document.getElementById('oficio-agente-nombre')) document.getElementById('oficio-agente-nombre').value = draft.datosOficio.oficioAgenteNombre || '';
            if(document.getElementById('oficio-agente-grado')) document.getElementById('oficio-agente-grado').value = draft.datosOficio.oficioAgenteGrado || '';
        }

        if (draft.datosCuerpo) {
            if(document.getElementById('informe-referencia')) document.getElementById('informe-referencia').value = draft.datosCuerpo.referencia || '';
            if(document.getElementById('informe-fecha-referencia')) document.getElementById('informe-fecha-referencia').value = draft.datosCuerpo.fechaReferencia || '';
            if(document.getElementById('informe-objeto')) document.getElementById('informe-objeto').value = draft.datosCuerpo.objeto || '';
            if(document.getElementById('informe-fundamentos-tecnicos')) document.getElementById('informe-fundamentos-tecnicos').value = draft.datosCuerpo.fundamentosTecnicos || '';
            if(document.getElementById('informe-fundamentos-legales')) document.getElementById('informe-fundamentos-legales').value = draft.datosCuerpo.fundamentosLegales || '';
            if(document.getElementById('informe-reconocimiento')) document.getElementById('informe-reconocimiento').value = draft.datosCuerpo.reconocimiento || '';
            if(document.getElementById('informe-conclusiones')) document.getElementById('informe-conclusiones').value = draft.datosCuerpo.conclusiones || '';
            popularFormularioPaso3(); 
        }

        maxStepAchieved = draft.savedStep || 2;
        navigateToStep(maxStepAchieved);
    }

    /* ==========================================================
       4. PESTAÑA BUSCAR
       ========================================================== */
    const searchForm = document.getElementById("search-form");
    const searchTermInput = document.getElementById("search-term");
    const searchLoader = document.getElementById("search-loader");
    const searchResultsContainer = document.getElementById("search-results-container");
    const searchResultsTbody = document.getElementById("search-results-tbody");
    
    async function loadRecentReports() {
        if (!searchLoader) return;
        
        searchLoader.classList.remove('d-none');
        if (searchResultsContainer) searchResultsContainer.style.display = "none";
        if (searchResultsTbody) searchResultsTbody.innerHTML = "";

        const payload = { action: "getRecentReports", user: loggedInUser };

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();
            
            searchLoader.classList.add('d-none');
            
            if (data.status === 'success') {
                renderSearchResults(data.results);
            }
        } catch (error) {
            console.error('Error cargando recientes:', error);
            searchLoader.classList.add('d-none');
        }
    }

    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const searchTerm = searchTermInput.value.trim();
            if (!searchTerm) return;

            searchLoader.classList.remove('d-none');
            searchResultsContainer.style.display = "none";
            searchResultsTbody.innerHTML = ""; 

            const payload = {
                action: "buscarInformes",
                searchTerm: searchTerm,
                user: loggedInUser 
            };

            try {
                const response = await fetch(GAS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    redirect: 'follow'
                });
                const data = await response.json();
                searchLoader.classList.add('d-none');
                if (data.status === 'success') renderSearchResults(data.results);
                else throw new Error(data.message || "Error desconocido.");
            } catch (error) {
                searchLoader.classList.add('d-none');
                Swal.fire({ icon: 'error', title: 'Error', text: error.message, customClass: swalDark });
            }
        });
    }

    function renderSearchResults(results) {
        if (!searchResultsTbody) return;
        searchResultsTbody.innerHTML = ""; 
        
        if (results.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" class="text-center text-white-50">No se encontraron informes recientes.</td>`;
            searchResultsTbody.appendChild(tr);
        } else {
            results.forEach(report => {
                const tr = document.createElement('tr');
                const escape = (str) => String(str).replace(/[&<>"']/g, m => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;'})[m]);

                tr.innerHTML = `
                    <td>${escape(report.tabla_if_nro)}</td>
                    <td>${escape(report.reporte_id)}</td>
                    <td>${escape(report.detenido)}</td>
                    <td>${escape(report.fecha_creacion)}</td>
                    <td>${escape(report.creado_por)}</td>
                    <td>
                        <button class="btn btn-info btn-sm me-1 btn-edit-report" data-report-id="${escape(report.reporte_id)}" title="Editar">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-light btn-sm btn-print-menu" data-report-id="${escape(report.reporte_id)}" title="Opciones">
                            <i class="fa-solid fa-print"></i>
                        </button>
                    </td>
                `;
                searchResultsTbody.appendChild(tr);
            });
        }
        if (searchResultsContainer) searchResultsContainer.style.display = "block"; 
    }

    if (searchResultsTbody) {
        searchResultsTbody.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const reportId = button.dataset.reportId;
            if (!reportId) return;

            if (button.classList.contains('btn-print-menu')) {
                handlePrintMenu(reportId);
            } else if (button.classList.contains('btn-edit-report')) {
                window.open(`editar-informe.html?id=${reportId}`, '_blank');
            }
        });
    }


    /* ==========================================================
       6. LÓGICA DEL WIZARD (Stepper)
       ========================================================== */
    const wizardStepper = document.getElementById('main-wizard-stepper');
    const step1Div = document.getElementById('wizard-step-1');
    const step2Div = document.getElementById('wizard-step-2');
    const step3Div = document.getElementById('wizard-step-3');
    const step4Div = document.getElementById('wizard-step-4');
    let maxStepAchieved = 1;
    
    function updateWizardStepper(stepNumber) {
        if (!wizardStepper) return;
        const stepList = wizardStepper.querySelector('.step-wizard-list');
        const stepItems = wizardStepper.querySelectorAll('.step-wizard-item');
        if (!stepList || !stepItems.length) return; 
        
        let progressPercent = "0%";
        if (stepNumber === 2) progressPercent = "26.6%"; 
        if (stepNumber === 3) progressPercent = "53.3%"; 
        if (stepNumber === 4) progressPercent = "80%";   

        if(stepList) stepList.style.setProperty('--wizard-progress', progressPercent);

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
            if(el) el.classList.add('d-none');
        });

        const targetDiv = document.getElementById(`wizard-step-${stepNumber}`);
        if(targetDiv) targetDiv.classList.remove('d-none');

        if (stepNumber === 2) popularFormularioPaso2();
        // Al entrar al paso 3, forzamos el rellenado de campos
        if (stepNumber === 3) popularFormularioPaso3(); 
        
        updateWizardStepper(stepNumber);

        if (stepNumber > 1) {
            autoSaveDraft();
        }
    }

    if(wizardStepper) {
        wizardStepper.addEventListener('click', (e) => {
            const stepItem = e.target.closest('.step-wizard-item');
            if (stepItem && !stepItem.classList.contains('disabled')) {
                const stepNumber = parseInt(stepItem.id.split('-').pop());
                navigateToStep(stepNumber);
            }
        });
    }

    // --- Lógica del PASO 1 ---
    const searchBtn = document.getElementById("if-search-btn");
    const searchInput = document.getElementById("if-search-input");
    const loader = document.getElementById("if-search-loader");
    const resultsCard = document.getElementById("if-search-results-card");
    const resultsContent = document.getElementById("if-search-results-content");
    const btnContinuarPaso1 = document.getElementById("if-search-continuar");

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const ifNumber = searchInput.value.trim();
            if (!ifNumber) {
                Swal.fire({ icon: 'error', title: 'Campo Vacío', text: 'Por favor, ingrese un N° de Instrucción Fiscal.', customClass: swalDark });
                return;
            }
            loader.classList.remove('d-none');
            resultsCard.classList.add('d-none');
            btnContinuarPaso1.classList.add('d-none');
            searchBtn.disabled = true;
            
            const payload = { action: "buscarFlagrancia", ifNumber: ifNumber };
            fetch(GAS_API_URL, {
                method: 'POST', body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow'
            })
                .then(response => response.json())
                .then(data => {
                    loader.classList.add('d-none');
                    searchBtn.disabled = false;
                    if (data.status === 'success') {
                        const d = data.data;
                        resultsContent.innerHTML = `
                            <p class="result-item"><strong>IF N°:</strong> ${d.if_number}</p>
                            <p class="result-item"><strong>Delito:</strong> ${d.delito}</p>
                            <p class="result-item"><strong>Detenido/Sosp.:</strong> ${d.detenido}</p>
                            <p class="result-item"><strong>Fiscal:</strong> ${d.fiscal}</p>
                            <p class="result-item"><strong>Unidad Fiscalía:</strong> ${d.unidad_fiscalia}</p>
                        `;
                        resultsCard.classList.remove('d-none');
                        btnContinuarPaso1.classList.remove('d-none');
                        localStorage.setItem('datosFlagrancia', JSON.stringify(d));
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: data.message, customClass: swalDark });
                    }
                })
                .catch(error => {
                    loader.classList.add('d-none');
                    searchBtn.disabled = false;
                    Swal.fire({ icon: 'error', title: 'Error de Conexión', text: 'No se pudo conectar.', customClass: swalDark });
                });
        });
    }

    if (btnContinuarPaso1) {
        btnContinuarPaso1.addEventListener('click', () => {
            maxStepAchieved = Math.max(maxStepAchieved, 2); 
            navigateToStep(2);
        });
    }

    const btnReg1 = document.getElementById('btn-regresar-paso1');
    if(btnReg1) btnReg1.addEventListener('click', () => navigateToStep(1));
    
    const btnCont3 = document.getElementById('btn-continuar-paso3');
    if(btnCont3) btnCont3.addEventListener('click', () => {
        maxStepAchieved = Math.max(maxStepAchieved, 3); 
        navigateToStep(3);
    });
    
    const btnReg2 = document.getElementById('btn-regresar-paso2');
    if(btnReg2) btnReg2.addEventListener('click', () => navigateToStep(2));
    
    const btnCont4 = document.getElementById('btn-continuar-paso4');
    if(btnCont4) btnCont4.addEventListener('click', () => {
        const reco = document.getElementById('informe-reconocimiento');
        if (reco && !reco.value.trim()) {
            Swal.fire({
                icon: 'warning', title: 'Campo Vacío',
                text: 'El reconocimiento está vacío. ¿Continuar?',
                showCancelButton: true, confirmButtonText: 'Sí', customClass: swalDark
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

    const btnReg3 = document.getElementById('btn-regresar-paso3');
    if(btnReg3) btnReg3.addEventListener('click', () => {
        showNavButtons(); 
        navigateToStep(3);
    });

    // --- 7. BOTONES GENERADORES (PASO 3) ---
    const generators = [
        { btn: 'btn-generar-referencia', target: 'informe-referencia', tmpl: (d) => `Mediante Oficio Nro.- ${d.ref}, de fecha ${d.fecha}, suscrito por la ${d.fiscal}, FISCAL DE LO PENAL DEL GUAYAS ${d.unidad}, dirigido al señor JEFE DEL SISTEMA ESPECIALIZADO INTEGRAL DE INVESTIGACIÓN, MEDICINA LEGAL Y CIENCIAS FORENSES DEL GUAYAS.` },
        { btn: 'btn-generar-objeto', target: 'informe-objeto', tmpl: (d) => `Pedido textual: “EL RECONOCIMIENTO DEL LUGAR DE LOS HECHOS”, que se hacen constar en el Parte Policial, de fecha ${d.fechaAp}, en contra de los procesados (a) ${d.proc}.` },
        { btn: 'btn-generar-conclusion', target: 'informe-conclusiones', tmpl: (d) => `se determina que el lugar de los hechos, suscrito en el parte de aprehensión, de fecha ${d.fechaAp}, en contra de la ciudadana hoy procesada ${d.proc}, (SI EXISTE) y se encuentra ubicado en el ${d.lugar}, misma que fue fijada y fotografiada y descriptivamente se encuentra detallada.` }
    ];

    generators.forEach(gen => {
        const btn = document.getElementById(gen.btn);
        if (btn) {
            btn.addEventListener('click', () => {
                const data = {
                    ref: document.getElementById('tabla-ref-oficio')?.value,
                    fecha: document.getElementById('informe-fecha-referencia')?.value,
                    fiscal: document.getElementById('oficio-fiscal-nombre')?.value,
                    unidad: `FISCALÍA ESPECIALIZADA EN INVESTIGACIÓN DE ${document.getElementById('oficio-fiscal-unidad')?.value}`,
                    fechaAp: document.getElementById('tabla-fecha-aprehension')?.value,
                    proc: document.getElementById('tabla-procesado')?.value,
                    lugar: document.getElementById('tabla-lugar-hechos')?.value
                };
                document.getElementById(gen.target).value = gen.tmpl(data);
            });
        }
    });

    // --- 8. RELLENADO DE FORMULARIOS ---
    function popularFormularioPaso2(isReset = false) {
        const datos = JSON.parse(localStorage.getItem('datosFlagrancia'));
        if (!isReset && datos) {
            if(document.getElementById('oficio-fiscal-nombre')) document.getElementById('oficio-fiscal-nombre').value = datos.fiscal || '';
            if(document.getElementById('oficio-fiscal-unidad')) document.getElementById('oficio-fiscal-unidad').value = datos.unidad_fiscalia || '';
            if(document.getElementById('oficio-agente-nombre')) document.getElementById('oficio-agente-nombre').value = datos.agente ? datos.agente.trim() : '';
            
            const gradoSelect = document.getElementById('oficio-agente-grado');
            if(gradoSelect) {
                const gradoAgente = datos.grado ? datos.grado.trim().toUpperCase() : '';
                for (let i = 0; i < gradoSelect.options.length; i++) {
                    if (gradoSelect.options[i].value === gradoAgente) {
                        gradoSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        } else if (isReset) {
            if(document.getElementById('oficio-fiscal-nombre')) document.getElementById('oficio-fiscal-nombre').value = '';
            if(document.getElementById('oficio-fiscal-unidad')) document.getElementById('oficio-fiscal-unidad').value = '';
            if(document.getElementById('oficio-agente-nombre')) document.getElementById('oficio-agente-nombre').value = '';
            if(document.getElementById('oficio-agente-grado')) document.getElementById('oficio-agente-grado').selectedIndex = 0;
        }

        if(document.getElementById('oficio-anio')) document.getElementById('oficio-anio').value = new Date().getFullYear();
        if(document.getElementById('oficio-fecha')) document.getElementById('oficio-fecha').value = formatearFecha(new Date());
        
        const ids = ['oficio-anio', 'oficio-numero', 'oficio-fecha', 'oficio-asunto-numero'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.removeEventListener('input', actualizarCuerpoOficio);
                el.addEventListener('input', actualizarCuerpoOficio);
            }
        });
        actualizarCuerpoOficio(); 
    }

    // --- FUNCIÓN CORREGIDA PARA RELLENAR LOS CAMPOS FALTANTES ---
    function popularFormularioPaso3() {
        const datosFlag = JSON.parse(localStorage.getItem('datosFlagrancia'));
        
        // Recoger valores actuales de los inputs del Paso 2
        const oficioAnio = document.getElementById('oficio-anio')?.value || new Date().getFullYear();
        const oficioNumero = document.getElementById('oficio-numero')?.value || '';
        const oficioFecha = document.getElementById('oficio-fecha')?.value || formatearFecha(new Date());
        const oficioAsunto = document.getElementById('oficio-asunto-numero')?.value || '';
        
        const agenteNombre = document.getElementById('oficio-agente-nombre')?.value || '';
        const agenteGrado = document.getElementById('oficio-agente-grado')?.value || '';
        const peritoCompleto = `${agenteGrado} DE POLICIA ${agenteNombre}`;

        // Rellenar campos visibles del Paso 3
        if(document.getElementById('tabla-if-nro')) document.getElementById('tabla-if-nro').value = datosFlag ? datosFlag.if_number : '';
        
        // [FIX] Llenar Fecha del Informe
        if(document.getElementById('tabla-fecha-informe')) document.getElementById('tabla-fecha-informe').value = oficioFecha;
        
        // [FIX] Llenar Perito
        if(document.getElementById('tabla-perito')) document.getElementById('tabla-perito').value = peritoCompleto;

        if(document.getElementById('tabla-informe-nro')) document.getElementById('tabla-informe-nro').value = `PN-ZONA8-JINVPJ-UDF-${oficioAnio}-${oficioNumero}`;
        if(document.getElementById('tabla-delito')) document.getElementById('tabla-delito').value = datosFlag ? datosFlag.delito : '';
        if(document.getElementById('tabla-agente-fiscal')) document.getElementById('tabla-agente-fiscal').value = datosFlag ? datosFlag.fiscal : '';
        if(document.getElementById('tabla-procesado')) document.getElementById('tabla-procesado').value = datosFlag ? datosFlag.detenido : '';
        if(document.getElementById('tabla-ref-oficio')) document.getElementById('tabla-ref-oficio').value = `FPG-FEIFO${oficioAsunto}`;

        if(document.getElementById('tabla-fecha-aprehension')) document.getElementById('tabla-fecha-aprehension').value = (datosFlag && datosFlag.fecha_infraccion) ? datosFlag.fecha_infraccion : formatearFecha(new Date());
        if(document.getElementById('informe-fecha-referencia')) document.getElementById('informe-fecha-referencia').value = (datosFlag && datosFlag.fecha_delegacion) ? datosFlag.fecha_delegacion : formatearFecha(new Date());

        actualizarCuerpoOficio();
        
        // Textos por defecto
        const ft = "El reconocimiento del lugar  es un  acto procesal que se cumplen por orden de autoridad competente y previa posesión ante la misma, tiene como fin la percepción y comprobación de los efectos materiales que el hecho investigado hubierejado, mediante la fijación de la actividad, motivo de la diligencia, así como también la búsqueda minuciosa de indicios, huellas, rastros o vestigios que indicaran directamente la existencia de un delito, al tratarse de un hecho que no produjo efectos materiales, o hubiere sido alterado o el tiempo hubiese cambiado, se describirá el estado existente, para tal efecto se utilizara las técnicas de observación y fijación adecuadas a lo solicitado por la autoridad competente.";
        const fl = "El COIP en su Art. 460 sobre el Reconocimiento del Lugar de los hechos manifiesta: La o el fiscal con el apoyo del personal del Sistema especializado integral de investigación, de medicina legal y ciencias forenses, o el personal competente en materia de tránsito, cuando sea relevante para la investigación, reconocerá el lugar de los hechos.";
        const elFT = document.getElementById('informe-fundamentos-tecnicos');
        if(elFT && !elFT.value) elFT.value = ft;
        const elFL = document.getElementById('informe-fundamentos-legales');
        if(elFL && !elFL.value) elFL.value = fl;
    }

    function actualizarCuerpoOficio() {
        const anio = document.getElementById('oficio-anio')?.value || '';
        const numero = document.getElementById('oficio-numero')?.value || '';
        const fecha = document.getElementById('oficio-fecha')?.value || '';
        const asunto = document.getElementById('oficio-asunto-numero')?.value || '';
        const d = JSON.parse(localStorage.getItem('datosFlagrancia'));
        
        if(document.getElementById('tabla-informe-nro')) document.getElementById('tabla-informe-nro').value = `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`;
        if(document.getElementById('tabla-ref-oficio')) document.getElementById('tabla-ref-oficio').value = `FPG-FEIFO${asunto}`;
        
        const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        setTxt('cuerpo-oficio-nro', `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`);
        setTxt('cuerpo-oficio-fecha', fecha);
        setTxt('cuerpo-oficio-asunto', `FPG-FEIFO${asunto}`);
        if(d) {
            setTxt('cuerpo-if-nro', d.if_number);
            setTxt('cuerpo-detenido-nombre', d.detenido);
            setTxt('cuerpo-delito-nombre', d.delito);
        }
    }

    function formatearFecha(date) {
        if (!date || isNaN(date.getTime())) return "";
        const options = { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }; 
        return `Guayaquil, ${date.toLocaleDateString('es-EC', options)}`;
    }

    // --- 9. PESTAÑAS (TABS) ---
    const tabs = document.querySelectorAll('.app-tabs .nav-link');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.id;
            localStorage.setItem('lastActiveTab', targetId);
            
            const wizard = document.getElementById('main-wizard-stepper');
            if(wizard) {
                if (targetId === 'nuevo-tab-original') wizard.style.display = 'block';
                else wizard.style.display = 'none';
            }
            
            if (targetId === 'buscar-tab-original') {
                loadRecentReports();
            }
        });
    });

    const lastTabId = localStorage.getItem('lastActiveTab');
    if (lastTabId) {
        const lastTab = document.getElementById(lastTabId);
        if (lastTab) {
            const inst = bootstrap.Tab.getOrCreateInstance(lastTab);
            inst.show();
            if (lastTabId === 'buscar-tab-original') loadRecentReports(); // También al recargar
        }
    }

    /* ==========================================================
       10. GESTIÓN DE FOTOS (Paso 4)
       ========================================================== */
    const laminasContainer = document.getElementById('laminas-container');
    const templateLamina = document.getElementById('template-lamina');
    const templateFoto = document.getElementById('template-foto');

    if (document.getElementById('btn-agregar-lugar')) {
        document.getElementById('btn-agregar-lugar').addEventListener('click', () => {
            const clone = templateLamina.content.cloneNode(true);
            laminasContainer.appendChild(clone);
            updateLaminaNumbers();
            showNavButtons();
        });
    }

    if (laminasContainer) {
        laminasContainer.addEventListener('click', (e) => {
            // Eliminar Lámina
            if (e.target.closest('.btn-eliminar-lamina')) {
                e.target.closest('.lamina-card').remove();
                updateLaminaNumbers();
                showNavButtons();
            }
            // Eliminar Foto
            if (e.target.closest('.btn-eliminar-foto')) {
                e.target.closest('.foto-card').remove();
                showNavButtons();
            }
            // Editar Foto
            if (e.target.closest('.btn-editar-foto')) {
                const card = e.target.closest('.foto-card');
                const img = card.querySelector('.foto-preview');
                const desc = card.querySelector('.foto-descripcion');
                
                PhotoEditor.open({
                    imgEl: img,
                    onSave: ({description}) => {
                        desc.value = description;
                        const btn = card.querySelector('.btn-agregar-descripcion');
                        btn.textContent = description ? description.substring(0, 20) + "..." : "+ Agregar Descripción";
                        showNavButtons();
                    }
                });
            }
            // Toggle Descripción
            if (e.target.closest('.btn-agregar-descripcion')) {
                const card = e.target.closest('.foto-card');
                card.querySelector('.foto-descripcion').classList.toggle('d-none');
            }
        });

        laminasContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('lamina-file-input')) {
                const files = e.target.files;
                const container = e.target.closest('.card-body').querySelector('.lamina-fotos-container');
                const num = e.target.closest('.lamina-card').querySelector('.lamina-numero').textContent;
                Array.from(files).forEach(f => processAndDisplayImage(f, container, num));
                showNavButtons();
            }
        });
    }

    async function processAndDisplayImage(file, container, laminaNum) {
        const clone = templateFoto.content.cloneNode(true);
        const card = clone.querySelector('.foto-card');
        const img = clone.querySelector('.foto-preview');
        const spinner = clone.querySelector('.foto-spinner');
        const title = clone.querySelector('.foto-title-input');

        title.value = `Fotografía N° ${container.children.length + 1}`;
        card.dataset.laminaNum = laminaNum;
        container.appendChild(clone);
        
        try {
            const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
            const url = await imageCompression.getDataUrlFromFile(compressed);
            img.src = url;
            img.dataset.base64 = url;
            spinner.classList.add('d-none');
        } catch (e) { console.error(e); }
    }

    function updateLaminaNumbers() {
        laminasContainer.querySelectorAll('.lamina-card').forEach((el, i) => {
            el.querySelector('.lamina-numero').textContent = i + 1;
        });
    }
    
    function updatePhotoNumbers(laminaCard) {
        if (!laminaCard) return;
        const allPhotoTitles = laminaCard.querySelectorAll('.foto-title-input');
        allPhotoTitles.forEach((input, index) => input.value = `Fotografía N° ${index + 1}`);
    }

    /* ==========================================================
       11. GUARDAR Y SUBIR
       ========================================================== */
    const btnGuardar = document.getElementById('btn-guardar-y-subir-fotos');
    let currentReportId = null;

    if (btnGuardar) {
        btnGuardar.addEventListener('click', async () => {
            Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, customClass: swalDark });

            const textData = gatherAllTextData();
            const photos = gatherAllPhotoData();

            try {
                // 1. Guardar Texto
                const res = await fetch(GAS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: "guardarInformeCompleto", datos: textData })
                });
                const data = await res.json();
                if (data.status !== 'success') throw new Error(data.message);

                currentReportId = data.reportId;

                // 2. Subir Fotos
                for (let i = 0; i < photos.length; i++) {
                    const p = photos[i];
                    if (!p.base64.startsWith('data:image')) continue;
                    
                    Swal.update({ text: `Subiendo foto ${i + 1}/${photos.length}` });
                    
                    await fetch(GAS_API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: "subirFoto",
                            reportId: currentReportId,
                            laminaNum: p.laminaNum,
                            titulo: p.titulo,
                            descripcion: p.descripcion,
                            base64Data: p.base64.split(',')[1]
                        })
                    });
                }

                Swal.fire({ icon: 'success', title: 'Guardado Correctamente', text: `ID: ${currentReportId}`, customClass: swalDark });
                showPostSaveButtons(currentReportId);
                
                // Actualizar lista de oficios usados
                loadLastOficios();

            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Error', text: e.message, customClass: swalDark });
            }
        });
    }

    function gatherAllTextData() {
        return {
            datosFlagrancia: JSON.parse(localStorage.getItem('datosFlagrancia')),
            datosOficio: {
                oficioAnio: document.getElementById('oficio-anio').value,
                oficioNumero: document.getElementById('oficio-numero').value,
                oficioFecha: document.getElementById('oficio-fecha').value,
                oficioAsunto: document.getElementById('oficio-asunto-numero').value,
                oficioTratamiento: document.getElementById('oficio-tratamiento').value,
                oficioFiscalNombre: document.getElementById('oficio-fiscal-nombre').value,
                oficioFiscalUnidad: document.getElementById('oficio-fiscal-unidad').value,
                oficioAgenteNombre: document.getElementById('oficio-agente-nombre').value,
                oficioAgenteGrado: document.getElementById('oficio-agente-grado').value,
                creadoPor: loggedInUser
            },
            datosCuerpo: {
                tabla_if_nro: document.getElementById('tabla-if-nro').value,
                tabla_fecha_informe: document.getElementById('tabla-fecha-informe').value,
                tabla_informe_nro: document.getElementById('tabla-informe-nro').value,
                tabla_delito: document.getElementById('tabla-delito').value,
                tabla_lugar_hechos: document.getElementById('tabla-lugar-hechos').value,
                tabla_fecha_aprehension: document.getElementById('tabla-fecha-aprehension').value,
                tabla_agente_fiscal: document.getElementById('tabla-agente-fiscal').value,
                tabla_procesado: document.getElementById('tabla-procesado').value,
                tabla_ref_oficio: document.getElementById('tabla-ref-oficio').value,
                tabla_perito: document.getElementById('tabla-perito').value,
                tabla_cod_reg: document.getElementById('tabla-cod-reg').value,
                referencia: document.getElementById('informe-referencia').value,
                fechaReferencia: document.getElementById('informe-fecha-referencia').value,
                objeto: document.getElementById('informe-objeto').value,
                fundamentosTecnicos: document.getElementById('informe-fundamentos-tecnicos').value,
                fundamentosLegales: document.getElementById('informe-fundamentos-legales').value,
                reconocimiento: document.getElementById('informe-reconocimiento').value,
                conclusiones: document.getElementById('informe-conclusiones').value
            }
        };
    }

    function gatherAllPhotoData() {
        const photos = [];
        laminasContainer.querySelectorAll('.foto-card').forEach(card => {
            photos.push({
                laminaNum: card.dataset.laminaNum,
                base64: card.querySelector('.foto-preview').dataset.base64,
                titulo: card.querySelector('.foto-title-input').value,
                descripcion: card.querySelector('.foto-descripcion').value
            });
        });
        return photos;
    }

    function showNavButtons() {
        const btnPrint = document.getElementById('btn-imprimir-documento');
        if(btnPrint) btnPrint.classList.add('d-none');
        
        const btnNew = document.getElementById('btn-nuevo-informe');
        if(btnNew) btnNew.classList.add('d-none');
        
        if(btnGuardar) btnGuardar.classList.remove('d-none');
    }
    
    function showPostSaveButtons(id) {
        const btnPrint = document.getElementById('btn-imprimir-documento');
        if(btnPrint) btnPrint.classList.remove('d-none');
        
        const btnNew = document.getElementById('btn-nuevo-informe');
        if(btnNew) btnNew.classList.remove('d-none');
        
        currentReportId = id;
    }
    
    // --- IMPRESIÓN / DESCARGA ---
    const btnPrint = document.getElementById('btn-imprimir-documento');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            if (!currentReportId) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No hay informe guardado.', customClass: swalDark });
                return;
            }
            handlePrintMenu(currentReportId);
        });
    }

    // Función para manejar el menú de impresión (MOVIDA AL ÁMBITO GLOBAL DE DOMContentLoaded)
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

    async function generarDoc(format, mode) {
        generarDocumento(format, currentReportId, mode);
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
            const payload = {
                action: "generarDocumento",
                reportId: reportId,
                format: format,
                user: loggedInUser 
            };
            
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });

            const data = await response.json();

            if (data.status === 'success') {
                Swal.close(); 
                downloadFileFromBase64(data.base64Data, data.fileName, data.mimeType, format, mode);
            } else {
                throw new Error(data.message || "Error desconocido en el backend.");
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

    // Función Global de Descarga
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
            console.error("Error descarga:", e);
            Swal.fire({ icon: 'error', title: 'Error de Descarga', text: 'Hubo un problema al crear el archivo.', customClass: swalDark });
        }
    };

    // Agendamiento: Eventos (Si existe la pestaña)
    const agendamientoTab = document.getElementById('agendamiento-tab');
    if (agendamientoTab) {
         agendamientoTab.addEventListener('shown.bs.tab', () => {
             if(window.cargarAgendamientosDeHoy) window.cargarAgendamientosDeHoy(); 
         });
    }
    
    // --- REINICIO ---
    const btnNew = document.getElementById('btn-nuevo-informe');
    if(btnNew) btnNew.onclick = () => window.location.reload();
    
    // ******* CÓDIGO DE AGENDAMIENTO DEL USUARIO (INTEGRADO AQUÍ) *******
    const modalAgendamientoElement = document.getElementById('modal-agendamiento');
    if(modalAgendamientoElement) {
        const modalAgendamiento = new bootstrap.Modal(modalAgendamientoElement);
        const agendamientoIfSearchBtn = document.getElementById("agendamiento-if-search-btn");
        const agendamientoIfSearchInput = document.getElementById("agendamiento-if-search-input");
        const agendamientoIfSearchLoader = document.getElementById("agendamiento-if-search-loader");
        const agendamientoIfSearchResultsCard = document.getElementById("agendamiento-if-search-results-card");
        const btnGuardarAgendamiento = document.getElementById("btn-guardar-agendamiento");
        const formAgendamiento = document.getElementById("form-agendamiento");
        
        // ... (Variables de campos del formulario de agendamiento) ...
        const agendamientoIfNroHidden = document.getElementById("agendamiento-if-nro-hidden");
        const agendamientoDelito = document.getElementById("agendamiento-delito");
        const agendamientoDetenido = document.getElementById("agendamiento-detenido");
        const agendamientoFiscal = document.getElementById("agendamiento-fiscal");
        const agendamientoFiscalia = document.getElementById("agendamiento-fiscalia");
        const agendamientoFecha = document.getElementById("agendamiento-fecha");
        const agendamientoHora = document.getElementById("agendamiento-hora");
        const agendamientoRealtimeBox = document.getElementById('agendamiento-realtime-box');
        const agendamientoCalendarioInput = document.getElementById('agendamiento-calendario-input');
        const agendamientoSearchInput = document.getElementById('agendamiento-search-input');
        const agendamientoSearchBtn = document.getElementById('agendamiento-search-btn');
        const btnMostrarHoy = document.getElementById('btn-mostrar-hoy');

        // Reagendamiento
        const modalReagendarElement = document.getElementById('modal-reagendar');
        const modalReagendar = new bootstrap.Modal(modalReagendarElement);
        const reagendarIdInput = document.getElementById('reagendar-id');
        const reagendarIfDisplay = document.getElementById('reagendar-if-display');
        const reagendarFecha = document.getElementById('reagendar-fecha');
        const reagendarHora = document.getElementById('reagendar-hora');
        const btnActualizarReagenda = document.getElementById('btn-actualizar-reagenda');

        // Mostrar Hoy Label
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        if(btnMostrarHoy) btnMostrarHoy.innerHTML = `<i class="fa-solid fa-calendar-day me-1"></i> Mostrar Hoy (${dia}/${mes}/${anio})`;

        // Buscar IF Agendamiento
        if(agendamientoIfSearchBtn) {
            agendamientoIfSearchBtn.addEventListener('click', async () => {
                const ifNum = agendamientoIfSearchInput.value.trim();
                if(!ifNum) return Swal.fire({icon:'error', title:'Error', text:'Ingrese IF', customClass:swalDark});
                agendamientoIfSearchLoader.classList.remove('d-none');
                agendamientoIfSearchResultsCard.classList.add('d-none');
                const res = await fetch(GAS_API_URL, {
                    method:'POST', body:JSON.stringify({action:"buscarFlagrancia", ifNumber:ifNum})
                });
                const d = await res.json();
                agendamientoIfSearchLoader.classList.add('d-none');
                if(d.status==='success') {
                    const data = d.data;
                    agendamientoIfNroHidden.value = data.if_number;
                    agendamientoDelito.value = data.delito;
                    agendamientoDetenido.value = data.detenido;
                    agendamientoFiscal.value = data.fiscal;
                    agendamientoFiscalia.value = data.unidad_fiscalia;
                    agendamientoIfSearchResultsCard.classList.remove('d-none');
                    btnGuardarAgendamiento.disabled = false;
                } else Swal.fire({icon:'error', title:'Error', text:d.message, customClass:swalDark});
            });
        }

        // Guardar Agendamiento
        if(btnGuardarAgendamiento) {
            btnGuardarAgendamiento.addEventListener('click', async () => {
                if(!agendamientoFecha.value || !agendamientoHora.value) return Swal.fire({icon:'warning', title:'Incompleto', text:'Falta fecha/hora', customClass:swalDark});
                Swal.fire({title:'Guardando...', didOpen:()=>Swal.showLoading(), customClass:swalDark});
                
                const dataAg = {
                    if_nro: agendamientoIfNroHidden.value,
                    delito: agendamientoDelito.value,
                    detenido: agendamientoDetenido.value,
                    fiscal: agendamientoFiscal.value,
                    fiscalia: agendamientoFiscalia.value,
                    fecha_audiencia: agendamientoFecha.value,
                    hora_audiencia: agendamientoHora.value,
                    creado_por: loggedInUser
                };
                const res = await fetch(GAS_API_URL, {method:'POST', body:JSON.stringify({action:"guardarAgendamiento", user:loggedInUser, datos:dataAg})});
                const d = await res.json();
                if(d.status==='success') {
                    Swal.fire({icon:'success', title:'Guardado', customClass:swalDark});
                    modalAgendamiento.hide();
                    cargarAgendamientosDeHoy();
                } else Swal.fire({icon:'error', title:'Error', text:d.message, customClass:swalDark});
            });
        }

        // Funciones Agendamiento
        window.cargarAgendamientosDeHoy = function() {
            const iso = `${anio}-${mes}-${dia}`;
            if(agendamientoCalendarioInput) agendamientoCalendarioInput.value = iso;
            cargarAgendamientosPorFecha(iso);
        };

        async function cargarAgendamientosPorFecha(iso) {
            if(agendamientoRealtimeBox) agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">Cargando...</p>';
            const res = await fetch(GAS_API_URL, {method:'POST', body:JSON.stringify({action:"getAgendamientosPorFecha", user:loggedInUser, fecha:iso})});
            const d = await res.json();
            if(d.status==='success') renderAgendamientos(d.results);
        }

        function renderAgendamientos(list) {
             if(!agendamientoRealtimeBox) return;
             agendamientoRealtimeBox.innerHTML = "";
             if(!list || list.length===0) {
                 agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">No hay audiencias.</p>';
                 return;
             }
             list.sort((a, b) => (a.hora_audiencia > b.hora_audiencia) ? 1 : -1);
             list.forEach(item => {
                 const div = document.createElement('div');
                 div.className = 'agendamiento-card-item';
                 const fechaAud = new Date(item.fecha_audiencia);
                 // Fix visual date
                 const fStr = fechaAud.toLocaleDateString('es-EC', {timeZone:'UTC', day:'2-digit', month:'long', year:'numeric'});
                 div.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h5>${item.hora_audiencia} - ${item.delito}</h5>
                        <button class="btn btn-outline-info btn-sm btn-reagendar" data-id="${item.agendamiento_id}" data-if="${item.if_nro}" data-f="${fechaAud.toISOString().split('T')[0]}" data-h="${item.hora_audiencia}"><i class="fa-solid fa-calendar-check"></i></button>
                    </div>
                    <p><strong>IF:</strong> ${item.if_nro}</p>
                    <p><strong>Detenido:</strong> ${item.detenido}</p>
                    <p><strong>Fiscal:</strong> ${item.fiscal}</p>
                    <small>Fecha: ${fStr}</small>
                 `;
                 agendamientoRealtimeBox.appendChild(div);
             });
        }

        if(agendamientoRealtimeBox) {
            agendamientoRealtimeBox.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-reagendar');
                if(btn) {
                    reagendarIdInput.value = btn.dataset.id;
                    reagendarIfDisplay.textContent = btn.dataset.if;
                    reagendarFecha.value = btn.dataset.f;
                    reagendarHora.value = btn.dataset.h;
                    modalReagendar.show();
                }
            });
        }

        if(btnActualizarReagenda) {
            btnActualizarReagenda.addEventListener('click', async () => {
                const p = {
                    action: "reagendarAudiencia", user: loggedInUser,
                    agendamiento_id: reagendarIdInput.value,
                    nueva_fecha: reagendarFecha.value, nueva_hora: reagendarHora.value
                };
                const res = await fetch(GAS_API_URL, {method:'POST', body:JSON.stringify(p)});
                const d = await res.json();
                if(d.status==='success') {
                    Swal.fire({icon:'success', title:'Reagendado', customClass:swalDark});
                    modalReagendar.hide();
                    if(agendamientoCalendarioInput.value) cargarAgendamientosPorFecha(agendamientoCalendarioInput.value);
                    else cargarAgendamientosDeHoy();
                }
            });
        }
        
        if(btnMostrarHoy) btnMostrarHoy.onclick = cargarAgendamientosDeHoy;
        if(agendamientoCalendarioInput) agendamientoCalendarioInput.onchange = (e) => cargarAgendamientosPorFecha(e.target.value);
        if(agendamientoSearchBtn) {
            agendamientoSearchBtn.onclick = async () => {
                const term = agendamientoSearchInput.value.trim();
                if(!term) return cargarAgendamientosDeHoy();
                const res = await fetch(GAS_API_URL, {method:'POST', body:JSON.stringify({action:"buscarAgendamientos", user:loggedInUser, searchTerm:term})});
                const d = await res.json();
                if(d.status==='success') renderAgendamientos(d.results);
            };
        }
    }
});