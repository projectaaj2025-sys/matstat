/* ---- ИИ-помощник: локальный движок, провайдеры и внешняя модель ------- */
/* Внешняя модель подключается по OpenAI-совместимому API. Список начинается с
   бесплатных провайдеров, которым ключ выдают без платёжных данных: Groq,
   Google AI Studio (Gemini), OpenRouter и Mistral. Дальше идут платные
   (DeepSeek, OpenAI, Together), локальные Ollama и LM Studio и свой адрес.
   Остаток лимитов провайдеры присылают в заголовках ответа (x-ratelimit-…),
   поэтому счётчики видно прямо в курсе. Ключ хранится только в этом браузере
   (localStorage) и уходит напрямую выбранному провайдеру: страница работает
   без сервера-посредника. */

/* ---- Строки помощника ------------------------------------------------ */
/* Подсказки о провайдерах содержат адреса, шаги и пояснения, поэтому их удобнее
   держать рядом с кодом, чем в словаре курса. Каждая строка есть на трёх языках. */
const AI_LANGS = ['ru', 'en', 'kk'];
const AI_TEXT = {
    'ai.assistant': {ru: 'ИИ-помощник', en: 'AI assistant', kk: 'ЖИ-көмекші'},
    'ai.open': {ru: 'Открыть ИИ-помощника', en: 'Open the AI assistant', kk: 'ЖИ-көмекшіні ашу'},
    'ai.close': {ru: 'Закрыть', en: 'Close', kk: 'Жабу'},
    'ai.chat': {ru: 'Чат с наставником', en: 'Chat with the mentor', kk: 'Тәлімгермен сөйлесу'},
    'ai.ask': {ru: 'Спросить', en: 'Ask', kk: 'Сұрау'},
    'ai.send': {ru: 'Отправить', en: 'Send', kk: 'Жіберу'},
    'ai.placeholder': {ru: 'Например: как найти дисперсию?', en: 'For example: how do I find the variance?', kk: 'Мысалы: дисперсияны қалай табуға болады?'},
    'ai.placeholderShort': {ru: 'Ваш вопрос…', en: 'Your question…', kk: 'Сұрағыңыз…'},
    'ai.thinking': {ru: 'Думаю…', en: 'Thinking…', kk: 'Ойланып жатырмын…'},
    'ai.quick.topic': {ru: 'Объясни тему', en: 'Explain the topic', kk: 'Тақырыпты түсіндір'},
    'ai.quick.task': {ru: 'Разбери задание по шагам', en: 'Walk me through the task', kk: 'Тапсырманы қадамдап талда'},
    'ai.quick.check': {ru: 'Проверь моё решение', en: 'Check my solution', kk: 'Шешімімді тексер'},
    'ai.quick.similar': {ru: 'Похожая задача', en: 'A similar task', kk: 'Ұқсас тапсырма'},
    'ai.quick.data': {ru: 'Что показывают эти данные?', en: 'What do these data show?', kk: 'Бұл деректер нені көрсетеді?'},
    'ai.quick.ask': {ru: 'Задать свой вопрос', en: 'Ask your own question', kk: 'Өз сұрағыңызды қою'},
    'ai.context.page': {ru: 'Текущая страница', en: 'Current page', kk: 'Ағымдағы бет'},
    'ai.context.topic': {ru: 'Тема: {title}', en: 'Topic: {title}', kk: 'Тақырып: {title}'},
    'ai.context.task': {ru: 'Задание: {title}', en: 'Task: {title}', kk: 'Тапсырма: {title}'},
    'ai.context.hint': {ru: 'Помощник видит тему и задание, о которых вы спрашиваете: ответ будет по делу, а не вообще.', en: 'The assistant sees the topic or task you are asking about, so the answer fits the question.', kk: 'Көмекші сіз сұраған тақырыпты немесе тапсырманы көреді, сондықтан жауап нақты болады.'},
    'ai.mode.local': {ru: 'Локальный режим: курс отвечает сам, без интернета', en: 'Local mode: the course answers by itself, offline', kk: 'Жергілікті режим: курс интернетсіз өзі жауап береді'},
    'ai.mode.model': {ru: '{name} · модель {model}', en: '{name} · model {model}', kk: '{name} · модель {model}'},
    'ai.mode.setup': {ru: 'Внешняя модель не подключена — открыть настройки', en: 'No external model yet — open the settings', kk: 'Сыртқы модель қосылмаған — параметрлерді ашу'},
    'ai.history.title': {ru: 'Что уже спрашивали', en: 'Previous questions', kk: 'Бұрын қойылған сұрақтар'},
    'ai.history.clear': {ru: 'Очистить историю', en: 'Clear the history', kk: 'Тарихты тазалау'},
    'ai.history.cleared': {ru: 'История вопросов очищена.', en: 'The question history is cleared.', kk: 'Сұрақтар тарихы тазаланды.'},
    'ai.greeting': {
        ru: 'Здравствуйте! Я ИИ-помощник по статистике. Спросите о теме курса, попросите разобрать задание или сгенерировать похожую задачу.',
        en: 'Hello! I am the statistics AI assistant. Ask about a course topic, ask me to walk through a task or to generate a similar one.',
        kk: 'Сәлеметсіз бе! Мен статистика бойынша ЖИ-көмекшімін. Курс тақырыбы туралы сұраңыз, тапсырманы талдауды немесе ұқсас тапсырма құрастыруды сұраңыз.'
    },
    'ai.greeting.offline': {
        ru: 'Внешняя модель не подключена: я отвечаю по теории и заданиям курса. Ключ провайдера можно добавить в настройках — тогда заработают свободные ответы и генерация задач.',
        en: 'No external model is connected: I answer from the theory and tasks of the course. Add a provider key in the settings to unlock free-form answers and task generation.',
        kk: 'Сыртқы модель қосылмаған: мен курстың теориясы мен тапсырмалары бойынша жауап беремін. Провайдер кілтін параметрлерге қоссаңыз, еркін жауаптар мен тапсырма құрастыру іске қосылады.'
    },
    'ai.bar.label': {ru: 'ИИ рядом с заданием:', en: 'AI next to the task:', kk: 'Тапсырма жанындағы ЖИ:'},
    'ai.bar.explain': {ru: 'Разбор по шагам', en: 'Step-by-step help', kk: 'Қадамдап талдау'},
    'ai.bar.check': {ru: 'Проверить мой ответ', en: 'Check my answer', kk: 'Жауабымды тексеру'},
    'ai.bar.similar': {ru: 'Похожая задача', en: 'Similar task', kk: 'Ұқсас тапсырма'},
    'ai.bar.exam': {ru: 'Во время контрольной подсказки ИИ закрыты.', en: 'AI hints are disabled during a test.', kk: 'Бақылау жұмысы кезінде ЖИ кеңестері жабық.'},
    'ai.q.explain': {ru: 'Разбери это задание по шагам: {question}', en: 'Walk me through this task step by step: {question}', kk: 'Осы тапсырманы қадамдап талда: {question}'},
    'ai.q.check': {ru: 'Проверь мой ответ в задании «{question}». Мой ответ: {answer}', en: 'Check my answer for the task “{question}”. My answer: {answer}', kk: '«{question}» тапсырмасындағы жауабымды тексер. Менің жауабым: {answer}'},
    'ai.q.similar': {ru: 'Придумай похожую задачу по теме «{topic}» с другими числами.', en: 'Make up a similar task on “{topic}” with different numbers.', kk: '«{topic}» тақырыбы бойынша басқа сандармен ұқсас тапсырма құрастыр.'},
    'ai.q.topic': {ru: 'Объясни тему «{topic}» простыми словами и приведи пример по шагам.', en: 'Explain the topic “{topic}” in simple words and give a step-by-step example.', kk: '«{topic}» тақырыбын қарапайым сөзбен түсіндіріп, қадамдап мысал келтір.'},
    'ai.q.data': {ru: 'Что показывают эти данные и какой вывод из них следует?', en: 'What do these data show and what conclusion follows?', kk: 'Бұл деректер нені көрсетеді және қандай қорытынды шығады?'},
    'ai.needAnswer': {ru: 'Сначала введите ответ в задании, потом попросите проверить.', en: 'Enter your answer in the task first, then ask me to check it.', kk: 'Алдымен тапсырмада жауап енгізіңіз, содан кейін тексеруді сұраңыз.'},
    'ai.local.hit': {ru: 'Вот что нашлось в курсе:', en: 'Here is what the course has:', kk: 'Курста мынау табылды:'},
    'ai.local.miss': {
        ru: 'Точного совпадения в курсе нет. Переформулируйте или назовите тему: «математическое ожидание», «дисперсия», «биномиальное распределение».',
        en: 'No exact match in the course. Rephrase the question or name the topic: “expected value”, “variance”, “binomial distribution”.',
        kk: 'Курста дәл сәйкестік жоқ. Сұрақты басқаша жазыңыз немесе тақырыпты атаңыз: «математикалық күтім», «дисперсия», «биномдық үлестірім».'
    },
    'ai.local.definition': {
        ru: 'Выборка — это часть генеральной совокупности, по которой делают выводы о всей совокупности. Генеральная совокупность — все объекты, о которых хотим судить.',
        en: 'A sample is a part of the population used to draw conclusions about the whole population. The population is every object we want to reason about.',
        kk: 'Іріктеме — бүкіл жиынтық туралы қорытынды жасауға пайдаланылатын жиынтықтың бөлігі. Бас жиынтық — біз туралы үкім шығарғымыз келетін барлық нысандар.'
    },
    'ai.local.theory': {ru: 'Теория по теме «{title}»', en: 'Theory of “{title}”', kk: '«{title}» тақырыбының теориясы'},
    'ai.local.open': {ru: 'Открыть тему', en: 'Open the topic', kk: 'Тақырыпты ашу'},
    'ai.local.practice': {ru: 'Открыть практику', en: 'Open the practice', kk: 'Практиканы ашу'},
    'ai.local.bank': {ru: 'Задача из банка', en: 'A bank problem', kk: 'Банктен алынған есеп'},
    'ai.local.hint': {ru: 'Подсказка курса: {hint}', en: 'Course hint: {hint}', kk: 'Курс кеңесі: {hint}'},
    'ai.local.steps': {
        ru: 'Порядок разбора: 1) что дано и что нужно найти; 2) какая формула связывает данные; 3) подставьте числа; 4) проверьте, правдоподобен ли результат.',
        en: 'Order of work: 1) what is given and what is required; 2) which formula links the data; 3) put the numbers in; 4) check whether the result is plausible.',
        kk: 'Талдау тәртібі: 1) не берілген және не табу керек; 2) деректерді қандай формула байланыстырады; 3) сандарды қойыңыз; 4) нәтиженің шынайылығын тексеріңіз.'
    },
    'ai.local.modelOnly': {
        ru: 'Подробный разбор формулировок делает внешняя модель: подключите ключ в настройках, и я разберу задание по шагам.',
        en: 'A detailed walkthrough needs an external model: add a key in the settings and I will go through the task step by step.',
        kk: 'Егжей-тегжейлі талдауды сыртқы модель жасайды: параметрлерде кілт қосыңыз, мен тапсырманы қадамдап талдаймын.'
    },
    'ai.check.correct': {ru: 'Ответ совпадает с эталонным.', en: 'The answer matches the reference one.', kk: 'Жауап эталонмен сәйкеседі.'},
    'ai.check.wrong': {ru: 'Пока не совпало с эталонным ответом.', en: 'It does not match the reference answer yet.', kk: 'Әзірге эталон жауаппен сәйкескен жоқ.'},
    'ai.check.reference': {ru: 'Эталонный ответ:', en: 'Reference answer:', kk: 'Эталон жауап:'},
    'ai.check.teacher': {ru: 'Проверка выполнена локально по данным курса.', en: 'The check was done locally against the course data.', kk: 'Тексеру курс деректері бойынша жергілікті орындалды.'},
    'ai.err.busy': {ru: 'Запрос уже выполняется.', en: 'A request is already running.', kk: 'Сұраныс орындалып жатыр.'},
    'ai.err.nokey': {ru: 'Сначала введите API-ключ.', en: 'Enter the API key first.', kk: 'Алдымен API кілтін енгізіңіз.'},
    'ai.err.401': {ru: 'Провайдер отклонил ключ (код 401). Проверьте, что ключ скопирован целиком и не удалён в кабинете провайдера.', en: 'The provider rejected the key (401). Check that the key was copied in full and is still active in the provider dashboard.', kk: 'Провайдер кілтті қабылдамады (401). Кілттің толық көшірілгенін және кабинетте жойылмағанын тексеріңіз.'},
    'ai.err.402': {ru: 'Провайдер сообщает, что на балансе нет средств (код 402). Пополните баланс в кабинете провайдера.', en: 'The provider reports an empty balance (402). Top up the balance in the provider dashboard.', kk: 'Провайдер баланста қаражат жоқ деп хабарлайды (402). Кабинетте балансты толтырыңыз.'},
    'ai.err.403': {ru: 'Доступ запрещён (код 403). Проверьте, что ключ подходит для выбранной модели и адреса.', en: 'Access denied (403). Check that the key is allowed for the chosen model and address.', kk: 'Қатынауға тыйым салынды (403). Кілттің таңдалған модель мен мекенжайға сәйкестігін тексеріңіз.'},
    'ai.err.404': {ru: 'Модель или адрес не найдены (код 404). Проверьте название модели и базовый адрес — список моделей даёт кнопка «Загрузить список моделей».', en: 'Model or address not found (404). Check the model name and the base URL; the “Load model list” button shows the valid names.', kk: 'Модель немесе мекенжай табылмады (404). Модель атауы мен базалық мекенжайды тексеріңіз; жарамды атауларды «Модельдер тізімін жүктеу» түймесі береді.'},
    'ai.err.429': {ru: 'Провайдер просит снизить темп (код 429): сработал один из счётчиков бесплатного тарифа — запросы или токены в минуту либо в сутки. Остаток и время сброса видны в строке лимитов; подождите или выберите другую модель.', en: 'The provider asks you to slow down (429): one of the free-tier counters is spent — requests or tokens per minute or per day. The remaining values and the reset time are shown in the limits line; wait or pick another model.', kk: 'Провайдер қарқынды азайтуды сұрайды (429): тегін тарифтің счётчиктерінің бірі бітті — минуттағы немесе тәуліктегі сұраныс не токен. Қалдық пен сброс уақыты шектеулер жолында көрінеді; күтіңіз немесе басқа модель таңдаңыз.'},
    'ai.err.5xx': {ru: 'На стороне провайдера сбой (код {code}). Попробуйте ещё раз через минуту.', en: 'The provider had a failure (code {code}). Try again in a minute.', kk: 'Провайдер жағында ақау (код {code}). Бір минуттан кейін қайта көріңіз.'},
    'ai.err.network': {
        ru: 'Запрос не ушёл: нет интернета или провайдер запрещает запросы прямо из браузера (CORS). Проверьте сеть, а если ошибка повторится — выберите другого провайдера (Groq, Google AI Studio, OpenRouter) или локальную модель (Ollama).',
        en: 'The request did not go through: no internet, or the provider blocks browser requests (CORS). Check the network; if it repeats, pick another provider (Groq, Google AI Studio, OpenRouter) or a local model (Ollama).',
        kk: 'Сұраныс жіберілмеді: интернет жоқ немесе провайдер браузерден сұранысқа тыйым салады (CORS). Желіні тексеріңіз; қайталанса, басқа провайдерді (Groq, Google AI Studio, OpenRouter) немесе жергілікті модельді (Ollama) таңдаңыз.'
    },
    'ai.err.timeout': {ru: 'Провайдер не ответил за минуту. Попробуйте ещё раз или выберите более быструю модель.', en: 'The provider did not answer within a minute. Try again or choose a faster model.', kk: 'Провайдер бір минутта жауап бермеді. Қайта көріңіз немесе жылдамырақ модель таңдаңыз.'},
    'ai.err.stopped': {ru: 'Запрос прерван.', en: 'The request was stopped.', kk: 'Сұраныс тоқтатылды.'},
    'ai.err.nocontent': {ru: 'Провайдер вернул пустой ответ. Попробуйте другую модель.', en: 'The provider returned an empty answer. Try another model.', kk: 'Провайдер бос жауап қайтарды. Басқа модельді көріңіз.'},
    'ai.fallback': {ru: 'Внешняя модель недоступна ({reason}). Отвечаю по курсу:', en: 'The external model is unavailable ({reason}). Answering from the course:', kk: 'Сыртқы модель қолжетімсіз ({reason}). Курс бойынша жауап беремін:'},
    'ai.stop': {ru: 'Остановить', en: 'Stop', kk: 'Тоқтату'},
    'ai.copy': {ru: 'Скопировать ответ', en: 'Copy the answer', kk: 'Жауапты көшіру'},
    'ai.copied': {ru: 'Ответ скопирован.', en: 'The answer is copied.', kk: 'Жауап көшірілді.'},
    'ai.retry': {ru: 'Ещё раз', en: 'Once more', kk: 'Тағы бір рет'},
    'ai.settings': {ru: 'Настройки ИИ', en: 'AI settings', kk: 'ЖИ параметрлері'},

    /* ---- Страница «ИИ-наставник» ---- */
    'ai.page.desc': {
        ru: 'Помощник работает в двух режимах. Локальный включается сразу и ищет ответ в теории и заданиях курса. Внешняя модель — бесплатный провайдер без карты (Groq, Google AI Studio, OpenRouter) или любой другой с OpenAI-совместимым API — отвечает свободным текстом, разбирает задания по шагам и придумывает новые задачи с таблицами данных.',
        en: 'The assistant works in two modes. The local one starts at once and searches the theory and the tasks of the course. An external model — a free provider without a card (Groq, Google AI Studio, OpenRouter) or any other OpenAI-compatible one — writes free-form answers, walks through tasks step by step and invents new tasks with data tables.',
        kk: 'Көмекші екі режимде жұмыс істейді. Жергілікті режим бірден қосылып, жауапты курстың теориясы мен тапсырмаларынан іздейді. Сыртқы модель — картасыз тегін провайдер (Groq, Google AI Studio, OpenRouter) немесе OpenAI-үйлесімді API бар өзге қызмет — еркін мәтінмен жауап береді, тапсырмаларды қадамдап талдайды және деректер кестелерімен жаңа тапсырма құрастырады.'
    },
    'ai.page.drawer': {ru: 'Панель помощника открывается на любой странице', en: 'The assistant panel opens on any page', kk: 'Көмекші панелі кез келген бетте ашылады'},
    'ai.page.drawerHint': {
        ru: 'Нажмите кнопку «ИИ-помощник» в правом нижнем углу: панель видит текущую тему или задание. В карточках заданий есть кнопки «Разбор по шагам», «Проверить мой ответ» и «Похожая задача».',
        en: 'Press the “AI assistant” button in the bottom-right corner: the panel knows the current topic or task. Task cards carry “Step-by-step help”, “Check my answer” and “Similar task” buttons.',
        kk: 'Төменгі оң жақтағы «ЖИ-көмекші» түймесін басыңыз: панель ағымдағы тақырыпты немесе тапсырманы көреді. Тапсырма карточкаларында «Қадамдап талдау», «Жауабымды тексеру» және «Ұқсас тапсырма» түймелері бар.'
    },
    'ai.rec.title': {ru: 'Рекомендации', en: 'Recommendations', kk: 'Ұсыныстар'},
    'ai.studio.title': {ru: 'Генератор задач', en: 'Task generator', kk: 'Тапсырма генераторы'},
    'ai.studio.topic': {ru: 'Тема', en: 'Topic', kk: 'Тақырып'},
    'ai.studio.count': {ru: 'Сколько задач', en: 'How many tasks', kk: 'Қанша тапсырма'},
    'ai.studio.make': {ru: 'Сгенерировать задачу', en: 'Generate a task', kk: 'Тапсырма құрастыру'},
    'ai.studio.makeMore': {ru: 'Добавить ещё', en: 'Add one more', kk: 'Тағы қосу'},
    'ai.studio.making': {ru: 'Генерирую задачу…', en: 'Generating a task…', kk: 'Тапсырма құрастырылуда…'},
    'ai.studio.makingSet': {ru: 'Генерирую задачи…', en: 'Generating tasks…', kk: 'Тапсырмалар құрастырылуда…'},
    'ai.studio.local': {ru: 'Без ключа задачи берутся из курса: условие, таблицы данных и график показываются полностью.', en: 'Without a key the tasks come from the course: the statement, the data tables and the chart are shown in full.', kk: 'Кілтсіз тапсырмалар курстан алынады: шарты, деректер кестелері және график толық көрсетіледі.'},
    'ai.studio.mine': {ru: 'Мои сгенерированные задачи', en: 'My generated tasks', kk: 'Менің құрастырған тапсырмаларым'},
    'ai.studio.empty': {ru: 'Пока пусто. Сгенерируйте задачу — она останется здесь и сохранится на этом устройстве.', en: 'Nothing yet. Generate a task and it will stay here, saved on this device.', kk: 'Әзірге бос. Тапсырма құрастырыңыз — ол осында қалады және осы құрылғыда сақталады.'},
    'ai.studio.added': {ru: 'Задача добавлена в «Мои задачи».', en: 'The task was added to “My tasks”.', kk: 'Тапсырма «Менің тапсырмаларымға» қосылды.'},
    'ai.studio.removed': {ru: 'Задача удалена.', en: 'The task was removed.', kk: 'Тапсырма жойылды.'},
    'ai.studio.remove': {ru: 'Удалить', en: 'Remove', kk: 'Жою'},
    'ai.studio.answer': {ru: 'Ваш ответ', en: 'Your answer', kk: 'Сіздің жауабыңыз'},
    'ai.studio.check': {ru: 'Проверить', en: 'Check', kk: 'Тексеру'},
    'ai.studio.solution': {ru: 'Решение', en: 'Solution', kk: 'Шешімі'},
    'ai.studio.hint': {ru: 'Подсказка', en: 'Hint', kk: 'Кеңес'},
    'ai.studio.solutionHidden': {ru: 'Показать решение', en: 'Show the solution', kk: 'Шешімді көрсету'},
    'ai.studio.askAi': {ru: 'Проверить с ИИ', en: 'Check with the AI', kk: 'ЖИ-мен тексеру'},
    'ai.studio.askAiHint': {ru: 'Для ответов словами подключите внешнюю модель: локально проверяются числа и варианты.', en: 'For worded answers connect an external model: numbers and choices are checked locally.', kk: 'Сөзбен жазылған жауаптар үшін сыртқы модельді қосыңыз: сандар мен нұсқалар жергілікті тексеріледі.'},
    'ai.studio.source': {ru: 'Источник', en: 'Source', kk: 'Дереккөз'},
    'ai.studio.fromCourse': {ru: 'из курса', en: 'from the course', kk: 'курстан'},
    'ai.studio.fromModel': {ru: 'от модели', en: 'from the model', kk: 'модельден'},
    'ai.studio.fill': {ru: 'Введите ответ, чтобы проверить.', en: 'Enter an answer to check it.', kk: 'Тексеру үшін жауап енгізіңіз.'},
    'ai.studio.verdictOk': {ru: 'Верно: локальная проверка по данным курса даёт тот же результат.', en: 'Correct: the local check against the course data gives the same result.', kk: 'Дұрыс: курс деректері бойынша жергілікті тексеру бірдей нәтиже береді.'},
    'ai.studio.verdictNo': {ru: 'Пока не совпало. Посмотрите подсказку и разбор шагов.', en: 'Not yet. Look at the hint and the step-by-step solution.', kk: 'Әзірге сәйкескен жоқ. Кеңес пен қадамдық талдауды қараңыз.'},
    'ai.studio.noAnswer': {ru: 'У этой задачи нет числового ключа: проверку делает внешняя модель.', en: 'This task has no numeric key: the external model does the check.', kk: 'Бұл тапсырмада сандық кілт жоқ: тексеруді сыртқы модель жасайды.'},

    /* ---- Подключение провайдера ---- */
    'ai.setup.title': {ru: 'Подключение внешней модели (необязательно)', en: 'Connect an external model (optional)', kk: 'Сыртқы модельді қосу (міндетті емес)'},
    'ai.setup.provider': {ru: 'Провайдер', en: 'Provider', kk: 'Провайдер'},
    'ai.setup.base': {ru: 'Базовый адрес API (OpenAI-совместимый)', en: 'API base URL (OpenAI-compatible)', kk: 'API базалық мекенжайы (OpenAI-үйлесімді)'},
    'ai.setup.model': {ru: 'Модель', en: 'Model', kk: 'Модель'},
    'ai.setup.key': {ru: 'API-ключ', en: 'API key', kk: 'API кілті'},
    'ai.setup.keyHint': {ru: 'вставьте ключ из кабинета провайдера: gsk_…, AIza…, sk-or-…', en: 'paste the key from the provider dashboard: gsk_…, AIza…, sk-or-…', kk: 'провайдер кабинетінен кілтті қойыңыз: gsk_…, AIza…, sk-or-…'},
    'ai.setup.group.free': {ru: 'Бесплатные: ключ без платёжных данных', en: 'Free: a key without payment details', kk: 'Тегін: кілт төлем деректерінсіз'},
    'ai.setup.group.paid': {ru: 'Платные: нужен баланс', en: 'Paid: a balance is required', kk: 'Ақылы: баланс керек'},
    'ai.setup.group.local': {ru: 'Локальные и свой адрес', en: 'Local and custom', kk: 'Жергілікті және өз мекенжайы'},
    'ai.setup.enabled': {ru: 'Использовать внешнюю модель', en: 'Use an external model', kk: 'Сыртқы модельді қолдану'},
    'ai.setup.stream': {ru: 'Показывать ответ по мере появления', en: 'Show the answer as it arrives', kk: 'Жауапты пайда болған сайын көрсету'},
    'ai.setup.save': {ru: 'Сохранить настройки', en: 'Save the settings', kk: 'Параметрлерді сақтау'},
    'ai.setup.saved': {ru: 'Настройки ИИ сохранены.', en: 'The AI settings are saved.', kk: 'ЖИ параметрлері сақталды.'},
    'ai.setup.test': {ru: 'Проверить подключение', en: 'Test the connection', kk: 'Қосылымды тексеру'},
    'ai.setup.models': {ru: 'Загрузить список моделей', en: 'Load the model list', kk: 'Модельдер тізімін жүктеу'},
    'ai.setup.testing': {ru: 'Проверяю подключение…', en: 'Testing the connection…', kk: 'Қосылым тексерілуде…'},
    'ai.setup.testOk': {ru: 'Подключение работает. Доступных моделей: {n}.', en: 'The connection works. Models available: {n}.', kk: 'Қосылым жұмыс істейді. Қолжетімді модельдер: {n}.'},
    'ai.setup.testOkChat': {ru: 'Подключение работает: провайдер ответил на пробный запрос.', en: 'The connection works: the provider answered the test request.', kk: 'Қосылым жұмыс істейді: провайдер сынақ сұранысына жауап берді.'},
    'ai.setup.testFail': {ru: 'Не получилось подключиться: {reason}', en: 'Could not connect: {reason}', kk: 'Қосылу мүмкін болмады: {reason}'},
    'ai.setup.modelsOk': {ru: 'Список моделей обновлён: {n} названий. Выберите подходящее.', en: 'The model list is updated: {n} names. Choose one.', kk: 'Модельдер тізімі жаңартылды: {n} атау. Біреуін таңдаңыз.'},
    'ai.setup.modelsFail': {ru: 'Список моделей недоступен, но запросы могут работать: впишите название модели вручную.', en: 'The model list is unavailable, but requests may still work: type the model name manually.', kk: 'Модельдер тізімі қолжетімсіз, бірақ сұраныстар жұмыс істеуі мүмкін: модель атауын қолмен жазыңыз.'},
    'ai.setup.noKey': {ru: 'Ключ не задан — работает локальный режим.', en: 'No key yet — the local mode works.', kk: 'Кілт жоқ — жергілікті режим жұмыс істейді.'},
    'ai.setup.ready': {ru: 'Ключ сохранён: вопросы и генерация задач идут во внешнюю модель.', en: 'The key is saved: questions and task generation go to the external model.', kk: 'Кілт сақталды: сұрақтар мен тапсырма құрастыру сыртқы модельге жіберіледі.'},
    'ai.setup.storage': {
        ru: 'Ключ хранится только в localStorage этого браузера и отправляется напрямую на выбранный адрес. Для класса берите отдельный ключ с небольшим балансом и удаляйте его в кабинете провайдера после занятий.',
        en: 'The key is kept only in this browser’s localStorage and goes straight to the chosen address. For a class, use a separate key with a small balance and delete it in the provider dashboard after the lesson.',
        kk: 'Кілт тек осы браузердің localStorage қоймасында сақталады және тікелей таңдалған мекенжайға жіберіледі. Сынып үшін шағын балансы бар бөлек кілт алыңыз да, сабақтан кейін провайдер кабинетінде жойыңыз.'
    },
    'ai.setup.offlineNote': {
        ru: 'При офлайн-работе внешняя модель недоступна: курс продолжает отвечать локально. Во время контрольной работы кнопки ИИ скрыты.',
        en: 'Offline the external model is unavailable: the course keeps answering locally. During a test the AI buttons are hidden.',
        kk: 'Офлайн режимде сыртқы модель қолжетімсіз: курс жергілікті жауап беруді жалғастырады. Бақылау жұмысы кезінде ЖИ түймелері жасырылады.'
    },
    'ai.guide.title': {ru: 'Где взять API-ключ: {name}', en: 'Where to get the API key: {name}', kk: 'API кілтін қайдан алуға болады: {name}'},
    'ai.guide.links': {ru: 'Ссылки провайдера', en: 'Provider links', kk: 'Провайдер сілтемелері'},
    'ai.guide.key': {ru: 'Ключи API', en: 'API keys', kk: 'API кілттері'},
    'ai.guide.docs': {ru: 'Документация', en: 'Documentation', kk: 'Құжаттама'},
    'ai.guide.price': {ru: 'Цены и лимиты', en: 'Prices and limits', kk: 'Бағалар мен шектеулер'},
    'ai.guide.steps': {ru: 'Шаги', en: 'Steps', kk: 'Қадамдар'},
    'ai.guide.tips': {ru: 'Что важно знать', en: 'Good to know', kk: 'Білу маңызды'},
    'ai.guide.browser': {ru: 'Запросы прямо из браузера: да', en: 'Browser requests: yes', kk: 'Браузерден сұраныс: иә'},
    'ai.guide.local': {ru: 'Локальная модель: интернет не нужен', en: 'Local model: no internet needed', kk: 'Жергілікті модель: интернет қажет емес'},
    'ai.guide.paid': {ru: 'Нужен баланс в кабинете провайдера', en: 'A balance in the provider dashboard is required', kk: 'Провайдер кабинетінде баланс қажет'},
    'ai.guide.free': {ru: 'Есть бесплатный тариф или пробный баланс', en: 'A free tier or trial balance is available', kk: 'Тегін тариф немесе сынақ балансы бар'},
    'ai.guide.noCard': {ru: 'Ключ без карты: платёжные данные не нужны', en: 'Key without a card: no payment details needed', kk: 'Кілт картасыз: төлем деректері қажет емес'},
    'ai.guide.dataNote': {ru: 'На бесплатном уровне содержимое запросов может использоваться для улучшения продуктов провайдера — не отправляйте персональные данные.', en: 'On the free tier the content of your requests may be used to improve the provider products — do not send personal data.', kk: 'Тегін деңгейде сұраныс мазмұны провайдер өнімдерін жақсартуға пайдаланылуы мүмкін — жеке деректерді жібермеңіз.'},
    'ai.limits.title': {ru: 'Лимиты {name} из заголовков ответа', en: 'Limits of {name} from the response headers', kk: '{name} шектеулері жауап тақырыпшаларында'},
    'ai.limits.hint': {ru: 'Остаток по счётчикам провайдера появится здесь после первого ответа: он приходит в заголовках, заходить в кабинет не нужно.', en: 'The remaining provider counters will appear here after the first answer: they arrive in the headers, no trip to the dashboard is needed.', kk: 'Провайдер счётчиктерінің қалдығы бірінші жауаптан кейін осында шығады: ол тақырыпшаларда келеді, кабинетке кірудің қажеті жоқ.'},
    'ai.limits.counter': {ru: '{kind}: осталось {remaining} из {limit}', en: '{kind}: {remaining} of {limit} left', kk: '{kind}: {limit} ішінен {remaining} қалды'},
    'ai.limits.counterNoLimit': {ru: '{kind}: осталось {remaining}', en: '{kind}: {remaining} left', kk: '{kind}: {remaining} қалды'},
    'ai.limits.kind.requests': {ru: 'запросы', en: 'requests', kk: 'сұраныстар'},
    'ai.limits.kind.tokens': {ru: 'токены', en: 'tokens', kk: 'токендер'},
    'ai.limits.kind.generic': {ru: 'запросы и токены', en: 'requests and tokens', kk: 'сұраныстар мен токендер'},
    'ai.limits.reset': {ru: 'обновление через {reset}', en: 'reset in {reset}', kk: 'жаңаруы {reset} кейін'},
    'ai.limits.retry': {ru: 'повторить можно через {seconds} с', en: 'you may retry in {seconds} s', kk: 'қайталауға {seconds} с кейін болады'},
    'ai.limits.none': {ru: 'Провайдер не прислал лимиты в заголовках ответа.', en: 'The provider sent no limits in the response headers.', kk: 'Провайдер жауап тақырыпшаларында шектеулерді жібермеді.'},
    'ai.free.title': {ru: 'Бесплатные провайдеры без карты', en: 'Free providers without a card', kk: 'Картасыз тегін провайдерлер'},
    'ai.free.give': {ru: 'Что даёт бесплатно', en: 'What you get for free', kk: 'Тегін не береді'},
    'ai.free.catch': {ru: 'В чём подвох', en: 'What the catch is', kk: 'Айласы неде'},
    'ai.free.groq.give': {ru: 'Ключ без карты и быстрые открытые модели', en: 'A key without a card and fast open-weight models', kk: 'Картасыз кілт және жылдам ашық модельдер'},
    'ai.free.groq.catch': {ru: 'Лимиты считаются по четырём величинам сразу (запросы и токены в минуту и в сутки): сработает та, до которой вы дойдёте первой. С российского адреса консоль отвечает отказом — тогда выбирайте другого провайдера.', en: 'Limits are counted on four scales at once (requests and tokens per minute and per day): whichever you reach first stops you. From a Russian address the console refuses to open — choose another provider then.', kk: 'Шектеулер бірден төрт шамамен есептеледі (минуттағы және тәуліктегі сұраныс пен токен): қайсысына бірінші жетсеңіз, сол тоқтатады. Ресейлік мекенжайдан консоль ашылмайды — онда басқа провайдер таңдаңыз.'},
    'ai.free.gemini.give': {ru: 'Настоящий бесплатный уровень: входные и выходные токены не стоят ничего, карта не нужна', en: 'A genuine free tier: input and output tokens cost nothing and no card is needed', kk: 'Шынайы тегін деңгей: кіріс және шығыс токендер ақыға тұрмайды, карта қажет емес'},
    'ai.free.gemini.catch': {ru: 'Плата — данными: содержимое запросов бесплатного уровня Google использует для улучшения продуктов (у платного уровня — «нет»). Точных цифр лимитов в документации больше нет: смотреть их нужно в AI Studio.', en: 'The price is your data: Google uses free-tier request content to improve its products (the paid tier does not). The docs no longer publish exact limits: read them in AI Studio.', kk: 'Ақы — деректер: Google тегін деңгейдегі сұраныс мазмұнын өнімдерін жақсартуға пайдаланады (ақылы деңгейде — «жоқ»). Құжаттамада нақты шектеу сандары енді жоқ: оларды AI Studio-дан қарау керек.'},
    'ai.free.openrouter.give': {ru: 'Один ключ без карты открывает десятки моделей разных разработчиков', en: 'One key without a card opens dozens of models from different vendors', kk: 'Бір кілт картасыз ондаған модельді ашады'},
    'ai.free.openrouter.catch': {ru: 'Бесплатны только модели с хвостом :free: 20 запросов в минуту и 50 в сутки (1000 после однократного пополнения на $10). Неудачные попытки тоже считаются.', en: 'Only models whose name ends with :free are free: 20 requests per minute and 50 per day (1,000 after a one-time $10 top-up). Failed attempts count too.', kk: 'Тек атауы :free болып аяқталатын модельдер тегін: минутына 20 және тәулігіне 50 сұраныс (бір рет $10 толтырғанда 1000). Сәтсіз әрекеттер де есептеледі.'},
    'ai.free.mistral.give': {ru: 'Бесплатный режим «Experiment», карта не нужна', en: 'The free “Experiment” mode, no card needed', kk: '«Experiment» тегін режимі, карта қажет емес'},
    'ai.free.mistral.catch': {ru: 'Нужна проверка телефона, а запросы бесплатного режима могут идти на улучшение моделей.', en: 'A phone check is required, and free-mode requests may be used to improve the models.', kk: 'Телефонды растау керек, ал тегін режимдегі сұраныстар модельді жақсартуға кетуі мүмкін.'},
    'ai.free.local.give': {ru: 'Ollama и LM Studio: оплата и интернет не нужны, данные не покидают компьютер', en: 'Ollama and LM Studio: no payment and no internet needed, data never leaves the computer', kk: 'Ollama және LM Studio: ақы мен интернет қажет емес, деректер компьютерден шықпайды'},
    'ai.free.local.catch': {ru: 'Нужен компьютер с запасом памяти: качество ответов зависит от размера модели.', en: 'A computer with spare memory is required: answer quality depends on the model size.', kk: 'Жадысы жеткілікті компьютер керек: жауап сапасы модель көлеміне байланысты.'},
    'ai.table.caption': {ru: 'Таблица из ответа модели', en: 'Table from the model answer', kk: 'Модель жауабындағы кесте'},
    'ai.errors.title': {ru: 'Частые ошибки и что делать', en: 'Common errors and what to do', kk: 'Жиі кездесетін қателер және не істеу керек'},
    'ai.errors.code': {ru: 'Код или сообщение', en: 'Code or message', kk: 'Код немесе хабарлама'},
    'ai.errors.meaning': {ru: 'Что означает', en: 'What it means', kk: 'Нені білдіреді'},
    'ai.errors.action': {ru: 'Что сделать', en: 'What to do', kk: 'Не істеу керек'},
    'ai.errors.howto.title': {ru: 'Как это устроено', en: 'How it works', kk: 'Бұл қалай жұмыс істейді'},
    'ai.errors.howto': {
        ru: 'Курс — один файл без сервера: браузер сам обращается к API провайдера, поэтому провайдер должен разрешать запросы из браузера (CORS). Ключ лежит в localStorage, в файл курса и в архив он не попадает. Без ключа помощник остаётся полностью рабочим: он отвечает по теории и заданиям курса. У бесплатных провайдеров лимиты считаются по запросам и токенам сразу за минуту и за сутки: остаток приходит в заголовках ответа и виден в строке лимитов.',
        en: 'The course is a single file without a server: the browser calls the provider API itself, so the provider must allow browser requests (CORS). The key lives in localStorage and never enters the course file or the kit archive. Without a key the assistant still works: it answers from the theory and the tasks of the course. Free providers count limits on requests and tokens per minute and per day: the remaining values arrive in the response headers and are shown in the limits line.',
        kk: 'Курс — серверсіз бір файл: браузер провайдердің API-іне өзі жүгінеді, сондықтан провайдер браузерден сұранысқа рұқсат беруі керек (CORS). Кілт localStorage қоймасында жатыр, курс файлына және архивке түспейді. Кілтсіз де көмекші толық жұмыс істейді: ол курстың теориясы мен тапсырмалары бойынша жауап береді. Тегін провайдерлерде шектеулер сұраныс пен токен бойынша минутқа және тәулікке саналады: қалдық жауап тақырыпшаларында келеді және шектеулер жолында көрінеді.'
    },
    'ai.how.step1': {ru: 'Начните с бесплатного провайдера без карты — Groq, Google AI Studio или OpenRouter — и получите ключ по шагам ниже.', en: 'Start with a free provider without a card — Groq, Google AI Studio or OpenRouter — and get a key using the steps below.', kk: 'Картасыз тегін провайдерден бастаңыз — Groq, Google AI Studio немесе OpenRouter — кілтті төмендегі қадамдармен алыңыз.'},
    'ai.how.step2': {ru: 'Вставьте ключ и проверьте подключение кнопкой «Проверить подключение».', en: 'Paste the key and test it with the “Test the connection” button.', kk: 'Кілтті қойып, «Қосылымды тексеру» түймесімен тексеріңіз.'},
    'ai.how.step3': {ru: 'Сохраните настройки: вопросы, разбор заданий и генерация пойдут во внешнюю модель.', en: 'Save the settings: questions, task help and generation will go to the external model.', kk: 'Параметрлерді сақтаңыз: сұрақтар, тапсырма талдау және құрастыру сыртқы модельге жіберіледі.'},
    'ai.how.step4': {ru: 'Ключ хранится только в этом браузере; его можно удалить в любой момент.', en: 'The key is kept only in this browser and can be deleted at any time.', kk: 'Кілт тек осы браузерде сақталады; оны кез келген уақытта жоюға болады.'}
};

