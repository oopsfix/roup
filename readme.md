# Введение
Модуль предназначен для обновление rotorCMS в проекте. Обновление производится методом трехстороннего слияния файлов. Слияние файлов производится по алгоритму - извлекается новая версия файла из репозитория rotorCMS, извлекается базовая версия файла на момент последнего коммита до которого мы уже обновлялись и наша версия файла из проекта. Самая новая версия файла из репозитория rotorCMS накладывается на базовую версию и сверху накладывается наша версия файла из проекта. Таким образом наш файлы проекта обновляются в соответствии с новыми файлами rotorCMS, а наши изменения остаются на месте. В случаи конфликта, когда на месте нашего кода обнаружен новый код из rotorCMS, происходит маркировка какие обновления из какой версии файла. Новые файлы будут просто скопированы в проект. Таким образом обновление rotorCMS в рабочем проекте становится лёгкой задачей. После обновления нам только нужно разрешить файлы конфликтов если такие имеются.

# Установка

В директории проекта создаём директорию под репозиторий rotorCMS и переходим в неё.

```bash
mkdir upgrades && cd upgrades
```

Клонируем rotorCMS
```bash
git clone https://github.com/visavi/rotor .
```

Возвращаемся в проект и устанавливаем roup
```bash
cd ../ && npm install roup --save
```

После установки в корне проекта будет создан файл `roup.js`

## Содержание roup.js
Запускаемый файл содержит конфиг
```bash
const CONFIG = {
    // Директория местонахождения репозитория с rotorcms
    pathRotorRepository: 'upgrades',
    // Последний айди коммита до которого у нас есть обновления
    lastIdCommit: 'ede524dc9cb4b6f414eded2258699c2451fe53a3',
    // Директория местонахождения нашего проекта
    pathProject: './',
    // Временная директория в которой собираются версии файлов для слияний
    pathTmpDir: '.roup',
    // Лог хранения результата обновления
    log: 'roup.log',
    // Отслеживаемый контент в репозитории rotorcms
    trackContents: [
        'app',
        'config',
        'database',
        'modules',
        'public',
        'resources',
        'routes',
        'tests',
        'bootstrap/app.php',
        '.editorconfig',
        '.env.example',
        '.gitattributes',
        '.gitignore',
        '.htaccess',
        '.styleci.yml',
        '.travis.yml',
        'artisan',
        'composer.json',
        'package.json',
        'phpunit.xml',
        'phpcs.xml',
        'phpstan.neon',
        'readme.md',
        'readme_ru.md',
        'webpack.mix.js',
        'deploy.php'
    ]
};
```


## Запускаем
```bash
node roup
```

В конце процесса будет приведена статистика обновлённых, новых и конфликтных файлов. Текущий результат записывается в лог `roup.log`. Не забудьте сохранить последний коммит обновления, его можно скопировать из лога, либо из репозитория ротора. Осталось отредактировать конфликтные файлы и обновление готово.