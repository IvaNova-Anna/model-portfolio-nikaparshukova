/**
 * Сверяет раскладку галереи из gallery.js с реальными файлами в photos/.
 *
 * Раскладка задана вручную, а список фото генерируется сборкой — две
 * половины расходятся молча. Переименовали файл — ряд потеряет кадр;
 * загрузили новое фото и забыли про ряд — оно уедет в хвост галереи мимо
 * задуманной последовательности. И то и другое видно только глазами на
 * готовой странице, поэтому проверяем на сборке.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* gallery.js — ES-модуль, а тесты выполняются как CommonJS (package.json в
   проекте нет намеренно, он тянет за собой npm-сборку). Файл содержит один
   литерал массива, поэтому достаточно снять export и выполнить. */
function loadRows() {
  const source = fs
    .readFileSync(path.join(ROOT, 'gallery.js'), 'utf8')
    .replace(/\bexport\s+/g, '');
  return new Function(`${source}; return rows;`)();
}

function loadPhotoNames() {
  const photos = JSON.parse(fs.readFileSync(path.join(ROOT, 'photos.json'), 'utf8'));
  return photos.map((photo) => photo.src.split('/').pop().replace(/\.[^.]+$/, ''));
}

test('раскладка ссылается только на существующие фото', () => {
  const names = new Set(loadPhotoNames());
  for (const row of loadRows()) {
    for (const name of row) {
      assert.ok(names.has(name),
        `gallery.js: «${name}» нет в photos/ — ряд отрисуется неполным`);
    }
  }
});

test('каждое фото попадает ровно в один ряд', () => {
  const placed = loadRows().flat();
  const seen = new Set();

  for (const name of placed) {
    assert.ok(!seen.has(name), `gallery.js: «${name}» стоит в раскладке дважды`);
    seen.add(name);
  }

  for (const name of loadPhotoNames()) {
    assert.ok(seen.has(name),
      `«${name}» лежит в photos/, но не попало ни в один ряд — уедет в конец галереи`);
  }
});

test('в ряду не больше трёх кадров', () => {
  loadRows().forEach((row, i) => {
    assert.ok(row.length >= 1 && row.length <= 3,
      `ряд ${i + 1}: ${row.length} кадров, а ряд рассчитан на один, два или три`);
  });
});