function aiLang() { return AI_LANGS.includes(LANG) ? LANG : 'ru' }
function ait(key, vars) {
    const entry = AI_TEXT[key];
    let text = entry ? (entry[aiLang()] || entry.ru || key) : key;
    if (vars) for (const name of Object.keys(vars)) text = text.split('{' + name + '}').join(String(vars[name]));
    return text
}

/* ---- Каталог провайдеров с OpenAI-совместимым API --------------------- */
/* base — базовый адрес: к нему добавляется /chat/completions и /models.
   guide.steps и guide.tips — подсказки, где взять ключ и на что смотреть. */
const AI_PROVIDERS = [
    {
        id: 'groq', name: 'Groq',
        base: 'https://api.groq.com/openai/v1',
        models: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3-32b'],
        keyUrl: 'https://console.groq.com/keys',
        docsUrl: 'https://console.groq.com/docs/openai',
        priceUrl: 'https://console.groq.com/docs/rate-limits',
        browser: true, paid: false, free: true, noCard: true,
        guide: {
            ru: {
                steps: [
                    'Откройте консоль Groq: https://console.groq.com — вход по e-mail или через аккаунт Google.',
                    'Откройте раздел «API Keys»: https://console.groq.com/keys',
                    'Нажмите «Create API Key», задайте имя (например, statpracticum-class) и скопируйте ключ gsk_… — он показывается один раз.',
                    'Платёжные данные не спрашивают: бесплатный тариф включается сразу после регистрации.',
                    'Вставьте ключ в поле «API-ключ», нажмите «Загрузить список моделей» и выберите модель из списка.',
                    'Нажмите «Проверить подключение», затем «Сохранить настройки».'
                ],
                tips: [
                    'Лимиты считаются сразу по четырём величинам: запросы в минуту (RPM), токены в минуту (TPM), запросы в сутки (RPD) и токены в сутки (TPD). Сработает та, до которой вы дойдёте первой.',
                    'Точные значения зависят от организации: смотрите страницу лимитов в настройках аккаунта https://console.groq.com/settings/limits',
                    'Остаток по каждому счётчику приходит в заголовках ответа (x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, x-ratelimit-reset-…). Курс показывает его под полем «API-ключ» и в панели помощника — в интерфейс заходить не нужно.',
                    'Лимиты общие на организацию: второй ключ в том же аккаунте остатка не увеличит.',
                    'Регион: с российского адреса консоль отвечает отказом, поэтому ключ там не выдать. В этом случае возьмите Google AI Studio или OpenRouter — там ключ тоже выдают без карты.',
                    'Ответы приходят очень быстро, но модели открытые: на длинных рассуждениях они уступают платным. При ошибке 429 подождите столько секунд, сколько указано в поле «повторить через».'
                ]
            },
            en: {
                steps: [
                    'Open the Groq console: https://console.groq.com — sign in with e-mail or a Google account.',
                    'Open “API Keys”: https://console.groq.com/keys',
                    'Press “Create API Key”, give it a name (for example statpracticum-class) and copy the gsk_… key — it is shown once.',
                    'No payment details are asked for: the free tier starts right after sign-up.',
                    'Paste the key into the “API key” field, press “Load the model list” and pick a model from the list.',
                    'Press “Test the connection”, then “Save the settings”.'
                ],
                tips: [
                    'Limits are counted on four scales at once: requests per minute (RPM), tokens per minute (TPM), requests per day (RPD) and tokens per day (TPD). Whichever you reach first is the one that stops you.',
                    'The exact values depend on the organization: see the limits page in the account settings https://console.groq.com/settings/limits',
                    'The remaining counters arrive in the response headers (x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, x-ratelimit-reset-…). The course shows them under the “API key” field and in the assistant panel, so no trip to the dashboard is needed.',
                    'Limits are shared by the organization: a second key in the same account adds no quota.',
                    'Region: from a Russian address the console refuses to open, so a key cannot be issued there. In that case take Google AI Studio or OpenRouter — both issue a key without a card as well.',
                    'Answers arrive very fast, but the models are open-weight: on long reasoning they are weaker than paid ones. On a 429 error wait the number of seconds shown as “retry after”.'
                ]
            },
            kk: {
                steps: [
                    'Groq консолін ашыңыз: https://console.groq.com — e-mail немесе Google аккаунтымен кіріңіз.',
                    '«API Keys» бөлімін ашыңыз: https://console.groq.com/keys',
                    '«Create API Key» түймесін басып, атау жазыңыз (мысалы, statpracticum-class) және gsk_… кілтін көшіріңіз — ол бір рет көрсетіледі.',
                    'Төлем деректері сұралмайды: тегін тариф тіркелгеннен кейін бірден қосылады.',
                    'Кілтті «API кілті» өрісіне қойып, «Модельдер тізімін жүктеу» түймесін басып, тізімнен модель таңдаңыз.',
                    '«Қосылымды тексеру», содан кейін «Параметрлерді сақтау» түймесін басыңыз.'
                ],
                tips: [
                    'Шектеулер бірден төрт шамамен есептеледі: минуттағы сұраныс (RPM), минуттағы токен (TPM), тәуліктегі сұраныс (RPD) және тәуліктегі токен (TPD). Қайсысына бірінші жетсеңіз, сол тоқтатады.',
                    'Нақты мәндер ұйымға байланысты: аккаунт параметрлеріндегі шектеулер бетін қараңыз https://console.groq.com/settings/limits',
                    'Әр счётчиктің қалдығы жауап тақырыпшаларында келеді (x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, x-ratelimit-reset-…). Курс оларды «API кілт» өрісінің астында және көмекші панелінде көрсетеді — кабинетке кірудің қажеті жоқ.',
                    'Шектеулер ұйымға ортақ: сол аккаунттағы екінші кілт қалдықты көбейтпейді.',
                    'Аймақ: ресейлік мекенжайдан консоль ашылмайды, сондықтан кілт алу мүмкін емес. Бұл жағдайда Google AI Studio немесе OpenRouter алыңыз — олар да кілтті картасыз береді.',
                    'Жауаптар өте жылдам келеді, бірақ модельдер ашық: ұзақ талдауда ақылы модельдерден әлсіздеу. 429 қатесінде «қайталау» өрісіндегі секунд қадарын күтіңіз.'
                ]
            }
        }
    },
    {
        id: 'gemini', name: 'Google AI Studio (Gemini)',
        base: 'https://generativelanguage.googleapis.com/v1beta/openai',
        models: ['gemini-2.5-flash'],
        keyUrl: 'https://aistudio.google.com/apikey',
        docsUrl: 'https://ai.google.dev/gemini-api/docs/openai',
        priceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
        browser: true, paid: false, free: true, noCard: true,
        guide: {
            ru: {
                steps: [
                    'Откройте Google AI Studio: https://aistudio.google.com/apikey и войдите в аккаунт Google.',
                    'Нажмите «Create API key» и выберите проект Google Cloud (или создайте новый).',
                    'Платёжный аккаунт не нужен: на бесплатном уровне ключ AIza… выдают без карты.',
                    'Скопируйте ключ и вставьте его в поле «API-ключ».',
                    'Проверьте базовый адрес: для Gemini он заканчивается на /v1beta/openai.',
                    'Нажмите «Загрузить список моделей», затем «Проверить подключение» и «Сохранить настройки».'
                ],
                tips: [
                    'Бесплатный уровень настоящий: входные и выходные токены не стоят ничего, платить за них не нужно.',
                    'Плата — другая, и она указана в самом прайсе: в таблицах есть строка об использовании содержимого запросов для улучшения продуктов компании. На бесплатном уровне там стоит «да», на платном — «нет». Не отправляйте сюда персональные данные учеников.',
                    'Конкретных значений лимитов в документации больше нет: она отвечает, что лимиты зависят от нескольких факторов, а смотреть их нужно в самом AI Studio. Круглые числа из чужих подборок перепроверяйте у себя в аккаунте.',
                    'Переход на первый платный уровень требует привязанного платёжного аккаунта и потолка трат. Переключение с бесплатного уровня срабатывает практически сразу, последующие — в течение десяти минут.',
                    'Иногда в проекте Google Cloud нужно включить Generative Language API — ссылка есть на странице ключей. Базовый адрес уже подставлен: менять его нужно только для другого региона или прокси.'
                ]
            },
            en: {
                steps: [
                    'Open Google AI Studio: https://aistudio.google.com/apikey and sign in with a Google account.',
                    'Press “Create API key” and choose a Google Cloud project (or create a new one).',
                    'No billing account is needed: on the free tier the AIza… key is issued without a card.',
                    'Copy the key and paste it into the “API key” field.',
                    'Check the base URL: for Gemini it ends with /v1beta/openai.',
                    'Press “Load the model list”, then “Test the connection” and “Save the settings”.'
                ],
                tips: [
                    'The free tier is real: input and output tokens cost nothing, there is no bill for them.',
                    'The price is different and it is written in the price list itself: the tables carry a row about whether the content of your requests is used to improve the company products. On the free tier it says “yes”, on the paid one “no”. Do not send students’ personal data here.',
                    'The documentation no longer gives exact limit values: it answers that limits depend on several factors and should be read in AI Studio itself. Round numbers from third-party round-ups are worth re-checking in your own account.',
                    'Moving to the first paid tier requires a linked billing account and a spending cap. The switch from the free tier takes effect almost at once, later tiers within ten minutes.',
                    'Sometimes the Generative Language API must be enabled in the Google Cloud project — the link is on the keys page. The base URL is pre-filled: change it only for another region or a proxy.'
                ]
            },
            kk: {
                steps: [
                    'Google AI Studio ашыңыз: https://aistudio.google.com/apikey — Google аккаунтымен кіріңіз.',
                    '«Create API key» түймесін басып, Google Cloud жобасын таңдаңыз (немесе жаңасын жасаңыз).',
                    'Төлем аккаунты қажет емес: тегін деңгейде AIza… кілті картасыз беріледі.',
                    'Кілтті көшіріп, «API кілті» өрісіне қойыңыз.',
                    'Базалық мекенжайды тексеріңіз: Gemini үшін ол /v1beta/openai болып аяқталады.',
                    '«Модельдер тізімін жүктеу», содан кейін «Қосылымды тексеру» және «Параметрлерді сақтау» түймесін басыңыз.'
                ],
                tips: [
                    'Тегін деңгей шынайы: кіріс және шығыс токендер ақыға тұрмайды, олар үшін төлеу керек емес.',
                    'Ақы — басқа, және ол прайстың өзінде жазылған: кестелерде сұраныс мазмұны компания өнімдерін жақсартуға пайдаланыла ма деген жол бар. Тегін деңгейде «иә», ақылы деңгейде «жоқ» деп тұр. Оқушылардың жеке деректерін мұнда жібермеңіз.',
                    'Құжаттамада нақты шектеу мәндері енді жоқ: ол шектеулер бірнеше факторға байланысты, оларды AI Studio-ның өзінен қарау керек деп жауап береді. Бөгде тізімдердегі дөңгелек сандарды өз аккаунтыңызда тексеріп алыңыз.',
                    'Бірінші ақылы деңгейге өту үшін төлем аккаунты мен шығыс шегі қажет. Тегін деңгейден ауысу дерлік бірден, кейінгілері он минут ішінде іске асады.',
                    'Кейде Google Cloud жобасында Generative Language API қосу керек — сілтеме кілттер бетінде. Базалық мекенжай алдын ала қойылған: оны тек басқа аймақ немесе прокси үшін өзгертіңіз.'
                ]
            }
        }
    },
    {
        id: 'openrouter', name: 'OpenRouter',
        base: 'https://openrouter.ai/api/v1',
        models: ['openrouter/free', 'deepseek/deepseek-chat-v3:free'],
        keyUrl: 'https://openrouter.ai/keys',
        docsUrl: 'https://openrouter.ai/docs/quickstart',
        priceUrl: 'https://openrouter.ai/models?max_price=0',
        browser: true, paid: false, free: true, noCard: true,
        guide: {
            ru: {
                steps: [
                    'Зарегистрируйтесь на https://openrouter.ai (достаточно e-mail или входа через Google).',
                    'Откройте «Keys» и нажмите «Create key»: https://openrouter.ai/keys',
                    'Скопируйте ключ sk-or-… и вставьте его в поле «API-ключ» на этой странице.',
                    'Нажмите «Загрузить список моделей» и выберите модель с хвостом :free — только такие модели бесплатны.',
                    'Нажмите «Проверить подключение» и «Сохранить настройки».'
                ],
                tips: [
                    'Метка бесплатной модели — хвост :free в идентификаторе, например deepseek/deepseek-chat-v3:free. Без этого хвоста модель тарифицируется по токенам.',
                    'Бесплатный тариф: 20 запросов в минуту и 50 в сутки; после однократного пополнения на $10 суточный лимит поднимается до 1000 запросов. Неудачные попытки тоже считаются.',
                    'Если не хочется выбирать конкретную модель, впишите openrouter/free: маршрутизатор сам отдаст запрос подходящей бесплатной модели.',
                    'Один ключ без карты открывает десятки моделей разных разработчиков — удобно сравнить ответы.',
                    'Бесплатные модели провайдеры иногда используют для обучения, поэтому не отправляйте им личные данные учеников.'
                ]
            },
            en: {
                steps: [
                    'Sign up at https://openrouter.ai (an e-mail or a Google login is enough).',
                    'Open “Keys” and press “Create key”: https://openrouter.ai/keys',
                    'Copy the sk-or-… key and paste it into the “API key” field on this page.',
                    'Press “Load the model list” and pick a model whose name ends with :free — only those are free of charge.',
                    'Press “Test the connection” and “Save the settings”.'
                ],
                tips: [
                    'The mark of a free model is the :free tail in its identifier, for example deepseek/deepseek-chat-v3:free. Without that tail the model is billed per token.',
                    'The free tier allows 20 requests per minute and 50 per day; a one-time $10 top-up raises the daily cap to 1,000 requests. Failed attempts count too.',
                    'If you would rather not choose a specific model, type openrouter/free: the router sends the request to a suitable free model itself.',
                    'One key without a card opens dozens of models from different vendors — handy for comparing answers.',
                    'Providers sometimes use free models for training, so do not send students’ personal data to them.'
                ]
            },
            kk: {
                steps: [
                    'https://openrouter.ai сайтында тіркеліңіз (e-mail немесе Google арқылы кіру жеткілікті).',
                    '«Keys» бөлімін ашып, «Create key» түймесін басыңыз: https://openrouter.ai/keys',
                    'sk-or-… кілтін көшіріп, осы беттегі «API кілті» өрісіне қойыңыз.',
                    '«Модельдер тізімін жүктеу» түймесін басып, атауы :free болып аяқталатын модельді таңдаңыз — тек сондай модельдер тегін.',
                    '«Қосылымды тексеру» және «Параметрлерді сақтау» түймелерін басыңыз.'
                ],
                tips: [
                    'Тегін модельдің белгісі — идентификатордағы :free қосымшасы, мысалы deepseek/deepseek-chat-v3:free. Бұл қосымшасыз модель токен бойынша тарифтеледі.',
                    'Тегін тариф: минутына 20 сұраныс және тәулігіне 50; бір рет $10 толтырсаңыз, тәуліктік шек 1000 сұранысқа көтеріледі. Сәтсіз әрекеттер де есептеледі.',
                    'Нақты модель таңдағыңыз келмесе, openrouter/free жазыңыз: маршрутизатор сұранысты тиісті тегін модельге өзі жібереді.',
                    'Бір кілт картасыз ондаған модельді ашады — жауаптарды салыстыруға қолайлы.',
                    'Тегін модельдерді провайдерлер оқытуға пайдалануы мүмкін, сондықтан оқушылардың жеке деректерін жібермеңіз.'
                ]
            }
        }
    },
    {
        id: 'mistral', name: 'Mistral',
        base: 'https://api.mistral.ai/v1',
        models: ['mistral-small-latest'],
        keyUrl: 'https://console.mistral.ai/api-keys/',
        docsUrl: 'https://docs.mistral.ai/api/',
        priceUrl: 'https://mistral.ai/pricing',
        browser: true, paid: false, free: true, noCard: true,
        guide: {
            ru: {
                steps: [
                    'Войдите в консоль: https://console.mistral.ai',
                    'Откройте «API Keys»: https://console.mistral.ai/api-keys/',
                    'Нажмите «Create new key» и скопируйте ключ.',
                    'Вставьте ключ в поле «API-ключ», загрузите список моделей и проверьте подключение.'
                ],
                tips: [
                    'Бесплатный режим «Experiment»: карта не нужна, но нужна проверка телефона.',
                    'В бесплатном режиме запросы могут использоваться для улучшения моделей: для школы лучше платный тариф.',
                    'Если телефон не подходит, начните с Groq, Google AI Studio или OpenRouter — этого достаточно для класса.'
                ]
            },
            en: {
                steps: [
                    'Sign in to the console: https://console.mistral.ai',
                    'Open “API Keys”: https://console.mistral.ai/api-keys/',
                    'Press “Create new key” and copy the key.',
                    'Paste the key into the “API key” field, load the model list and test the connection.'
                ],
                tips: [
                    'The free “Experiment” mode needs no card, but a phone check is required.',
                    'In the free mode requests may be used to improve the models: for school work a paid plan is safer.',
                    'If the phone step does not suit you, start with Groq, Google AI Studio or OpenRouter — that is enough for a classroom.'
                ]
            },
            kk: {
                steps: [
                    'Консольге кіріңіз: https://console.mistral.ai',
                    '«API Keys» бөлімін ашыңыз: https://console.mistral.ai/api-keys/',
                    '«Create new key» түймесін басып, кілтті көшіріңіз.',
                    'Кілтті «API кілті» өрісіне қойып, модельдер тізімін жүктеп, қосылымды тексеріңіз.'
                ],
                tips: [
                    '«Experiment» тегін режимі: карта қажет емес, бірақ телефонды растау керек.',
                    'Тегін режимде сұраныстар модельді жақсартуға пайдаланылуы мүмкін: мектеп үшін ақылы тариф сенімдірек.',
                    'Телефон қолайсыз болса, Groq, Google AI Studio немесе OpenRouter-ден бастаңыз — сыныпқа осы жеткілікті.'
                ]
            }
        }
    },
    {
        id: 'deepseek', name: 'DeepSeek',
        base: 'https://api.deepseek.com',
        models: ['deepseek-flash', 'deepseek-v4-pro'],
        keyUrl: 'https://platform.deepseek.com/api_keys',
        docsUrl: 'https://api-docs.deepseek.com/',
        priceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
        browser: true, paid: true, free: false, noCard: false,
        guide: {
            ru: {
                steps: [
                    'Откройте кабинет платформы: https://platform.deepseek.com — это отдельный кабинет для API, а не чат.',
                    'Зарегистрируйтесь по e-mail и подтвердите письмо: номер телефона для регистрации не нужен.',
                    'Войдите и откройте слева раздел «API keys»: https://platform.deepseek.com/api_keys',
                    'Нажмите «Create new API key», задайте понятное имя (например, statpracticum-class) и подтвердите.',
                    'Скопируйте ключ сразу: он показывается один раз и начинается с «sk-». Сохраните его в надёжном месте.',
                    'Проверьте баланс в разделе «Top up»: без средств API отвечает ошибкой 402. Цены и модели: https://api-docs.deepseek.com/quick_start/pricing',
                    'Вставьте ключ в поле «API-ключ» и нажмите «Проверить подключение», затем «Сохранить настройки».'
                ],
                tips: [
                    'Базовый адрес https://api.deepseek.com и модели deepseek-flash (быстрая и дешёвая) или deepseek-v4-pro (точнее на сложных задачах). Точный список даёт кнопка «Загрузить список моделей».',
                    'Ключ DeepSeek можно использовать прямо со страницы курса: сервер отдаёт CORS-заголовки, посредник не нужен.',
                    'Бесплатного уровня у API нет: нужен баланс. Если платить не хочется, выберите Groq, Google AI Studio или OpenRouter — они стоят в начале списка, и ключ там выдают без карты.',
                    'Ключ — доступ к балансу. Не публикуйте его; если он попал в чужие руки, удалите ключ в разделе «API keys» и создайте новый.'
                ]
            },
            en: {
                steps: [
                    'Open the platform dashboard: https://platform.deepseek.com — it is a separate API dashboard, not the chat.',
                    'Sign up with your e-mail and confirm the letter: no phone number is required.',
                    'Sign in and open “API keys” in the left menu: https://platform.deepseek.com/api_keys',
                    'Press “Create new API key”, give it a clear name (for example statpracticum-class) and confirm.',
                    'Copy the key at once: it is shown only once and starts with “sk-”. Store it safely.',
                    'Check the balance under “Top up”: with an empty balance the API answers with error 402. Prices and models: https://api-docs.deepseek.com/quick_start/pricing',
                    'Paste the key into the “API key” field, press “Test the connection”, then “Save the settings”.'
                ],
                tips: [
                    'Base URL https://api.deepseek.com and the models deepseek-flash (fast and cheap) or deepseek-v4-pro (more accurate on hard tasks). The exact list comes from the “Load the model list” button.',
                    'The DeepSeek key can be used right from the course page: the server sends CORS headers, so no proxy is needed.',
                    'The API has no free tier: a balance is required. If you would rather not pay, choose Groq, Google AI Studio or OpenRouter — they stand first in the list and issue a key without a card.',
                    'A key is access to your balance. Never publish it; if it leaks, delete the key under “API keys” and create a new one.'
                ]
            },
            kk: {
                steps: [
                    'Платформа кабинетін ашыңыз: https://platform.deepseek.com — бұл чат емес, API-ге арналған бөлек кабинет.',
                    'E-mail арқылы тіркеліп, хатты растаңыз: тіркелу үшін телефон нөмірі қажет емес.',
                    'Кабинетке кіріп, сол жақтағы «API keys» бөлімін ашыңыз: https://platform.deepseek.com/api_keys',
                    '«Create new API key» түймесін басып, түсінікті атау жазыңыз (мысалы, statpracticum-class) және растаңыз.',
                    'Кілтті бірден көшіріңіз: ол бір рет қана көрсетіледі және «sk-» әріптерінен басталады. Сенімді жерде сақтаңыз.',
                    '«Top up» бөлімінде балансты тексеріңіз: қаражат болмаса API 402 қатесін қайтарады. Бағалар мен модельдер: https://api-docs.deepseek.com/quick_start/pricing',
                    'Кілтті «API кілті» өрісіне қойып, «Қосылымды тексеру» түймесін басыңыз, содан кейін «Параметрлерді сақтау».'
                ],
                tips: [
                    'Базалық мекенжай https://api.deepseek.com, модельдер: deepseek-flash (жылдам әрі арзан) немесе deepseek-v4-pro (күрделі есептерде дәлірек). Нақты тізімді «Модельдер тізімін жүктеу» түймесі береді.',
                    'DeepSeek кілтін курс бетінен тікелей қолдануға болады: сервер CORS тақырыпшаларын жібереді, делдал қажет емес.',
                    'API-нің тегін деңгейі жоқ: баланс керек. Ақы төлегіңіз келмесе, Groq, Google AI Studio немесе OpenRouter таңдаңыз — олар тізімнің басында тұр және кілтті картасыз береді.',
                    'Кілт — балансқа қатынау. Оны жарияламаңыз; қолға түссе, «API keys» бөлімінде жойып, жаңасын жасаңыз.'
                ]
            }
        }
    },
    {
        id: 'openai', name: 'OpenAI',
        base: 'https://api.openai.com/v1',
        models: ['gpt-4o-mini'],
        keyUrl: 'https://platform.openai.com/api-keys',
        docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
        priceUrl: 'https://openai.com/api/pricing/',
        browser: true, paid: true, free: false,
        guide: {
            ru: {
                steps: [
                    'Войдите в кабинет: https://platform.openai.com',
                    'Откройте раздел «API keys»: https://platform.openai.com/api-keys',
                    'Нажмите «Create new secret key», скопируйте ключ sk-… (показывается один раз).',
                    'Пополните баланс: Billing → Add payment method, иначе запрос вернёт ошибку 429 или 402.',
                    'Вставьте ключ в поле «API-ключ» и нажмите «Проверить подключение».'
                ],
                tips: [
                    'Название модели уточняйте кнопкой «Загрузить список моделей»: у OpenAI оно меняется чаще, чем у других провайдеров.',
                    'Запросы из браузера поддерживаются, но ключ активной платёжной карты лучше не оставлять на общем компьютере.',
                    'Бесплатный тариф у OpenAI не предусмотрен: если карта не подходит, начните с Groq, Google AI Studio или OpenRouter.'
                ]
            },
            en: {
                steps: [
                    'Sign in to the dashboard: https://platform.openai.com',
                    'Open “API keys”: https://platform.openai.com/api-keys',
                    'Press “Create new secret key” and copy the sk-… key (it is shown once).',
                    'Top up the balance: Billing → Add payment method, otherwise requests return 429 or 402.',
                    'Paste the key into the “API key” field and press “Test the connection”.'
                ],
                tips: [
                    'Check the model name with the “Load the model list” button: OpenAI renames models more often than other providers.',
                    'Browser requests are supported, but a key tied to a live payment card is better not left on a shared computer.',
                    'OpenAI has no free tier: if a card is not an option, start with Groq, Google AI Studio or OpenRouter.'
                ]
            },
            kk: {
                steps: [
                    'Кабинетке кіріңіз: https://platform.openai.com',
                    '«API keys» бөлімін ашыңыз: https://platform.openai.com/api-keys',
                    '«Create new secret key» түймесін басып, sk-… кілтін көшіріңіз (бір рет көрсетіледі).',
                    'Балансты толтырыңыз: Billing → Add payment method, әйтпесе сұраныс 429 немесе 402 қатесін қайтарады.',
                    'Кілтті «API кілті» өрісіне қойып, «Қосылымды тексеру» түймесін басыңыз.'
                ],
                tips: [
                    'Модель атауын «Модельдер тізімін жүктеу» түймесімен нақтылаңыз: OpenAI атауларды жиі өзгертеді.',
                    'Браузерден сұраныс қолдау табады, бірақ нақты төлем картасына байланған кілтті ортақ компьютерде қалдырмаған жөн.',
                    'OpenAI-де тегін тариф жоқ: карта қолайсыз болса, Groq, Google AI Studio немесе OpenRouter-ден бастаңыз.'
                ]
            }
        }
    },
    {
        id: 'together', name: 'Together AI',
        base: 'https://api.together.xyz/v1',
        models: ['deepseek-ai/DeepSeek-V3'],
        keyUrl: 'https://api.together.ai/settings/api-keys',
        docsUrl: 'https://docs.together.ai/docs/openai-api-compatibility',
        priceUrl: 'https://www.together.ai/pricing',
        browser: true, paid: true, free: false,
        guide: {
            ru: {
                steps: [
                    'Зарегистрируйтесь на https://api.together.ai',
                    'Откройте «Settings» → «API Keys»: https://api.together.ai/settings/api-keys',
                    'Нажмите «Create key» и скопируйте ключ.',
                    'Пополните баланс (минимум около $5) и вставьте ключ в поле «API-ключ».'
                ],
                tips: [
                    'В каталоге есть модели DeepSeek и Llama — удобно сравнить ответы.',
                    'Бесплатного тарифа нет: без баланса запросы отклоняются.',
                    'Если нужен бесплатный вариант, начните с Groq, Google AI Studio или OpenRouter — они стоят в начале списка.'
                ]
            },
            en: {
                steps: [
                    'Sign up at https://api.together.ai',
                    'Open “Settings” → “API Keys”: https://api.together.ai/settings/api-keys',
                    'Press “Create key” and copy the key.',
                    'Top up the balance (about $5 minimum) and paste the key into the “API key” field.'
                ],
                tips: [
                    'The catalogue includes DeepSeek and Llama models — handy for comparing answers.',
                    'There is no free tier: without a balance requests are rejected.',
                    'For a free option start with Groq, Google AI Studio or OpenRouter — they stand first in the list.'
                ]
            },
            kk: {
                steps: [
                    'https://api.together.ai сайтында тіркеліңіз.',
                    '«Settings» → «API Keys» бөлімін ашыңыз: https://api.together.ai/settings/api-keys',
                    '«Create key» түймесін басып, кілтті көшіріңіз.',
                    'Балансты толтырыңыз (кемінде $5 шамасында) және кілтті «API кілті» өрісіне қойыңыз.'
                ],
                tips: [
                    'Каталогта DeepSeek және Llama модельдері бар — жауаптарды салыстыруға қолайлы.',
                    'Тегін тариф жоқ: баланссыз сұраныстар қабылданбайды.',
                    'Тегін нұсқа керек болса, Groq, Google AI Studio немесе OpenRouter-ден бастаңыз — олар тізімнің басында.'
                ]
            }
        }
    },
    {
        id: 'ollama', name: 'Ollama', label: {ru: 'Ollama (локально)', en: 'Ollama (local)', kk: 'Ollama (жергілікті)'},
        base: 'http://localhost:11434/v1',
        models: ['llama3.1', 'qwen2.5'],
        keyUrl: 'https://ollama.com/download',
        docsUrl: 'https://docs.ollama.com/api',
        priceUrl: 'https://ollama.com/library',
        browser: false, paid: false, free: true, local: true,
        guide: {
            ru: {
                steps: [
                    'Установите Ollama со страницы https://ollama.com/download (Windows, macOS или Linux).',
                    'Скачайте модель командой в терминале: ollama pull llama3.1 (список моделей: https://ollama.com/library).',
                    'Запустите сервер: ollama serve — он слушает http://localhost:11434.',
                    'Разрешите странице курса обращаться к серверу: задайте переменную OLLAMA_ORIGINS со значением * и перезапустите Ollama.',
                    'В поле «API-ключ» впишите любое слово, например ollama: локальный сервер ключ не проверяет.'
                ],
                tips: [
                    'Интернет не нужен, данные не покидают компьютер — лучший вариант, когда важна приватность.',
                    'Если в ответе ошибка про CORS, значит переменная OLLAMA_ORIGINS не применилась: проверьте её и перезапустите сервер.',
                    'На слабом ноутбуке выбирайте небольшую модель: качество ответов зависит от её размера.'
                ]
            },
            en: {
                steps: [
                    'Install Ollama from https://ollama.com/download (Windows, macOS or Linux).',
                    'Download a model in the terminal: ollama pull llama3.1 (model list: https://ollama.com/library).',
                    'Start the server: ollama serve — it listens on http://localhost:11434.',
                    'Allow the course page to reach the server: set the OLLAMA_ORIGINS variable to * and restart Ollama.',
                    'Type any word into the “API key” field, for example ollama: the local server does not check keys.'
                ],
                tips: [
                    'No internet is needed and data never leaves the computer — the best option when privacy matters.',
                    'If the answer is a CORS error, OLLAMA_ORIGINS did not apply: check it and restart the server.',
                    'On a weak laptop pick a small model: answer quality depends on its size.'
                ]
            },
            kk: {
                steps: [
                    'Ollama-ны https://ollama.com/download бетінен орнатыңыз (Windows, macOS немесе Linux).',
                    'Терминалда модель жүктеңіз: ollama pull llama3.1 (модельдер тізімі: https://ollama.com/library).',
                    'Серверді іске қосыңыз: ollama serve — ол http://localhost:11434 мекенжайын тыңдайды.',
                    'Курс бетіне серверге жүгінуге рұқсат беріңіз: OLLAMA_ORIGINS айнымалысына * мәнін қойып, Ollama-ны қайта іске қосыңыз.',
                    '«API кілті» өрісіне кез келген сөз жазыңыз, мысалы ollama: жергілікті сервер кілтті тексермейді.'
                ],
                tips: [
                    'Интернет қажет емес, деректер компьютерден шықпайды — құпиялылық маңызды болғанда ең қолайлы нұсқа.',
                    'Жауапта CORS қатесі шықса, OLLAMA_ORIGINS қолданылмаған: оны тексеріп, серверді қайта іске қосыңыз.',
                    'Әлсіз ноутбукте шағын модель таңдаңыз: жауап сапасы оның көлеміне байланысты.'
                ]
            }
        }
    },
    {
        id: 'lmstudio', name: 'LM Studio', label: {ru: 'LM Studio (локально)', en: 'LM Studio (local)', kk: 'LM Studio (жергілікті)'},
        base: 'http://localhost:1234/v1',
        models: ['local-model'],
        keyUrl: 'https://lmstudio.ai/download',
        docsUrl: 'https://lmstudio.ai/docs/app/api',
        priceUrl: 'https://lmstudio.ai/models',
        browser: false, paid: false, free: true, local: true,
        guide: {
            ru: {
                steps: [
                    'Установите LM Studio: https://lmstudio.ai/download',
                    'В приложении скачайте модель на вкладке поиска (например, Qwen или Llama).',
                    'Откройте вкладку Developer → Start Server: сервер слушает http://localhost:1234.',
                    'Включите в настройках сервера поддержку CORS, иначе браузер заблокирует запрос.',
                    'В поле «API-ключ» впишите любое слово, например lmstudio.'
                ],
                tips: [
                    'Адрес по умолчанию http://localhost:1234/v1 — он уже подставлен.',
                    'Если сервер запущен на другом компьютере класса, замените localhost на его адрес в сети.',
                    'Модель можно менять в приложении, не трогая страницу курса: достаточно нажать «Загрузить список моделей».'
                ]
            },
            en: {
                steps: [
                    'Install LM Studio: https://lmstudio.ai/download',
                    'Download a model in the app on the search tab (for example Qwen or Llama).',
                    'Open the Developer tab → Start Server: the server listens on http://localhost:1234.',
                    'Enable CORS in the server settings, otherwise the browser blocks the request.',
                    'Type any word into the “API key” field, for example lmstudio.'
                ],
                tips: [
                    'The default address is http://localhost:1234/v1 — it is pre-filled.',
                    'If the server runs on another computer in the classroom, replace localhost with its network address.',
                    'Models can be changed in the app without touching the course page: just press “Load the model list”.'
                ]
            },
            kk: {
                steps: [
                    'LM Studio-ны орнатыңыз: https://lmstudio.ai/download',
                    'Қолданбада іздеу қойындысынан модель жүктеңіз (мысалы, Qwen немесе Llama).',
                    'Developer қойындысын ашып, Start Server түймесін басыңыз: сервер http://localhost:1234 мекенжайын тыңдайды.',
                    'Сервер параметрлерінде CORS қолдауын қосыңыз, әйтпесе браузер сұранысты бөгеп тастайды.',
                    '«API кілті» өрісіне кез келген сөз жазыңыз, мысалы lmstudio.'
                ],
                tips: [
                    'Әдепкі мекенжай http://localhost:1234/v1 — ол алдын ала қойылған.',
                    'Сервер сыныптағы басқа компьютерде жұмыс істесе, localhost орнына оның желілік мекенжайын жазыңыз.',
                    'Модельді қолданбада ауыстыруға болады: курс бетінде тек «Модельдер тізімін жүктеу» түймесін басу жеткілікті.'
                ]
            }
        }
    },
    {
        id: 'custom', name: 'Custom OpenAI-compatible server', label: {ru: 'Свой OpenAI-совместимый сервер', en: 'Custom OpenAI-compatible server', kk: 'Өз OpenAI-үйлесімді сервері'},
        base: '',
        models: [],
        keyUrl: '', docsUrl: '', priceUrl: '',
        browser: true, paid: false, free: false,
        guide: {
            ru: {
                steps: [
                    'Получите ключ в кабинете вашего провайдера (в поиске: «OpenAI-compatible API»).',
                    'Скопируйте базовый адрес из документации: обычно он заканчивается на /v1 или на /openai/v1.',
                    'Укажите базовый адрес и название модели в полях ниже, ключ — в поле «API-ключ».',
                    'Нажмите «Проверить подключение»: если запрос упёрся в CORS, провайдер не разрешает обращения из браузера — нужен посредник или другой провайдер.'
                ],
                tips: [
                    'Курс обращается к адресу {base}/chat/completions и {base}/models: этого достаточно для проверки.',
                    'Если базовый адрес заканчивается на /chat/completions, уберите этот хвост — страница добавит его сама.',
                    'Для закрытых корпоративных API может потребоваться прокси: курс напрямую из браузера такие серверы не видит.'
                ]
            },
            en: {
                steps: [
                    'Get a key in your provider dashboard (search for “OpenAI-compatible API”).',
                    'Copy the base URL from the documentation: it usually ends with /v1 or /openai/v1.',
                    'Enter the base URL and the model name below, the key into the “API key” field.',
                    'Press “Test the connection”: if the request hits CORS, the provider does not allow browser calls — use a proxy or another provider.'
                ],
                tips: [
                    'The course calls {base}/chat/completions and {base}/models: that is enough for the check.',
                    'If the base URL ends with /chat/completions, drop that tail — the page adds it itself.',
                    'Private corporate APIs may need a proxy: the course cannot reach them directly from the browser.'
                ]
            },
            kk: {
                steps: [
                    'Провайдер кабинетінен кілт алыңыз (іздеу: «OpenAI-compatible API»).',
                    'Құжаттамадан базалық мекенжайды көшіріңіз: әдетте ол /v1 немесе /openai/v1 болып аяқталады.',
                    'Базалық мекенжай мен модель атауын төмендегі өрістерге, кілтті «API кілті» өрісіне жазыңыз.',
                    '«Қосылымды тексеру» түймесін басыңыз: сұраныс CORS-қа тірелсе, провайдер браузерден сұранысқа рұқсат бермейді — делдал немесе басқа провайдер керек.'
                ],
                tips: [
                    'Курс {base}/chat/completions және {base}/models мекенжайларына жүгінеді: тексеру үшін осы жеткілікті.',
                    'Базалық мекенжай /chat/completions болып аяқталса, ол бөлікті алып тастаңыз — бет оны өзі қосады.',
                    'Жабық корпоративтік API-лерге делдал керек болуы мүмкін: курс оларға браузерден тікелей жете алмайды.'
                ]
            }
        }
    }
];

