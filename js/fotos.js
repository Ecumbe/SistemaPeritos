// js/fotos.js
// Gestión de láminas y fotos (subida, compresión, edición con PhotoEditor)

(function () {

  let laminasContainer, templateLamina, templateFoto;

  function initFotos() {
    laminasContainer = document.getElementById('laminas-container');
    templateLamina = document.getElementById('template-lamina');
    templateFoto = document.getElementById('template-foto');

    const btnAgregarLugar = document.getElementById('btn-agregar-lugar');
    if (btnAgregarLugar && templateLamina && laminasContainer) {
      btnAgregarLugar.addEventListener('click', () => {
        const clone = templateLamina.content.cloneNode(true);
        laminasContainer.appendChild(clone);
        updateLaminaNumbers();
        if (window.Wizard) window.Wizard.showNavButtons();
      });
    }

    if (laminasContainer) {
      // Clicks: eliminar lámina, eliminar foto, editar foto, togglear descripción
      laminasContainer.addEventListener('click', (e) => {
        const laminaCard = e.target.closest('.lamina-card');
        const fotoCard = e.target.closest('.foto-card');

        // Eliminar Lámina
        if (e.target.closest('.btn-eliminar-lamina') && laminaCard) {
          laminaCard.remove();
          updateLaminaNumbers();
          if (window.Wizard) window.Wizard.showNavButtons();
        }

        // Eliminar Foto
        if (e.target.closest('.btn-eliminar-foto') && fotoCard) {
          const parentLamina = fotoCard.closest('.lamina-card');
          fotoCard.remove();
          if (parentLamina) updatePhotoNumbers(parentLamina);
          if (window.Wizard) window.Wizard.showNavButtons();
        }

        // Editar Foto (PhotoEditor.open)
        if (e.target.closest('.btn-editar-foto') && fotoCard) {
          const img = fotoCard.querySelector('.foto-preview');
          const desc = fotoCard.querySelector('.foto-descripcion');
          const btnDesc = fotoCard.querySelector('.btn-agregar-descripcion');

          if (window.PhotoEditor && img) {
            PhotoEditor.open({
              imgEl: img,
              onSave: ({ description }) => {
                if (desc) desc.value = description || '';
                if (btnDesc) {
                  btnDesc.textContent = description
                    ? description.substring(0, 20) + "..."
                    : "+ Agregar Descripción";
                }
                if (window.Wizard) window.Wizard.showNavButtons();
              }
            });
          }
        }

        // Mostrar/ocultar descripción
        if (e.target.closest('.btn-agregar-descripcion') && fotoCard) {
          const desc = fotoCard.querySelector('.foto-descripcion');
          if (desc) desc.classList.toggle('d-none');
        }
      });

      // Cambio de input de archivo (carga de fotos)
      laminasContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('lamina-file-input')) {
          const files = e.target.files;
          const laminaCard = e.target.closest('.lamina-card');
          if (!laminaCard) return;

          const container = laminaCard.querySelector('.lamina-fotos-container');
          const num = laminaCard.querySelector('.lamina-numero').textContent;

          Array.from(files).forEach(f => processAndDisplayImage(f, container, num));
          if (window.Wizard) window.Wizard.showNavButtons();
        }
      });
      document.addEventListener('paste', (e) => {
        // 1. Si el usuario está pegando texto en un input, ignorar.
        const activeElement = document.activeElement;
        const targetTag = activeElement ? activeElement.tagName : null;
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
            return;
        }

        // 2. Verificar que estemos en el paso 4 (Wizard stepper visible y activo)
        const step4Marker = document.getElementById('step-marker-4');
        // Si no existe el marcador o no está activo, asumimos que no estamos en el paso de fotos
        if (!step4Marker || !step4Marker.classList.contains('active')) {
             // Opcional: si usas el sistema de pestañas, verifica si el panel #nuevo-pane está visible.
             // Por ahora, la verificación del stepper suele ser suficiente.
             // return; 
             // NOTA: Dependiendo de cómo ocultes los pasos, esta verificación podría necesitar ajuste.
             // Si ves que no pega, comenta temporalmente esta verificación del paso 2.
        }

        // 3. Validar que haya al menos una lámina donde pegar
        const ultimaLamina = laminasContainer.querySelector('.lamina-card:last-of-type');
        if (!ultimaLamina) {
            Swal.fire({
                icon: 'warning',
                title: 'No hay lámina',
                text: 'Por favor, agrega una lámina (lugar) primero antes de pegar imágenes.',
                // Usamos un tema oscuro por defecto si no está disponible swalDark
                customClass: window.Wizard ? window.Wizard.swalDark : { popup: 'bg-dark text-white', title: 'text-white', content: 'text-white-50' }
            });
            return;
        }

        // 4. Obtener contenedor de fotos de la última lámina
        const fotosContainer = ultimaLamina.querySelector('.lamina-fotos-container');
        const laminaNumEl = ultimaLamina.querySelector('.lamina-numero');
        const laminaNum = laminaNumEl ? laminaNumEl.textContent : "1";

        // 5. Obtener archivos del portapapeles
        const items = e.clipboardData.items;
        let foundImage = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    foundImage = true;
                    // Usamos la función existente para procesar
                    processAndDisplayImage(file, fotosContainer, laminaNum);
                }
            }
        }

        if (foundImage) {
            e.preventDefault(); // Evitar comportamiento por defecto
            if (window.Wizard) window.Wizard.showNavButtons(); // Mostrar botones de guardar
        }
    });
    }
    
  }

  async function processAndDisplayImage(file, container, laminaNum) {
    if (!templateFoto || !container) return;
    const clone = templateFoto.content.cloneNode(true);
    const card = clone.querySelector('.foto-card');
    const img = clone.querySelector('.foto-preview');
    const spinner = clone.querySelector('.foto-spinner');
    const title = clone.querySelector('.foto-title-input');

    const currentPhotos = container.querySelectorAll('.foto-card').length;
    if (title) title.value = `Fotografía N° ${currentPhotos + 1}`;
    if (card) card.dataset.laminaNum = laminaNum;
    container.appendChild(clone);

    try {
      // imageCompression debe estar ya cargado en tu HTML
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const url = await imageCompression.getDataUrlFromFile(compressed);
      if (img) {
        img.src = url;
        img.dataset.base64 = url;
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (spinner) spinner.classList.add('d-none');
    }
  }

  function updateLaminaNumbers() {
    if (!laminasContainer) return;
    laminasContainer.querySelectorAll('.lamina-card').forEach((el, i) => {
      const numEl = el.querySelector('.lamina-numero');
      if (numEl) numEl.textContent = i + 1;
      updatePhotoNumbers(el);
    });
  }

  function updatePhotoNumbers(laminaCard) {
    if (!laminaCard) return;
    const allPhotoTitles = laminaCard.querySelectorAll('.foto-title-input');
    allPhotoTitles.forEach((input, index) => {
      input.value = `Fotografía N° ${index + 1}`;
    });
  }

  function gatherAllPhotoData() {
    const photos = [];
    if (!laminasContainer) return photos;

    laminasContainer.querySelectorAll('.foto-card').forEach(card => {
      const preview = card.querySelector('.foto-preview');
      const titulo = card.querySelector('.foto-title-input');
      const descripcion = card.querySelector('.foto-descripcion');

      photos.push({
        laminaNum: card.dataset.laminaNum,
        base64: preview ? (preview.dataset.base64 || '') : '',
        titulo: titulo ? titulo.value : '',
        descripcion: descripcion ? descripcion.value : ''
      });
    });
    return photos;
  }

  // Exponer al scope global
  window.Fotos = {
    initFotos,
    gatherAllPhotoData
  };

  // Si quieres inicializar automáticamente al cargar DOM:
  document.addEventListener('DOMContentLoaded', initFotos);

})();
