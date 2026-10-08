# Сборка и проверки релиза

## Подготовка окружения

Версии npm-зависимостей зафиксированы в `package-lock.json`, Python-зависимостей —
в `requirements.txt`.

```bash
npm ci
python3 -m pip install -r requirements.txt
```

## Исходники веб-приложения

CSS и JavaScript поддерживаются в `src/`; большие данные курса и сторонние
офлайн-библиотеки остаются встроенными в `index.html`.

```bash
python3 tools/build_site.py           # обновить CSS/JS-блоки в index.html
python3 tools/build_site.py --check   # проверить, что артефакт актуален
python3 tools/validate_release.py index.html
```

Подробности о структуре исходников — в [`src/README.md`](../src/README.md).

## Автономный 7z-комплект

Сборщик помещает актуальный `index.html` и четыре инструкции в архив. Временные
файлы создаются изолированно и очищаются автоматически; существующий архив
заменяется атомарно только после успешной сборки.

```bash
python3 tools/build_kit.py
python3 tools/build_kit.py --output /tmp/statpracticum-kit.7z
python3 tools/validate_kit.py                 # проверить отслеживаемый архив
python3 tools/validate_kit.py --test           # проверить и запустить тест на HTML из архива
```

## Регрессионные тесты

`npm test` запускает две jsdom-сюиты для корневой сборки:
`tools/test-solution-gate.mjs` (поведение курса) и
`tools/test-open-answer-languages.mjs` (автопроверка открытых ответов на русском,
английском и казахском: эталонные разборы зачитываются 96/96 в каждом языке и в
любой паре «язык ответа — язык интерфейса», пустой ответ не зачитывается, у
каждого проверяемого пункта есть ключи на всех трёх языках). Полный локальный
прогон включает также HTML, извлечённый из 7z-архива:

```bash
npm test
npm run test:kit
npm run test:all
```

GitHub Actions выполняет те же ключевые проверки, проверяет, что 7z содержит
актуальные документы и приложение, затем собирает новый архив во временном
каталоге runner-а и запускает на его HTML регрессионную сюиту.