/* По умолчанию — бесплатный провайдер: ключ выдаётся без платёжных данных. */
const AI_DEFAULT_PROVIDER = 'groq';

function aiProviderInfo(id) {
    return AI_PROVIDERS.find(p => p.id === id) || AI_PROVIDERS[0]
}

/* Порядок в списке: сначала бесплатные без карты, потом платные, потом локальные. */
function aiProviderGroup(provider) {
    if (provider.local || provider.id === 'custom') return 'local';
    if (provider.noCard || provider.free) return 'free';
    return 'paid'
}

function aiProviderOptionsHtml(current) {
    const groups = [['free', 'ai.setup.group.free'], ['paid', 'ai.setup.group.paid'], ['local', 'ai.setup.group.local']];
    return groups.map(([group, label]) => {
        const items = AI_PROVIDERS.filter(p => aiProviderGroup(p) === group);
        if (!items.length) return '';
        return `<optgroup label="${esc(ait(label))}">` + items.map(p =>
            `<option value="${p.id}" ${p.id === current ? 'selected' : ''}>${esc(aiProviderName(p))}</option>`).join('') + '</optgroup>'
    }).join('')
}

/* Названия провайдеров — имена собственные, но пояснения к ним переводятся. */
function aiProviderName(provider) {
    if (!provider) return '';
    if (!provider.label) return provider.name;
    return provider.label[aiLang()] || provider.name
}

