import { content } from './content.js';
import { rows } from './gallery.js';

/** Расставляет тексты из content.js по элементам с data-content. */
function fillContent() {
  document.querySelectorAll('[data-content]').forEach((el) => {
    el.textContent = content[el.dataset.content];
  });
  document.title = `${content.name} — Model Portfolio`;
  document.getElementById('telegram-link').href = content.telegram;
}

fillContent();

/* iOS блокирует автозапуск в режиме энергосбережения и во встроенных браузерах
   мессенджеров: остаётся постер с кнопкой воспроизведения. Пробуем запустить
   сами, а если браузер отказал — повторяем при первом касании страницы. */
const heroVideo = document.querySelector('.hero__video');

function playHero() {
  const attempt = heroVideo.play();
  if (attempt) attempt.catch(() => {});
}

playHero();

['touchstart', 'click'].forEach((type) => {
  document.addEventListener(type, function once() {
    document.removeEventListener(type, once);
    playHero();
  }, { passive: true });
});

/** Строит список параметров из content.compCard. */
function renderCompCard() {
  const list = document.getElementById('comp-list');
  list.innerHTML = '';
  content.compCard.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  });
}

renderCompCard();

/** Проявляет секции при попадании в кадр. Срабатывает один раз. */
function setupReveal() {
  const sections = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    sections.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

  sections.forEach((el) => observer.observe(el));
}

/** Имя файла без папки и расширения — этим фото названо в gallery.js. */
function photoName(src) {
  return src.split('/').pop().replace(/\.[^.]+$/, '');
}

/**
 * Собирает ряды из gallery.js: раскладка задаётся вручную, а размеры кадров
 * подтягиваются из photos.json.
 *
 * Фото, не попавшее ни в один ряд, уходит хвостом по три в ряд, а не
 * пропадает: забытая строчка в раскладке не должна стирать фото с сайта.
 */
function buildRows(photos, layout) {
  const byName = new Map(photos.map((photo) => [photoName(photo.src), photo]));
  const used = new Set();
  const built = [];

  for (const row of layout) {
    const items = [];
    for (const name of row) {
      const photo = byName.get(name);
      if (!photo) {
        console.warn(`gallery.js: нет фото «${name}» в photos/`);
        continue;
      }
      used.add(name);
      items.push(photo);
    }
    if (items.length) built.push(items);
  }

  const leftover = photos.filter((photo) => !used.has(photoName(photo.src)));
  for (let i = 0; i < leftover.length; i += 3) {
    built.push(leftover.slice(i, i + 3));
  }

  return built;
}

/**
 * Рисует ряды. Внутри ряда flex-grow равен пропорции кадра, поэтому свободная
 * ширина делится так, что у всех фото ряда одинаковая высота без обрезки.
 */
function renderGallery(rowsOfPhotos) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  let index = 0;
  for (const row of rowsOfPhotos) {
    const div = document.createElement('div');
    div.className = 'gallery__row';
    /* Одиночный кадр иначе растянулся бы на всю ширину галереи и подмял бы
       страницу. Пусть он идёт в масштабе половины пары, по центру. */
    if (row.length === 1) div.classList.add('gallery__row--solo');

    for (const photo of row) {
      const figure = document.createElement('figure');
      figure.className = 'gallery__item';
      figure.dataset.index = index;
      figure.tabIndex = 0;
      figure.setAttribute('role', 'button');
      /* Пропорция уезжает в переменную, а не в inline flex-grow: инлайновый
         стиль перебить из медиазапроса можно было бы только !important, а на
         телефоне ширину кадра задаёт именно CSS. */
      figure.style.setProperty('--ratio', photo.w / photo.h);

      const img = document.createElement('img');
      img.src = photo.src;
      img.width = photo.w;
      img.height = photo.h;
      img.alt = `${content.name} — photo ${index + 1}`;
      img.loading = index < 3 ? 'eager' : 'lazy';
      img.decoding = 'async';

      figure.append(img);
      div.append(figure);
      index += 1;
    }

    gallery.append(div);
  }
}

let photos = [];

/* Раскладка фиксированная, поэтому перерисовывать на resize нечего:
   ряды перестраиваются в колонку средствами CSS. */
