/**
 * Ловит имя предыдущей модели, забытое при копировании сайта.
 *
 * Этот лендинг — форк портфолио другой модели. Имя там лежало не только в
 * content.js, но и в пяти местах разметки: title, description, блок og,
 * тексты-фолбэки без JS, инициалы в favicon и заголовок 404. Пропустить одно
 * из них легко, а цена ошибки высокая: краулер Telegram кэширует превью с
 * чужим именем, и кэш чистится только вручную.
 *
 * Сканируем только то, что реально отдаётся в веб. docs/ и spec.md
 * намеренно не трогаем — там прежнее имя стоит законно, как история
 * происхождения кода, и они закрыты редиректами в netlify.toml.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SERVED_FILES = [
  'index.html',
  '404.html',
  'content.js',
  'app.js',
  'style.css',
  'favicon.svg',
  'netlify.toml',
  'README.md',
];

const STALE = /sonya|zelenuk/i;

test('в отдаваемых файлах нет имени предыдущей модели', () => {
  for (const name of SERVED_FILES) {
    const file = path.join(ROOT, name);
    assert.ok(fs.existsSync(file), `нет файла ${name}`);

    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      assert.ok(!STALE.test(line),
        `${name}:${i + 1} осталось имя предыдущей модели — ${line.trim()}`);
    });
  }
});

test('адрес сайта в мета-тегах совпадает с этим лендингом', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const urls = [...html.matchAll(/content="(https:\/\/[^"]+)"/g)].map((m) => m[1]);

  assert.ok(urls.length >= 3, 'в index.html меньше трёх абсолютных адресов');
  for (const url of urls) {
    assert.strictEqual(new URL(url).host, 'model-portfolio-nikap.netlify.app',
      `${url} ведёт на чужой сайт — превью ссылки покажет не тот портфолио`);
  }
});