/* Приводим базовый адрес к виду без хвоста /chat/completions. */
function aiNormalizeBase(url) {
    let base = String(url || '').trim().replace(/\/+$/, '');
    base = base.replace(/\/chat\/completions$/i, '');
    return base
}

function aiChatUrl(base) { return aiNormalizeBase(base) + '/chat/completions' }
function aiModelsUrl(base) { return aiNormalizeBase(base) + '/models' }

/* ---- Лимиты провайдера из заголовков ответа --------------------------- */
/* Groq и OpenRouter присылают остаток счётчиков прямо в ответе:
   x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens,
   x-ratelimit-reset-… и retry-after. Счётчики читаются на месте — в кабинет
   провайдера заходить не нужно. */
const AI_LIMIT_GROUPS = [
    {kind: 'requests', limit: 'x-ratelimit-limit-requests', remaining: 'x-ratelimit-remaining-requests', reset: 'x-ratelimit-reset-requests'},
    {kind: 'tokens', limit: 'x-ratelimit-limit-tokens', remaining: 'x-ratelimit-remaining-tokens', reset: 'x-ratelimit-reset-tokens'},
    {kind: 'generic', limit: 'x-ratelimit-limit', remaining: 'x-ratelimit-remaining', reset: 'x-ratelimit-reset'}
];
let aiLastLimits = null;

