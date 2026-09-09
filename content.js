/* Комп-карту читают иностранные букеры, поэтому размеры переведены в
   международные шкалы: российский 23 — это длина стопы в сантиметрах,
   то есть EU 36. Имя продублировано в index.html, 404.html и favicon.svg,
   потому что краулеры мессенджеров JS не выполняют и увидели бы пустую
   страницу. */
export const content = {
  name: 'Nika Parshukova',
  city: 'Ekaterinburg',
  telegram: 'https://t.me/PARSHUKOVAAAAA',
  booking: 'Available for editorial, commercial, runway and lookbook work.',
  compCard: [
    ['Height', '162 cm'],
    ['Bust', '82 cm'],
    ['Waist', '62 cm'],
    ['Hips', '88 cm'],
    ['Dress', 'XXS-XS'],
    ['Shoes', 'EU 36'],
    ['Hair', 'Blonde'],
    ['Eyes', 'Blue-green'],
  ],
};
