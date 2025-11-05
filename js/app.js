// Se ejecuta cuando todo el HTML de app.html está cargado
document.addEventListener("DOMContentLoaded", () => {

    // --- 0. URL DE LA API ---
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzZorOIGmW2hijo4g4ydwdegqESyvW0iWSDovlnbtIPAia8snyAz06Y97SSX-gg10LX7g/exec";

    // --- 1. VERIFICACIÓN DE SEGURIDAD ---
    const loggedInUser = localStorage.getItem("sistemaPeritosUser");
    if (!loggedInUser) {
        alert("Acceso denegado. Debes iniciar sesión.");
        window.location.href = "index.html";
        return;
    }

    // --- 2. PERSONALIZACIÓN DE LA PÁGINA ---
    const userGreeting = document.getElementById("user-greeting");
    userGreeting.innerHTML = `<i class="fa-solid fa-user-check"></i> Bienvenido, <strong>${loggedInUser}</strong>`;

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
            customClass: { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' }
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem("sistemaPeritosUser");
                window.location.href = "index.html";
            }
        });
    });

    /* ==========================================================
       LÓGICA PESTAÑA "BUSCAR"
       ========================================================== */
    const searchForm = document.getElementById("search-form");
    const searchResultsContainer = document.getElementById("search-results-container");
    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log("Buscando...");
            searchResultsContainer.style.display = "block";
        });
    }

    /* ==========================================================
       LÓGICA DEL WIZARD "NUEVO INFORME"
       ========================================================== */

    const step1Div = document.getElementById('wizard-step-1');
    const step2Div = document.getElementById('wizard-step-2');
    const step3Div = document.getElementById('wizard-step-3');
    const step4Div = document.getElementById('wizard-step-4');
    const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };

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
        showNavButtons(); // <-- [NUEVO] Ocultar botones post-save si regresa
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

    // --- [MODIFICADO] Selectores de botones del Paso 4 ---
    // Ya no usamos los DIVs contenedores, seleccionamos los botones directamente
    const btnRegresarPaso3 = document.getElementById('btn-regresar-paso3');
    const btnGuardarYSubir = document.getElementById('btn-guardar-y-subir-fotos');
    const btnNuevoInforme = document.getElementById('btn-nuevo-informe');
    const btnImprimirDocumento = document.getElementById('btn-imprimir-documento');
    // --- FIN DE LA MODIFICACIÓN ---

    // --- Variable global para guardar el ID del reporte
    let currentReportId = null; 

    // --- [MODIFICADO] Funciones para mostrar/ocultar botones del Paso 4
    function showNavButtons() {
        // Muestra los botones de navegación estándar
        btnRegresarPaso3.classList.remove('d-none');
        btnGuardarYSubir.classList.remove('d-none');
        
        // Oculta los botones post-guardado
        btnNuevoInforme.classList.add('d-none');
        btnImprimirDocumento.classList.add('d-none');
        
        currentReportId = null; // Si se muestran los botones de nav, se anula el ID guardado (requiere nuevo guardado)
    }
    
    function showPostSaveButtons(reportId) {
        // Muestra TODOS los botones
        btnRegresarPaso3.classList.remove('d-none');
        btnGuardarYSubir.classList.remove('d-none');
        btnNuevoInforme.classList.remove('d-none');
        btnImprimirDocumento.classList.remove('d-none');
        
        currentReportId = reportId; // Guardamos el ID para usarlo en la impresión
    }
    // --- FIN DE LA MODIFICACIÓN ---


    // --- [MODIFICADO] Detectar cambios para revertir botones ---
    document.getElementById('btn-agregar-lugar').addEventListener('click', () => {
        showNavButtons(); // <-- [CORREGIDO] Esto ahora funciona
        const laminaClone = templateLamina.content.cloneNode(true);
        laminasContainer.appendChild(laminaClone);
        updateLaminaNumbers();
    });

    laminasContainer.addEventListener('click', (e) => {
        // eliminar lamina
        if (e.target.closest('.btn-eliminar-lamina')) {
            showNavButtons(); // <-- Revertir botones si se edita
            e.target.closest('.lamina-card').remove();
            updateLaminaNumbers();
        }
        // eliminar foto
        if (e.target.closest('.btn-eliminar-foto')) {
            showNavButtons(); // <-- Revertir botones si se edita
            const laminaCard = e.target.closest('.lamina-card');
            e.target.closest('.foto-card').remove();
            updatePhotoNumbers(laminaCard);
        }
        // editar foto con PhotoEditor
        if (e.target.closest('.btn-editar-foto')) {
            const fotoCard = e.target.closest('.foto-card');
            const img = fotoCard.querySelector('.foto-preview');
            const descripcion = fotoCard.querySelector('.foto-descripcion');

            PhotoEditor.open({
                imgEl: img,
                onSave: ({ description }) => {
                    showNavButtons(); // <-- Revertir botones si se edita
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
    });

    laminasContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('lamina-file-input')) {
            showNavButtons(); // <-- Revertir botones si se edita
            handleFileInputChange(e);
        }
    });

    async function handleFileInputChange(event) {
        const files = event.target.files;
        const fotosContainer = event.target.closest('.card-body').querySelector('.lamina-fotos-container');
        const laminaNum = event.target.closest('.lamina-card').querySelector('.lamina-numero').textContent;

        for (const file of files) {
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
                const maxSizeInBytes = 1 * 1024 * 1024;
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

            } catch (error) {
                console.error(error);
                spinner.textContent = 'Error al procesar';
            }
        }
    }

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

            Swal.fire({
                icon: 'success',
                title: '¡Informe Guardado!',
                text: `Informe ${reportId} guardado correctamente.`,
                customClass: swalDark
            }).then((result) => {
                if (result.isConfirmed) {
                    showPostSaveButtons(reportId); // <-- Mostrar botones "Nuevo" e "Imprimir" (y los estándar)
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
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontró el ID del informe guardado.', customClass: swalDark });
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
            confirmButtonColor: '#d33', // Rojo para PDF
            denyButtonColor: '#3085d6', // Azul para Word
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
            text: 'Esto puede tomar un momento...',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => Swal.showLoading()
        });

        // --- ¡¡¡PENDIENTE!!! ---
        setTimeout(() => {
             Swal.fire({
                icon: 'error',
                title: 'Función Pendiente',
                text: 'La generación de documentos (PDF/WORD) aún no está implementada en el backend (Codigo.gs).',
                customClass: swalDark
            });
        }, 1500);
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

        showNavButtons(); // <-- Restaura solo los botones de navegación
        
        step1Div.classList.remove('d-none');
        step2Div.classList.add('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.add('d-none');
        
        new bootstrap.Tab(document.getElementById('nuevo-tab')).show();

        popularFormularioPaso2(true); 
        popularFormularioPaso3(); 
    }


    // --- FUNCIONES DE AYUDA DEL WIZARD (COMPLETAS) ---
    
    function popularFormularioPaso2(isReset = false) {
        const datos = JSON.parse(localStorage.getItem('datosFlagrancia'));
        
        if (!isReset) { 
            if (!datos) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontraron datos de flagrancia.', customClass: swalDark });
                document.getElementById('btn-regresar-paso1').click();
                return;
            }
            document.getElementById('oficio-fiscal-nombre').value = datos.fiscal;
            document.getElementById('oficio-fiscal-unidad').value = datos.unidad_fiscalia;
            document.getElementById('cuerpo-if-nro').textContent = datos.if_number;
            document.getElementById('cuerpo-detenido-nombre').textContent = datos.detenido.trim();
            document.getElementById('cuerpo-delito-nombre').textContent = datos.delito.trim();
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
            document.getElementById('cuerpo-if-nro').textContent = '...';
            document.getElementById('cuerpo-detenido-nombre').textContent = '...';
            document.getElementById('cuerpo-delito-nombre').textContent = '...';
            document.getElementById('oficio-agente-nombre').value = '';
            document.getElementById('oficio-agente-grado').selectedIndex = 0;
        }

        document.getElementById('oficio-anio').value = new Date().getFullYear();
        document.getElementById('oficio-fecha').value = formatearFecha(new Date());

        const step2Inputs = document.querySelectorAll('#wizard-step-2 input, #wizard-step-2 select');
        step2Inputs.forEach(input => {
            input.removeEventListener('input', showNavButtons); 
            input.addEventListener('input', showNavButtons); // <-- Cualquier cambio en el Paso 2 oculta los botones post-save
            
            if (['oficio-anio', 'oficio-numero', 'oficio-fecha'].includes(input.id)) {
                 input.removeEventListener('input', actualizarCuerpoOficio);
                 input.addEventListener('input', actualizarCuerpoOficio);
            }
        });

        actualizarCuerpoOficio();
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
        }

        const fechaActualFormateada = formatearFecha(new Date());
        if (!document.getElementById('tabla-fecha-aprehension').value)
            document.getElementById('tabla-fecha-aprehension').value = fechaActualFormateada;
        if (!document.getElementById('informe-fecha-referencia').value)
            document.getElementById('informe-fecha-referencia').value = fechaActualFormateada;

        const ft = `El reconocimiento del lugar  es un  acto procesal que se cumplen por orden de autoridad competente y previa posesión ante la misma, tiene como fin la percepción y comprobación de los efectos materiales que el hecho investigado hubiere dejado, mediante la fijación de la actividad, motivo de la diligencia, así como también la búsqueda minuciosa de indicios, huellas, rastros o vestigios que indicaran directamente la existencia de un delito, al tratarse de un hecho que no produjo efectos materiales, o hubiere sido alterado o el tiempo hubiese cambiado, se describirá el estado existente, para tal efecto se utilizara las técnicas de observación y fijación adecuadas a lo solicitado por la autoridad competente.`;
        if (document.getElementById('informe-fundamentos-tecnicos').value === "")
            document.getElementById('informe-fundamentos-tecnicos').value = ft;

        const fl = `El COIP en su Art. 460 sobre el Reconocimiento del Lugar de los hechos manifiesta: La o el fiscal con el apoyo del personal del Sistema especializado integral de investigación, de medicina legal y ciencias forenses, o el personal competente en materia de tránsito, cuando sea relevante para la investigación, reconocerá el lugar de los hechos.`;
        if (document.getElementById('informe-fundamentos-legales').value === "")
            document.getElementById('informe-fundamentos-legales').value = fl;

        const step3Inputs = document.querySelectorAll('#wizard-step-3 input, #wizard-step-3 textarea');
        step3Inputs.forEach(input => {
            input.removeEventListener('input', showNavButtons); 
            input.addEventListener('input', showNavButtons); // <-- Cualquier cambio en el Paso 3 oculta los botones post-save
        });
    }

    function actualizarCuerpoOficio() {
        const anio = document.getElementById('oficio-anio').value;
        const numero = document.getElementById('oficio-numero').value;
        const fecha = document.getElementById('oficio-fecha').value;
        document.getElementById('cuerpo-oficio-nro').textContent = `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`;
        document.getElementById('cuerpo-oficio-fecha').textContent = fecha;
    }

    function formatearFecha(date) {
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        const fechaFormateada = date.toLocaleDateString('es-EC', options);
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
});