function aiHeader(res, name) {
    if (!res || !res.headers || typeof res.headers.get !== 'function') return '';
    try { return String(res.headers.get(name) || '').trim() } catch (error) { return '' }
}

function aiFormatCount(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!/^\d+$/.test(raw)) return raw;
    const number = Number(raw);
    if (!isFinite(number)) return raw;
    const tag = aiLang() === 'ru' ? 'ru-RU' : (aiLang() === 'kk' ? 'kk-KZ' : 'en-US');
    try { return number.toLocaleString(tag) } catch (error) { return raw }
}

/* Читает заголовки ответа и запоминает последний известный остаток. */
function aiCaptureLimits(res, providerId) {
    const limits = {provider: providerId || aiSettings().aiProvider, groups: [], retryAfter: aiHeader(res, 'retry-after')};
    for (const group of AI_LIMIT_GROUPS) {
        /* Общие заголовки берём, только если отдельных счётчиков в ответе нет. */
        if (group.kind === 'generic' && limits.groups.length) continue;
        const remaining = aiHeader(res, group.remaining);
        const limit = aiHeader(res, group.limit);
        const reset = aiHeader(res, group.reset);
        if (!remaining && !limit && !reset) continue;
        limits.groups.push({kind: group.kind, remaining: remaining, limit: limit, reset: reset})
    }
    if (!limits.groups.length && !limits.retryAfter) return null;
    aiLastLimits = limits;
    return limits
}

/* Строка для интерфейса: «запросы: осталось 998 из 1000; токены: … · обновление через …». */
function aiLimitsSummary(limits) {
    const data = limits || aiLastLimits;
    if (!data) return '';
    const parts = [];
    let reset = '';
    for (const group of data.groups || []) {
        const kind = ait('ai.limits.kind.' + group.kind);
        if (group.remaining) {
            parts.push(group.limit
                ? ait('ai.limits.counter', {kind: kind, remaining: aiFormatCount(group.remaining), limit: aiFormatCount(group.limit)})
                : ait('ai.limits.counterNoLimit', {kind: kind, remaining: aiFormatCount(group.remaining)}))
        }
        if (!reset && group.reset) reset = group.reset
    }
    let text = parts.join('; ');
    if (reset) text += (text ? ' · ' : '') + ait('ai.limits.reset', {reset: reset});
    if (data.retryAfter) text += (text ? ' · ' : '') + ait('ai.limits.retry', {seconds: aiFormatCount(data.retryAfter)});
    if (!text) return '';
    return ait('ai.limits.title', {name: aiLimitsProviderName(data)}) + ': ' + text
}

/* Обновляет строки лимитов на странице ИИ и в панели помощника. */
function aiRenderLimits() {
    const text = aiLimitsSummary();
    const nodes = document.querySelectorAll ? document.querySelectorAll('.ai-limits-line') : [];
    for (const node of nodes) {
        const hint = node.getAttribute('data-hint') === '1' ? ait('ai.limits.hint') : '';
        node.textContent = text || hint
    }
    aiSyncDrawerMode()
}

function aiLimitsProviderName(limits) {
    const provider = aiProviderInfo((limits || aiLastLimits || {}).provider);
    return aiProviderName(provider)
}

/* ---- Настройки ------------------------------------------------------- */

function aiSettings() {
    if (!progress.settings || typeof progress.settings !== 'object') progress.settings = {};
    const s = progress.settings;
    if (typeof s.aiProvider !== 'string' || !AI_PROVIDERS.some(p => p.id === s.aiProvider)) s.aiProvider = AI_DEFAULT_PROVIDER;
    /* Настройки версий до 4.1 выбирали платный DeepSeek по умолчанию. Если ключ
       так и не завели, переключаем такие установки на бесплатного провайдера;
       заведённые ключи и адреса не трогаем. */
    if (!s.aiFreeDefaultMigrated) {
        const untouched = s.aiProvider === 'deepseek' && !s.aiApiKey && !String(s.aiEndpoint || '').trim();
        if (untouched) {
            s.aiProvider = AI_DEFAULT_PROVIDER;
            s.aiBaseUrl = aiProviderInfo(s.aiProvider).base;
            s.aiModel = aiProviderInfo(s.aiProvider).models[0] || '';
            s.aiModels = []
        }
        s.aiFreeDefaultMigrated = true
    }
    const provider = aiProviderInfo(s.aiProvider);
    if (typeof s.aiBaseUrl !== 'string' || !s.aiBaseUrl.trim()) s.aiBaseUrl = provider.base;
    if (typeof s.aiModel !== 'string' || !s.aiModel.trim()) s.aiModel = provider.models[0] || '';
    if (typeof s.aiApiKey !== 'string') s.aiApiKey = '';
    if (typeof s.aiEnabled !== 'boolean') s.aiEnabled = false;
    /* Настройки прежних версий хранили полный адрес /chat/completions. */
    if (!s.aiBaseMigrated) {
        const legacy = aiNormalizeBase(typeof s.aiEndpoint === 'string' ? s.aiEndpoint : '');
        if (legacy && legacy !== provider.base) {
            s.aiBaseUrl = legacy;
            s.aiProvider = 'custom'
        }
        s.aiBaseMigrated = true
    }
    if (typeof s.aiStream !== 'boolean') s.aiStream = true;
    if (!Array.isArray(s.aiChat)) s.aiChat = [];
    if (!Array.isArray(s.aiModels)) s.aiModels = [];
    return s
}

