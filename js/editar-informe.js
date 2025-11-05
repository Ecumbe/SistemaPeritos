// Se ejecuta cuando todo el HTML de editar-informe.html está cargado
document.addEventListener("DOMContentLoaded", () => {

    // --- 0. URL DE LA API Y DATOS DE USUARIO ---
    // Leemos la URL de la API que guardamos en el localStorage desde app.js
    const GAS_API_URL = localStorage.getItem("GAS_API_URL");
    const loggedInUser = localStorage.getItem("sistemaPeritosUser");
    const loggedInFullName = localStorage.getItem("sistemaPeritosFullName");
    
    // --- Constantes de Estilo ---
    const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };

    // --- Elementos Globales ---
    const pageLoader = document.getElementById('page-loader');
    const editorContent = document.getElementById('editor-content');
    const userGreeting = document.getElementById('user-greeting-edit');
    const btnRegresarApp = document.getElementById('btn-regresar-app');
    
    // --- 1. VERIFICACIÓN DE SEGURIDAD ---
    if (!GAS_API_URL || !loggedInUser || !loggedInFullName) {
        Swal.fire({
            icon: 'error', title: 'Error de Autenticación',
            text: 'No se pudieron cargar los datos de la sesión. Por favor, cierre esta pestaña e inicie sesión de nuevo.',
            customClass: swalDark
        });
        pageLoader.style.display = 'none';
        return;
    }

    // Personalizar saludo
    userGreeting.innerHTML = `<i class="fa-solid fa-user-check"></i> Editando como: <strong>${loggedInFullName}</strong>`;

    // Botón para cerrar la ventana
    btnRegresarApp.addEventListener('click', () => {
        Swal.fire({
            title: '¿Cerrar el editor?',
            text: "Cualquier cambio no guardado se perderá.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar',
            customClass: swalDark
        }).then((result) => {
            if (result.isConfirmed) {
                window.close();
            }
        });
    });

    // --- 2. OBTENER ID DEL INFORME DESDE LA URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const reporteIdParaEditar = urlParams.get('id');

    if (!reporteIdParaEditar) {
        Swal.fire({
            icon: 'error', title: 'Error',
            text: 'No se especificó un ID de informe para editar. Cierre esta pestaña.',
            customClass: swalDark
        });
        pageLoader.style.display = 'none';
        return;
    }

    /* ==========================================================
       LÓGICA DEL WIZARD DE EDICIÓN
       ========================================================== */
    const step2Div = document.getElementById('wizard-step-2');
    const step3Div = document.getElementById('wizard-step-3');
    const step4Div = document.getElementById('wizard-step-4');

    // --- Navegación del Wizard (CON CORRECCIÓN DE LÓGICA) ---
    document.getElementById('btn-continuar-paso3').addEventListener('click', () => {
        actualizarCamposPaso3DesdePaso2();
        
        step2Div.classList.add('d-none');
        step3Div.classList.remove('d-none');
        step4Div.classList.add('d-none');
    });

    document.getElementById('btn-regresar-paso2').addEventListener('click', () => {
        step2Div.classList.remove('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.add('d-none');
    });
    document.getElementById('btn-continuar-paso4').addEventListener('click', () => {
        step2Div.classList.add('d-none');
        step3Div.classList.add('d-none');
        step4Div.classList.remove('d-none');
    });
    document.getElementById('btn-regresar-paso3').addEventListener('click', () => {
        step2Div.classList.add('d-none');
        step3Div.classList.remove('d-none');
        step4Div.classList.add('d-none');
    });

    // --- 3. FUNCIÓN PRINCIPAL: CARGAR DATOS DEL INFORME ---
    (async function cargarDatosDelInforme() {
        try {
            const payload = {
                action: "cargarInformeParaEditar",
                reportId: reporteIdParaEditar,
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
                popularFormularioPaso2(data.informeData);
                popularFormularioPaso3(data.informeData);
                popularFormularioPaso4(data.fotosData);
                
                // Guardamos los datos de flagrancia ORIGINALES en localStorage
                const datosFlag = {
                    if_number: data.informeData.IF_Numero,
                    delito: data.informeData.IF_Delito,
                    detenido: data.informeData.IF_Detenido,
                    fiscal: data.informeData.IF_Fiscal,
                    unidad_fiscalia: data.informeData.IF_Unidad,
                    grado: data.informeData.IF_Grado,
                    agente: data.informeData.IF_Agente,
                    fecha_infraccion: data.informeData.Tabla_Fecha_Aprehension || formatearFechaLarga(new Date()),
                    fecha_delegacion: data.informeData.Cuerpo_Fecha_Referencia || formatearFechaLarga(new Date())
                };
                localStorage.setItem('datosFlagrancia', JSON.stringify(datosFlag));

                pageLoader.style.display = 'none';
                editorContent.style.visibility = 'visible';
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error', title: 'Error al Cargar',
                text: `No se pudo cargar el informe: ${error.message}. Cierre esta pestaña.`,
                customClass: swalDark
            });
            pageLoader.querySelector('h4').textContent = 'Error al Cargar';
            pageLoader.querySelector('p').textContent = error.message;
        }
    })();


    // --- 4. FUNCIONES PARA RELLENAR LOS FORMULARIOS ---
    
    function popularFormularioPaso2(data) {
        document.getElementById('oficio-anio').value = data.OficioAnio;
        document.getElementById('oficio-numero').value = data.OficioNumero;
        document.getElementById('oficio-fecha').value = data.OficioFecha;
        document.getElementById('oficio-asunto-numero').value = data.OficioAsunto;
        document.getElementById('oficio-tratamiento').value = data.OficioTratamiento;
        document.getElementById('oficio-fiscal-nombre').value = data.OficioFiscalNombre;
        document.getElementById('oficio-fiscal-unidad').value = data.OficioFiscalUnidad;
        document.getElementById('oficio-agente-nombre').value = data.OficioAgenteNombre;
        document.getElementById('oficio-agente-grado').value = data.OficioAgenteGrado;

        actualizarCuerpoOficio(data.Tabla_IF_Nro, data.IF_Detenido, data.IF_Delito);
        
        const step2Inputs = document.querySelectorAll('#wizard-step-2 input, #wizard-step-2 select');
        step2Inputs.forEach(input => {
            input.addEventListener('input', showNavButtons);

            if (['oficio-anio', 'oficio-numero', 'oficio-fecha', 'oficio-asunto-numero'].includes(input.id)) {
                 input.addEventListener('input', () => actualizarCuerpoOficio(
                    document.getElementById('tabla-if-nro').value, 
                    document.getElementById('tabla-procesado').value, 
                    document.getElementById('tabla-delito').value 
                 ));
            }
        });
    }

    function popularFormularioPaso3(data) {
        document.getElementById('tabla-if-nro').value = data.Tabla_IF_Nro;
        document.getElementById('tabla-fecha-informe').value = data.Tabla_Fecha_Informe;
        document.getElementById('tabla-informe-nro').value = data.Tabla_Informe_Nro;
        document.getElementById('tabla-delito').value = data.Tabla_Delito;
        document.getElementById('tabla-lugar-hechos').value = data.Tabla_Lugar_Hechos;
        document.getElementById('tabla-fecha-aprehension').value = data.Tabla_Fecha_Aprehension;
        document.getElementById('tabla-agente-fiscal').value = data.Tabla_Agente_Fiscal;
        document.getElementById('tabla-procesado').value = data.Tabla_Procesado;
        document.getElementById('tabla-ref-oficio').value = data.Tabla_Ref_Oficio;
        document.getElementById('tabla-perito').value = data.Tabla_Perito;
        document.getElementById('tabla-cod-reg').value = data.Tabla_Cod_Reg;

        document.getElementById('informe-referencia').value = data.Cuerpo_Referencia;
        document.getElementById('informe-fecha-referencia').value = data.Cuerpo_Fecha_Referencia;
        document.getElementById('informe-objeto').value = data.Cuerpo_Objeto;
        document.getElementById('informe-fundamentos-tecnicos').value = data.Cuerpo_FundamentosTecnicos;
        document.getElementById('informe-fundamentos-legales').value = data.Cuerpo_FundamentosLegales;
        document.getElementById('informe-reconocimiento').value = data.Cuerpo_Reconocimiento;
        document.getElementById('informe-conclusiones').value = data.Cuerpo_Conclusiones;

        const step3Inputs = document.querySelectorAll('#wizard-step-3 input, #wizard-step-3 textarea');
        step3Inputs.forEach(input => {
            input.addEventListener('input', showNavButtons);
        });
    }

    function popularFormularioPaso4(fotos) {
        const laminasContainer = document.getElementById('laminas-container');
        const templateLamina = document.getElementById('template-lamina');
        const templateFoto = document.getElementById('template-foto');
        laminasContainer.innerHTML = ''; 

        const laminas = {}; 

        fotos.forEach(foto => {
            if (!laminas[foto.LaminaNum]) {
                laminas[foto.LaminaNum] = [];
            }
            laminas[foto.LaminaNum].push(foto);
        });

        const laminasOrdenadas = Object.keys(laminas).sort((a, b) => a - b);

        for (const laminaNum of laminasOrdenadas) {
            const laminaClone = templateLamina.content.cloneNode(true);
            const laminaCard = laminaClone.querySelector('.lamina-card');
            laminaCard.querySelector('.lamina-numero').textContent = laminaNum;
            const fotosContainer = laminaCard.querySelector('.lamina-fotos-container');
            
            laminas[laminaNum].forEach(foto => {
                const fotoClone = templateFoto.content.cloneNode(true);
                const fotoCard = fotoClone.querySelector('.foto-card');
                const previewImg = fotoCard.querySelector('.foto-preview');
                const descripcion = fotoCard.querySelector('.foto-descripcion');
                
                fotoCard.dataset.laminaNum = laminaNum;
                fotoCard.querySelector('.foto-title-input').value = foto.Titulo;
                descripcion.value = foto.Descripcion;
                
                if (foto.Descripcion) {
                    const resumenBtn = fotoCard.querySelector('.btn-agregar-descripcion');
                    resumenBtn.textContent = foto.Descripcion.substring(0, 40) + "…";
                }

                if(foto.Base64Data) {
                    previewImg.src = foto.Base64Data;
                    previewImg.dataset.base64 = foto.Base64Data;
                } else {
                    previewImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAwAB/AUF2kAAAAASUVORK5CYII=";
                    previewImg.dataset.base64 = "error";
                }

                fotoCard.querySelector('.foto-spinner').classList.add('d-none');
                fotosContainer.appendChild(fotoClone);
            });

            laminasContainer.appendChild(laminaClone);
        }
    }

    // --- 5. LÓGICA DE ACTUALIZACIÓN/CLONACIÓN (Tu nueva idea) ---
    
    document.getElementById('btn-actualizar-flagrancia').addEventListener('click', async () => {
        const ifInput = document.getElementById('tabla-if-nro');
        const ifNumber = ifInput.value.trim();
        const loader = document.getElementById('if-update-loader');
        
        if (!ifNumber) {
            Swal.fire({ icon: 'error', title: 'Campo Vacío', text: 'Por favor, ingrese un N° de Instrucción Fiscal.', customClass: swalDark });
            return;
        }

        loader.classList.remove('d-none');
        
        try {
            const payload = { action: "buscarFlagrancia", ifNumber: ifNumber };
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });
            const data = await response.json();
            
            loader.classList.add('d-none');
            
            if (data.status === 'success') {
                const d = data.data;
                // Actualizar SÓLO los campos del formulario.
                document.getElementById('tabla-delito').value = d.delito;
                document.getElementById('tabla-agente-fiscal').value = d.fiscal;
                document.getElementById('tabla-procesado').value = d.detenido;
                
                document.getElementById('oficio-fiscal-nombre').value = d.fiscal;
                document.getElementById('oficio-fiscal-unidad').value = d.unidad_fiscalia;
                document.getElementById('oficio-agente-nombre').value = d.agente;
                document.getElementById('oficio-agente-grado').value = d.grado.toUpperCase();

                document.getElementById('tabla-fecha-aprehension').value = d.fecha_infraccion || formatearFechaLarga(new Date());
                document.getElementById('informe-fecha-referencia').value = d.fecha_delegacion || formatearFechaLarga(new Date());
                
                actualizarCuerpoOficio(ifNumber, d.detenido, d.delito);

                Swal.fire({ icon: 'success', title: 'Datos Precargados', text: 'Los campos de detenido, delito y fiscal han sido actualizados en el formulario.', customClass: swalDark });
            } else {
                Swal.fire({ icon: 'error', title: 'Error en la Búsqueda', text: data.message, customClass: swalDark });
            }
        } catch (error) {
            loader.classList.add('d-none');
            Swal.fire({ icon: 'error', title: 'Error de Conexión', text: error.message, customClass: swalDark });
        }
    });

    // --- 6. FUNCIONES DE AYUDA (copiadas de app.js) ---
    
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

    function actualizarCuerpoOficio(ifNro, detenido, delito) {
        const anio = document.getElementById('oficio-anio').value;
        const numero = document.getElementById('oficio-numero').value;
        const fecha = document.getElementById('oficio-fecha').value;
        const asuntoNumero = document.getElementById('oficio-asunto-numero').value;

        document.getElementById('cuerpo-oficio-nro').textContent = `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`;
        document.getElementById('cuerpo-oficio-fecha').textContent = fecha;
        document.getElementById('cuerpo-oficio-asunto').textContent = `FPG-FEIFO${asuntoNumero}`;
        
        if(ifNro) document.getElementById('cuerpo-if-nro').textContent = ifNro;
        if(detenido) document.getElementById('cuerpo-detenido-nombre').textContent = detenido;
        if(delito) document.getElementById('cuerpo-delito-nombre').textContent = delito;
    }

    // --- Esta función actualiza los campos del Paso 3 ---
    function actualizarCamposPaso3DesdePaso2() {
        const anio = document.getElementById('oficio-anio').value;
        const numero = document.getElementById('oficio-numero').value;
        const fecha = document.getElementById('oficio-fecha').value;
        const refOficioNum = document.getElementById('oficio-asunto-numero').value;
        const agenteNombre = document.getElementById('oficio-agente-nombre').value;
        const agenteGrado = document.getElementById('oficio-agente-grado').value;

        // Actualizar los campos readonly del Paso 3
        document.getElementById('tabla-fecha-informe').value = fecha;
        document.getElementById('tabla-informe-nro').value = `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`;
        document.getElementById('tabla-ref-oficio').value = `FPG-FEIFO${refOficioNum}`;
        document.getElementById('tabla-perito').value = `${agenteGrado} DE POLICIA ${agenteNombre}`;
    }

    /* ==========================================================
       7. LÓGICA DE FOTOS (Copiada de app.js)
       ========================================================== */
    const laminasContainer = document.getElementById('laminas-container');
    const templateLamina = document.getElementById('template-lamina');
    const templateFoto = document.getElementById('template-foto');

    document.getElementById('btn-agregar-lugar').addEventListener('click', () => {
        showNavButtons();
        const laminaClone = templateLamina.content.cloneNode(true);
        laminasContainer.appendChild(laminaClone);
        updateLaminaNumbers();
    });

    laminasContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-eliminar-lamina')) {
            showNavButtons();
            e.target.closest('.lamina-card').remove();
            updateLaminaNumbers();
        }
        if (e.target.closest('.btn-eliminar-foto')) {
            showNavButtons();
            const laminaCard = e.target.closest('.lamina-card');
            e.target.closest('.foto-card').remove();
            updatePhotoNumbers(laminaCard);
        }
        
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
            await processAndDisplayImage(file, fotosContainer, laminaNum); // Usar la función reutilizable
        }
    }
    
    // --- [INICIO: LÓGICA PARA PEGAR (COPIADA DE APP.JS Y CORREGIDA)] ---
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
        // Usamos document.activeElement para saber qué tiene el foco
        const activeElement = document.activeElement;
        const targetTag = activeElement ? activeElement.tagName : null;
        
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
    // --- [FIN: LÓGICA PARA PEGAR (COPIADA DE APP.JS Y CORREGIDA)] ---


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
       8. LÓGICA DE GUARDADO
       ========================================================== */
    
    const btnGuardarYSubir = document.getElementById('btn-guardar-y-subir-fotos');
    const btnImprimirDocumento = document.getElementById('btn-imprimir-documento');
    let currentReportId = reporteIdParaEditar; 

    function showNavButtons() {
        btnImprimirDocumento.classList.add('d-none');
        btnGuardarYSubir.classList.remove('d-none'); 
    }
    
    function showPostSaveButtons(reportId) {
        btnImprimirDocumento.classList.remove('d-none');
        btnGuardarYSubir.classList.remove('d-none'); 
        currentReportId = reportId; 
    }

    editorContent.addEventListener('input', showNavButtons);
    

    document.getElementById('btn-guardar-y-subir-fotos').addEventListener('click', async () => {
        Swal.fire({
            title: 'Guardando Cambios...',
            text: 'Etapa 1 de 2: Guardando datos de texto.',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => Swal.showLoading()
        });

        // Actualizar los campos del Paso 3 ANTES de recolectar los datos
        actualizarCamposPaso3DesdePaso2();

        const textData = gatherAllTextData();
        let reportId;
        try {
            reportId = await saveTextData(textData);
            if (!reportId) throw new Error("No se recibió Report ID.");
            
            const photos = await gatherAllPhotoData();
            if (photos.length > 0) {
                Swal.update({ title: 'Subiendo Fotos...', text: `Etapa 2 de 2: ${photos.length} fotos.` });
                await uploadAllPhotos(reportId, photos);
            }
            
            Swal.fire({
                icon: 'success',
                title: '¡Cambios Guardados!',
                text: `Informe ${reportId} actualizado/creado correctamente.`,
                customClass: swalDark
            }).then(() => {
                showPostSaveButtons(reportId);
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error al Guardar', text: error.message, customClass: swalDark });
        }
    });

    
    function gatherAllTextData() {
        const datosFlagranciaOriginales = JSON.parse(localStorage.getItem('datosFlagrancia'));
        
        // Creamos un nuevo objeto 'datosFlagrancia' basado en lo que está en el formulario
        const datosFlagranciaFormulario = {
            // Leemos del formulario
            if_number: document.getElementById('tabla-if-nro').value,
            delito: document.getElementById('tabla-delito').value,
            detenido: document.getElementById('tabla-procesado').value,
            fiscal: document.getElementById('tabla-agente-fiscal').value,
            unidad_fiscalia: document.getElementById('oficio-fiscal-unidad').value,
            grado: document.getElementById('oficio-agente-grado').value,
            agente: document.getElementById('oficio-agente-nombre').value,
            
            // Usamos el IF_Numero original (del Paso 1) como respaldo
            IF_Numero: datosFlagranciaOriginales ? datosFlagranciaOriginales.if_number : document.getElementById('tabla-if-nro').value
        };

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
        
        return { datosFlagrancia: datosFlagranciaFormulario, datosOficio: datosOficio, datosCuerpo: datosCuerpo };
    }
    
    
    async function gatherAllPhotoData() {
        const photos = [];
        const allFotoCards = laminasContainer.querySelectorAll('.foto-card');
        
        for (const card of allFotoCards) {
            const img = card.querySelector('.foto-preview');
            const descripcion = card.querySelector('.foto-descripcion').value;
            const titulo = card.querySelector('.foto-title-input').value;
            
            let base64 = img.dataset.base64; 

            if (!base64.startsWith('data:image')) {
                base64 = img.src;
            }
            
            photos.push({
                laminaNum: card.dataset.laminaNum,
                base64: base64,
                titulo: titulo,
                descripcion: descripcion
            });
        }
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
                console.warn(`Omitiendo foto ${i+1} (datos base64 inválidos o URL)`);
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
    
    // --- Lógica de Impresión (Copiada de app.js) ---
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
    
    // Función de ayuda para formatear la fecha
    function formatearFechaLarga(date) {
        // Asegurarse de que sea un objeto Date
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        // Comprobar si la fecha es válida
        if (isNaN(date.getTime())) {
            return ""; // Devolver vacío si es inválida
        }
        // [CORRECCIÓN ZONA HORARIA] Usar UTC para leer la fecha
        const options = { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' };
        const fechaFormateada = date.toLocaleDateString('es-EC', options);
        return `Guayaquil, ${fechaFormateada}`;
    }

});
