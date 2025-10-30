// Se ejecuta cuando todo el HTML de app.html está cargado
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 0. URL DE LA API (DEBE COINCIDIR CON login.js) ---
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEoCUDULpDjzYKQIWe5wNlNaV8apLx035sy1T-LQTrpl2e59YH0i0n2LlJjIOovIuF/exec";

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

    // --- 3. LÓGICA DE CERRAR SESIÓN ---
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
       LÓGICA PESTAÑA "BUSCAR" (La que ya tenías)
       ========================================================== */
    const searchForm = document.getElementById("search-form");
    const searchResultsContainer = document.getElementById("search-results-container");
    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault(); 
            console.log("Buscando..."); 
            searchResultsContainer.style.display = "block";
            // ... TAREA PENDIENTE ...
        });
    }

    /* ==========================================================
       LÓGICA DEL WIZARD "NUEVO INFORME" (PASO 1 Y PASO 2)
       ========================================================== */

    const step1Div = document.getElementById('wizard-step-1');
    const step2Div = document.getElementById('wizard-step-2');
    const swalDark = {
        popup: 'bg-dark text-white',
        title: 'text-white',
        content: 'text-white-50'
    };

    // --- Lógica del PASO 1: Búsqueda de Flagrancia ---
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
            headers: { 'Content-Type': 'text-plain;charset=utf-8' },
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

    // --- Transición del PASO 1 al PASO 2 ---
    btnContinuarPaso1.addEventListener('click', () => {
        step1Div.classList.add('d-none');
        step2Div.classList.remove('d-none');
        popularFormularioPaso2();
    });

    // --- Botón para regresar al PASO 1 ---
    document.getElementById('btn-regresar-paso1').addEventListener('click', () => {
        step2Div.classList.add('d-none');
        step1Div.classList.remove('d-none');
    });

    // --- ¡¡LÓGICA DE GUARDADO ACTUALIZADA!! ---
    document.getElementById('btn-guardar-paso2').addEventListener('click', () => {
        
        // 1. Mostrar alerta de "Guardando..."
        Swal.fire({
            title: 'Guardando Informe',
            text: 'Por favor espera...',
            allowOutsideClick: false,
            customClass: swalDark,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 2. Recolectar TODOS los datos del formulario
        const datosPaso2 = {
            // Datos del Paso 1 (guardados en localStorage)
            datosFlagrancia: JSON.parse(localStorage.getItem('datosFlagrancia')),
            
            // Datos del Formulario (Paso 2)
            oficioAnio: document.getElementById('oficio-anio').value,
            oficioNumero: document.getElementById('oficio-numero').value,
            oficioFecha: document.getElementById('oficio-fecha').value,
            oficioAsunto: document.getElementById('oficio-asunto-numero').value,
            oficioTratamiento: document.getElementById('oficio-tratamiento').value,
            oficioFiscalNombre: document.getElementById('oficio-fiscal-nombre').value,
            oficioFiscalUnidad: document.getElementById('oficio-fiscal-unidad').value,
            oficioAgenteNombre: document.getElementById('oficio-agente-nombre').value,
            oficioAgenteGrado: document.getElementById('oficio-agente-grado').value,
            
            // Usuario que lo crea
            creadoPor: loggedInUser
        };

        // 3. Crear el payload para enviar a Google Apps Script
        const payload = {
            action: "guardarDatosPaso2",
            datos: datosPaso2
        };

        // 4. Enviar los datos al backend
        fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: '¡Guardado con Éxito!',
                    text: `El informe ha sido guardado con el ID: ${data.reportId}`,
                    customClass: swalDark
                });
                
                // Guardamos el ID del informe para los siguientes pasos
                localStorage.setItem('currentReportId', data.reportId);
                
                // (En el futuro, aquí ocultaríamos el Paso 2 y mostraríamos el Paso 3)
                // Por ahora, solo cerramos la alerta.

            } else {
                Swal.fire({ icon: 'error', title: 'Error al Guardar', text: data.message, customClass: swalDark });
            }
        })
        .catch(error => {
            console.error('Error al guardar:', error);
            Swal.fire({ icon: 'error', title: 'Error de Conexión', text: 'No se pudo guardar el informe.', customClass: swalDark });
        });
    });


    /**
     * Rellena el formulario del Paso 2 con los datos del localStorage.
     */
    function popularFormularioPaso2() {
        const datos = JSON.parse(localStorage.getItem('datosFlagrancia'));
        if (!datos) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se encontraron datos de flagrancia.', customClass: swalDark });
            document.getElementById('btn-regresar-paso1').click();
            return;
        }

        document.getElementById('oficio-anio').value = new Date().getFullYear();
        document.getElementById('oficio-fecha').value = formatearFecha(new Date());

        // --- AUTORELLENO ACTUALIZADO (Punto 4) ---
        // Rellena los campos pero NO los bloquea
        document.getElementById('oficio-fiscal-nombre').value = datos.fiscal.trim();
        document.getElementById('oficio-fiscal-unidad').value = datos.unidad_fiscalia.trim();

        // (Punto 5)
        document.getElementById('cuerpo-if-nro').textContent = datos.if_number;
        document.getElementById('cuerpo-detenido-nombre').textContent = datos.detenido.trim();
        document.getElementById('cuerpo-delito-nombre').textContent = datos.delito.trim();

        // (Punto 6)
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
        
        actualizarCuerpoOficio();

        // "Listeners" para que el cuerpo se actualice si el usuario edita
        document.getElementById('oficio-anio').addEventListener('input', actualizarCuerpoOficio);
        document.getElementById('oficio-numero').addEventListener('input', actualizarCuerpoOficio);
        document.getElementById('oficio-fecha').addEventListener('input', actualizarCuerpoOficio);
    }

    /**
     * Actualiza el texto del Punto 5 (Cuerpo) basado en los campos del formulario.
     */
    function actualizarCuerpoOficio() {
        const anio = document.getElementById('oficio-anio').value;
        const numero = document.getElementById('oficio-numero').value;
        const fecha = document.getElementById('oficio-fecha').value;
        
        document.getElementById('cuerpo-oficio-nro').textContent = `PN-ZONA8-JINVPJ-UDF-${anio}-${numero}`;
        document.getElementById('cuerpo-oficio-fecha').textContent = fecha;
    }


    /**
     * Formatea la fecha al estilo "Guayaquil, 03 de octubre del 2025"
     */
    function formatearFecha(date) {
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        const fechaFormateada = date.toLocaleDateString('es-EC', options);
        return `Guayaquil, ${fechaFormateada}`;
    }

    /* ==========================================================
       LÓGICA DE PESTAÑAS (la que ya tenías)
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