function aiEndpoint() { return aiChatUrl(aiSettings().aiBaseUrl) }

function aiSaveSettings() {
    const s = aiSettings();
    const provider = $('ai-provider'), base = $('ai-base'), model = $('ai-model'), key = $('ai-key'), enabled = $('ai-enabled'), stream = $('ai-stream');
    if (provider && AI_PROVIDERS.some(p => p.id === provider.value)) s.aiProvider = provider.value;
    if (base) s.aiBaseUrl = aiNormalizeBase(base.value) || aiProviderInfo(s.aiProvider).base;
    if (model) s.aiModel = model.value.trim() || aiProviderInfo(s.aiProvider).models[0] || '';
    if (key) s.aiApiKey = key.value.trim();
    if (enabled) s.aiEnabled = !!enabled.checked;
    if (stream) s.aiStream = !!stream.checked;
    persist();
    aiRefreshChrome();
    aiStatusLine(ait('ai.setup.saved'), 'ok');
    toast(ait('ai.setup.saved'))
}

function aiConfigured() {
    const s = aiSettings();
    return !!(s.aiEnabled && s.aiApiKey && s.aiBaseUrl && s.aiModel)
}

function aiProviderReady() {
    const s = aiSettings();
    return !!(s.aiApiKey && s.aiBaseUrl && s.aiModel)
}

/* ---- Подсказка «где взять ключ» -------------------------------------- */

function aiLinkify(text) {
    const escaped = esc(text);
    return escaped.replace(/https?:\/\/[^\s<>()]+/g, url => {
        const clean = url.replace(/[.,;)]+$/, '');
        const tail = url.slice(clean.length);
        return `<a href="${clean}" target="_blank" rel="noopener noreferrer">${clean}</a>${tail}`
    })
}

function aiProviderGuideHtml(provider) {
    const guide = provider.guide && (provider.guide[aiLang()] || provider.guide.ru) || {steps: [], tips: []};
    const badge = provider.local
        ? `<span class="pill">${ait('ai.guide.local')}</span>`
        : `<span class="pill green">${ait('ai.guide.browser')}</span>`;
    const money = provider.local ? '' : (provider.noCard
        ? `<span class="pill green">${ait('ai.guide.noCard')}</span>`
        : (provider.free ? `<span class="pill green">${ait('ai.guide.free')}</span>` : `<span class="pill warm">${ait('ai.guide.paid')}</span>`));
    const links = [[ait('ai.guide.key'), provider.keyUrl], [ait('ai.guide.docs'), provider.docsUrl], [ait('ai.guide.price'), provider.priceUrl]]
        .filter(x => x[1])
        .map(x => `<a class="btn sm ghost" href="${esc(x[1])}" target="_blank" rel="noopener noreferrer">${ico('external')} ${esc(x[0])}</a>`)
        .join('');
    const steps = (guide.steps || []).map(s => `<li>${aiLinkify(s)}</li>`).join('');
    const tips = (guide.tips || []).map(s => `<li>${aiLinkify(s.replace('{base}', aiNormalizeBase(aiSettings().aiBaseUrl)))}</li>`).join('');
    if (!steps && !tips && !links) return '';
    return `<div class="ai-guide">
        <div class="ai-guide-head">
          <strong>${esc(ait('ai.guide.title', {name: aiProviderName(provider)}))}</strong>
          <span class="row wrap" style="gap:6px">${badge}${money}</span>
        </div>
        ${links ? `<div class="row wrap ai-guide-links">${links}</div>` : ''}
        ${steps ? `<p class="small muted" style="margin:12px 0 3px">${esc(ait('ai.guide.steps'))}</p><ol class="ai-instructions">${steps}</ol>` : ''}
        ${tips ? `<details class="ai-guide-tips"><summary>${esc(ait('ai.guide.tips'))}</summary><ul class="ai-tips">${tips}</ul></details>` : ''}
        ${provider.noCard && !provider.local ? `<p class="small muted" style="margin-top:8px">${esc(ait('ai.guide.dataNote'))}</p>` : ''}
        ${provider.local ? '' : `<p class="small muted ai-limits-line" style="margin-top:6px" data-hint="0"></p>`}
      </div>`
}

/* Перерисовка подсказки и полей при смене провайдера. */
function aiProviderChanged() {
    const select = $('ai-provider');
    if (!select) return;
    const provider = aiProviderInfo(select.value);
    const base = $('ai-base'), model = $('ai-model'), list = $('ai-model-list'), help = $('ai-provider-help');
    if (base) base.value = provider.base;
    if (model) model.value = provider.models[0] || '';
    if (list) list.innerHTML = aiModelOptions().map(m => `<option value="${esc(m)}"></option>`).join('');
    if (help) help.innerHTML = aiProviderGuideHtml(provider);
    aiRenderLimits();
    aiStatusLine(provider.local ? ait('ai.setup.noKey') : ait('ai.how.step2'), 'info')
}

function aiStatusLine(text, state) {
    const el = $('ai-status');
    if (el) {
        el.textContent = text;
        el.className = 'ai-status' + (state ? ' ' + state : '')
    }
    const drawer = $('ai-drawer-mode');
    if (drawer) aiSyncDrawerMode()
}

/* ---- Внешняя модель: запрос с потоком и без него ---------------------- */

function aiRequestError(code, detail) {
    const error = new Error('ai-' + code);
    error.code = code;
    error.detail = String(detail || '').slice(0, 400);
    return error
}

function aiErrorReason(error) {
    const code = error && error.code;
    if (code === 401) return ait('ai.err.401');
    if (code === 402) return ait('ai.err.402');
    if (code === 403) return ait('ai.err.403');
    if (code === 404) return ait('ai.err.404');
    if (code === 429) return ait('ai.err.429') + (error && error.retryAfter ? ' ' + ait('ai.limits.retry', {seconds: aiFormatCount(error.retryAfter)}) : '');
    if (code === 'timeout') return ait('ai.err.timeout');
    if (code === 'stopped') return ait('ai.err.stopped');
    if (code === 'nocontent') return ait('ai.err.nocontent');
    if (code === 'network') return ait('ai.err.network');
    if (typeof code === 'number' && code >= 500) return ait('ai.err.5xx', {code: code});
    if (typeof code === 'number') return ait('ai.err.5xx', {code: code});
    return String(error && (error.detail || error.message) || error || '')
}

async function aiFetchError(res) {
    const limits = aiCaptureLimits(res);
    aiRenderLimits();
    let detail = '';
    try { detail = (await res.text() || '').slice(0, 300) } catch (e) { detail = '' }
    const error = aiRequestError(res.status, detail);
    if (limits && limits.retryAfter) error.retryAfter = limits.retryAfter;
    return error
}

/* Возвращает текст ответа. onDelta(text) вызывается по мере появления текста. */
async function aiExternalChat(messages, options) {
    const s = aiSettings();
    if (!s.aiApiKey) throw aiRequestError('nokey', ait('ai.err.nokey'));
    const opts = options || {};
    const base = aiNormalizeBase(s.aiBaseUrl);
    if (!base) throw aiRequestError('network', ait('ai.err.network'));
    const controllers = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controllers ? setTimeout(() => controllers.abort(), opts.timeout || 90000) : null;
    if (opts.registerAbort) opts.registerAbort(controllers);
    const wantStream = opts.stream !== false && s.aiStream;
    let res;
    try {
        res = await fetch(aiChatUrl(base), {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.aiApiKey},
            body: JSON.stringify({
                model: s.aiModel,
                messages: messages,
                temperature: opts.temperature ?? 0.4,
                stream: !!wantStream,
                max_tokens: opts.maxTokens || 1200
            }),
            signal: controllers ? controllers.signal : undefined
        })
    } catch (error) {
        if (timer) clearTimeout(timer);
        if (error && error.name === 'AbortError') throw aiRequestError('timeout', '');
        throw aiRequestError('network', error && error.message)
    }
    if (!res.ok) {
        if (timer) clearTimeout(timer);
        throw await aiFetchError(res)
    }
    /* Остаток лимитов приходит в заголовках ответа: показываем без похода в кабинет. */
    if (aiCaptureLimits(res)) aiRenderLimits();
    const canStream = wantStream && res.body && typeof res.body.getReader === 'function' && typeof TextDecoder === 'function';
    try {
        if (!canStream) {
            const data = await res.json();
            if (timer) clearTimeout(timer);
            const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if (!content) throw aiRequestError('nocontent', '');
            return content
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '', text = '';
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, {stream: true});
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const payload = trimmed.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;
                let parsed = null;
                try { parsed = JSON.parse(payload) } catch (e) { continue }
                const delta = parsed && parsed.choices && parsed.choices[0] && (parsed.choices[0].delta || {});
                const piece = delta && (delta.content || delta.reasoning_content);
                if (piece) {
                    text += piece;
                    if (opts.onDelta) opts.onDelta(text)
                }
            }
        }
        if (timer) clearTimeout(timer);
        const finalText = text.trim();
        if (!finalText) throw aiRequestError('nocontent', '');
        return finalText
    } finally {
        if (timer) clearTimeout(timer)
    }
}

async function aiFetchModels() {
    const s = aiSettings();
    if (!s.aiApiKey) throw aiRequestError('nokey', ait('ai.err.nokey'));
    let res;
    try {
        res = await fetch(aiModelsUrl(s.aiBaseUrl), {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + s.aiApiKey}
        })
    } catch (error) {
        throw aiRequestError('network', error && error.message)
    }
    if (!res.ok) throw await aiFetchError(res);
    if (aiCaptureLimits(res)) aiRenderLimits();
    let data = null;
    try { data = await res.json() } catch (e) { throw aiRequestError('nocontent', '') }
    const list = (data && (data.data || data.models)) || [];
    const names = list.map(item => typeof item === 'string' ? item : (item && (item.id || item.name))).filter(Boolean);
    if (!names.length) throw aiRequestError('nocontent', '');
    return names
}

/* Проверка: сначала список моделей (бесплатно), затем пробный запрос. */
async function aiTestConnection(button) {
    const s = aiSettings();
    if (!s.aiApiKey) {
        aiStatusLine(ait('ai.err.nokey'), 'error');
        toast(ait('ai.err.nokey'), true);
        return {ok: false, reason: ait('ai.err.nokey')}
    }
    if (button) button.disabled = true;
    aiStatusLine(ait('ai.setup.testing'), 'info');
    try {
        const names = await aiFetchModels();
        aiFillModelList(names);
        aiStatusLine(ait('ai.setup.testOk', {n: names.length}), 'ok');
        return {ok: true, models: names}
    } catch (error) {
        try {
            const answer = await aiExternalChat([{role: 'user', content: 'ping'}], {stream: false, maxTokens: 5});
            aiStatusLine(ait('ai.setup.testOkChat'), 'ok');
            return {ok: true, answer: answer}
        } catch (inner) {
            const reason = aiErrorReason(error);
            aiStatusLine(ait('ai.setup.testFail', {reason: reason}), 'error');
            return {ok: false, reason: reason}
        }
    } finally {
        if (button) button.disabled = false
    }
}

/* Список моделей запоминаем: он пригодится и при следующем открытии страницы. */
function aiFillModelList(names) {
    const saved = aiSettings();
    saved.aiModels = names.slice(0, 80);
    persist();
    const select = $('ai-model-list');
    if (select) select.innerHTML = aiModelOptions(saved).map(name => `<option value="${esc(name)}"></option>`).join('');
    if (!names.includes(saved.aiModel)) {
        const model = $('ai-model');
        if (model && !model.value.trim()) model.value = names[0]
    }
}

function aiModelOptions(settings) {
    const current = settings || aiSettings();
    const provider = aiProviderInfo(current.aiProvider);
    return [...new Set([...provider.models, ...(current.aiModels || [])].filter(Boolean))]
}

async function aiLoadModels() {
    const s = aiSettings();
    if (!s.aiApiKey) { toast(ait('ai.err.nokey'), true); return }
    aiStatusLine(ait('ai.setup.testing'), 'info');
    try {
        const names = await aiFetchModels();
        aiFillModelList(names);
        const model = $('ai-model');
        if (model) model.value = names.includes(s.aiModel) ? s.aiModel : names[0];
        aiStatusLine(ait('ai.setup.modelsOk', {n: names.length}), 'ok');
        toast(ait('ai.setup.modelsOk', {n: names.length}))
    } catch (error) {
        const reason = aiErrorReason(error);
        aiStatusLine(ait('ai.setup.modelsFail'), 'error');
        toast(ait('ai.setup.modelsFail') + ' ' + reason, true)
    }
}

/* ---- Разметка ответа: markdown-таблицы, формулы, код ------------------- */

