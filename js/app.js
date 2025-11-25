// js/app.js
// Orquestador general: sesión, dashboard, búsqueda, tabs, agendamiento, y arranque del Wizard.

document.addEventListener("DOMContentLoaded", () => {

  // =================================================================
  // 0. CONFIGURACIÓN INICIAL
  // =================================================================
  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwfKYrojdS7bbGy0ioSHASxgfacOjSsWOzucfAOUyZHjVb9v00_nT-f0IJDdMHlTo6ThA/exec";
  window.GAS_API_URL = GAS_API_URL;
  localStorage.setItem("GAS_API_URL", GAS_API_URL);

  // Estilos SweetAlert
  const swalDark = { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' };

  // Toast
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#1f2937',
    color: '#fff',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
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
      const data = await API.getUserStats(loggedInUser);
      if (data.status === 'success') {
        if (reportCountSpan) {
          reportCountSpan.textContent = String(data.reportCount).padStart(2, '0');
        }
        loadDashboardStats();
        loadRecentReports();
        loadLastOficios();
        // Wizard se encargará de revisar borrador
      }
    } catch (error) {
      console.error("Error inicio:", error);
      if (reportCountSpan) reportCountSpan.textContent = "--";
    }
  })();

  async function loadDashboardStats() {
    try {
      const statsData = await API.getUserDashboardStats(loggedInUser);
      if (statsData.status === 'success') {
        const elSi = document.getElementById("user-si");
        const elNo = document.getElementById("user-no");
        const elTotal = document.getElementById("user-total");
        const elRange = document.getElementById("user-range");

        if (elSi) elSi.textContent = statsData.kpis.totalSI;
        if (elNo) elNo.textContent = statsData.kpis.totalNO;
        if (elTotal) elTotal.textContent = statsData.kpis.totalGeneral;
        if (elRange) elRange.textContent = statsData.dateRange;
      }
    } catch (err) {
      console.log("Stats error", err);
    }
  }

  async function loadLastOficios() {
    const container = document.getElementById('container-ultimos-oficios');
    if (!container) return;
    try {
      const data = await API.getLastOficios();
      container.innerHTML = '';
      if (data.status === 'success') {
        if (!data.data || data.data.length === 0) {
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
      container.innerHTML = '<small class="text-danger">Error al cargar datos.</small>';
    }
  }

  // Exponer para que Wizard pueda llamar a loadLastOficios después de guardar
  window.App = window.App || {};
  window.App.loadLastOficios = loadLastOficios;

  // =================================================================
  // 4. PESTAÑA BUSCAR
  // =================================================================
  const searchForm = document.getElementById("search-form");
  const searchTermInput = document.getElementById("search-term");
  const searchLoader = document.getElementById("search-loader");
  const searchResultsContainer = document.getElementById("search-results-container");
  const searchResultsTbody = document.getElementById("search-results-tbody");

  async function loadRecentReports() {
    if (!searchLoader || !searchResultsTbody) return;
    searchLoader.classList.remove('d-none');
    if (searchResultsContainer) searchResultsContainer.style.display = "none";
    searchResultsTbody.innerHTML = "";

    try {
      const data = await API.getRecentReports(loggedInUser);
      searchLoader.classList.add('d-none');
      if (data.status === 'success') {
        renderSearchResults(data.results);
      }
    } catch (error) {
      console.error('Error cargando recientes:', error);
      searchLoader.classList.add('d-none');
    }
  }

  function renderSearchResults(results) {
    if (!searchResultsTbody) return;
    searchResultsTbody.innerHTML = "";

    if (!results || results.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-white-50">No se encontraron informes recientes.</td>`;
      searchResultsTbody.appendChild(tr);
    } else {
      results.forEach(report => {
        const tr = document.createElement('tr');
        const escape = (str) =>
          String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

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

  if (searchForm && searchTermInput) {
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const searchTerm = searchTermInput.value.trim();
      if (!searchTerm) return;
      if (!searchLoader || !searchResultsTbody) return;

      searchLoader.classList.remove('d-none');
      if (searchResultsContainer) searchResultsContainer.style.display = "none";
      searchResultsTbody.innerHTML = "";

      try {
        const data = await API.buscarInformes(loggedInUser, searchTerm);
        searchLoader.classList.add('d-none');
        if (data.status === 'success') renderSearchResults(data.results);
        else throw new Error(data.message || "Error desconocido.");
      } catch (error) {
        searchLoader.classList.add('d-none');
        Swal.fire({ icon: 'error', title: 'Error', text: error.message, customClass: swalDark });
      }
    });
  }

  if (searchResultsTbody) {
    searchResultsTbody.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const reportId = button.dataset.reportId;
      if (!reportId) return;

      if (button.classList.contains('btn-print-menu')) {
        if (window.Wizard) window.Wizard.handlePrintMenu(reportId);
      } else if (button.classList.contains('btn-edit-report')) {
        window.open(`editar-informe.html?id=${reportId}`, '_blank');
      }
    });
  }

  // =================================================================
  // 9. PESTAÑAS (TABS)
  // =================================================================
  const tabs = document.querySelectorAll('.app-tabs .nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', (event) => {
      const targetId = event.target.id;
      localStorage.setItem('lastActiveTab', targetId);

      const wizard = document.getElementById('main-wizard-stepper');
      if (wizard) {
        if (targetId === 'nuevo-tab-original') wizard.style.display = 'block';
        else wizard.style.display = 'none';
      }

      if (targetId === 'buscar-tab-original') {
        loadRecentReports();
      }

      if (targetId === 'agendamiento-tab' && window.cargarAgendamientosDeHoy) {
        window.cargarAgendamientosDeHoy();
      }
    });
  });

  const lastTabId = localStorage.getItem('lastActiveTab');
  if (lastTabId) {
    const lastTab = document.getElementById(lastTabId);
    if (lastTab && window.bootstrap) {
      const inst = bootstrap.Tab.getOrCreateInstance(lastTab);
      inst.show();
      if (lastTabId === 'buscar-tab-original') loadRecentReports();
    }
  }

  // =================================================================
  // 10. AGENDAMIENTO (se deja prácticamente igual que en tu app.js original)
  // =================================================================
  (function initAgendamiento() {
    const modalAgendamientoElement = document.getElementById('modal-agendamiento');
    if (modalAgendamientoElement) {
        // Al empezar a abrirse, quitamos el foco del botón que lo abrió
        modalAgendamientoElement.addEventListener('show.bs.modal', () => {
            if (document.activeElement) {
                document.activeElement.blur(); // Quita el foco (cursor) del botón
            }
        });

        // Cuando ya está totalmente abierto, forzamos el foco al primer input
        modalAgendamientoElement.addEventListener('shown.bs.modal', () => {
            const primerInput = document.getElementById('agendamiento-if-input');
            if (primerInput) {
                primerInput.focus();
            }
        });
    }
    if (!modalAgendamientoElement) return;

    const modalAgendamiento = new bootstrap.Modal(modalAgendamientoElement);
    const agendamientoIfSearchBtn = document.getElementById("agendamiento-if-search-btn");
    const agendamientoIfSearchInput = document.getElementById("agendamiento-if-search-input");
    const agendamientoIfSearchLoader = document.getElementById("agendamiento-if-search-loader");
    const agendamientoIfSearchResultsCard = document.getElementById("agendamiento-if-search-results-card");
    const btnGuardarAgendamiento = document.getElementById("btn-guardar-agendamiento");

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

    const modalReagendarElement = document.getElementById('modal-reagendar');
    const modalReagendar = new bootstrap.Modal(modalReagendarElement);
    const reagendarIdInput = document.getElementById('reagendar-id');
    const reagendarIfDisplay = document.getElementById('reagendar-if-display');
    const reagendarFecha = document.getElementById('reagendar-fecha');
    const reagendarHora = document.getElementById('reagendar-hora');
    const btnActualizarReagenda = document.getElementById('btn-actualizar-reagenda');

    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    if (btnMostrarHoy) {
      btnMostrarHoy.innerHTML = `<i class="fa-solid fa-calendar-day me-1"></i> Mostrar Hoy (${dia}/${mes}/${anio})`;
    }

    if (agendamientoIfSearchBtn) {
      agendamientoIfSearchBtn.addEventListener('click', async () => {
        const ifNum = (agendamientoIfSearchInput.value || '').trim();
        if (!ifNum) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Ingrese IF', customClass: swalDark });
          return;
        }
        agendamientoIfSearchLoader.classList.remove('d-none');
        agendamientoIfSearchResultsCard.classList.add('d-none');
        try {
          const d = await API.buscarFlagrancia(ifNum);
          agendamientoIfSearchLoader.classList.add('d-none');
          if (d.status === 'success') {
            const data = d.data;
            agendamientoIfNroHidden.value = data.if_number;
            agendamientoDelito.value = data.delito;
            agendamientoDetenido.value = data.detenido;
            agendamientoFiscal.value = data.fiscal;
            agendamientoFiscalia.value = data.unidad_fiscalia;
            agendamientoIfSearchResultsCard.classList.remove('d-none');
            btnGuardarAgendamiento.disabled = false;
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: d.message, customClass: swalDark });
          }
        } catch (e) {
          agendamientoIfSearchLoader.classList.add('d-none');
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar', customClass: swalDark });
        }
      });
    }

    if (btnGuardarAgendamiento) {
      btnGuardarAgendamiento.addEventListener('click', async () => {
        if (!agendamientoFecha.value || !agendamientoHora.value) {
          Swal.fire({ icon: 'warning', title: 'Incompleto', text: 'Falta fecha/hora', customClass: swalDark });
          return;
        }
        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading(), customClass: swalDark });

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
        try {
          const d = await API.guardarAgendamiento(loggedInUser, dataAg);
          if (d.status === 'success') {
            Swal.fire({ icon: 'success', title: 'Guardado', customClass: swalDark });
            modalAgendamiento.hide();
            cargarAgendamientosDeHoy();
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: d.message, customClass: swalDark });
          }
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar', customClass: swalDark });
        }
      });
    }

    window.cargarAgendamientosDeHoy = async function () {
      const iso = `${anio}-${mes}-${dia}`;
      if (agendamientoCalendarioInput) agendamientoCalendarioInput.value = iso;
      await cargarAgendamientosPorFecha(iso);
    };

    async function cargarAgendamientosPorFecha(iso) {
      if (agendamientoRealtimeBox) {
        agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">Cargando...</p>';
      }
      try {
        const d = await API.getAgendamientosPorFecha(loggedInUser, iso);
        if (d.status === 'success') renderAgendamientos(d.results);
      } catch (e) {
        if (agendamientoRealtimeBox) {
          agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">Error al cargar.</p>';
        }
      }
    }

    function renderAgendamientos(list) {
      if (!agendamientoRealtimeBox) return;
      agendamientoRealtimeBox.innerHTML = "";
      if (!list || list.length === 0) {
        agendamientoRealtimeBox.innerHTML = '<p class="text-white-50">No hay audiencias.</p>';
        return;
      }
      list.sort((a, b) => (a.hora_audiencia > b.hora_audiencia ? 1 : -1));
      list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'agendamiento-card-item';
        const fechaAud = new Date(item.fecha_audiencia);
        const fStr = fechaAud.toLocaleDateString('es-EC', {
          timeZone: 'UTC',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        div.innerHTML = `
          <div class="d-flex justify-content-between">
              <h5>${item.hora_audiencia} - ${item.delito}</h5>
              <button class="btn btn-outline-info btn-sm btn-reagendar"
                      data-id="${item.agendamiento_id}"
                      data-if="${item.if_nro}"
                      data-f="${fechaAud.toISOString().split('T')[0]}"
                      data-h="${item.hora_audiencia}">
                <i class="fa-solid fa-calendar-check"></i>
              </button>
          </div>
          <p><strong>IF:</strong> ${item.if_nro}</p>
          <p><strong>Detenido:</strong> ${item.detenido}</p>
          <p><strong>Fiscal:</strong> ${item.fiscal}</p>
          <small>Fecha: ${fStr}</small>
        `;
        agendamientoRealtimeBox.appendChild(div);
      });
    }

    if (agendamientoRealtimeBox) {
      agendamientoRealtimeBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-reagendar');
        if (btn) {
          reagendarIdInput.value = btn.dataset.id;
          reagendarIfDisplay.textContent = btn.dataset.if;
          reagendarFecha.value = btn.dataset.f;
          reagendarHora.value = btn.dataset.h;
          modalReagendar.show();
        }
      });
    }

    if (btnActualizarReagenda) {
      btnActualizarReagenda.addEventListener('click', async () => {
        try {
          const d = await API.reagendarAudiencia(
            loggedInUser,
            reagendarIdInput.value,
            reagendarFecha.value,
            reagendarHora.value
          );
          if (d.status === 'success') {
            Swal.fire({ icon: 'success', title: 'Reagendado', customClass: swalDark });
            modalReagendar.hide();
            if (agendamientoCalendarioInput && agendamientoCalendarioInput.value) {
              cargarAgendamientosPorFecha(agendamientoCalendarioInput.value);
            } else {
              cargarAgendamientosDeHoy();
            }
          }
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo reagendar.', customClass: swalDark });
        }
      });
    }

    if (btnMostrarHoy) btnMostrarHoy.onclick = window.cargarAgendamientosDeHoy;
    if (agendamientoCalendarioInput) {
      agendamientoCalendarioInput.onchange = (e) => cargarAgendamientosPorFecha(e.target.value);
    }
    if (agendamientoSearchBtn) {
      agendamientoSearchBtn.onclick = async () => {
        const term = (agendamientoSearchInput.value || '').trim();
        if (!term) return window.cargarAgendamientosDeHoy();
        try {
          const d = await API.buscarAgendamientos(loggedInUser, term);
          if (d.status === 'success') renderAgendamientos(d.results);
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo buscar.', customClass: swalDark });
        }
      };
    }
  })();

  // =================================================================
  // 11. INICIALIZAR WIZARD (usa el módulo wizard.js)
  // =================================================================
  if (window.Wizard && typeof window.Wizard.initWizard === 'function') {
    Wizard.initWizard({
      loggedInUser,
      swalDark,
      Toast
    });
  }
setTimeout(() => {
        const todosLosInputs = document.querySelectorAll('input[type="text"], textarea');
        todosLosInputs.forEach(input => {
            input.setAttribute('spellcheck', 'true');
            input.setAttribute('lang', 'es');
        });
        console.log("✅ Corrector ortográfico activado globalmente.");
    }, 1000); // Espera 1 seg para asegurar que todo el HTML esté listo
});