function setupGallery() {
  const rowsOfPhotos = buildRows(photos, rows);
  /* Лайтбокс адресует фото по индексу, поэтому список должен идти в том же
     порядке, в каком кадры легли на страницу, а не в алфавитном. */
  photos = rowsOfPhotos.flat();
  renderGallery(rowsOfPhotos);
}

/* 5 с максимум на запрос: зависшая раздача (плохая мобильная сеть) не должна
   держать страницу без галереи, ревила и слушателей лайтбокса бесконечно —
   таймаут переводит зависание в ту же ветку catch, что и обычную ошибку. */
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const response = await fetch('photos.json', { signal: controller.signal });
  if (!response.ok) {
    throw new Error(`photos.json: HTTP ${response.status}`);
  }
  photos = await response.json();
} catch (err) {
  console.error('Failed to load photos.json — gallery will be empty.', err);
} finally {
  clearTimeout(timeout);
}
setupGallery();

/* Наблюдатель ставится только теперь, когда галерея уже получила реальную
   высоту: если поставить его раньше (пока #gallery ещё пустой), первый же
   синхронный замер IntersectionObserver может застать документ короче
   финального и по ошибке проявить comp/booking, которые ещё не попадали
   в кадр — а снять наблюдение он успевает раньше, чем фото лягут в разметку. */
setupReveal();

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCounter = document.getElementById('lightbox-counter');
let currentIndex = 0;
let lastFocusedIndex = null;

function showPhoto(index) {
  currentIndex = (index + photos.length) % photos.length;
  const photo = photos[currentIndex];
  lightboxImg.src = photo.src;
  lightboxImg.alt = `${content.name} — photo ${currentIndex + 1}`;
  lightboxCounter.textContent = `${currentIndex + 1} / ${photos.length}`;
}

function openLightbox(index) {
  /* Индекс, а не сам DOM-узел: renderGallery пересоздаёт все figure при смене
     числа колонок, и узел, сохранённый на момент открытия, к моменту закрытия
     может быть уже отсоединён от документа. */
  lastFocusedIndex = index;
  showPhoto(index);
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('lightbox-close').focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  if (lastFocusedIndex !== null) {
    const gallery = document.getElementById('gallery');
    const figure = gallery.querySelector(`[data-index="${lastFocusedIndex}"]`);
    if (figure) figure.focus();
  }
}

document.getElementById('gallery').addEventListener('click', (event) => {
  const figure = event.target.closest('.gallery__item');
  if (figure) openLightbox(Number(figure.dataset.index));
});

document.getElementById('gallery').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const figure = event.target.closest('.gallery__item');
  if (!figure) return;
  /* preventDefault для обоих клавиш: Space иначе прокрутит страницу, а Enter
     иначе доиграет своё "нажатие" уже на кнопке закрытия (фокус на неё
     переходит внутри openLightbox), закрыв лайтбокс тем же кликом. */
  event.preventDefault();
  openLightbox(Number(figure.dataset.index));
});

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (lightbox.hidden) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowRight') showPhoto(currentIndex + 1);
  if (event.key === 'ArrowLeft') showPhoto(currentIndex - 1);
  if (event.key === 'Tab') {
    /* Единственный интерактивный элемент внутри — кнопка закрытия,
       поэтому фокус просто удерживается на ней. */
    event.preventDefault();
    document.getElementById('lightbox-close').focus();
  }
});

/* Свайп: порог 50 px, всё что меньше — считается тапом. */
const SWIPE = 50;
let startX = 0;
let startY = 0;

lightbox.addEventListener('touchstart', (event) => {
  startX = event.changedTouches[0].clientX;
  startY = event.changedTouches[0].clientY;
}, { passive: true });

lightbox.addEventListener('touchend', (event) => {
  const dx = event.changedTouches[0].clientX - startX;
  const dy = event.changedTouches[0].clientY - startY;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE) {
    showPhoto(currentIndex + (dx < 0 ? 1 : -1));
  } else if (dy > SWIPE) {
    closeLightbox();
  }
}, { passive: true });

/* iOS Safari продолжает "резиновый" скролл страницы под фиксированным
   оверлеем даже при overflow:hidden на body — блокируем его явно. Но только
   для одного пальца: пинч-зум (два пальца и более) должен работать, это
   единственный способ рассмотреть лицо на фото. */
lightbox.addEventListener('touchmove', (event) => {
  if (!lightbox.hidden && event.touches.length === 1) event.preventDefault();
}, { passive: false });