function aiInlineHtml(text) {
    let out = esc(text);
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[\s(«"])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return out
}

function aiTableRow(line) {
    let row = String(line).trim();
    if (row.startsWith('|')) row = row.slice(1);
    if (row.endsWith('|')) row = row.slice(0, -1);
    return row.split('|').map(cell => cell.trim())
}

function aiIsTableSeparator(line) {
    const cells = aiTableRow(line);
    return cells.length > 1 && cells.every(cell => /^:?-{2,}:?$/.test(cell))
}

/* Модель отвечает markdown-ом: превращаем таблицы, списки, код и формулы
   в разметку курса. Весь текст сначала экранируется, поэтому вставка безопасна. */
function aiRichHtml(text) {
    const src = String(text ?? '').replace(/\r\n?/g, '\n').trim();
    if (!src) return '';
    const lines = src.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (/^\s*```/.test(line)) {
            const code = [];
            i += 1;
            while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i += 1 }
            i += 1;
            out.push('<pre class="ai-code"><code>' + esc(code.join('\n')) + '</code></pre>');
            continue
        }
        if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && aiIsTableSeparator(lines[i + 1])) {
            const head = aiTableRow(line);
            const rows = [];
            i += 2;
            while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]) && !aiIsTableSeparator(lines[i])) { rows.push(aiTableRow(lines[i])); i += 1 }
            out.push('<div class="table-scroll"><table class="data-table"><caption>' + esc(ait('ai.table.caption')) + '</caption><thead><tr>'
                + head.map(cell => '<th scope="col">' + aiInlineHtml(cell) + '</th>').join('')
                + '</tr></thead><tbody>'
                + rows.map(row => '<tr>' + row.map((cell, index) => index === 0 ? '<th scope="row">' + aiInlineHtml(cell) + '</th>' : '<td>' + aiInlineHtml(cell) + '</td>').join('') + '</tr>').join('')
                + '</tbody></table></div>');
            continue
        }
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = Math.min(4, heading[1].length + 1);
            out.push(`<h${level}>${aiInlineHtml(heading[2])}</h${level}>`);
            i += 1;
            continue
        }
        if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
            const ordered = /^\s*\d+[.)]\s+/.test(line);
            const items = [];
            while (i < lines.length && (/^\s*([-*•])\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))) {
                items.push(aiInlineHtml(lines[i].replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')));
                i += 1
            }
            out.push(`<${ordered ? 'ol' : 'ul'} class="ai-list">${items.map(item => '<li>' + item + '</li>').join('')}</${ordered ? 'ol' : 'ul'}>`);
            continue
        }
        if (/^\s*>\s?/.test(line)) {
            const quoted = [];
            while (i < lines.length && /^\s*>\s?/.test(lines[i])) { quoted.push(lines[i].replace(/^\s*>\s?/, '')); i += 1 }
            out.push('<blockquote class="ai-quote">' + aiInlineHtml(quoted.join(' ')) + '</blockquote>');
            continue
        }
        if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) { out.push('<div class="sep"></div>'); i += 1; continue }
        if (!line.trim()) { i += 1; continue }
        const paragraph = [];
        while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !/^(#{1,4})\s+/.test(lines[i])
            && !/^\s*\|.*\|\s*$/.test(lines[i]) && !/^\s*([-*•])\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])
            && !/^\s*>\s?/.test(lines[i])) { paragraph.push(lines[i].trim()); i += 1 }
        out.push('<p>' + aiInlineHtml(paragraph.join(' ')) + '</p>')
    }
    return out.join('')
}

/* ---- Ответы по курсу без внешней модели ------------------------------- */

function aiKnowledgeBase() {
    const out = [];
    for (const s of SECTIONS) {
        out.push({title: s.title, text: [s.subtitle, (s.objectives || []).join(' '), s.theory || '', (s.formulas || []).join(' '), s.error || ''].join(' '), sectionId: s.id});
    }
    for (const p of (COURSE.bankProblems || [])) {
        for (const t of (p.tasks || [])) {
            out.push({title: 'Банк задач · ' + p.title, text: (t.question || '') + ' ' + (t.solution || ''), sectionId: 'bank', taskId: t.id});
        }
    }
    return out
}

function aiTerms(query) {
    return String(query || '').toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(w => w.length >= 3)
}

function aiSearchKnowledge(query) {
    const q = String(query || '').toLowerCase().replace(/ё/g, 'е');
    const terms = aiTerms(query);
    const kb = aiKnowledgeBase();
    const scored = kb.map(item => {
        const text = String(item.text || '').toLowerCase().replace(/ё/g, 'е');
        let score = 0;
        for (const t of terms) if (text.includes(t)) score += 1;
        if (item.title.toLowerCase().includes(q)) score += 3;
        return {item, score}
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
    return scored.map(x => x.item)
}

/* Блоки теории, в которых встречаются слова вопроса: формулы и таблицы
   показываются как есть, поэтому данные не теряются. */
function aiTheorySnippets(section, query) {
    if (!section || !section.theory) return '';
    const terms = aiTerms(query);
    if (!terms.length) return '';
    let holder = null;
    try {
        holder = document.createElement('div');
        holder.innerHTML = section.theory
    } catch (e) { return '' }
    const blocks = [...holder.children].map(block => {
        const text = (block.textContent || '').toLowerCase().replace(/ё/g, 'е');
        let score = 0;
        for (const term of terms) if (text.includes(term)) score += 1;
        return {block, score, size: (block.textContent || '').length}
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    const picked = [];
    let size = 0;
    for (const candidate of blocks) {
        if (picked.length >= 2 && size > 900) break;
        picked.push(candidate);
        size += candidate.size;
        if (picked.length >= 4) break
    }
    if (!picked.length) return '';
    return picked.map(x => `<div class="ai-hit">${x.block.outerHTML}</div>`).join('')
}

function aiPlainText(html) {
    const holder = document.createElement('div');
    holder.innerHTML = String(html || '');
    return (holder.textContent || '').replace(/\s+/g, ' ').trim()
}

function aiLocalAnswer(question, ctx) {
    const q = String(question || '').trim();
    if (ctx && typeof aiTaskLocalReply === 'function') {
        const reply = aiTaskLocalReply(ctx, q);
        if (reply) return reply
    }
    if (!q) return esc(ait('ai.local.miss'));
    if (/что такое|определение|означает|what is|definition/i.test(q) && /выборк|генеральн|sample|population/i.test(q)) {
        return '<p>' + esc(ait('ai.local.definition')) + '</p>'
    }
    const hits = aiSearchKnowledge(q);
    if (!hits.length) {
        return '<p>' + esc(ait('ai.local.miss')) + '</p><p class="small muted">' + esc(ait('ai.local.steps')) + '</p>'
    }
    const parts = hits.map(hit => {
        const section = SECTIONS.find(s => s.id === hit.sectionId);
        if (!section && hit.taskId) {
            const task = taskMap[hit.taskId];
            const problem = (COURSE.bankProblems || []).find(p => (p.tasks || []).some(t => t.id === hit.taskId));
            const text = task ? (task.question || '') : '';
            return `<div class="ai-hit"><strong>${esc(ait('ai.local.bank'))} · ${esc(hit.title.replace('Банк задач · ', ''))}</strong>
              <p class="small muted">${esc(text.slice(0, 260))}${text.length > 260 ? '…' : ''}</p>
              ${problem ? `<a class="btn sm ghost" href="#bank" onclick="bankOpenId='${esc(problem.id)}'">${esc(ait('ai.local.open'))}</a>` : ''}</div>`
        }
        if (!section) return '';
        const snippet = aiTheorySnippets(section, q);
        return `<div class="ai-hit"><strong>${esc(ait('ai.local.theory', {title: section.title}))}</strong>
          <span class="row wrap" style="gap:6px;margin:6px 0">
            <a class="btn sm ghost" href="#${section.id}/theory">${esc(ait('ai.local.open'))}</a>
            <a class="btn sm ghost" href="#${section.id}/practice">${esc(ait('ai.local.practice'))}</a>
          </span>
          ${snippet}</div>`
    }).filter(Boolean);
    if (!parts.length) return '<p>' + esc(ait('ai.local.miss')) + '</p>';
    return `<p>${esc(ait('ai.local.hit'))}</p>${parts.join('')}`
}

/* ---- Построение запросов к модели ------------------------------------- */

const AI_CHAT_PROMPTS = {
    ru: 'Ты помощник по курсу математической статистики для школьников. Отвечай по-русски, кратко и понятно, с формулами при необходимости. Таблицы оформляй markdown-таблицами.',
    en: 'You are a tutor for a school course in mathematical statistics. Answer in English, briefly and clearly, with formulas where needed. Format tables as markdown tables.',
    kk: 'Сыз математикалық статистика курсы бойынша мұғалімсіз. Жауапты қазақ тілінде, қысқа әрі түсінікті беріңіз, қажет болса формулалармен. Кестелерді markdown кестелері түрінде рәсімдеңіз.'
};
const AI_GENERATE_PROMPTS = {
    ru: 'Ты помощник по курсу математической статистики. Придумай одну задачу по указанной теме для школьника и реши её. Ответь строго JSON-объектом без markdown: {"question":"условие задачи","answer":"числовой или текстовый ответ","table":{"caption":"название данных","head":["столбец 1","столбец 2"],"rows":[["значение","значение"]]},"options":[],"hint":"подсказка","solution":"решение по шагам"}. Массив table заполняй, если по условию нужны данные: таблица показывается ученику отдельно. Вопрос и ответ на русском языке.',
    en: 'You are a tutor for a school course in mathematical statistics. Make up one problem on the given topic for a school student and solve it. Reply with a strict JSON object without markdown: {"question":"problem statement","answer":"numeric or short answer","table":{"caption":"data caption","head":["column 1","column 2"],"rows":[["value","value"]]},"options":[],"hint":"hint","solution":"step-by-step solution"}. Fill table when the problem needs data: the table is shown to the student separately. The question and the answer must be in English.',
    kk: 'Сыз математикалық статистика курсы бойынша көмекшісіз. Көрсетілген тақырып бойынша мектеп оқушысына арналған бір есеп құрастырып, оны шешіңіз. Markdown жоқ, тек JSON объектісімен жауап беріңіз: {"question":"есеп шарты","answer":"сандық немесе қысқа жауап","table":{"caption":"деректер атауы","head":["1-баған","2-баған"],"rows":[["мән","мән"]]},"options":[],"hint":"кеңес","solution":"қадамдық шешім"}. Есепте деректер керек болса, table өрісін толтырыңыз: кесте оқушыға бөлек көрсетіледі. Сұрақ пен жауап қазақ тілінде болуы керек.'
};
const AI_TOPIC_LABELS = {ru: 'Тема', en: 'Topic', kk: 'Тақырып'};
function aiPrompt(kind) { const table = kind === 'generate' ? AI_GENERATE_PROMPTS : AI_CHAT_PROMPTS; return table[LANG] || table.ru }
function aiTopicLabel() { return AI_TOPIC_LABELS[LANG] || AI_TOPIC_LABELS.en }

/* Ответ внешней модели прогоняется через словарь курса: если модель вернула
   условие или разбор из курса, они переводятся вместе с остальным содержимым. */
function aiLocalize(text) { const raw = String(text ?? ''); if (LANG === 'ru') return raw; const done = translatePhrase(raw); return done === null ? raw : done }

/* Кусок контекста для модели: тема, задание и его данные. */
function aiContextPrompt(ctx) {
    if (!ctx) return '';
    if (ctx.task) {
        const t = ctx.task;
        return 'Current task data (JSON): ' + JSON.stringify({
            id: t.id, topic: t.sectionTitle || t.sectionId, type: t.type,
            question: t.question, options: t.options || undefined,
            tables: t.inputTables || undefined,
            chart: t.chart ? {xs: t.chart.xs, ys: t.chart.ys, yLabel: t.chart.yLabel} : undefined,
            answer: t.answer, hint: t.hint, solution: t.solution
        }).slice(0, 2500)
    }
    if (ctx.section) {
        const s = ctx.section;
        return 'Current course topic (JSON): ' + JSON.stringify({title: s.title, objectives: s.objectives, formulas: s.formulas, mistake: s.error}).slice(0, 1500)
    }
    return ''
}

const AI_MODE_PROMPTS = {
    explain: {
        ru: 'Ты наставник. Веди ученика по шагам: сначала спроси, что известно, затем наведи на формулу, дай подсказку и только в конце покажи полное решение. Не выдавай готовый ответ в первом абзаце.',
        en: 'You are the tutor. Guide the student step by step: first ask what is given, then lead to the formula, give a hint and only at the end show the full solution. Do not give the final answer in the first paragraph.',
        kk: 'Сіз тәлімгерсіз. Оқушыны қадамдап жетелеңіз: алдымен не берілгенін сұраңыз, содан кейін формулаға бағыттаңыз, кеңес беріңіз, толық шешімді тек соңында көрсетіңіз. Дайын жауапты бірінші абзацта бермеңіз.'
    },
    check: {
        ru: 'Проверь ответ ученика. Ответь коротко: верно или нет, где ошибка, как исправить. Если ответ неполный, назови критерии, которых не хватает.',
        en: 'Check the student’s answer. Answer briefly: correct or not, where the mistake is, how to fix it. If the answer is incomplete, name the missing criteria.',
        kk: 'Оқушының жауабын тексеріңіз. Қысқа жауап беріңіз: дұрыс па, қатесі қайда, қалай түзетуге болады. Жауап толық болмаса, жетіспейтін критерийлерді атаңыз.'
    },
    similar: {
        ru: 'Придумай похожую задачу с другими числами и верни JSON по правилам генерации задач.',
        en: 'Make up a similar task with different numbers and return JSON following the task generation rules.',
        kk: 'Басқа сандармен ұқсас тапсырма құрастырып, тапсырма құрастыру ережелері бойынша JSON қайтарыңыз.'
    },
    data: {
        ru: 'Объясни, что показывают приведённые данные: столбцы, единицы, закономерности. Сделай вывод, но не подменяй расчёт своим.',
        en: 'Explain what the given data show: columns, units, patterns. Draw a conclusion but do not replace the calculation with your own.',
        kk: 'Берілген деректер нені көрсететінін түсіндіріңіз: бағандар, бірліктер, заңдылықтар. Қорытынды жасаңыз, бірақ есептеуді өз пікіріңізбен алмастырмаңыз.'
    }
};

function aiModePrompt(ctx) {
    if (!ctx) return '';
    const table = AI_MODE_PROMPTS[ctx.kind];
    if (!table) return '';
    return table[aiLang()] || table.ru
}

function aiSystemMessage(ctx) {
    const parts = [aiPrompt(ctx && ctx.kind === 'similar' ? 'generate' : 'chat')];
    const mode = aiModePrompt(ctx);
    if (mode) parts.push(mode);
    const data = aiContextPrompt(ctx);
    if (data) parts.push(data);
    return parts.join('\n\n')
}

/* ---- Диалог: история, отправка, рендер -------------------------------- */

function aiHistory() {
    const s = aiSettings();
    if (!Array.isArray(s.aiChat)) s.aiChat = [];
    return s.aiChat
}

function aiPushHistory(role, html) {
    const history = aiHistory();
    let content = String(html);
    /* Разбор с таблицами теории бывает очень длинным: в историю он попадает
       коротким текстом, а в открытом окне остаётся полным. */
    if (content.length > 9000) content = esc(aiPlainText(content).slice(0, 1600)) + '…';
    history.push({role: role, html: content, ts: Date.now()});
    while (history.length > 24) history.shift();
    let size = 0;
    for (const item of history) size += item.html.length;
    while (history.length > 2 && size > 120000) {
        size -= history[0].html.length;
        history.shift()
    }
    persist()
}

function aiRenderHistory() {
    const history = aiHistory();
    const greeting = aiConfigured() ? ait('ai.greeting') : ait('ai.greeting') + ' ' + ait('ai.greeting.offline');
    const html = `<div class="ai-msg ai-msg-assistant"><strong>${esc(ait('ai.assistant'))}:</strong> <span>${greeting}</span></div>`
        + history.map(item => aiMessageHtml(item.role, item.html)).join('');
    for (const id of ['ai-chat-log', 'ai-drawer-log']) {
        const log = $(id);
        if (!log) continue;
        log.innerHTML = html;
        log.scrollTop = log.scrollHeight
    }
    const clear = $('ai-history-clear');
    if (clear) clear.classList.toggle('hidden', !history.length)
}

function aiMessageHtml(role, content) {
    const who = role === 'user' ? ait('ai.ask') : ait('ai.assistant');
    const cls = role === 'user' ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-assistant';
    return `<div class="${cls}"><strong>${esc(who)}:</strong> <span>${content}</span></div>`
}

function aiAppendChat(role, html) {
    aiPushHistory(role, html);
    aiRenderHistory()
}

let aiBusy = false;
let aiAbort = null;

function aiSetBusy(busy) {
    aiBusy = busy;
    const labels = {['ai-send']: 'ai.ask', ['ai-drawer-send']: 'ai.send'};
    for (const id of Object.keys(labels)) {
        const button = $(id);
        if (button) {
            button.disabled = busy;
            button.textContent = busy ? ait('ai.thinking') : ait(labels[id])
        }
    }
    for (const id of ['ai-stop', 'ai-stop-page']) {
        const stop = $(id);
        if (stop) stop.classList.toggle('hidden', !busy)
    }
}

/* Общая точка: вопрос ученика с необязательным контекстом.
   ctx: {kind:'task'|'topic'|'data'|'explain'|'check'|'similar', task, section, cid, mode} */
async function aiSend(text, ctx) {
    const question = String(text || '').trim();
    if (!question) return;
    if (aiBusy) { toast(ait('ai.err.busy')); return }
    const previous = aiHistory().slice(-6).map(item => ({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: aiPlainText(item.html)
    })).filter(item => item.content);
    aiPushHistory('user', esc(question));
    aiRenderHistory();
    const pending = aiMessageHtml('assistant', '<em>' + esc(ait('ai.thinking')) + '</em>');
    const logs = ['ai-chat-log', 'ai-drawer-log'].map(id => $(id)).filter(Boolean);
    const placeholders = [];
    for (const log of logs) {
        const holder = document.createElement('div');
        holder.innerHTML = pending;
        const node = holder.firstElementChild;
        log.appendChild(node);
        log.scrollTop = log.scrollHeight;
        placeholders.push(node)
    }
    const finish = html => {
        for (const node of placeholders) if (node.parentNode) node.parentNode.removeChild(node);
        aiPushHistory('assistant', html);
        aiRenderHistory();
        for (const log of ['ai-chat-log', 'ai-drawer-log'].map(id => $(id)).filter(Boolean)) math(log)
    };
    if (!aiConfigured()) {
        finish(aiLocalAnswer(question, ctx));
        return
    }
    aiSetBusy(true);
    const messages = [{role: 'system', content: aiSystemMessage(ctx)}, ...previous, {role: 'user', content: question}];
    let streamed = '';
    try {
        const answer = await aiExternalChat(messages, {
            registerAbort: controller => { aiAbort = controller },
            onDelta: partial => {
                streamed = partial;
                for (const node of placeholders) {
                    const holder = node.querySelector('span');
                    if (holder) holder.innerHTML = aiRichHtml(partial)
                }
            }
        });
        finish(typeof aiFormatAnswer === 'function' ? aiFormatAnswer(answer, ctx) : aiRichHtml(aiLocalize(answer)));
        for (const log of ['ai-chat-log', 'ai-drawer-log'].map(id => $(id)).filter(Boolean)) math(log)
    } catch (error) {
        const reason = aiErrorReason(error);
        if (error && error.code === 'stopped') {
            finish(streamed ? aiRichHtml(streamed) : '<em>' + esc(reason) + '</em>');
            aiStatusLine(reason, 'info');
        } else {
            finish('<p class="small muted">' + esc(ait('ai.fallback', {reason: reason})) + '</p>' + aiLocalAnswer(question, ctx));
            aiStatusLine(reason, 'error')
        }
    } finally {
        aiAbort = null;
        aiSetBusy(false)
    }
}

function aiAsk() {
    const input = $('ai-question');
    if (!input) return;
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    aiSend(question, aiActiveContext())
}

function aiStop() {
    if (aiAbort && typeof aiAbort.abort === 'function') aiAbort.abort();
    aiAbort = null
}

function aiClearHistory() {
    const s = aiSettings();
    s.aiChat = [];
    persist();
    aiRenderHistory();
    toast(ait('ai.history.cleared'))
}

function aiCopyLast() {
    const history = aiHistory();
    const last = [...history].reverse().find(x => x.role !== 'user');
    if (!last) return;
    const text = aiPlainText(last.html);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast(ait('ai.copied'))).catch(() => toast(ait('ai.copied')))
    } else {
        toast(ait('ai.copied'))
    }
}

/* ---- Панель помощника (открывается на любой странице) ----------------- */

let aiDrawerContext = null;

function aiActiveContext() {
    if (aiDrawerContext && aiDrawerContext.kind) return aiDrawerContext;
    const section = SECTIONS.find(s => s.id === route.id);
    if (section) return {kind: 'topic', section: section, label: ait('ai.context.topic', {title: section.title})};
    return {kind: 'page', label: ait('ai.context.page')}
}

function aiContextTitle(ctx) {
    if (!ctx) return ait('ai.context.page');
    if (ctx.task) return ait('ai.context.task', {title: String(ctx.task.question || '').slice(0, 70)});
    if (ctx.section) return ait('ai.context.topic', {title: ctx.section.title});
    return ctx.label || ait('ai.context.page')
}

function aiDrawerHtml() {
    return `<div class="ai-drawer-head">
        <span class="ai-drawer-title">${ico('bot')}<strong>${esc(ait('ai.assistant'))}</strong></span>
        <span class="ai-status" id="ai-drawer-status"></span>
        <button class="btn icon ghost" onclick="aiDrawerClose()" aria-label="${esc(ait('ai.close'))}">${ico('close')}</button>
      </div>
      <p class="ai-drawer-context small muted" id="ai-drawer-context"></p>
      <div class="ai-chips" id="ai-drawer-chips"></div>
      <div class="ai-chat-log ai-drawer-log" id="ai-drawer-log" role="log" aria-live="polite"></div>
      <div class="ai-drawer-input">
        <textarea id="ai-drawer-question" rows="2" placeholder="${esc(ait('ai.placeholderShort'))}" aria-label="${esc(ait('ai.placeholderShort'))}"></textarea>
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn primary" id="ai-drawer-send" onclick="aiDrawerSend()">${esc(ait('ai.send'))}</button>
          <button class="btn ghost hidden" id="ai-stop" onclick="aiStop()">${esc(ait('ai.stop'))}</button>
          <button class="btn ghost" onclick="aiCopyLast()">${esc(ait('ai.copy'))}</button>
        </div>
      </div>
      <div class="ai-drawer-foot">
        <span class="small muted" id="ai-drawer-mode"></span>
        <button class="btn sm ghost" id="ai-history-clear" onclick="aiClearHistory()">${esc(ait('ai.history.clear'))}</button>
      </div>`
}

function aiDrawerChipsHtml() {
    const ctx = aiDrawerContext;
    const chips = [];
    if (ctx && ctx.task) {
        chips.push(['ai.quick.task', () => aiTaskMode(ctx.task.id, 'explain', ctx.cid)]);
        chips.push(['ai.quick.check', () => aiTaskMode(ctx.task.id, 'check', ctx.cid)]);
        chips.push(['ai.quick.similar', () => spAiSimilarTask(ctx.task.id)]);
        chips.push(['ai.quick.data', () => aiSend(ait('ai.q.data'), {kind: 'data', task: ctx.task})])
    } else {
        chips.push(['ai.quick.topic', () => aiAskAboutCurrentTopic()]);
        chips.push(['ai.quick.similar', () => aiGenerateForCurrentTopic()]);
        chips.push(['ai.quick.data', () => aiSend(ait('ai.q.data'), aiActiveContext())])
    }
    chips.push(['ai.quick.ask', () => { const input = $('ai-drawer-question'); if (input) input.focus() }]);
    aiChipHandlers = chips.map(x => x[1]);
    return chips.map((chip, index) => `<button class="btn sm" onclick="aiChip(${index})">${esc(ait(chip[0]))}</button>`).join('')
}

let aiChipHandlers = [];
function aiChip(index) {
    const handler = aiChipHandlers[index];
    if (typeof handler === 'function') handler()
}

function aiSyncDrawerMode() {
    const el = $('ai-drawer-mode');
    if (!el) return;
    const s = aiSettings();
    if (!aiConfigured()) {
        el.textContent = ait('ai.mode.local');
        return
    }
    const provider = aiProviderInfo(s.aiProvider);
    const limits = aiLimitsSummary();
    el.textContent = ait('ai.mode.model', {name: aiProviderName(provider), model: s.aiModel}) + (limits ? ' · ' + limits : '')
}

function aiDrawerChrome() {
    const drawer = $('ai-drawer');
    if (!drawer) return;
    const ctx = aiDrawerContext || aiActiveContext();
    const context = $('ai-drawer-context');
    if (context) context.textContent = aiContextTitle(ctx) + ' · ' + ait('ai.context.hint');
    const chips = $('ai-drawer-chips');
    if (chips) chips.innerHTML = aiDrawerChipsHtml();
    aiSyncDrawerMode();
    aiRenderHistory()
}

function aiRefreshChrome() {
    const label = $('ai-fab-label');
    if (label) label.textContent = ait('ai.assistant');
    const fab = $('ai-fab');
    if (fab) fab.setAttribute('aria-label', ait('ai.open'));
    aiDrawerChrome()
}

function aiMountDrawer() {
    if ($('ai-drawer')) return;
    const fab = document.createElement('button');
    fab.id = 'ai-fab';
    fab.className = 'ai-fab';
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'ai-drawer');
    fab.setAttribute('aria-label', ait('ai.open'));
    fab.innerHTML = ico('bot') + `<span class="ai-fab-label" id="ai-fab-label">${esc(ait('ai.assistant'))}</span>`;
    fab.addEventListener('click', () => aiDrawerToggle());
    document.body.appendChild(fab);
    const backdrop = document.createElement('div');
    backdrop.id = 'ai-backdrop';
    backdrop.className = 'ai-backdrop hidden';
    backdrop.addEventListener('click', () => aiDrawerClose());
    document.body.appendChild(backdrop);
    const drawer = document.createElement('aside');
    drawer.id = 'ai-drawer';
    drawer.className = 'ai-drawer hidden';
    drawer.setAttribute('aria-label', ait('ai.assistant'));
    drawer.innerHTML = aiDrawerHtml();
    document.body.appendChild(drawer);
    aiRefreshChrome();
    if (typeof MutationObserver === 'function' && document.documentElement) {
        new MutationObserver(() => aiRefreshChrome()).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']})
    }
}

function aiInExam() {
    return typeof spExamActive === 'function' && spExamActive()
}

function aiDrawerToggle() { if ($('ai-drawer') && !$('ai-drawer').classList.contains('hidden')) aiDrawerClose(); else aiDrawerOpen(null) }

function aiDrawerOpen(context) {
    if (aiInExam()) { toast(ait('ai.bar.exam')); return }
    aiMountDrawer();
    const randomDialog = $('random-dialog');
    if (randomDialog && randomDialog.open && typeof randomDialog.close === 'function') randomDialog.close();
    aiDrawerContext = context || null;
    const drawer = $('ai-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden');
    drawer.classList.toggle('ai-drawer-modal', window.innerWidth < 900 || !!aiDrawerContext);
    const fab = $('ai-fab');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    const backdrop = $('ai-backdrop');
    if (backdrop) backdrop.classList.remove('hidden');
    aiDrawerChrome();
    const input = $('ai-drawer-question');
    if (!aiDrawerContext && input) input.focus()
}

function aiDrawerClose() {
    const drawer = $('ai-drawer');
    if (drawer) drawer.classList.add('hidden');
    const fab = $('ai-fab');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    const backdrop = $('ai-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
    aiDrawerContext = null;
    aiRenderHistory()
}

function aiDrawerSend() {
    const input = $('ai-drawer-question');
    if (!input) return;
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    aiSend(question, aiActiveContext())
}

/* Кнопки в карточках заданий и в теории: помощник отвечает в панели. */
function aiAskAboutCurrentTopic() {
    const section = SECTIONS.find(s => s.id === route.id) || SECTIONS[0];
    if (!section) return;
    aiDrawerOpen({kind: 'topic', section: section});
    aiSend(ait('ai.q.topic', {topic: section.title}), {kind: 'topic', section: section})
}

function aiGenerateForCurrentTopic() {
    const section = SECTIONS.find(s => s.id === route.id) || SECTIONS[0];
    if (!section) return;
    spAiGenerateSimilar({section: section})
}

/* ---- Рекомендации ----------------------------------------------------- */

function aiRecommendations() {
    const recs = [];
    const weak = SECTIONS.map(s => {
        const total = s.tasks.length || 1;
        const done = s.tasks.filter(t => progress.solved[t.id]).length;
        return {s, done, total, ratio: done / total}
    }).filter(x => x.ratio < 1).sort((a, b) => a.ratio - b.ratio).slice(0, 5);
    for (const w of weak) {
        recs.push({title: w.s.title, text: ui('Решено ' + w.done + ' из ' + w.total + '. Повторите теорию и задания.'), link: '#' + w.s.id + '/practice'})
    }
    const openLow = Object.entries(progress.openReplies || {}).filter(([id, r]) => r && (r.percent || 0) < 80).map(([id]) => taskMap[id]).filter(Boolean).slice(0, 4);
    for (const t of openLow) {
        const sec = SECTIONS.find(s => s.id === t.sectionId);
        recs.push({title: ui('Открытый ответ: ') + (sec ? sec.title : t.id), text: ui('Процент выполнения ниже 80 %. Дополните ответ по критериям.'), link: '#' + t.sectionId + '/practice'})
    }
    if (!recs.length) recs.push({title: ui('Отличная работа!'), text: ui('Все задания решены. Попробуйте банк задач или контрольную работу.'), link: '#bank'});
    return recs
}

/* ---- Страница раздела -------------------------------------------------- */

function aiErrorRows() {
    return [
        ['401', ait('ai.err.401')],
        ['402', ait('ai.err.402')],
        ['403', ait('ai.err.403')],
        ['404', ait('ai.err.404')],
        ['429', ait('ai.err.429')],
        ['Failed to fetch', ait('ai.err.network')],
        ['timeout', ait('ai.err.timeout')]
    ]
}

/* Таблица «что даёт бесплатно и в чём подвох» — из неё видно, почему список
   провайдеров начинается с Groq, Google AI Studio и OpenRouter. */
function aiFreeTableHtml() {
    const rows = [
        ['Groq', 'ai.free.groq.give', 'ai.free.groq.catch'],
        ['Google AI Studio (Gemini)', 'ai.free.gemini.give', 'ai.free.gemini.catch'],
        ['OpenRouter', 'ai.free.openrouter.give', 'ai.free.openrouter.catch'],
        ['Mistral', 'ai.free.mistral.give', 'ai.free.mistral.catch'],
        ['Ollama · LM Studio', 'ai.free.local.give', 'ai.free.local.catch']
    ];
    const body = rows.map(row => `<tr><th scope="row">${esc(row[0])}</th><td>${esc(ait(row[1]))}</td><td>${esc(ait(row[2]))}</td></tr>`).join('');
    return `<div class="table-scroll" style="margin-top:12px"><table class="data-table">
        <caption>${esc(ait('ai.free.title'))}</caption>
        <thead><tr><th scope="col">${esc(ait('ai.setup.provider'))}</th><th scope="col">${esc(ait('ai.free.give'))}</th><th scope="col">${esc(ait('ai.free.catch'))}</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>`
}

function renderAI() {
    const s = aiSettings();
    const provider = aiProviderInfo(s.aiProvider);
    const recs = aiRecommendations();
    const gen = aiGenerateTask((SECTIONS[0] || {}).id);
    const errorRows = aiErrorRows().map(row => `<tr><th scope="row">${esc(row[0])}</th><td>${esc(row[1])}</td></tr>`).join('');
    $('main-content').innerHTML = `<div class="page ai-page">
      ${pageTop(ui('ИИ-наставник'))}
      <p class="eyebrow">${ui('ИНТЕЛЛЕКТУАЛЬНЫЙ ПОМОЩНИК')}</p>
      <h1>${ui('ИИ-наставник по статистике')}</h1>
      <p class="page-description">${esc(ait('ai.page.desc'))}</p>
      <div class="ai-callout">
        <div>${ico('bot')}<strong>${esc(ait('ai.page.drawer'))}</strong><p class="small muted">${esc(ait('ai.page.drawerHint'))}</p></div>
        <button class="btn" onclick="aiDrawerOpen(null)">${esc(ait('ai.open'))}</button>
      </div>

      <div class="grid2" style="margin-top:18px">
        <div class="card">
          <h3 style="margin-top:0">${esc(ait('ai.chat'))}</h3>
          <div id="ai-chat-log" class="ai-chat-log" role="log" aria-live="polite"></div>
          <div class="row" style="gap:8px;margin-top:10px">
            <input id="ai-question" class="field" style="flex:1" placeholder="${esc(ait('ai.placeholder'))}" onkeydown="if(event.key==='Enter')aiAsk()">
            <button class="btn primary" id="ai-send" onclick="aiAsk()">${esc(ait('ai.ask'))}</button>
            <button class="btn ghost hidden" id="ai-stop-page" onclick="aiStop()">${esc(ait('ai.stop'))}</button>
          </div>
          <p class="small muted" style="margin-top:8px">${esc(aiConfigured() ? ait('ai.setup.ready') : ait('ai.mode.local'))}</p>
          <p class="small muted ai-limits-line" id="ai-chat-limits" data-hint="0"></p>
        </div>
        <div class="card">
          <h3 style="margin-top:0">${esc(ait('ai.studio.title'))}</h3>
          <label class="small muted" for="ai-gen-topic">${esc(ait('ai.studio.topic'))}</label>
          <select id="ai-gen-topic" style="margin:6px 0 10px">${SECTIONS.map(sec => `<option value="${sec.id}">${esc(sec.title)}</option>`).join('')}</select>
          <label class="small muted" for="ai-gen-count">${esc(ait('ai.studio.count'))}</label>
          <select id="ai-gen-count" style="margin:6px 0 10px">${[1, 2, 3].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
          <div class="row wrap" style="gap:8px">
            <button class="btn primary" onclick="aiGenerate()">${esc(ait('ai.studio.make'))}</button>
            <button class="btn ghost" onclick="aiGenerateForCurrentTopic()">${esc(ait('ai.studio.makeMore'))}</button>
          </div>
          <p class="small muted" style="margin-top:8px">${esc(ait('ai.studio.local'))}</p>
          <div id="ai-gen-result" class="ai-gen-result" style="margin-top:12px"></div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="between"><h3 style="margin:0">${esc(ait('ai.studio.mine'))}</h3><span class="pill small" id="ai-task-count"></span></div>
        <div id="ai-task-list" class="stack" style="margin-top:12px"></div>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${esc(ait('ai.rec.title'))}</h3>
        <ul class="ai-rec-list">${recs.map(r => `<li><a href="${r.link}"><strong>${esc(r.title)}</strong></a><p class="small muted">${esc(r.text)}</p></li>`).join('')}</ul>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${esc(ait('ai.setup.title'))}</h3>
        <div class="profile-grid">
          <div class="profile-row"><label><input type="checkbox" id="ai-enabled" ${s.aiEnabled ? 'checked' : ''}> ${esc(ait('ai.setup.enabled'))}</label></div>
          <div class="profile-row"><label class="small muted" for="ai-provider">${esc(ait('ai.setup.provider'))}</label>
            <select id="ai-provider" onchange="aiProviderChanged()">${aiProviderOptionsHtml(s.aiProvider)}</select></div>
          <div class="profile-row"><label class="small muted" for="ai-base">${esc(ait('ai.setup.base'))}</label>
            <input id="ai-base" class="field" value="${esc(s.aiBaseUrl)}" style="width:100%"></div>
          <div class="profile-row"><label class="small muted" for="ai-model">${esc(ait('ai.setup.model'))}</label>
            <input id="ai-model" class="field" list="ai-model-list" value="${esc(s.aiModel)}" style="width:100%">
            <datalist id="ai-model-list">${aiModelOptions().map(m => `<option value="${esc(m)}"></option>`).join('')}</datalist></div>
          <div class="profile-row"><label class="small muted" for="ai-key">${esc(ait('ai.setup.key'))}</label>
            <input id="ai-key" class="field" type="password" value="${esc(s.aiApiKey)}" style="width:100%" placeholder="${esc(ait('ai.setup.keyHint'))}"></div>
          <div class="profile-row"><label><input type="checkbox" id="ai-stream" ${s.aiStream ? 'checked' : ''}> ${esc(ait('ai.setup.stream'))}</label></div>
        </div>
        <div class="row wrap" style="gap:8px;margin-top:12px">
          <button class="btn primary" onclick="aiSaveSettings()">${esc(ait('ai.setup.save'))}</button>
          <button class="btn" id="ai-test" onclick="aiTestConnection(this)">${esc(ait('ai.setup.test'))}</button>
          <button class="btn ghost" onclick="aiLoadModels()">${esc(ait('ai.setup.models'))}</button>
        </div>
        <p class="ai-status" id="ai-status">${esc(aiConfigured() ? ait('ai.setup.ready') : ait('ai.setup.noKey'))}</p>
        <p class="small muted ai-limits-line" id="ai-limits" data-hint="1"></p>
        <p class="small muted" style="margin-top:8px">${esc(ait('ai.setup.storage'))}</p>
        <p class="small muted" style="margin-top:6px">${esc(ait('ai.setup.offlineNote'))}</p>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${esc(ait('ai.errors.howto.title'))}</h3>
        <p class="small muted">${esc(ait('ai.errors.howto'))}</p>
        <ol class="ai-instructions">
          <li>${esc(ait('ai.how.step1'))}</li>
          <li>${esc(ait('ai.how.step2'))}</li>
          <li>${esc(ait('ai.how.step3'))}</li>
          <li>${esc(ait('ai.how.step4'))}</li>
        </ol>
        ${aiFreeTableHtml()}
        <div id="ai-provider-help" class="stack" style="gap:12px;margin-top:14px">${aiProviderGuideHtml(provider)}</div>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 style="margin-top:0">${esc(ait('ai.errors.title'))}</h3>
        <div class="table-scroll"><table class="data-table">
          <caption>${esc(ait('ai.errors.title'))}</caption>
          <thead><tr><th scope="col">${esc(ait('ai.errors.code'))}</th><th scope="col">${esc(ait('ai.errors.meaning'))}</th></tr></thead>
          <tbody>${errorRows}</tbody>
        </table></div>
      </div>

      ${footer()}
    </div>`;
    const res = $('ai-gen-result');
    if (res) res.innerHTML = aiRenderGenerated(gen);
    aiRenderHistory();
    aiRenderStudio();
    aiRenderLimits();
    math($('main-content'))
}

/* Рендер сгенерированной задачи: условие, таблицы данных, варианты и решение. */
function aiRenderGenerated(g) {
    const title = ui('Сгенерированная задача') + (g && g.sectionTitle ? ' · ' + g.sectionTitle : '');
    return aiTaskCardHtml(g, {key: 'preview', title: title, source: (g && g.source) || 'course'})
}

/* Кнопка помощника появляется сразу, а не только после первого вопроса. */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => aiMountDrawer());
else aiMountDrawer();

/* экспорт для навигации */
window.renderAI = renderAI;
