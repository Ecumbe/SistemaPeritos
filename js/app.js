// Se ejecuta cuando todo el HTML de app.html está cargado
document.addEventListener("DOMContentLoaded", () => {

    // --- 0. URL DE LA API ---
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyOJRwHdoEVvVEXuSYn9znm3jzLwmNrHJhlWZ_qAwQzU7sq5VOYPNM2NTBsTTp_8SWAcg/exec"; // 👈 REEMPLAZA ESTO

    // Guardamos la URL en localStorage para que 'editar-informe.js' pueda usarla
    localStorage.setItem("GAS_API_URL", GAS_API_URL);

    // --- Constantes de Estilo ---
    const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };

    // --- 1. VERIFICACIÓN DE SEGURIDAD ---
    const loggedInUser = localStorage.getItem("sistemaPeritosUser"); 
    const loggedInFullName = localStorage.getItem("sistemaPeritosFullName"); 

    if (!loggedInUser || !loggedInFullName) {
        alert("Acceso denegado. Debes iniciar sesión.");
        window.location.href = "index.html";
        return;
    }

    // --- 2. PERSONALIZACIÓN DE LA PÁGINA ---
    const userGreeting = document.getElementById("user-greeting");
    userGreeting.innerHTML = `<i class="fa-solid fa-user-check"></i> Bienvenido, <strong>${loggedInFullName}</strong>`;
    const reportCountSpan = document.getElementById("report-count");

    // --- Cargar estadísticas del usuario al inicio ---
    (async function loadUserStats() {
        try {
            const payload = {
                action: "getUserStats",
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
                reportCountSpan.textContent = String(data.reportCount).padStart(2, '0');

            // --- Cargar estadísticas individuales de productividad ---
            try {
                const payloadStats = { action: "getUserDashboardStats", user: loggedInUser };
                const respStats = await fetch(GAS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payloadStats),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const statsData = await respStats.json();
                if (statsData.status === 'success') {
                    document.getElementById("user-si").textContent = statsData.kpis.totalSI;
                    document.getElementById("user-no").textContent = statsData.kpis.totalNO;
                    document.getElementById("user-total").textContent = statsData.kpis.totalGeneral;
                    document.getElementById("user-range").textContent = statsData.dateRange;
                }
            } catch (err) {
                console.log("No se pudieron cargar estadísticas de usuario:", err);
            }

            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
            reportCountSpan.textContent = "Error";
        }
    })();

    // --- 3. LÓGICA de CERRAR SESIÓN ---
    const btnLogout = document.getElementById("btn-logout");
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

    /* ==========================================================
       LÓGICA PESTAÑA "BUSCAR"
       ========================================================== */
    const searchForm = document.getElementById("search-form");
    const searchTermInput = document.getElementById("search-term");
    const searchLoader = document.getElementById("search-loader");
    const searchResultsContainer = document.getElementById("search-results-container");
    const searchResultsTbody = document.getElementById("search-results-tbody");
    
    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const searchTerm = searchTermInput.value.trim();
            if (!searchTerm) return;

            console.log(`Buscando: ${searchTerm}`);
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
                
                if (data.status === 'success') {
                    renderSearchResults(data.results);
                } else {
                    throw new Error(data.message || "Error desconocido en el servidor.");
                }

            } catch (error) {
                console.error('Error en la búsqueda:', error);
                searchLoader.classList.add('d-none');
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Error de Búsqueda', 
                    text: error.message, 
                    customClass: swalDark 
                });
            }
        });
    }

    /**
     * Dibuja los resultados en la tabla de búsqueda
     */
    function renderSearchResults(results) {
        searchResultsTbody.innerHTML = ""; 
        
        if (results.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" class="text-center text-white-50">No se encontraron informes.</td>`;
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
                        <button class="btn btn-danger btn-sm me-1 btn-pdf-report" data-report-id="${escape(report.reporte_id)}" title="Visualizar (PDF)">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button class="btn btn-primary btn-sm btn-word-report" data-report-id="${escape(report.reporte_id)}" title="Descargar (WORD)">
                            <i class="fa-solid fa-file-word"></i>
                        </button>
                    </td>
                `;
                searchResultsTbody.appendChild(tr);
            });
        }
        searchResultsContainer.style.display = "block"; 
    }

    /**
     * Event Listener para los botones dinámicos de la tabla (PDF/Word/Editar)
     */
    searchResultsTbody.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const reportId = button.dataset.reportId;
        if (!reportId) return;

        if (button.classList.contains('btn-pdf-report')) {
            generarDocumento('pdf', reportId);
        } else if (button.classList.contains('btn-word-report')) {
            generarDocumento('word', reportId);
        } else if (button.classList.contains('btn-edit-report')) {
            console.log(`Abriendo editor para: ${reportId}`);
            window.open(`editar-informe.html?id=${reportId}`, '_blank');
        }
    });

    /* ==========================================================
       FIN DE LA SECCIÓN "BUSCAR"
       ========================================================== */


    /* ==========================================================
       LÓGICA DEL WIZARD "NUEVO INFORME"
       ========================================================== */

    const step1Div = document.getElementById('wizard-step-1');
    const step2Div = document.getElementById('wizard-step-2');
    const step3Div = document.getElementById('wizard-step-3');
    const step4Div = document.getElementById('wizard-step-4');

    // --- Lógica del PASO 1: Búsqueda (COMPLETA) ---
    const searchBtn = document.getElementById("if-search-btn");
    const searchInput = document.getElementById("if-search-input");
    const loader = document.getElementById("if-search-loader");
    const resultsCard = document.getElementById("if-search-results-card");
    const resultsContent = document.getElementById("if-search-results-content");
    const btnContinuarPaso1 = document.getElementById("if-search-continuar");

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
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow'
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
                        <p class="result-item"><strong>Agente:</strong> ${d.grado} ${d.agente}</p>
                        <p class="result-item"><strong>Fecha Infracción:</strong> ${d.fecha_infraccion}</p>
                        <p class="result-item"><strong>Fecha Delegación:</strong> ${d.fecha_delegacion}</p>
                    `;
                    resultsCard.classList.remove('d-none');
                    btnContinuarPaso1.classList.remove('d-none');
                    localStorage.setItem('datosFlagrancia', JSON.stringify(d));
                } else {
                    Swal.fire({ icon: 'error', title: 'Error en la Búsqueda', text: data.message, customClass: swalDark });
                }
            })
            .catch(error => {
                loader.classList.add('d-none');
                searchBtn.disabled = false;
                console.error('Error en fetch:', error);
                Swal.fire({ icon: 'error', title: 'Error de Conexión', text: 'No se pudo conectar con el servidor.', customClass: swalDark });
            });
    });

    // --- LÓGICA DE NAVEGACIÓN DEL WIZARD (COMPLETA) ---
    btnContinuarPaso1.addEventListener('click', () => {
        step1Div.classList.add('d-none');
        step2Div.classList.remove('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.add('d-none');
        popularFormularioPaso2();
    });
    document.getElementById('btn-regresar-paso1').addEventListener('click', () => {
        step1Div.classList.remove('d-none');
        step2Div.classList.add('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.add('d-none');
    });
    document.getElementById('btn-continuar-paso3').addEventListener('click', () => {
        step1Div.classList.add('d-none');
        step2Div.classList.add('d-none');
        step3Div.classList.remove('d-none');
        step4Div.classList.add('d-none');
        popularFormularioPaso3(); 
    });
    document.getElementById('btn-regresar-paso2').addEventListener('click', () => {
        step1Div.classList.add('d-none');
        step2Div.classList.remove('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.add('d-none');
    });
    document.getElementById('btn-continuar-paso4').addEventListener('click', () => {
        if (document.getElementById('informe-reconocimiento').value.trim() === "") {
            Swal.fire({
                icon: 'warning', title: 'Campo Vacío',
                text: 'El campo "Reconocimiento Pericial" está vacío. ¿Desea continuar?',
                showCancelButton: true, confirmButtonText: 'Sí, continuar', customClass: swalDark
            }).then((result) => {
                if (result.isConfirmed) navegarPaso4();
            });
        } else {
            navegarPaso4();
        }
    });
    function navegarPaso4() {
        step1Div.classList.add('d-none');
        step2Div.classList.add('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.remove('d-none');
    }
    document.getElementById('btn-regresar-paso3').addEventListener('click', () => {
        showNavButtons(); 
        step1Div.classList.add('d-none');
        step2Div.classList.add('d-none');
        step3Div.classList.remove('d-none');
        step4Div.classList.add('d-none');
    });


    // --- BOTONES GENERADORES (PASO 3 - COMPLETOS) ---
    document.getElementById('btn-generar-referencia').addEventListener('click', () => {
        const refOficio = document.getElementById('tabla-ref-oficio').value;
        const fechaRef = document.getElementById('informe-fecha-referencia').value;
        const fiscalNombre = document.getElementById('oficio-fiscal-nombre').value;
        const fiscalUnidad = document.getElementById('oficio-fiscal-unidad').value;
        const fiscalUnidadCompleta = `FISCALÍA ESPECIALIZADA EN INVESTIGACIÓN DE ${fiscalUnidad}`;
        const texto = `Mediante Oficio Nro.- ${refOficio}, de fecha ${fechaRef}, suscrito por la ${fiscalNombre}, FISCAL DE LO PENAL DEL GUAYAS ${fiscalUnidadCompleta}, dirigido al señor JEFE DEL SISTEMA ESPECIALIZADO INTEGRAL DE INVESTIGACIÓN, MEDICINA LEGAL Y CIENCIAS FORENSES DEL GUAYAS .`;
        document.getElementById('informe-referencia').value = texto;
    });
    document.getElementById('btn-generar-objeto').addEventListener('click', () => {
        const fechaAprehension = document.getElementById('tabla-fecha-aprehension').value;
        const procesado = document.getElementById('tabla-procesado').value;
        const texto = `Pedido textual: “EL RECONOCIMIENTO DEL LUGAR DE LOS HECHOS”, que se hacen constar en el Parte Policial, de fecha ${fechaAprehension}, en contra de los procesados (a) ${procesado}.`;
        document.getElementById('informe-objeto').value = texto;
    });
    document.getElementById('btn-generar-conclusion').addEventListener('click', () => {
        const fechaAprehension = document.getElementById('tabla-fecha-aprehension').value;
        const procesado = document.getElementById('tabla-procesado').value;
        const lugar = document.getElementById('tabla-lugar-hechos').value;
        const texto = `SE DETERMINA QUE EL LUGAR DE LOS HECHOS, SUSCRITO EN EL PARTE DE APREHENSIÓN, DE FECHA ${fechaAprehension}, EN CONTRA DE LA CIUDADANA HOY PROCESADA ${procesado}, (SI EXISTE) Y SE ENCUENTRA UBICADO EN EL ${lugar}, MISMA QUE FUE FIJADA Y FOTOGRAFIADA Y DESCRIPTIVAMENTE SE ENCUENTRA DETALLADA.`;
        document.getElementById('informe-conclusiones').value = texto;
    });


    /* ==========================================================
       PASO 4: LÁMINAS Y FOTOS (actualizado con PhotoEditor)
       ========================================================== */
    const laminasContainer = document.getElementById('laminas-container');
    const templateLamina = document.getElementById('template-lamina');
    const templateFoto = document.getElementById('template-foto');

    // --- Selectores de botones del Paso 4 ---
    const btnRegresarPaso3 = document.getElementById('btn-regresar-paso3');
    const btnGuardarYSubir = document.getElementById('btn-guardar-y-subir-fotos');
    const btnNuevoInforme = document.getElementById('btn-nuevo-informe');
    const btnImprimirDocumento = document.getElementById('btn-imprimir-documento');

    // --- Variable global para guardar el ID del reporte
    let currentReportId = null; 

    // --- Funciones para mostrar/ocultar botones del Paso 4
    function showNavButtons() {
        btnRegresarPaso3.classList.remove('d-none');
        btnGuardarYSubir.classList.remove('d-none');
        btnNuevoInforme.classList.add('d-none');
        btnImprimirDocumento.classList.add('d-none');
        currentReportId = null; 
    }
    
    function showPostSaveButtons(reportId) {
        btnRegresarPaso3.classList.remove('d-none');
        btnGuardarYSubir.classList.remove('d-none');
        btnNuevoInforme.classList.remove('d-none');
        btnImprimirDocumento.classList.remove('d-none');
        currentReportId = reportId; 
    }


    // --- Detectar cambios para revertir botones ---
    document.getElementById('btn-agregar-lugar').addEventListener('click', () => {
        showNavButtons(); 
        const laminaClone = templateLamina.content.cloneNode(true);
        laminasContainer.appendChild(laminaClone);
        updateLaminaNumbers();
    });

    laminasContainer.addEventListener('click', (e) => {
        // eliminar lamina
        if (e.target.closest('.btn-eliminar-lamina')) {
            showNavButtons(); 
            e.target.closest('.lamina-card').remove();
            updateLaminaNumbers();
        }
        // eliminar foto
        if (e.target.closest('.btn-eliminar-foto')) {
            showNavButtons(); 
            const laminaCard = e.target.closest('.lamina-card');
            e.target.closest('.foto-card').remove();
            updatePhotoNumbers(laminaCard);
        }
        
        // Botón Editar Foto
        if (e.target.closest('.btn-editar-foto')) {
            showNavButtons();
            const fotoCard = e.target.closest('.foto-card');
            const img = fotoCard.querySelector('.foto-preview');
            const descripcion = fotoCard.querySelector('.foto-descripcion');

            PhotoEditor.open({
                imgEl: img,
                onSave: ({ description }) => {
                    descripcion.value = description || "";
                    const resumenBtn = fotoCard.querySelector('.btn-agregar-descripcion');
                    if (descripcion.value.trim() !== "") {
                        resumenBtn.textContent = descripcion.value.substring(0, 40) + "…";
                    } else {
                        resumenBtn.textContent = "+ Agregar Descripción";
                    }
                }
            });
        }
        
        // Botón Agregar Descripción
        if (e.target.closest('.btn-agregar-descripcion')) {
            showNavButtons();
            const fotoCard = e.target.closest('.foto-card');
            const descripcion = fotoCard.querySelector('.foto-descripcion');
            const btn = e.target.closest('.btn-agregar-descripcion');

            descripcion.classList.toggle('d-none');
            
            if (!descripcion.classList.contains('d-none')) {
                descripcion.focus();
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Ocultar Descripción';
            } else {
                if (descripcion.value.trim() !== "") {
                    btn.textContent = descripcion.value.substring(0, 40) + "…";
                } else {
                    btn.textContent = "+ Agregar Descripción";
                }
            }
        }
    });

    laminasContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('lamina-file-input')) {
            showNavButtons(); 
            handleFileInputChange(e);
        }
    });

    async function handleFileInputChange(event) {
        const files = event.target.files;
        const fotosContainer = event.target.closest('.card-body').querySelector('.lamina-fotos-container');
        const laminaNum = event.target.closest('.lamina-card').querySelector('.lamina-numero').textContent;

        for (const file of files) {
            await processAndDisplayImage(file, fotosContainer, laminaNum);
        }
    }

    // --- [INICIO: LÓGICA PARA PEGAR (MODIFICADA)] ---
    /**
     * Procesa un archivo de imagen (de portapapeles o input) y lo añade
     */
    async function processAndDisplayImage(file, fotosContainer, laminaNum) {
        const fotoClone = templateFoto.content.cloneNode(true);
        const fotoCard = fotoClone.querySelector('.foto-card');
        const previewImg = fotoCard.querySelector('.foto-preview');
        const spinner = fotoCard.querySelector('.foto-spinner');
        const titleInput = fotoCard.querySelector('.foto-title-input');

        spinner.classList.remove('d-none');
        const photoCount = fotosContainer.querySelectorAll('.foto-card').length;
        titleInput.value = `Fotografía N° ${photoCount + 1}`;
        fotosContainer.appendChild(fotoClone);
        fotoCard.dataset.laminaNum = laminaNum;

        try {
            let fileToProcess = file;
            const maxSizeInBytes = 1 * 1024 * 1024; // 1MB
            if (file.size > maxSizeInBytes) {
                spinner.querySelector('.ms-2').textContent = 'Comprimiendo...';
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                fileToProcess = await imageCompression(file, options);
            } else {
                spinner.querySelector('.ms-2').textContent = 'Procesando...';
            }

            const dataURL = await imageCompression.getDataUrlFromFile(fileToProcess);
            previewImg.src = dataURL;
            previewImg.dataset.base64 = dataURL;
            spinner.classList.add('d-none');
            showNavButtons(); // Marcar como "cambio"

        } catch (error) {
            console.error(error);
            spinner.textContent = 'Error al procesar';
        }
    }

    /**
     * Escucha el evento de pegar (Ctrl+V)
     */
    document.addEventListener('paste', (e) => {
        // --- [INICIO DE LA CORRECCIÓN] ---
        // 1. Si el usuario está pegando en un campo de texto, ignorar
        const targetTag = e.target.tagName;
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
            return; // Dejar que el navegador pegue el texto
        }
        // --- [FIN DE LA CORRECCIÓN] ---

        // 2. Validar que estemos en el Paso 4
        if (step4Div.classList.contains('d-none')) {
            return; // No estamos en el paso 4, ignorar
        }
        
        // 3. Validar que haya una lámina
        const ultimaLamina = laminasContainer.querySelector('.lamina-card:last-of-type');
        if (!ultimaLamina) {
            Swal.fire({ 
                icon: 'warning', 
                title: 'No hay lámina', 
                text: 'Por favor, agregue una lámina primero antes de pegar imágenes.', 
                customClass: swalDark 
            });
            return;
        }

        // 4. Obtener contenedor de fotos de la última lámina
        const fotosContainer = ultimaLamina.querySelector('.lamina-fotos-container');
        const laminaNum = ultimaLamina.querySelector('.lamina-numero').textContent;

        // 5. Obtener archivos del portapapeles
        const items = e.clipboardData.items;
        let foundImage = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    foundImage = true;
                    // Procesar la imagen pegada
                    processAndDisplayImage(file, fotosContainer, laminaNum);
                }
            }
        }

        if (foundImage) {
            e.preventDefault(); // Evitar que el navegador pegue la imagen en otro lado
        }
    });
    // --- [FIN: LÓGICA PARA PEGAR (MODIFICADA)] ---


    function updateLaminaNumbers() {
        const allLaminas = laminasContainer.querySelectorAll('.lamina-card');
        allLaminas.forEach((lamina, index) => {
            lamina.querySelector('.lamina-numero').textContent = index + 1;
        });
    }

    function updatePhotoNumbers(laminaCard) {
        if (!laminaCard) return;
        const allPhotoTitles = laminaCard.querySelectorAll('.foto-title-input');
        allPhotoTitles.forEach((input, index) => {
            input.value = `Fotografía N° ${index + 1}`;
        });
    }

    /* ==========================================================
       GUARDADO FINAL (ETAPA A y B)
       ========================================================== */
    
    document.getElementById('btn-guardar-y-subir-fotos').addEventListener('click', async () => {
        Swal.fire({
            title: 'Guardando Informe...',
            text: 'Etapa 1 de 2: Guardando datos de texto.',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => Swal.showLoading()
        });

        const textData = gatherAllTextData();
        let reportId;
        try {
            reportId = await saveTextData(textData);
            if (!reportId) throw new Error("No se recibió Report ID.");
            
            const photos = gatherAllPhotoData();
            if (photos.length > 0) {
                Swal.update({ title: 'Subiendo Fotos...', text: `Etapa 2 de 2: ${photos.length} fotos.` });
                await uploadAllPhotos(reportId, photos);
            }
            
            // Actualizar contador
            const currentCount = parseInt(reportCountSpan.textContent, 10) || 0;
            reportCountSpan.textContent = String(currentCount + 1).padStart(2, '0');

            Swal.fire({
                icon: 'success',
                title: '¡Informe Guardado!',
                text: `Informe ${reportId} guardado/actualizado correctamente.`,
                customClass: swalDark
            }).then((result) => {
                if (result.isConfirmed) {
                    showPostSaveButtons(reportId); 
                }
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error en el Guardado', text: error.message, customClass: swalDark });
        }
    });

    function gatherAllTextData() {
        const datosFlagrancia = JSON.parse(localStorage.getItem('datosFlagrancia'));
        const datosOficio = {
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
        };
        const datosCuerpo = {
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
        };
        return { datosFlagrancia, datosOficio, datosCuerpo };
    }

    function gatherAllPhotoData() {
        const photos = [];
        const allFotoCards = laminasContainer.querySelectorAll('.foto-card');
        
        allFotoCards.forEach(card => {
            const img = card.querySelector('.foto-preview');
            const descripcion = card.querySelector('.foto-descripcion').value;
            const titulo = card.querySelector('.foto-title-input').value;
            photos.push({
                laminaNum: card.dataset.laminaNum,
                base64: img.dataset.base64,
                titulo: titulo,
                descripcion: descripcion
            });
        });
        return photos;
    }

    async function saveTextData(textData) {
        const payload = { action: "guardarInformeCompleto", datos: textData };
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow'
        });
        const data = await response.json();
        if (data.status === 'success') {
            return data.reportId;
        } else {
            throw new Error(data.message || "Error al guardar los datos de texto.");
        }
    }

    async function uploadAllPhotos(reportId, photos) {
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            
            if (!photo.base64 || !photo.base64.startsWith('data:image')) {
                console.warn(`Omitiendo foto ${i+1} (datos base64 inválidos)`);
                continue; 
            }

            Swal.update({
                text: `Etapa 2 de 2: Subiendo foto ${i + 1} de ${photos.length} (Lámina ${photo.laminaNum}).`
            });

            const base64Data = photo.base64.split(',')[1];
            const payload = {
                action: "subirFoto",
                reportId: reportId,
                laminaNum: photo.laminaNum,
                titulo: photo.titulo,
                descripcion: photo.descripcion,
                base64Data: base64Data
            };

            try {
                const response = await fetch(GAS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    redirect: 'follow'
                });
                const data = await response.json();
                if (data.status !== 'success') {
                    throw new Error(data.message || `Error al subir la foto ${i + 1}.`);
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Subida',
                    text: `Falló la foto ${i + 1}. ${error.message}`,
                    customClass: swalDark
                });
            }
        }
    }

    /* ==========================================================
       LÓGICA DE BOTONES POST-GUARDADO
       ========================================================== */

    btnNuevoInforme.addEventListener('click', () => {
        Swal.fire({
            title: '¿Iniciar un nuevo informe?',
            text: "Se limpiarán todos los campos del formulario actual.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, empezar de nuevo',
            cancelButtonText: 'Cancelar',
            customClass: swalDark
        }).then((result) => {
            if (result.isConfirmed) {
                resetWizard();
            }
        });
    });

    btnImprimirDocumento.addEventListener('click', () => {
        if (!currentReportId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontró el ID del informe guardado. Vuelve a guardar.', customClass: swalDark });
            return;
        }
        handlePrintMenu(currentReportId);
    });

    function handlePrintMenu(reportId) {
        Swal.fire({
            title: 'Seleccione un formato',
            text: `¿Cómo desea imprimir el informe ${reportId}?`,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: `<i class="fa-solid fa-file-pdf"></i> Generar PDF`,
            denyButtonText: `<i class="fa-solid fa-file-word"></i> Descargar WORD`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33', 
            denyButtonColor: '#3085d6', 
            customClass: swalDark
        }).then((result) => {
            if (result.isConfirmed) {
                generarDocumento('pdf', reportId);
            } else if (result.isDenied) {
                generarDocumento('word', reportId);
            }
        });
    }
    
    async function generarDocumento(format, reportId) {
        Swal.fire({
            title: `Generando ${format.toUpperCase()}...`,
            text: 'Esto puede tomar un momento, el servidor está ensamblando el documento...',
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
                downloadFileFromBase64(data.base64Data, data.fileName, data.mimeType, format);
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
    
    
    function resetWizard() {
        document.getElementById('if-search-input').value = '';
        document.getElementById('if-search-results-content').innerHTML = '';
        resultsCard.classList.add('d-none');
        btnContinuarPaso1.classList.add('d-none');
        localStorage.removeItem('datosFlagrancia');

        const step2Inputs = document.querySelectorAll('#wizard-step-2 input, #wizard-step-2 select');
        step2Inputs.forEach(input => {
             if (input.type === 'text' || input.type === 'date') input.value = '';
             else if (input.tagName === 'SELECT') input.selectedIndex = 0;
        });
        
        const step3Inputs = document.querySelectorAll('#wizard-step-3 input, #wizard-step-3 textarea');
        step3Inputs.forEach(input => {
             if (input.type === 'text' || input.type === 'textarea') input.value = '';
        });

        laminasContainer.innerHTML = '';
        updateLaminaNumbers();

        showNavButtons(); 
        
        step1Div.classList.remove('d-none');
        step2Div.classList.add('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.add('d-none');
        
        new bootstrap.Tab(document.getElementById('nuevo-tab')).show();

        popularFormularioPaso2(true); // Llamar con isReset para limpiar
        popularFormularioPaso3(); 
    }


    // --- FUNCIONES DE AYUDA DEL WIZARD ---
    
    function popularFormularioPaso2(isReset = false) {
        const datos = JSON.parse(localStorage.getItem('datosFlagrancia'));
        
        if (!isReset) { 
            if (!datos) {
                // No mostramos alerta si es un reset, solo si falla la carga inicial
                if (!isReset) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontraron datos de flagrancia.', customClass: swalDark });
                    document.getElementById('btn-regresar-paso1').click();
                }
                return;
            }
            document.getElementById('oficio-fiscal-nombre').value = datos.fiscal;
            document.getElementById('oficio-fiscal-unidad').value = datos.unidad_fiscalia;
            document.getElementById('oficio-agente-nombre').value = datos.agente.trim();

            const gradoSelect = document.getElementById('oficio-agente-grado');
            const gradoAgente = datos.grado.trim().toUpperCase();
            let gradoEncontrado = false;
            for (let i = 0; i < gradoSelect.options.length; i++) {
                if (gradoSelect.options[i].value === gradoAgente) {
                    gradoSelect.selectedIndex = i;
                    gradoEncontrado = true;
                    break;
                }
            }
            if (!gradoEncontrado) {
                gradoSelect.selectedIndex = 0;
                console.warn(`Grado "${gradoAgente}" no encontrado en la lista.`);
            }
        } else { 
            document.getElementById('oficio-fiscal-nombre').value = '';
            document.getElementById('oficio-fiscal-unidad').value = '';
            document.getElementById('oficio-agente-nombre').value = '';
            document.getElementById('oficio-agente-grado').selectedIndex = 0;
        }

        document.getElementById('oficio-anio').value = new Date().getFullYear();
        document.getElementById('oficio-fecha').value = formatearFecha(new Date());

        const step2Inputs = document.querySelectorAll('#wizard-step-2 input, #wizard-step-2 select');
        step2Inputs.forEach(input => {
            input.removeEventListener('input', showNavButtons); 
            input.addEventListener('input', showNavButtons); 
            
            if (['oficio-anio', 'oficio-numero', 'oficio-fecha', 'oficio-asunto-numero'].includes(input.id)) {
                 input.removeEventListener('input', actualizarCuerpoOficio);
                 input.addEventListener('input', actualizarCuerpoOficio);
            }
        });

        actualizarCuerpoOficio(); // Asegurarse de que se llame al final
    }

    function popularFormularioPaso3() {
        const datosFlag = JSON.parse(localStorage.getItem('datosFlagrancia'));
        
        if (datosFlag) {
            const oficioAnio = document.getElementById('oficio-anio').value;
            const oficioNumero = document.getElementById('oficio-numero').value;
            const oficioFecha = document.getElementById('oficio-fecha').value;
            const refOficioNum = document.getElementById('oficio-asunto-numero').value;
            const agenteNombre = document.getElementById('oficio-agente-nombre').value;
            const agenteGrado = document.getElementById('oficio-agente-grado').value;

            document.getElementById('tabla-if-nro').value = datosFlag.if_number;
            document.getElementById('tabla-fecha-informe').value = oficioFecha;
            document.getElementById('tabla-informe-nro').value = `PN-ZONA8-JINVPJ-UDF-${oficioAnio}-${oficioNumero}`;
            document.getElementById('tabla-delito').value = datosFlag.delito;
            document.getElementById('tabla-agente-fiscal').value = datosFlag.fiscal;
            document.getElementById('tabla-procesado').value = datosFlag.detenido;
            document.getElementById('tabla-ref-oficio').value = `FPG-FEIFO${refOficioNum}`;
            document.getElementById('tabla-perito').value = `${agenteGrado} DE POLICIA ${agenteNombre}`;

            // --- [INICIO: MODIFICACIÓN] ---
            const fechaActualFormateada = formatearFecha(new Date());
            document.getElementById('tabla-fecha-aprehension').value = datosFlag.fecha_infraccion || fechaActualFormateada;
            document.getElementById('informe-fecha-referencia').value = datosFlag.fecha_delegacion || fechaActualFormateada;
            // --- [FIN: MODIFICACIÓN] ---
        }

        const ft = `El reconocimiento del lugar  es un  acto procesal que se cumplen por orden de autoridad competente y previa posesión ante la misma, tiene como fin la percepción y comprobación de los efectos materiales que el hecho investigado hubierejado, mediante la fijación de la actividad, motivo de la diligencia, así como también la búsqueda minuciosa de indicios, huellas, rastros o vestigios que indicaran directamente la existencia de un delito, al tratarse de un hecho que no produjo efectos materiales, o hubiere sido alterado o el tiempo hubiese cambiado, se describirá el estado existente, para tal efecto se utilizara las técnicas de observación y fijación adecuadas a lo solicitado por la autoridad competente.`;
        if (document.getElementById('informe-fundamentos-tecnicos').value === "")
            document.getElementById('informe-fundamentos-tecnicos').value = ft;

        const fl = `El COIP en su Art. 460 sobre el Reconocimiento del Lugar de los hechos manifiesta: La o el fiscal con el apoyo del personal del Sistema especializado integral de investigación, de medicina legal y ciencias forenses, o el personal competente en materia de tránsito, cuando sea relevante para la investigación, reconocerá el lugar de los hechos.`;
        if (document.getElementById('informe-fundamentos-legales').value === "")
            document.getElementById('informe-fundamentos-legales').value = fl;

        const step3Inputs = document.querySelectorAll('#wizard-step-3 input, #wizard-step-3 textarea');
        step3Inputs.forEach(input => {
            input.removeEventListener('input', showNavButtons); 
            input.addEventListener('input', showNavButtons); 
        });
    }

    // --- [INICIO: CORRECCIÓN] ---
    function actualizarCuerpoOficio() {
        const datosFlag = JSON.parse(localStorage.getItem('datosFlagrancia')); // Obtener datos de flagrancia
        
        const anio = document.getElementById('oficio-anio').value;
        const numero = document.getElementById('oficio-numero').value;
        const fecha = document.getElementById('oficio-fecha').value;
        const asuntoNumero = document.getElementById('oficio-asunto-numero').value;

        // Usar datosFlag si están disponibles, de lo contrario, usar '...'
        const ifNro = datosFlag ? datosFlag.if_number : '...';
        const detenido = datosFlag ? datosFlag.detenido.trim() : '...'; // Corregido de datosFlag.detenido
        const delito = datosFlag ? datosFlag.delito : '...';

        document.getElementById('cuerpo-oficio-nro').textContent = `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`;
        document.getElementById('cuerpo-oficio-fecha').textContent = fecha;
        document.getElementById('cuerpo-oficio-asunto').textContent = `FPG-FEIFO${asuntoNumero}`;
        
        document.getElementById('cuerpo-if-nro').textContent = ifNro;
        document.getElementById('cuerpo-detenido-nombre').textContent = detenido;
        document.getElementById('cuerpo-delito-nombre').textContent = delito;
    }
    // --- [FIN: CORRECCIÓN] ---

    function formatearFecha(date) {
        // Corrección para evitar error si la fecha es inválida
        if (!date) return "Guayaquil, fecha inválida";
        const options = { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }; // Usar UTC
        const fechaObj = (date instanceof Date) ? date : new Date(date);
        if (isNaN(fechaObj.getTime())) return "Guayaquil, fecha inválida";
        
        const fechaFormateada = fechaObj.toLocaleDateString('es-EC', options);
        return `Guayaquil, ${fechaFormateada}`;
    }

    /* ==========================================================
       LÓGICA DE PESTAÑAS
       ========================================================== */
    const tabs = document.querySelectorAll('.app-tabs .nav-link');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            localStorage.setItem('lastActiveTab', event.target.id);
        });
    });

    const lastTabId = localStorage.getItem('lastActiveTab');
    if (lastTabId) {
        const lastTab = document.getElementById(lastTabId);
        if (lastTab) {
            new bootstrap.Tab(lastTab).show();
        }
    }
    
    // --- FUNCIÓN DE AYUDA PARA DESCARGA (SIN CAMBIOS) ---
    function downloadFileFromBase64(base64Data, fileName, mimeType, format) {
        try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const blobUrl = URL.createObjectURL(blob);

            if (format === 'pdf') {
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
            console.error("Error al decodificar o descargar el archivo:", e);
            Swal.fire({
                icon: 'error',
                title: 'Error de Descarga',
                text: 'Hubo un problema al crear el archivo para descargar.',
                customClass: swalDark
            });
        }
    }


    /* ==========================================================
       INICIO: LÓGICA PESTAÑA "AGENDAMIENTO" (COMPLETA)
       ========================================================== */
    
    // --- Selectores del Modal 1 (Nuevo Agendamiento) ---
    const modalAgendamientoElement = document.getElementById('modal-agendamiento');
    const modalAgendamiento = new bootstrap.Modal(modalAgendamientoElement);
    const agendamientoIfSearchBtn = document.getElementById("agendamiento-if-search-btn");
    const agendamientoIfSearchInput = document.getElementById("agendamiento-if-search-input");
    const agendamientoIfSearchLoader = document.getElementById("agendamiento-if-search-loader");
    const agendamientoIfSearchResultsCard = document.getElementById("agendamiento-if-search-results-card");
    const btnGuardarAgendamiento = document.getElementById("btn-guardar-agendamiento");
    const formAgendamiento = document.getElementById("form-agendamiento");

    // --- Selectores del formulario del Modal 1 ---
    const agendamientoIfNroHidden = document.getElementById("agendamiento-if-nro-hidden");
    const agendamientoDelito = document.getElementById("agendamiento-delito");
    const agendamientoDetenido = document.getElementById("agendamiento-detenido");
    const agendamientoFiscal = document.getElementById("agendamiento-fiscal");
    const agendamientoFiscalia = document.getElementById("agendamiento-fiscalia");
    const agendamientoFecha = document.getElementById("agendamiento-fecha");
    const agendamientoHora = document.getElementById("agendamiento-hora");

    // --- Selectores del Modal 2 (Reagendar) ---
    const modalReagendarElement = document.getElementById('modal-reagendar');
    const modalReagendar = new bootstrap.Modal(modalReagendarElement);
    const reagendarIdInput = document.getElementById('reagendar-id');
    const reagendarIfDisplay = document.getElementById('reagendar-if-display');
    const reagendarFecha = document.getElementById('reagendar-fecha');
    const reagendarHora = document.getElementById('reagendar-hora');
    const btnActualizarReagenda = document.getElementById('btn-actualizar-reagenda');

    // --- Selectores de la Pestaña Agendamiento ---
    const agendamientoTab = document.getElementById('agendamiento-tab');
    const agendamientoSearchBtn = document.getElementById('agendamiento-search-btn');
    const agendamientoSearchInput = document.getElementById('agendamiento-search-input');
    const agendamientoRealtimeBox = document.getElementById('agendamiento-realtime-box');
    const agendamientoCalendarioInput = document.getElementById('agendamiento-calendario-input');
    // --- [NUEVO] Establecer fecha en el botón "Mostrar Hoy" ---
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    btnMostrarHoy.innerHTML = `<i class="fa-solid fa-calendar-day me-1"></i> Mostrar Hoy (${dia}/${mes}/${anio})`;
// --- [FIN NUEVO] ---


    /**
     * Listener para BUSCAR IF dentro del modal de agendamiento
     */
    agendamientoIfSearchBtn.addEventListener('click', async () => {
        const ifNumber = agendamientoIfSearchInput.value.trim();
        if (!ifNumber) {
            Swal.fire({ icon: 'error', title: 'Campo Vacío', text: 'Por favor, ingrese un N° de Instrucción Fiscal.', customClass: swalDark });
            return;
        }

        agendamientoIfSearchLoader.classList.remove('d-none');
        agendamientoIfSearchResultsCard.classList.add('d-none');
        btnGuardarAgendamiento.disabled = true;
        agendamientoIfSearchBtn.disabled = true;

        // Usamos la misma acción de 'buscarFlagrancia' del wizard
        const payload = { action: "buscarFlagrancia", ifNumber: ifNumber };

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();

            if (data.status === 'success') {
                const d = data.data;
                // Autocompletar los campos del formulario (Req 1)
                agendamientoIfNroHidden.value = d.if_number;
                agendamientoDelito.value = d.delito;
                agendamientoDetenido.value = d.detenido;
                agendamientoFiscal.value = d.fiscal;
                agendamientoFiscalia.value = d.unidad_fiscalia;

                // Mostrar el formulario y habilitar el guardado
                agendamientoIfSearchResultsCard.classList.remove('d-none');
                btnGuardarAgendamiento.disabled = false;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error en la Búsqueda', text: error.message, customClass: swalDark });
        } finally {
            agendamientoIfSearchLoader.classList.add('d-none');
            agendamientoIfSearchBtn.disabled = false;
        }
    });

    /**
     * Listener para GUARDAR el nuevo agendamiento
     */
    btnGuardarAgendamiento.addEventListener('click', async () => {
        // Validación (Req 1 - campos de rellenar)
        if (!agendamientoFecha.value || !agendamientoHora.value) {
            Swal.fire({ icon: 'warning', title: 'Campos Incompletos', text: 'Por favor, ingrese la Fecha y Hora de la audiencia.', customClass: swalDark });
            return;
        }

        // Recopilar todos los datos
        const datosAgendamiento = {
            if_nro: agendamientoIfNroHidden.value,
            delito: agendamientoDelito.value,
            detenido: agendamientoDetenido.value,
            fiscal: agendamientoFiscal.value,
            fiscalia: agendamientoFiscalia.value,
            fecha_audiencia: agendamientoFecha.value,
            hora_audiencia: agendamientoHora.value,
            creado_por: loggedInUser
        };

        Swal.fire({
            title: 'Guardando Agendamiento...',
            text: 'Por favor espere.',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => Swal.showLoading()
        });

        // Enviar al backend (Nueva acción 'guardarAgendamiento')
        const payload = {
            action: "guardarAgendamiento",
            user: loggedInUser,
            datos: datosAgendamiento
        };

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();

            if (data.status === 'success') {
                Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'Agendamiento registrado correctamente.', customClass: swalDark });
                modalAgendamiento.hide();
                // Refrescar la lista para mostrar el nuevo item
                cargarAgendamientosDeHoy();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error al Guardar', text: error.message, customClass: swalDark });
        }
    });

    /**
     * Limpiar el modal de agendamiento cuando se cierra
     */
    modalAgendamientoElement.addEventListener('hidden.bs.modal', () => {
        formAgendamiento.reset(); // Limpia todos los campos (IF, fecha, hora, etc.)
        agendamientoIfSearchResultsCard.classList.add('d-none'); // Oculta el formulario de autocompletado
        btnGuardarAgendamiento.disabled = true; // Deshabilita el botón de guardar
        agendamientoIfSearchLoader.classList.add('d-none');
        agendamientoIfSearchBtn.disabled = false;
    });


    // --- [INICIO: LÓGICA DE BÚSQUEDA Y VISUALIZACIÓN DE AGENDAMIENTOS (NUEVO)] ---

    /**
     * Carga agendamientos por fecha y los muestra en el 'realtime box'
     * (Req 4: Cargar "Hoy" / Req 5: Cargar desde calendario)
     */
    async function cargarAgendamientosPorFecha(fechaISO) {
        agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">Buscando...</p>';
        const payload = {
            action: "getAgendamientosPorFecha",
            user: loggedInUser,
            fecha: fechaISO // ej: "2025-11-07"
        };
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();
            if (data.status === 'success') {
                renderAgendamientos(data.results);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            agendamientoRealtimeBox.innerHTML = `<p class="text-danger">Error al cargar agendamientos: ${error.message}</p>`;
        }
    }

    /**
     * Carga agendamientos por N° de IF
     * (Req 2: Búsqueda)
     */
    async function buscarAgendamientosPorIF() {
        const searchTerm = agendamientoSearchInput.value.trim();
        if (!searchTerm) {
            // Si la búsqueda está vacía, mostrar los de hoy
            cargarAgendamientosDeHoy();
            return;
        }
        agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">Buscando por IF...</p>';
        const payload = {
            action: "buscarAgendamientos",
            user: loggedInUser,
            searchTerm: searchTerm
        };
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();
            if (data.status === 'success') {
                renderAgendamientos(data.results);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            agendamientoRealtimeBox.innerHTML = `<p class="text-danger">Error al buscar: ${error.message}</p>`;
        }
    }

    /**
     * Dibuja los resultados del agendamiento en el 'realtime box'
     * (Función de ayuda para Req 2, 4, 5)
     *
     * --- [INICIO: ARREGLO ERROR 2 (DISEÑO)] ---
     */
    function renderAgendamientos(results) {
        if (!results || results.length === 0) {
            agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">No se encontraron agendamientos.</p>';
            return;
        }
        // Limpiar el contenedor
        agendamientoRealtimeBox.innerHTML = '';
        
        // Ordenar por hora
        results.sort((a, b) => (a.hora_audiencia > b.hora_audiencia) ? 1 : -1); 

        results.forEach(item => {
            // Formatear fecha (la fecha viene de la DB como string ISO)
            const fechaAudiencia = new Date(item.fecha_audiencia);
            const fechaFormateada = fechaAudiencia.toLocaleDateString('es-EC', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
            
            // Arreglo para la hora (el backend ya la formatea)
            const horaFormateada = item.hora_audiencia;
            
            const card = document.createElement('div');
            // Usar la nueva clase CSS que definimos en `style.css`
            card.className = 'agendamiento-card-item'; 
            
            // Poner la fecha en el formato YYYY-MM-DD para el modal de reagendar
            const fechaISO = fechaAudiencia.toISOString().split('T')[0];

            // Esta es la nueva estructura HTML que usa las clases CSS
            card.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5>${horaFormateada} - ${item.delito}</h5>
                    <button class="btn btn-outline-info btn-sm btn-reagendar" 
                            data-id="${item.agendamiento_id}" 
                            data-if-nro="${item.if_nro}"
                            data-fecha="${fechaISO}"
                            data-hora="${horaFormateada}"
                            title="Reagendar">
                        <i class="fa-solid fa-calendar-check" style="pointer-events: none;"></i>
                    </button>
                </div>
                <p><strong>IF:</strong> ${item.if_nro}</p>
                <p><strong>Detenido:</strong> ${item.detenido}</p>
                <p><strong>Fiscal:</strong> ${item.fiscal} (${item.fiscalia})</p>
                <small>Agendado para: ${fechaFormateada}</small>
            `;
            agendamientoRealtimeBox.appendChild(card);
        });
    }
    // --- [FIN: ARREGLO ERROR 2 (DISEÑO)] ---


    /**
     * Obtiene la fecha de HOY en formato YYYY-MM-DD (usando la zona horaria local)
     */
    function getTodayISO() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function cargarAgendamientosDeHoy() {
        const hoyISO = getTodayISO();
        agendamientoCalendarioInput.value = hoyISO; // Sincronizar calendario
        cargarAgendamientosPorFecha(hoyISO);
    }

    // --- Listeners para la Pestaña Agendamiento ---

    // Req 2: Búsqueda por IF
    agendamientoSearchBtn.addEventListener('click', buscarAgendamientosPorIF);

    // Req 4: Botón "Mostrar Hoy"
    btnMostrarHoy.addEventListener('click', cargarAgendamientosDeHoy);

    // Req 5: Input del Calendario
    agendamientoCalendarioInput.addEventListener('change', () => {
        const fechaSeleccionada = agendamientoCalendarioInput.value;
        if(fechaSeleccionada) {
            cargarAgendamientosPorFecha(fechaSeleccionada);
        }
    });

    // Req 3 (Inicio): Cargar agendamientos de hoy cuando se muestra la pestaña
    agendamientoTab.addEventListener('shown.bs.tab', () => {
        cargarAgendamientosDeHoy();
    });
    // Cargar también al inicio si es la pestaña activa
    if (agendamientoTab.classList.contains('active')) {
        cargarAgendamientosDeHoy();
    }

    // Req 3 (Modal Reagendar): Abrir el modal de reagendar
    agendamientoRealtimeBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-reagendar');
        if (!btn) return;

        const id = btn.dataset.id;
        const ifNro = btn.dataset.ifNro;
        const fecha = btn.dataset.fecha;
        const hora = btn.dataset.hora;
        
        // Llenar el modal de reagendar
        reagendarIdInput.value = id;
        reagendarIfDisplay.textContent = ifNro;
        reagendarFecha.value = fecha;
        reagendarHora.value = hora;
        
        // Mostrar el modal
        modalReagendar.show();
    });

    // Req 3 (Guardar Reagenda): Guardar los cambios de la reagenda
    btnActualizarReagenda.addEventListener('click', async () => {
        const id = reagendarIdInput.value;
        const nuevaFecha = reagendarFecha.value;
        const nuevaHora = reagendarHora.value;

        if (!nuevaFecha || !nuevaHora) {
            Swal.fire({ icon: 'warning', title: 'Campos Vacíos', text: 'Debe seleccionar una nueva fecha y hora.', customClass: swalDark });
            return;
        }

        Swal.fire({
            title: 'Reagendando...',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => Swal.showLoading()
        });

        const payload = {
            action: "reagendarAudiencia",
            user: loggedInUser,
            agendamiento_id: id,
            nueva_fecha: nuevaFecha,
            nueva_hora: nuevaHora
        };

        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();

            if (data.status === 'success') {
                Swal.fire({ icon: 'success', title: 'Actualizado', text: data.message, customClass: swalDark });
                modalReagendar.hide();
                // Refrescar la vista actual (ya sea "hoy" o la fecha del calendario)
                const fechaCalendario = agendamientoCalendarioInput.value;
                if (fechaCalendario) {
                    cargarAgendamientosPorFecha(fechaCalendario);
                } else {
                    cargarAgendamientosDeHoy();
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, customClass: swalDark });
        }
    });

    // --- [FIN: LÓGICA DE BÚSQUEDA Y VISUALIZACIÓN DE AGENDAMIENTOS] ---


    /* ==========================================================
       FIN: LÓGICA PESTAÑA "AGENDAMIENTO"
       ========================================================== */


});