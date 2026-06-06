(function () {
    const storageKey = "spMedPortalSession";
    const profileStorageKey = "spMedPortalProfiles";
    const requestStorageKey = "spMedPortalRegistrationRequests";
    const noticeStorageKey = "spMedPortalNotices";
    const noticeReadStorageKey = "spMedPortalNoticeReads";
    const messageStorageKey = "spMedPortalMessages";
    const resetRequestStorageKey = "spMedPortalResetRequests";
    const loginAttemptStorageKey = "spMedPortalLoginAttempts";
    const inactivityLimitMs = 2 * 60 * 60 * 1000;
    const maxLoginAttempts = 5;
    const loginLockMs = 15 * 60 * 1000;
    const minPasswordLength = 8;
    const loginPattern = /^[a-z0-9._-]{4,32}$/;
    const config = window.SP_MEDPORTAL_CONFIG || {};
    const isLocalPrototype = window.location.protocol === "file:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
    const hasSupabaseConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey);
    const supabaseClient = hasSupabaseConfig && window.supabase
        ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
        : null;
    const secureServerModeReady = hasSupabaseConfig;
    const defaultRegistryUrl = "https://docs.google.com/spreadsheets/d/1_b5-VF9Nvk8Rn4i9W7Tvx4SAWWmhAmti2V9hR-KeTCU/edit?gid=633307791#gid=633307791";
    const qualityWorkbookUrl = "https://docs.google.com/spreadsheets/d/1Y1HCTc9C2_FpMl3q2HbhswrUBaQCSZPqQFg8id_lUUQ/edit?gid=1322485474#gid=1322485474";
    const adverseEventUrl = "https://forms.yandex.ru/u/68be9fa4e010dbff11d321b6";
    const adminCredentials = {
        username: "admin",
        saltBase64: "aBfTpOYw64maNA1BaTymWQ==",
        hashBase64: "+yyl3ljfrPf5EFrhdgdi6lUsMc3xbbvfmuL034P2Hpc=",
        iterations: 120000
    };
    const roleLabels = {
        employee: "Сотрудник",
        okk_member: "ОКК и БМД",
        okk_head: "Начальник ОКК",
        admin: "Администратор"
    };
    const statusLabels = {
        approved: "Одобрен",
        blocked: "Заблокирован",
        pending: "Ожидает",
        rejected: "Отклонен"
    };
    const defaultNotices = [
        {
            id: "notice-1",
            title: "Портал работает в рабочем режиме",
            body: "Проверяйте уведомления, документы и сообщения в личном кабинете ежедневно.",
            createdAt: "2026-06-06T08:40:00+03:00"
        },
        {
            id: "notice-2",
            title: "Подать НС можно из отдельной плашки",
            body: "Для регистрации нежелательного события используйте выделенный баннер в кабинете сотрудника.",
            createdAt: "2026-06-06T09:10:00+03:00"
        }
    ];
    const serviceLinks = [
        {
            title: "Реестр документов (Google)",
            description: "Рабочий доступ к документам, приказам и внутренним материалам учреждения.",
            action: "Открыть",
            icon: "📋",
            href: defaultRegistryUrl,
            featured: false,
            roles: ["employee", "okk_member", "okk_head", "admin"]
        },
        {
            title: "Клинические рекомендации",
            description: "Официальные клинические рекомендации Минздрава Российской Федерации.",
            action: "Перейти",
            icon: "📚",
            href: "https://cr.minzdrav.gov.ru/",
            featured: false,
            roles: ["employee", "okk_member", "okk_head", "admin"]
        },
        {
            title: "Реестр лекарств",
            description: "Проверка лекарственных препаратов в государственном реестре лекарственных средств.",
            action: "Проверить",
            icon: "💊",
            href: "https://grls.rosminzdrav.ru/",
            featured: false,
            roles: ["employee", "okk_member", "okk_head", "admin"]
        },
        {
            title: "Взаимодействие лекарств",
            description: "Проверка совместимости и лекарственных взаимодействий препаратов.",
            action: "Открыть",
            icon: "⚖",
            href: "https://www.vidal.ru/drugs/interaction/new",
            featured: false,
            roles: ["employee", "okk_member", "okk_head", "admin"]
        },
        {
            title: "Обучение сотрудников",
            description: "Курсы, чек-листы, вводные материалы и справочные разделы для персонала.",
            action: "Открыть раздел",
            icon: "🎓",
            href: "training.html",
            featured: false,
            roles: ["employee", "okk_member", "okk_head", "admin"]
        },
        {
            title: "ОКК и БМД",
            description: "Закрытая рабочая зона: разбор НС, справочники причин, меры, статусы, кураторы и защищённый разбор.",
            action: "Открыть раздел",
            icon: "🛡",
            href: "quality.html",
            featured: false,
            roles: ["okk_member", "okk_head", "admin"]
        }
    ];
    const dashboardContactCards = [
        {
            title: "Администратор портала",
            note: "Доступы, ошибки, новые разделы, предложения по улучшению.",
            action: "Через форму справа"
        },
        {
            title: "Главный врач",
            note: "Служебные вопросы, организационные решения, маршрутизация сложных обращений.",
            action: "Через форму обращения"
        },
        {
            title: "ОКК и БМД",
            note: "Нежелательные события, безопасность, защищённый разбор и профилактика повторов.",
            action: "Через плашку ОКК"
        }
    ];
    const dashboardNewsCards = [
        {
            title: "Главные новости дня",
            text: "Быстрый вход в общую федеральную повестку, чтобы понимать, о чём сейчас говорят и что влияет на рабочий фон.",
            action: "Открыть Яндекс Новости",
            href: "https://dzen.ru/news"
        },
        {
            title: "Здравоохранение",
            text: "Решения, инициативы и события, которые относятся к медицине, системе здравоохранения и отраслевым изменениям.",
            action: "Смотреть повестку",
            href: "https://dzen.ru/news/rubric/health"
        },
        {
            title: "Официальные отраслевые новости",
            text: "Полезно сверять общую новостную повестку с официальными сообщениями регуляторов и профильных ведомств.",
            action: "Открыть Росздравнадзор",
            href: "https://www.roszdravnadzor.gov.ru/"
        }
    ];
    const dashboardSpotlightCards = [
        {
            title: "Что нового в кабинете",
            text: "Рабочий стол стал живым: приоритеты дня, быстрые действия, контакты и более удобный навигатор по служебным сценариям."
        },
        {
            title: "Практика безопасной работы",
            text: "Лучший внутренний портал помогает быстро стартовать день, видеть приоритеты, не терять уведомления и мгновенно понимать, куда идти по задаче."
        }
    ];
    const qualityActionCards = [
        {
            title: "Реестр ОКК и БМД",
            description: "Основной рабочий реестр со справочниками, статусами, кураторами и логикой разбора.",
            href: qualityWorkbookUrl,
            action: "Открыть реестр",
            icon: "🗂"
        },
        {
            title: "Подать нежелательное событие",
            description: "Точка входа для первичного сообщения о случае с последующим маршрутом в разбор.",
            href: adverseEventUrl,
            action: "Открыть форму",
            icon: "⚠"
        },
        {
            title: "Защищённый разбор",
            description: "Используется для чувствительных случаев, повторных инцидентов и эпизодов с риском давления на сотрудников.",
            href: qualityWorkbookUrl,
            action: "Открыть контур",
            icon: "🔒"
        },
        {
            title: "Меры и контроль эффективности",
            description: "После разбора фиксируются немедленные действия, корректирующие и предупредительные меры, обучение и проверка эффективности.",
            href: qualityWorkbookUrl,
            action: "Смотреть меры",
            icon: "📈"
        }
    ];
    const qualityWorkflowSteps = [
        {
            title: "1. Поступление сигнала",
            body: "Сотрудник подаёт НС через форму. Сигнал сразу попадает в рабочий контур ОККиБМД."
        },
        {
            title: "2. Первичная оценка",
            body: "Определяются подразделение, категория, подкатегория, срочность, реализованность и последствия."
        },
        {
            title: "3. Эскалация и защищённый разбор",
            body: "Критические случаи, повторные инциденты, давление на сотрудника и тяжёлые последствия переводятся в защищённый режим."
        },
        {
            title: "4. Причины и меры",
            body: "Фиксируются группа причин, куратор, тип меры и маршрут выполнения: немедленно, корректирующе, предупредительно."
        },
        {
            title: "5. Проверка эффективности",
            body: "После внедрения мер ОКК проверяет устойчивость результата и только потом закрывает случай."
        }
    ];
    const qualityTaxonomy = {
        categories: [
            "Идентификация и маршрутизация пациента", "Лекарственная безопасность", "Медицинские изделия и оборудование",
            "Диагностика, лечение и медицинские вмешательства", "Инфекционная безопасность", "Уход за пациентом и безопасность среды",
            "Этика, деонтология и коммуникация", "Документация, передача информации и организационные процессы", "Иное"
        ],
        subcategories: [
            "Несвоевременная помощь", "Ошибка диагностики", "Ошибка назначения", "Ошибка дозировки", "Нарушение хранения лекарств / вакцин",
            "Отказ оборудования", "Нарушение маршрутизации", "Инфекционный риск", "Ошибка документации", "Падение пациента",
            "Грубое обращение", "Нарушение этики и деонтологии", "Давление после сообщения", "Повторный случай"
        ],
        statuses: [
            "Новое", "На первичной оценке", "На защищённом разборе ОККиБМД", "Срочно эскалировано",
            "Разбор в работе", "Меры в работе", "Проверка эффективности", "Закрыто"
        ],
        urgency: ["Обычная", "Срочная (48 часов)", "Критическая (немедленно)"],
        curators: [
            "ОККиБМД", "Руководитель подразделения", "Старшая медицинская сестра", "Зам. главного врача", "Инженер по МИ", "Эпидемиолог"
        ],
        measureTypes: [
            "Немедленные действия", "Корректирующая мера", "Предупредительная мера", "Обучение", "Пересмотр СОП", "Проверка эффективности"
        ],
        causeGroups: [
            "Коммуникация и деонтология", "Документация и передача информации", "Идентификация и маршрутизация",
            "Оборудование и оснащение", "Лекарства", "Инфекционный контроль", "Уход и безопасность среды",
            "Организация процесса", "Недостаток навыков / обучения", "Прочее"
        ]
    };
    const qualityReviewRules = [
        {
            title: "Когда сразу закрытый режим",
            text: "Критическая срочность, значительный вред, летальный исход, давление на сотрудника после сообщения, повторные случаи и этически чувствительные конфликты."
        },
        {
            title: "Что фиксируем в первую очередь",
            text: "Подразделение, категория, подкатегория, реализованность, последствия, срочность и первичного куратора."
        },
        {
            title: "Что должно выйти из разбора",
            text: "Причина, решение, ответственный, срок, тип меры и отдельная проверка эффективности после внедрения."
        }
    ];
    const adverseEventLifecycle = [
        {
            title: "1. Сообщение о событии",
            owner: "Сотрудник / заявитель",
            body: "Сотрудник подает НС через форму, указывает факты, место, время, участников, последствия и контакт для обратной связи. Сообщение нельзя задерживать до конца смены, если есть риск для пациента или повторения случая."
        },
        {
            title: "2. Первичный triage",
            owner: "Специалист ОКК / дежурный куратор",
            body: "ОКК верифицирует полноту сигнала, определяет срочность, категорию, повторяемость и необходимость немедленных защитных действий: остановить процесс, изолировать оборудование, уведомить руководителя смены."
        },
        {
            title: "3. Маршрутизация и уведомление",
            owner: "ОКК и БМД",
            body: "Случай назначается куратору. При критическом риске сразу уведомляются руководитель подразделения, профильный зам. главного врача, при необходимости инженер по МИ, эпидемиолог или фармаконадзор."
        },
        {
            title: "4. Разбор и сбор материалов",
            owner: "Куратор случая",
            body: "Собираются документы, объяснения, выписки из системы, сведения об оборудовании и лекарственных назначениях. Разбор должен отделять факты от оценок и исключать давление на заявителя."
        },
        {
            title: "5. Причины и меры",
            owner: "ОКК + руководитель подразделения",
            body: "Определяются коренные причины, формируется набор мер: немедленные, корректирующие, предупредительные, обучение, пересмотр СОП, контроль среды, настройка маршрута пациента."
        },
        {
            title: "6. Информирование сторон",
            owner: "ОКК / руководитель",
            body: "Заявитель получает обратную связь, подразделение — решение и сроки, руководство — сводную информацию по критическим и повторным случаям. Коммуникация фиксируется, даже если разбор продолжается."
        },
        {
            title: "7. Проверка эффективности",
            owner: "ОКК и БМД",
            body: "После внедрения мер проверяется, снизился ли риск: нет ли повторов, соблюдаются ли новые действия, прошли ли сотрудники обучение, подтверждена ли работоспособность оборудования и процессов."
        },
        {
            title: "8. Закрытие случая",
            owner: "Руководитель ОКК / уполномоченный администратор",
            body: "Случай закрывается только когда зафиксированы причина, меры, ответственные, сроки, доказательства выполнения и итог проверки эффективности. При незавершенных мерах случай остается открытым."
        }
    ];
    const adverseEventOwnership = [
        {
            role: "Заявитель",
            responsibility: "Сообщает факты без задержки, прикладывает минимально достаточное описание и при необходимости остается на связи для уточнений.",
            result: "Старт сигнала и первичное содержание случая."
        },
        {
            role: "Специалист ОКК",
            responsibility: "Принимает случай, проверяет полноту, категоризирует, определяет срочность и запускает маршрут разбора.",
            result: "Карточка случая, куратор, статус и первичные действия."
        },
        {
            role: "Начальник ОКК",
            responsibility: "Берет критические и конфликтные случаи, утверждает эскалацию, контролирует качество разбора и закрытие.",
            result: "Решение по сложным случаям и санкция на закрытие."
        },
        {
            role: "Руководитель подразделения",
            responsibility: "Обеспечивает исполнение мер на месте, участие сотрудников, доступ к документам и отсутствие давления на заявителя.",
            result: "Исполнение мер и организационные изменения."
        },
        {
            role: "Профильный эксперт",
            responsibility: "Подключается по тематике: эпидемиолог, инженер по МИ, фармаконадзор, зам. главного врача, главная медсестра.",
            result: "Экспертное заключение и профессиональные меры."
        },
        {
            role: "Администратор портала",
            responsibility: "Не разбирает клиническую часть, но обеспечивает доступы, защищённые контуры, аудит и сохранность данных.",
            result: "Техническая устойчивость и контроль доступа."
        }
    ];
    const adverseEventEscalation = [
        {
            title: "Немедленная эскалация",
            text: "Летальный исход, тяжелый вред, непосредственная угроза жизни, грубая ошибка маршрутизации, отказ критического оборудования, вспышка инфекционного риска. Уведомление — сразу, без ожидания полного разбора."
        },
        {
            title: "Эскалация в течение 24 часов",
            text: "Повторный случай, серьезный организационный сбой, конфликт с пациентом/родственниками, существенная ошибка в лекарственной терапии, давление на сотрудника после сообщения."
        },
        {
            title: "Обычный маршрут",
            text: "Случаи без немедленного риска, но требующие анализа процесса, обучения, корректировки СОП и профилактики повторов."
        }
    ];
    const adverseEventCommunication = [
        {
            title: "Кому сообщаем",
            text: "Заявителю, куратору, руководителю подразделения, профильному эксперту и руководству — по уровню риска и последствиям."
        },
        {
            title: "Как сообщаем",
            text: "Через защищённый контур ОКК, служебные уведомления, рабочий реестр и отдельные эскалационные сообщения по критическим случаям. Не использовать открытые чаты для чувствительных данных."
        },
        {
            title: "Что обязано быть в обратной связи",
            text: "Подтверждение принятия сигнала, текущий статус, ответственный куратор, нужны ли уточнения, какие меры уже запущены и когда ждать следующего обновления."
        },
        {
            title: "Когда обновлять статус",
            text: "После triage, после решения об эскалации, после определения мер, после проверки эффективности и при закрытии. Тишина дольше согласованного срока недопустима."
        }
    ];
    const adverseEventClosureChecklist = [
        "Категория, подкатегория, срочность и последствия заполнены",
        "Назначен куратор и определены привлеченные эксперты",
        "Зафиксированы факты, материалы и объяснения сторон",
        "Определены коренные причины, а не только внешние симптомы",
        "Назначены меры, сроки и ответственные исполнители",
        "Проведена обратная связь заявителю и подразделению",
        "Есть подтверждение выполнения мер",
        "Проверка эффективности завершена и риск снижен"
    ];
    const adverseEventCases = [
        {
            code: "НС-2026-014",
            title: "Повторная ошибка маршрутизации пациента между приёмным отделением и профильным постом",
            department: "Стационар / приёмное отделение",
            status: "Срочно эскалировано",
            urgency: "Критическая",
            owner: "Начальник ОКК",
            deadline: "Сегодня до 19:00",
            nextStep: "Подтвердить временную схему маршрута и довести до дежурных смен.",
            tags: ["повторный случай", "маршрутизация", "руководство"]
        },
        {
            code: "НС-2026-015",
            title: "Несоответствие маркировки лекарственного назначения и листа сестринского поста",
            department: "Терапевтическое отделение",
            status: "Разбор в работе",
            urgency: "Срочная 48ч",
            owner: "Специалист ОКК",
            deadline: "Завтра до 12:00",
            nextStep: "Сверить первичную документацию, объяснения смены и маршрут передачи информации.",
            tags: ["лекарственная безопасность", "документация"]
        },
        {
            code: "НС-2026-016",
            title: "Падение пациента без тяжёлых последствий в палате после перевода",
            department: "Хирургическое отделение",
            status: "Меры в работе",
            urgency: "Обычная",
            owner: "Руководитель подразделения",
            deadline: "Через 3 дня",
            nextStep: "Проверить внедрение памятки риска падения и контроль окружающей среды.",
            tags: ["безопасность среды", "уход"]
        },
        {
            code: "НС-2026-017",
            title: "Конфликтный случай с жалобой на деонтологию и риском давления на заявителя",
            department: "Поликлиника №2",
            status: "На защищённом разборе ОККиБМД",
            urgency: "Срочная 48ч",
            owner: "Начальник ОКК",
            deadline: "Завтра до 16:00",
            nextStep: "Провести разбор в закрытом контуре и исключить контакт заинтересованных лиц с заявителем.",
            tags: ["деонтология", "защищённый режим"]
        }
    ];
    const adverseEventCaseDetails = {
        "НС-2026-014": {
            summary: "Повторный организационный сбой с риском повторного отклонения пациента от правильного маршрута.",
            timeline: [
                "08:15 — сигнал от дежурной смены о повторном эпизоде",
                "08:25 — ОКК перевел случай в срочную эскалацию",
                "08:40 — подключен руководитель подразделения и зам. главного врача",
                "09:10 — временная схема маршрутизации утверждена до окончания разбора"
            ],
            measures: [
                "Ввести временный чек-пункт подтверждения маршрута в приёмном отделении",
                "Довести новый алгоритм до дежурных смен под подпись",
                "Перепроверить визуальную навигацию и распределение ответственности"
            ],
            contacts: [
                "Куратор: Начальник ОКК",
                "Руководитель подразделения: Приёмное отделение",
                "Эскалация: Зам. главного врача"
            ],
            closure: [
                "Нет повторов в течение контрольного периода",
                "Новый маршрут внедрен во всех сменах",
                "Подразделение подтвердило исполнение"
            ]
        },
        "НС-2026-015": {
            summary: "Несоответствие между врачебным назначением и рабочим листом поста, потенциально влияющее на лекарственную безопасность.",
            timeline: [
                "Вчера 17:30 — зарегистрирован сигнал",
                "Сегодня 09:00 — открыт разбор с дежурной сменой",
                "Сегодня 10:20 — поднята документация и листы передачи"
            ],
            measures: [
                "Пересмотреть передачу назначений между врачом и сестринским постом",
                "Ввести двойную проверку в уязвимом участке",
                "Провести короткое обучение смены"
            ],
            contacts: [
                "Куратор: Специалист ОКК",
                "Подразделение: Терапевтическое отделение",
                "Эксперт: Лекарственная безопасность"
            ],
            closure: [
                "Причина несоответствия определена",
                "Обновлен локальный порядок передачи информации",
                "Проверка на повторяемость выполнена"
            ]
        },
        "НС-2026-016": {
            summary: "Падение пациента после перевода без тяжелых последствий, требует проверки оценки риска, среды и сопровождения.",
            timeline: [
                "Позавчера — сообщение от отделения",
                "Вчера — завершена первичная оценка",
                "Сегодня — подразделение подтверждает внедрение мер"
            ],
            measures: [
                "Проверить маркировку риска падения",
                "Усилить контроль пространства около койки",
                "Провести повторный инструктаж персонала"
            ],
            contacts: [
                "Куратор: Руководитель подразделения",
                "ОКК: Контроль эффективности",
                "Старшая медсестра: исполнение мер"
            ],
            closure: [
                "Среда и чек-листы приведены в порядок",
                "Сотрудники повторно ознакомлены",
                "Нет повторных падений в контрольный период"
            ]
        },
        "НС-2026-017": {
            summary: "Чувствительный деонтологический случай с необходимостью защищенного режима и защиты заявителя от давления.",
            timeline: [
                "Сегодня утром — получено обращение",
                "Через 15 минут — включен защищенный контур",
                "Назначено закрытое обсуждение с ограниченным кругом доступа"
            ],
            measures: [
                "Ограничить круг доступа к материалам",
                "Запретить неформальный контакт с заявителем по теме случая",
                "Подготовить нейтральное заключение и план мер"
            ],
            contacts: [
                "Куратор: Начальник ОКК",
                "Подразделение: Поликлиника №2",
                "Эскалация: руководство при необходимости"
            ],
            closure: [
                "Исключено давление на заявителя",
                "Факты подтверждены и разделены от оценок",
                "Меры по коммуникации и этике утверждены"
            ]
        }
    };
    const adverseEventStatusBoard = [
        {
            key: "Срочно эскалировано",
            title: "Немедленное управление",
            note: "Руководство и кураторы подключены сразу"
        },
        {
            key: "Разбор в работе",
            title: "Анализ и сбор материалов",
            note: "Фиксируем факты, причины и участников"
        },
        {
            key: "Меры в работе",
            title: "Исполнение решений",
            note: "Контроль сроков, ответственных и внедрения"
        },
        {
            key: "На защищённом разборе ОККиБМД",
            title: "Закрытый контур",
            note: "Для чувствительных и конфликтных случаев"
        }
    ];
    const adverseEventCaseFields = [
        {
            title: "Что должно быть в карточке случая",
            items: ["дата и время", "подразделение", "описание фактов", "категория и подкатегория", "срочность", "последствия", "куратор", "статус", "меры"]
        },
        {
            title: "Что не должно теряться",
            items: ["контакт с заявителем", "следы повторяемости", "информация о давлении", "связанные документы", "оборудование / серия", "лекарство / дозировка"]
        }
    ];

    const qualityResourceCards = [
        {
            title: "Рабочий реестр ОКК",
            description: "Вся матрица категорий, статусов, кураторов, причин и тегов для стандартизированного разбора.",
            href: qualityWorkbookUrl
        },
        {
            title: "Форма подачи НС",
            description: "Стартовая точка для сотрудника. После подачи случай должен дойти до ОКК и войти в разбор.",
            href: adverseEventUrl
        },
        {
            title: "База приказов и материалов",
            description: "Внутренний Google-реестр документов, СОПов, приказов и памяток, связанных с качеством и безопасностью.",
            href: defaultRegistryUrl
        }
    ];
    let adminDataCache = null;

    function readJson(storageName, fallback) {
        try {
            const raw = window.localStorage.getItem(storageName);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(storageName, value) {
        window.localStorage.setItem(storageName, JSON.stringify(value));
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function isServerAuthAvailable() {
        return secureServerModeReady && Boolean(supabaseClient);
    }

    function buildAuthEmail(login) {
        return String(login || "").trim().toLowerCase() + "@users.sp-medportal.local";
    }

    function mapProfileSession(profile) {
        return {
            profile_id: profile.id,
            auth_user_id: profile.auth_user_id,
            login: profile.login,
            full_name: profile.full_name,
            role: profile.role,
            status: profile.status,
            department_name: profile.department_name,
            position: profile.position,
            signed_in_at: Date.now(),
            last_activity_at: Date.now()
        };
    }

    async function fetchCurrentServerProfile() {
        if (!supabaseClient) {
            return null;
        }
        const userResult = await supabaseClient.auth.getUser();
        const user = userResult && userResult.data ? userResult.data.user : null;
        if (!user) {
            return null;
        }

        const profileResult = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle();

        if (profileResult.error || !profileResult.data) {
            return null;
        }

        return profileResult.data;
    }

    async function hydrateSessionFromSupabase() {
        if (!isServerAuthAvailable()) {
            return null;
        }
        const profile = await fetchCurrentServerProfile();
        if (!profile) {
            clearSession();
            return null;
        }
        const session = mapProfileSession(profile);
        writeSession(session);
        return session;
    }

    async function signOutEverywhere(timeout) {
        clearSession();
        if (isServerAuthAvailable()) {
            try {
                await supabaseClient.auth.signOut();
            } catch (_error) {
            }
        }
        window.location.href = timeout ? "login.html?timeout=1" : "login.html";
    }

    async function invokeEdgeFunction(name, payload) {
        const result = await supabaseClient.functions.invoke(name, {
            body: payload
        });
        return result;
    }

    async function fetchServerNotices() {
        const result = await supabaseClient
            .from("notices")
            .select("id,title,body,created_at")
            .order("created_at", { ascending: false });

        if (result.error) {
            return [];
        }

        return (result.data || []).map(function (item) {
            return {
                id: item.id,
                title: item.title,
                body: item.body,
                createdAt: item.created_at
            };
        });
    }

    async function fetchServerReadNoticeIds(session) {
        if (!session || !session.profile_id) {
            return [];
        }
        const result = await supabaseClient
            .from("notice_reads")
            .select("notice_id")
            .eq("profile_id", session.profile_id);

        if (result.error) {
            return [];
        }

        return (result.data || []).map(function (item) { return item.notice_id; });
    }

    async function markServerNoticeRead(session, noticeId) {
        if (!session || !session.profile_id) {
            return;
        }
        await supabaseClient
            .from("notice_reads")
            .upsert({
                notice_id: noticeId,
                profile_id: session.profile_id
            }, { onConflict: "notice_id,profile_id" });
    }

    async function createServerMessage(session, channel, subject, body) {
        return supabaseClient
            .from("messages")
            .insert({
                from_profile_id: session.profile_id,
                to_channel: channel,
                subject: subject,
                body: body
            });
    }

    async function fetchAdminServerData() {
        const requestsResult = await supabaseClient
            .from("registration_requests")
            .select("*")
            .order("created_at", { ascending: false });
        const profilesResult = await supabaseClient
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });
        const messagesResult = await supabaseClient
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false });
        const resetResult = await supabaseClient
            .from("password_reset_requests")
            .select("*")
            .order("created_at", { ascending: false });

        const profiles = profilesResult.data || [];
        const profileMap = {};
        profiles.forEach(function (profile) {
            profileMap[profile.id] = profile;
        });

        return {
            requests: (requestsResult.data || []).map(function (item) {
                item.createdAt = item.created_at;
                return item;
            }),
            profiles: profiles.map(function (item) {
                item.createdAt = item.created_at;
                return item;
            }),
            messages: (messagesResult.data || []).map(function (item) {
                return {
                    id: item.id,
                    subject: item.subject,
                    body: item.body,
                    to_channel: item.to_channel,
                    status: item.status,
                    createdAt: item.created_at,
                    from_login: profileMap[item.from_profile_id] ? profileMap[item.from_profile_id].login : "unknown",
                    from_name: profileMap[item.from_profile_id] ? profileMap[item.from_profile_id].full_name : "Неизвестный пользователь"
                };
            }),
            resetRequests: (resetResult.data || []).map(function (item) {
                item.createdAt = item.created_at;
                return item;
            })
        };
    }

    async function refreshAdminPageData() {
        if (!isServerAuthAvailable()) {
            return;
        }
        adminDataCache = await fetchAdminServerData();
        renderAdminSummary();
        renderAdminRequests();
        renderAdminUsers();
        renderAdminMessages();
        renderResetRequests();
    }

    function renderAdminSummary() {
        const requestsNode = document.getElementById("admin-summary-requests");
        const usersNode = document.getElementById("admin-summary-users");
        const messagesNode = document.getElementById("admin-summary-messages");
        const resetsNode = document.getElementById("admin-summary-resets");
        const requests = (isServerAuthAvailable() && adminDataCache ? adminDataCache.requests : getRequests()).filter(function (item) {
            return item.status === "pending";
        });
        const profiles = isServerAuthAvailable() && adminDataCache ? adminDataCache.profiles : getProfiles();
        const messages = (isServerAuthAvailable() && adminDataCache ? adminDataCache.messages : getMessages()).filter(function (item) {
            return item.status !== "closed";
        });
        const resets = (isServerAuthAvailable() && adminDataCache ? adminDataCache.resetRequests : getResetRequests()).filter(function (item) {
            return item.status === "pending";
        });

        if (requestsNode) {
            requestsNode.textContent = String(requests.length);
        }
        if (usersNode) {
            usersNode.textContent = String(profiles.length);
        }
        if (messagesNode) {
            messagesNode.textContent = String(messages.length);
        }
        if (resetsNode) {
            resetsNode.textContent = String(resets.length);
        }
    }

    function denyInProduction(messageNode, text) {
        if (!isLocalPrototype) {
            showMessage(
                messageNode,
                text || "Этот раздел будет открыт после подключения защищённой серверной авторизации.",
                "error"
            );
            return true;
        }
        return false;
    }

    function readSession() {
        try {
            const raw = window.sessionStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function writeSession(session) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(session));
    }

    function clearSession() {
        window.sessionStorage.removeItem(storageKey);
    }

    function getProfiles() {
        if (!isLocalPrototype) {
            return [];
        }
        const stored = readJson(profileStorageKey, null);
        if (stored && Array.isArray(stored) && stored.length) {
            return stored;
        }

        const seed = [
            {
                id: "profile-admin",
                full_name: "Администратор портала",
                short_name: "Администратор",
                login: "admin",
                department_type: "Администрация",
                department_name: "Портал",
                position: "Администратор портала",
                role: "admin",
                status: "approved",
                is_active: true,
                auth_mode: "local"
            }
        ];
        writeJson(profileStorageKey, seed);
        return seed;
    }

    function saveProfiles(profiles) {
        if (!isLocalPrototype) {
            return;
        }
        writeJson(profileStorageKey, profiles);
    }

    function getRequests() {
        if (!isLocalPrototype) {
            return [];
        }
        return readJson(requestStorageKey, []);
    }

    function saveRequests(requests) {
        if (!isLocalPrototype) {
            return;
        }
        writeJson(requestStorageKey, requests);
    }

    function getNotices() {
        if (!isLocalPrototype) {
            return defaultNotices.slice();
        }
        const stored = readJson(noticeStorageKey, null);
        if (stored && Array.isArray(stored) && stored.length) {
            return stored;
        }

        writeJson(noticeStorageKey, defaultNotices);
        return defaultNotices.slice();
    }

    function saveNotices(notices) {
        if (!isLocalPrototype) {
            return;
        }
        writeJson(noticeStorageKey, notices);
    }

    function getMessages() {
        if (!isLocalPrototype) {
            return [];
        }
        return readJson(messageStorageKey, []);
    }

    function saveMessages(messages) {
        if (!isLocalPrototype) {
            return;
        }
        writeJson(messageStorageKey, messages);
    }

    function getResetRequests() {
        if (!isLocalPrototype) {
            return [];
        }
        return readJson(resetRequestStorageKey, []);
    }

    function saveResetRequests(requests) {
        if (!isLocalPrototype) {
            return;
        }
        writeJson(resetRequestStorageKey, requests);
    }

    function getReadNoticeIds(login) {
        if (!isLocalPrototype) {
            return [];
        }
        const allReads = readJson(noticeReadStorageKey, {});
        return allReads[login] || [];
    }

    function markNoticeRead(login, noticeId) {
        if (!isLocalPrototype) {
            return;
        }
        const reads = readJson(noticeReadStorageKey, {});
        const current = new Set(reads[login] || []);
        current.add(noticeId);
        reads[login] = Array.from(current);
        writeJson(noticeReadStorageKey, reads);
    }

    function getAttempts() {
        if (!isLocalPrototype) {
            return {};
        }
        return readJson(loginAttemptStorageKey, {});
    }

    function saveAttempts(attempts) {
        if (!isLocalPrototype) {
            return;
        }
        writeJson(loginAttemptStorageKey, attempts);
    }

    function normalizeAttemptState(login) {
        const attempts = getAttempts();
        const current = attempts[login] || { count: 0, locked_until: 0 };
        if (current.locked_until && Date.now() > current.locked_until) {
            attempts[login] = { count: 0, locked_until: 0 };
            saveAttempts(attempts);
            return attempts[login];
        }
        return current;
    }

    function registerFailedAttempt(login) {
        const attempts = getAttempts();
        const current = attempts[login] || { count: 0, locked_until: 0 };
        current.count += 1;
        if (current.count >= maxLoginAttempts) {
            current.locked_until = Date.now() + loginLockMs;
        }
        attempts[login] = current;
        saveAttempts(attempts);
        return current;
    }

    function clearAttempts(login) {
        const attempts = getAttempts();
        delete attempts[login];
        saveAttempts(attempts);
    }

    function base64ToBytes(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    function bytesToBase64(bytes) {
        let binary = "";
        bytes.forEach(function (value) {
            binary += String.fromCharCode(value);
        });
        return window.btoa(binary);
    }

    async function hashPassword(password, saltBase64, iterations) {
        const salt = saltBase64 ? base64ToBytes(saltBase64) : window.crypto.getRandomValues(new Uint8Array(16));
        const rounds = iterations || 120000;
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );
        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: rounds,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );

        return {
            saltBase64: saltBase64 || bytesToBase64(salt),
            hashBase64: bytesToBase64(new Uint8Array(derivedBits)),
            iterations: rounds
        };
    }

    async function verifyAdminPassword(username, password) {
        if (!isLocalPrototype || username !== adminCredentials.username || !window.crypto || !window.crypto.subtle) {
            return false;
        }

        const hashed = await hashPassword(password, adminCredentials.saltBase64, adminCredentials.iterations);
        return hashed.hashBase64 === adminCredentials.hashBase64;
    }

    async function verifyProfilePassword(profile, password) {
        if (!profile || !profile.password_hash || !profile.password_salt) {
            return false;
        }

        const hashed = await hashPassword(password, profile.password_salt, profile.password_iterations || 120000);
        return hashed.hashBase64 === profile.password_hash;
    }

    function isStrongPassword(password) {
        return password.length >= minPasswordLength &&
            /[A-Za-zА-Яа-яЁё]/.test(password) &&
            /\d/.test(password);
    }

    function isValidLogin(login) {
        return loginPattern.test(login);
    }

    function generateTemporaryPassword() {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        let password = "";
        for (let index = 0; index < 12; index += 1) {
            password += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return password;
    }

    function getRoleLabel(role) {
        return roleLabels[role] || "Сотрудник";
    }

    function getStatusLabel(status) {
        return statusLabels[status] || status;
    }

    function shortName(fullName) {
        const cleaned = String(fullName || "").trim().split(/\s+/);
        if (cleaned.length >= 3) {
            return cleaned[1] + " " + cleaned[2];
        }
        return String(fullName || "");
    }

    function greetingText(fullName) {
        return "Добрый день, " + shortName(fullName);
    }

    function formatDate() {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date());
    }

    function formatShortDate(value) {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value));
    }

    function formatLockRemaining(timestamp) {
        const minutes = Math.max(1, Math.ceil((timestamp - Date.now()) / 60000));
        return minutes + " мин.";
    }

    function showMessage(node, text, kind) {
        if (!node) {
            return;
        }
        node.textContent = text;
        node.className = "form-message " + kind;
    }

    function getCurrentPath() {
        return window.location.pathname.split("/").pop() || "index.html";
    }

    function redirectToLogin(timeout) {
        void signOutEverywhere(timeout);
    }

    function updateLastActivity() {
        const session = readSession();
        if (!session) {
            return;
        }
        session.last_activity_at = Date.now();
        writeSession(session);
    }

    function startInactivityGuard() {
        const session = readSession();
        if (!session) {
            return;
        }

        const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
        events.forEach(function (name) {
            window.addEventListener(name, updateLastActivity, { passive: true });
        });

        window.setInterval(function () {
            const current = readSession();
            if (!current) {
                return;
            }

            const lastActivity = Number(current.last_activity_at || current.signed_in_at || Date.now());
            if (Date.now() - lastActivity > inactivityLimitMs) {
                redirectToLogin(true);
            }
        }, 60000);
    }

    function requireSession(allowedRoles) {
        const session = readSession();
        if (!session) {
            redirectToLogin(false);
            return null;
        }

        const lastActivity = Number(session.last_activity_at || session.signed_in_at || Date.now());
        if (Date.now() - lastActivity > inactivityLimitMs) {
            redirectToLogin(true);
            return null;
        }

        if (allowedRoles && allowedRoles.length && allowedRoles.indexOf(session.role) === -1) {
            window.location.href = "dashboard.html";
            return null;
        }

        return session;
    }

    function renderServiceTiles(session) {
        const grid = document.getElementById("service-grid");
        if (!grid || !session) {
            return;
        }

        grid.innerHTML = serviceLinks.map(function (item) {
            const hasAccess = item.roles.indexOf(session.role) !== -1;
            const href = hasAccess ? item.href : "#";
            const extraClass = item.featured ? " service-tile-featured" : "";
            const lockClass = hasAccess ? "" : " service-tile-locked";
            const action = hasAccess ? item.action : "Доступ по специальной роли";
            const target = href.indexOf("http") === 0 ? ' target="_blank" rel="noreferrer"' : "";

            return [
                '<a class="service-tile' + extraClass + lockClass + '" href="' + href + '"' + target + (hasAccess ? "" : ' aria-disabled="true"') + ">",
                '  <div class="service-tile-top">',
                '    <span class="service-tile-icon">' + item.icon + "</span>",
                '    <span class="service-tile-arrow">' + (hasAccess ? "→" : "🔒") + "</span>",
                "  </div>",
                "  <strong>" + escapeHtml(item.title) + "</strong>",
                "  <p>" + escapeHtml(item.description) + "</p>",
                '  <span class="service-tile-action">' + escapeHtml(action) + "</span>",
                "</a>"
            ].join("");
        }).join("");
    }

    async function renderNotices(session) {
        const noticeList = document.getElementById("notice-list");
        const counter = document.getElementById("notice-counter");
        if (!noticeList || !session) {
            return;
        }

        const sourceNotices = isServerAuthAvailable() ? await fetchServerNotices() : getNotices();
        const notices = sourceNotices.slice().sort(function (left, right) {
            return new Date(right.createdAt) - new Date(left.createdAt);
        });
        const reads = new Set(isServerAuthAvailable()
            ? await fetchServerReadNoticeIds(session)
            : getReadNoticeIds(session.login));
        const unreadCount = notices.filter(function (notice) {
            return !reads.has(notice.id);
        }).length;

        if (counter) {
            counter.textContent = unreadCount + " новых";
        }

        noticeList.innerHTML = notices.map(function (notice) {
            const isRead = reads.has(notice.id);
            return [
                '<article class="notice-card' + (isRead ? " notice-read" : "") + '" data-notice-id="' + notice.id + '">',
                '  <div class="notice-copy">',
                '    <div class="notice-head">',
                "      <strong>" + escapeHtml(notice.title) + "</strong>",
                "      <span>" + formatShortDate(notice.createdAt) + "</span>",
                "    </div>",
                "    <p>" + escapeHtml(notice.body) + "</p>",
                "  </div>",
                '  <button class="notice-check-btn" type="button" data-notice-read="' + notice.id + '"' + (isRead ? " disabled" : "") + ">",
                isRead ? "Прочитано" : "✓ Отметить",
                "  </button>",
                "</article>"
            ].join("");
        }).join("");
        return unreadCount;
    }

    function bindNoticeEvents(session) {
        const noticeList = document.getElementById("notice-list");
        if (!noticeList || !session) {
            return;
        }

        noticeList.addEventListener("click", async function (event) {
            const button = event.target.closest("[data-notice-read]");
            if (!button) {
                return;
            }
            const noticeId = button.getAttribute("data-notice-read");
            if (isServerAuthAvailable()) {
                await markServerNoticeRead(session, noticeId);
            } else {
                markNoticeRead(session.login, noticeId);
            }
            await renderNotices(session);
        });
    }

    function bindMessageForms(session) {
        ["chief", "admin"].forEach(function (channel) {
            const form = document.getElementById("message-form-" + channel);
            const messageNode = document.getElementById("message-feedback-" + channel);
            if (!form) {
                return;
            }

            form.addEventListener("submit", async function (event) {
                event.preventDefault();
                const formData = new FormData(form);
                const subject = String(formData.get("subject") || "").trim();
                const body = String(formData.get("body") || "").trim();

                if (!subject || !body) {
                    showMessage(messageNode, "Заполните тему и текст обращения.", "error");
                    return;
                }

                if (subject.length > 120 || body.length > 2000) {
                    showMessage(messageNode, "Сообщение слишком длинное. Сократите текст и попробуйте снова.", "error");
                    return;
                }

                if (isServerAuthAvailable()) {
                    const result = await createServerMessage(session, channel, subject, body);
                    if (result.error) {
                        showMessage(messageNode, "Не удалось отправить сообщение. Попробуйте снова.", "error");
                        return;
                    }
                } else {
                    const messages = getMessages();
                    messages.push({
                        id: "message-" + Date.now(),
                        from_login: session.login,
                        from_name: session.full_name,
                        to_channel: channel,
                        subject: subject,
                        body: body,
                        createdAt: new Date().toISOString(),
                        status: "new"
                    });
                    saveMessages(messages);
                }
                form.reset();
                showMessage(
                    messageNode,
                    channel === "chief"
                        ? "Обращение главному врачу отправлено."
                        : "Сообщение администратору портала отправлено.",
                    "success"
                );
            });
        });
    }

    async function handleLoginPage() {
        const form = document.getElementById("login-form");
        if (!form) {
            return;
        }

        const existingSession = isServerAuthAvailable() ? await hydrateSessionFromSupabase() : readSession();
        if (existingSession && existingSession.role) {
            window.location.href = existingSession.role === "admin"
                ? "admin.html"
                : existingSession.role.indexOf("okk") === 0
                    ? "quality.html"
                    : "dashboard.html";
            return;
        }

        const message = document.getElementById("form-message");
        const params = new URLSearchParams(window.location.search);
        if (params.get("timeout") === "1") {
            showMessage(message, "Сессия завершена из-за долгого бездействия. Войдите снова.", "error");
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const formData = new FormData(form);
            if (String(formData.get("website") || "").trim()) {
                showMessage(message, "Запрос отклонен системой защиты формы.", "error");
                return;
            }
            const login = String(formData.get("email") || "").trim().toLowerCase();
            const password = String(formData.get("password") || "").trim();

            if (!login || password.length < minPasswordLength) {
                showMessage(message, "Проверьте логин и длину пароля.", "error");
                return;
            }

            if (!isValidLogin(login)) {
                showMessage(message, "Логин должен содержать 4–32 символа: латинские буквы, цифры, точку, дефис или нижнее подчёркивание.", "error");
                return;
            }

            if (!isLocalPrototype && !isServerAuthAvailable()) {
                showMessage(message, "Защищённый вход на опубликованном сайте пока закрыт до полного серверного подключения.", "error");
                return;
            }

            const attemptState = normalizeAttemptState(login);
            if (attemptState.locked_until && Date.now() < attemptState.locked_until) {
                showMessage(message, "Слишком много попыток. Повторите через " + formatLockRemaining(attemptState.locked_until), "error");
                return;
            }

            if (await verifyAdminPassword(login, password)) {
                clearAttempts(login);
                const session = {
                    login: "admin",
                    full_name: "Администратор портала",
                    role: "admin",
                    signed_in_at: Date.now(),
                    last_activity_at: Date.now()
                };
                writeSession(session);
                window.location.href = "admin.html";
                return;
            }

            if (isServerAuthAvailable()) {
                const loginResult = await supabaseClient.auth.signInWithPassword({
                    email: buildAuthEmail(login),
                    password: password
                });

                if (loginResult.error) {
                    const state = registerFailedAttempt(login);
                    showMessage(message, state.locked_until ? "Слишком много попыток. Вход временно заблокирован." : "Неверный логин или пароль.", "error");
                    return;
                }

                const profile = await fetchCurrentServerProfile();
                if (!profile) {
                    await supabaseClient.auth.signOut();
                    showMessage(message, "Профиль пользователя не найден.", "error");
                    return;
                }

                if (profile.status !== "approved" || !profile.is_active) {
                    await supabaseClient.auth.signOut();
                    showMessage(message, "Доступ к учетной записи пока не открыт. Статус: " + getStatusLabel(profile.status || "pending"), "error");
                    return;
                }

                clearAttempts(login);
                const session = mapProfileSession(profile);
                writeSession(session);
                window.location.href = profile.role === "admin" ? "admin.html" : profile.role.indexOf("okk") === 0 ? "quality.html" : "dashboard.html";
                return;
            }

            const profile = getProfiles().find(function (item) {
                return item.login === login;
            });
            if (!profile) {
                const state = registerFailedAttempt(login);
                showMessage(message, state.locked_until ? "Слишком много попыток. Вход временно заблокирован." : "Такой пользователь не найден.", "error");
                return;
            }

            if (profile.status !== "approved" || !profile.is_active) {
                showMessage(message, "Доступ к учетной записи не активен. Статус: " + getStatusLabel(profile.status || "blocked"), "error");
                return;
            }

            const matches = await verifyProfilePassword(profile, password);
            if (!matches) {
                const state = registerFailedAttempt(login);
                showMessage(message, state.locked_until ? "Слишком много попыток. Вход временно заблокирован." : "Неверный логин или пароль.", "error");
                return;
            }

            clearAttempts(login);
            const session = {
                login: profile.login,
                full_name: profile.full_name,
                role: profile.role,
                department_name: profile.department_name,
                position: profile.position,
                signed_in_at: Date.now(),
                last_activity_at: Date.now()
            };
            writeSession(session);
            window.location.href = profile.role === "admin" ? "admin.html" : profile.role.indexOf("okk") === 0 ? "quality.html" : "dashboard.html";
        });
    }

    async function handleRegisterPage() {
        const form = document.getElementById("register-form");
        if (!form) {
            return;
        }

        const message = document.getElementById("register-message");
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const formData = new FormData(form);
            if (String(formData.get("website") || "").trim()) {
                showMessage(message, "Запрос отклонен системой защиты формы.", "error");
                return;
            }
            const fullName = String(formData.get("full_name") || "").trim();
            const departmentType = String(formData.get("department_type") || "").trim();
            const departmentName = String(formData.get("department_name") || "").trim();
            const position = String(formData.get("position") || "").trim();
            const requestedLogin = String(formData.get("requested_login") || "").trim().toLowerCase();
            const requestedPassword = String(formData.get("requested_password") || "").trim();

            if (!fullName || !departmentType || !departmentName || !position || !requestedLogin) {
                showMessage(message, "Заполните все поля формы.", "error");
                return;
            }

            if (!isValidLogin(requestedLogin)) {
                showMessage(message, "Логин должен содержать 4–32 символа: латинские буквы, цифры, точку, дефис или нижнее подчёркивание.", "error");
                return;
            }

            if (fullName.length > 120 || departmentName.length > 120 || position.length > 120) {
                showMessage(message, "Слишком длинные данные в одном из полей. Сократите текст и попробуйте снова.", "error");
                return;
            }

            if (!isStrongPassword(requestedPassword)) {
                showMessage(message, "Пароль должен быть не короче 8 символов и содержать хотя бы одну букву и одну цифру.", "error");
                return;
            }

            if (isServerAuthAvailable()) {
                const result = await invokeEdgeFunction("submit-registration", {
                    full_name: fullName,
                    department_type: departmentType,
                    department_name: departmentName,
                    position: position,
                    requested_login: requestedLogin,
                    requested_password: requestedPassword
                });

                if (result.error) {
                    showMessage(message, result.error.message || "Не удалось отправить заявку.", "error");
                    return;
                }

                form.reset();
                showMessage(message, "Заявка отправлена. Ожидайте одобрения администратора портала.", "success");
                return;
            }

            const profiles = getProfiles();
            const requests = getRequests();
            const loginExists = profiles.some(function (item) { return item.login === requestedLogin; }) ||
                requests.some(function (item) { return item.requested_login === requestedLogin && item.status === "pending"; });
            if (loginExists) {
                showMessage(message, "Такой логин уже занят или ожидает одобрения.", "error");
                return;
            }

            const hashed = await hashPassword(requestedPassword);
            requests.push({
                id: "request-" + Date.now(),
                full_name: fullName,
                department_type: departmentType,
                department_name: departmentName,
                position: position,
                requested_login: requestedLogin,
                password_hash: hashed.hashBase64,
                password_salt: hashed.saltBase64,
                password_iterations: hashed.iterations,
                status: "pending",
                createdAt: new Date().toISOString()
            });
            saveRequests(requests);
            form.reset();
            showMessage(message, "Заявка отправлена. Ожидайте одобрения администратора портала.", "success");
        });
    }

    function handleForgotPage() {
        const form = document.getElementById("forgot-form");
        if (!form) {
            return;
        }

        const message = document.getElementById("forgot-message");
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const formData = new FormData(form);
            if (String(formData.get("website") || "").trim()) {
                showMessage(message, "Запрос отклонен системой защиты формы.", "error");
                return;
            }
            const login = String(formData.get("login") || "").trim().toLowerCase();
            const department = String(formData.get("department_name") || "").trim();
            const note = String(formData.get("note") || "").trim();

            if (!login || !department) {
                showMessage(message, "Укажите логин и подразделение.", "error");
                return;
            }

            if (!isValidLogin(login)) {
                showMessage(message, "Проверьте формат логина.", "error");
                return;
            }

            if (department.length > 120 || note.length > 500) {
                showMessage(message, "Комментарий или подразделение слишком длинные.", "error");
                return;
            }

            if (isServerAuthAvailable()) {
                supabaseClient
                    .from("password_reset_requests")
                    .select("id")
                    .eq("login", login)
                    .eq("status", "pending")
                    .then(function (existing) {
                        if (existing.data && existing.data.length) {
                            showMessage(message, "Запрос на сброс уже отправлен и ожидает обработки.", "error");
                            return;
                        }
                        supabaseClient
                            .from("password_reset_requests")
                            .insert({
                                login: login,
                                department_name: department,
                                note: note,
                                status: "pending"
                            })
                            .then(function (result) {
                                if (result.error) {
                                    showMessage(message, "Не удалось отправить запрос на восстановление.", "error");
                                    return;
                                }
                                form.reset();
                                showMessage(message, "Запрос на восстановление отправлен администратору.", "success");
                            });
                    });
                return;
            }

            const requests = getResetRequests();
            const alreadyOpen = requests.some(function (item) {
                return item.login === login && item.status === "pending";
            });
            if (alreadyOpen) {
                showMessage(message, "Запрос на сброс уже отправлен и ожидает обработки.", "error");
                return;
            }

            requests.push({
                id: "reset-" + Date.now(),
                login: login,
                department_name: department,
                note: note,
                status: "pending",
                createdAt: new Date().toISOString()
            });
            saveResetRequests(requests);
            form.reset();
            showMessage(message, "Запрос на восстановление отправлен администратору.", "success");
        });
    }

    function renderDashboardHighlights(session, unreadCount) {
        const root = document.getElementById("dashboard-highlight-grid");
        if (!root) {
            return;
        }
        const cards = [
            {
                title: "Непрочитанные уведомления",
                value: String(unreadCount),
                note: unreadCount ? "Есть новые сообщения от администрации" : "Все уведомления прочитаны"
            },
            {
                title: "Роль и доступ",
                value: getRoleLabel(session.role),
                note: session.role.indexOf("okk") === 0 || session.role === "admin" ? "Открыт и базовый кабинет, и защищённый контур ОКК" : "Открыт персональный рабочий кабинет"
            },
            {
                title: "Первый фокус дня",
                value: unreadCount ? "Проверить ленту" : "Открыть рабочие разделы",
                note: unreadCount ? "Начните с новых публикаций и распоряжений" : "Сразу переходите к документам, сервисам и задачам"
            },
            {
                title: "Безопасность",
                value: "НС под рукой",
                note: "Форма НС и рабочий контур ОКК доступны из кабинета без поиска"
            }
        ];
        root.innerHTML = cards.map(function (item) {
            return [
                '<article class="dashboard-highlight-card">',
                '  <span>' + escapeHtml(item.title) + '</span>',
                '  <strong>' + escapeHtml(item.value) + '</strong>',
                '  <p>' + escapeHtml(item.note) + '</p>',
                '</article>'
            ].join('');
        }).join('');
    }

    function renderDashboardQuickStart(session, unreadCount) {
        const actionsRoot = document.getElementById("dashboard-quick-actions");
        if (actionsRoot) {
            const actions = [
                {
                    title: unreadCount ? "Открыть новые уведомления" : "Проверить ленту сотрудников",
                    text: unreadCount ? "У вас есть новые служебные публикации. Лучше прочитать их в начале работы." : "Даже без новых публикаций полезно быстро просмотреть ленту и убедиться, что всё спокойно.",
                    action: "Сначала — лента и распоряжения"
                },
                {
                    title: "Перейти к документам и реестрам",
                    text: "Клинические рекомендации, реестры, лекарственные сервисы и служебные материалы должны быть доступны в один клик.",
                    action: "Открыть нужный раздел"
                },
                {
                    title: "Сообщить о НС или риске",
                    text: "Если заметили нежелательное событие, риск повторения или опасный процесс — лучше сообщить сразу, не откладывая.",
                    action: "Открыть форму НС"
                }
            ];
            actionsRoot.innerHTML = actions.map(function (item, index) {
                return [
                    '<article class="dashboard-action-card' + (index === 0 ? ' is-priority' : '') + '">',
                    '  <strong>' + escapeHtml(item.title) + '</strong>',
                    '  <p>' + escapeHtml(item.text) + '</p>',
                    '  <span>' + escapeHtml(item.action) + '</span>',
                    '</article>'
                ].join('');
            }).join('');
        }

        const shiftRoot = document.getElementById("dashboard-shift-list");
        if (shiftRoot) {
            const roleHint = session.role.indexOf("okk") === 0 || session.role === "admin"
                ? "Если есть инциденты, повторы или сложные случаи — держите открытую зону ОКК и статусы разбора."
                : "Если замечаете риск или уже случилось НС — сообщайте сразу, без ожидания конца смены.";
            const items = [
                "Проверьте новые уведомления и распоряжения",
                "Откройте нужные документы, реестры и клинические сервисы",
                roleHint,
                "Если нужен вопрос руководству, отправьте его через встроенные обращения, чтобы он не потерялся"
            ];
            shiftRoot.innerHTML = items.map(function (item, index) {
                return [
                    '<article class="dashboard-shift-card">',
                    '  <span class="dashboard-shift-index">' + String(index + 1) + '</span>',
                    '  <p>' + escapeHtml(item) + '</p>',
                    '</article>'
                ].join('');
            }).join('');
        }
    }

    function renderDashboardNews() {
        const root = document.getElementById("dashboard-news-grid");
        if (!root) {
            return;
        }
        root.innerHTML = dashboardNewsCards.map(function (item) {
            return [
                '<a class="dashboard-news-card" href="' + item.href + '" target="_blank" rel="noreferrer">',
                '  <strong>' + escapeHtml(item.title) + '</strong>',
                '  <p>' + escapeHtml(item.text) + '</p>',
                '  <span>' + escapeHtml(item.action) + '</span>',
                '</a>'
            ].join('');
        }).join('');
    }

    function renderDashboardSideContent(session) {
        const contactsRoot = document.getElementById("dashboard-contacts");
        if (contactsRoot) {
            contactsRoot.innerHTML = dashboardContactCards.map(function (item) {
                return [
                    '<article class="dashboard-contact-card">',
                    '  <strong>' + escapeHtml(item.title) + '</strong>',
                    '  <p>' + escapeHtml(item.note) + '</p>',
                    '  <span>' + escapeHtml(item.action) + '</span>',
                    '</article>'
                ].join('');
            }).join('');
        }
        const spotlightRoot = document.getElementById("dashboard-spotlight");
        if (spotlightRoot) {
            const cards = dashboardSpotlightCards.concat(session.role.indexOf("okk") === 0 || session.role === "admin"
                ? [{ title: "Для ОКК и БМД", text: "У вас открыт доступ к защищённой рабочей зоне: там собраны маршруты НС, роли, эскалация, активные случаи и карточки разбора." }]
                : []);
            spotlightRoot.innerHTML = cards.map(function (item) {
                return [
                    '<article class="dashboard-spotlight-card">',
                    '  <strong>' + escapeHtml(item.title) + '</strong>',
                    '  <p>' + escapeHtml(item.text) + '</p>',
                    '</article>'
                ].join('');
            }).join('');
        }
    }

    async function renderDashboard(session) {
        const nameNode = document.getElementById("session-name");
        const roleNode = document.getElementById("session-role");
        const emailNode = document.getElementById("session-email");
        const greetingNode = document.getElementById("greeting-title");
        const dateNode = document.getElementById("current-date");
        const adverseLink = document.getElementById("adverse-link");
        const adminEntry = document.getElementById("admin-entry");

        if (nameNode) {
            nameNode.textContent = shortName(session.full_name);
        }
        if (roleNode) {
            roleNode.textContent = getRoleLabel(session.role);
        }
        if (emailNode) {
            emailNode.textContent = session.login;
        }
        if (greetingNode) {
            greetingNode.textContent = greetingText(session.full_name);
        }
        if (dateNode) {
            dateNode.textContent = formatDate();
        }
        if (adverseLink) {
            adverseLink.href = adverseEventUrl;
        }
        if (adminEntry && session.role !== "admin") {
            adminEntry.remove();
        }

        renderServiceTiles(session);
        const unreadCount = await renderNotices(session) || 0;
        renderDashboardHighlights(session, unreadCount);
        renderDashboardQuickStart(session, unreadCount);
        renderDashboardNews();
        renderDashboardSideContent(session);
        bindNoticeEvents(session);
        bindMessageForms(session);

        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                void signOutEverywhere(false);
            });
        }
    }

    function renderAdminRequests() {
        const root = document.getElementById("request-list");
        if (!root) {
            return;
        }

        const requests = (isServerAuthAvailable() && adminDataCache ? adminDataCache.requests : getRequests()).filter(function (item) {
            return item.status === "pending";
        });

        if (!requests.length) {
            root.innerHTML = '<div class="admin-empty-state">Новых заявок пока нет.</div>';
            return;
        }

        root.innerHTML = requests.map(function (request) {
            return [
                '<article class="admin-card" data-request-id="' + request.id + '">',
                "  <strong>" + escapeHtml(request.full_name) + "</strong>",
                "  <p>" + escapeHtml(request.department_type) + " / " + escapeHtml(request.department_name) + "</p>",
                "  <p>" + escapeHtml(request.position) + "</p>",
                "  <p>Логин: " + escapeHtml(request.requested_login) + "</p>",
                '  <div class="admin-card-actions">',
                '    <button class="portal-admin-btn" type="button" data-request-approve="' + request.id + '">Одобрить</button>',
                '    <button class="portal-ghost-btn" type="button" data-request-reject="' + request.id + '">Отклонить</button>',
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderAdminUsers() {
        const root = document.getElementById("user-list");
        if (!root) {
            return;
        }

        const profiles = isServerAuthAvailable() && adminDataCache ? adminDataCache.profiles : getProfiles();
        root.innerHTML = profiles.map(function (profile) {
            return [
                '<article class="admin-card" data-profile-id="' + profile.id + '">',
                "  <strong>" + escapeHtml(profile.full_name) + "</strong>",
                "  <p>Логин: " + escapeHtml(profile.login) + "</p>",
                "  <p>" + escapeHtml(profile.department_name) + "</p>",
                "  <p>Статус: " + getStatusLabel(profile.status || "approved") + "</p>",
                '  <div class="admin-card-row">',
                '    <select class="portal-select" data-profile-role="' + profile.id + '">',
                Object.keys(roleLabels).map(function (role) {
                    return '<option value="' + role + '"' + (profile.role === role ? " selected" : "") + ">" + getRoleLabel(role) + "</option>";
                }).join(""),
                "    </select>",
                '    <select class="portal-select" data-profile-status="' + profile.id + '">',
                ["pending", "approved", "blocked", "rejected"].map(function (status) {
                    return '<option value="' + status + '"' + ((profile.status || "approved") === status ? " selected" : "") + ">" + getStatusLabel(status) + "</option>";
                }).join(""),
                "    </select>",
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderAdminMessages() {
        const root = document.getElementById("message-list");
        if (!root) {
            return;
        }

        const messages = (isServerAuthAvailable() && adminDataCache ? adminDataCache.messages : getMessages()).slice().sort(function (left, right) {
            return new Date(right.createdAt) - new Date(left.createdAt);
        });

        if (!messages.length) {
            root.innerHTML = '<div class="admin-empty-state">Сообщений пока нет.</div>';
            return;
        }

        root.innerHTML = messages.map(function (message) {
            const channelLabel = message.to_channel === "chief" ? "Главному врачу" : "Администратору";
            return [
                '<article class="admin-card" data-message-id="' + message.id + '">',
                "  <strong>" + escapeHtml(message.subject) + "</strong>",
                "  <p>От: " + escapeHtml(message.from_name) + " (" + escapeHtml(message.from_login) + ")</p>",
                "  <p>Канал: " + channelLabel + "</p>",
                "  <p>" + escapeHtml(message.body) + "</p>",
                '  <div class="admin-card-row">',
                '    <select class="portal-select" data-message-status="' + message.id + '">',
                ["new", "in_review", "closed"].map(function (status) {
                    const label = status === "new" ? "Новое" : status === "in_review" ? "В работе" : "Закрыто";
                    return '<option value="' + status + '"' + (message.status === status ? " selected" : "") + ">" + label + "</option>";
                }).join(""),
                "    </select>",
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function renderResetRequests() {
        const root = document.getElementById("reset-request-list");
        if (!root) {
            return;
        }

        const requests = (isServerAuthAvailable() && adminDataCache ? adminDataCache.resetRequests : getResetRequests()).filter(function (item) {
            return item.status === "pending" || Boolean(item.generated_password);
        });

        if (!requests.length) {
            root.innerHTML = '<div class="admin-empty-state">Запросов на восстановление нет.</div>';
            return;
        }

        root.innerHTML = requests.map(function (request) {
            return [
                '<article class="admin-card" data-reset-id="' + request.id + '">',
                "  <strong>Сброс пароля: " + escapeHtml(request.login) + "</strong>",
                "  <p>Подразделение: " + escapeHtml(request.department_name) + "</p>",
                "  <p>" + escapeHtml(request.note || "Без дополнительного комментария.") + "</p>",
                '  <div class="admin-card-actions">',
                '    <button class="portal-admin-btn" type="button" data-reset-generate="' + request.id + '">Выдать временный пароль</button>',
                "  </div>",
                request.generated_password ? '<p class="temp-password-line">Временный пароль: <strong>' + escapeHtml(request.generated_password) + "</strong></p>" : "",
                "</article>"
            ].join("");
        }).join("");
    }

    function bindAdminActions(session) {
        const requestRoot = document.getElementById("request-list");
        const userRoot = document.getElementById("user-list");
        const noticeForm = document.getElementById("admin-notice-form");
        const noticeMessage = document.getElementById("admin-form-message");
        const resetRoot = document.getElementById("reset-request-list");
        const messageRoot = document.getElementById("message-list");

        if (requestRoot) {
            requestRoot.addEventListener("click", async function (event) {
                const approveButton = event.target.closest("[data-request-approve]");
                const rejectButton = event.target.closest("[data-request-reject]");

                if (isServerAuthAvailable()) {
                    const requestId = approveButton
                        ? approveButton.getAttribute("data-request-approve")
                        : rejectButton
                            ? rejectButton.getAttribute("data-request-reject")
                            : "";
                    const action = approveButton ? "approve" : rejectButton ? "reject" : "";
                    if (!requestId || !action) {
                        return;
                    }
                    const result = await invokeEdgeFunction("admin-registration", {
                        requestId: requestId,
                        action: action
                    });
                    if (result.error) {
                        return;
                    }
                    await refreshAdminPageData();
                    return;
                }

                const requests = getRequests();

                if (approveButton) {
                    const requestId = approveButton.getAttribute("data-request-approve");
                    const request = requests.find(function (item) { return item.id === requestId; });
                    if (!request) {
                        return;
                    }
                    request.status = "approved";
                    request.reviewed_by = session.login;
                    request.reviewed_at = new Date().toISOString();
                    saveRequests(requests);

                    const profiles = getProfiles();
                    profiles.push({
                        id: "profile-" + Date.now(),
                        full_name: request.full_name,
                        short_name: shortName(request.full_name),
                        login: request.requested_login,
                        department_type: request.department_type,
                        department_name: request.department_name,
                        position: request.position,
                        role: "employee",
                        status: "approved",
                        is_active: true,
                        password_hash: request.password_hash,
                        password_salt: request.password_salt,
                        password_iterations: request.password_iterations
                    });
                    saveProfiles(profiles);
                    renderAdminRequests();
                    renderAdminUsers();
                    return;
                }

                if (rejectButton) {
                    const requestId = rejectButton.getAttribute("data-request-reject");
                    const request = requests.find(function (item) { return item.id === requestId; });
                    if (!request) {
                        return;
                    }
                    request.status = "rejected";
                    request.reviewed_by = session.login;
                    request.reviewed_at = new Date().toISOString();
                    saveRequests(requests);
                    renderAdminRequests();
                }
            });
        }

        if (userRoot) {
            userRoot.addEventListener("change", async function (event) {
                const roleSelect = event.target.closest("[data-profile-role]");
                const statusSelect = event.target.closest("[data-profile-status]");

                if (isServerAuthAvailable()) {
                    const profileId = roleSelect
                        ? roleSelect.getAttribute("data-profile-role")
                        : statusSelect
                            ? statusSelect.getAttribute("data-profile-status")
                            : "";
                    const sourceProfiles = adminDataCache && adminDataCache.profiles ? adminDataCache.profiles : [];
                    const currentProfile = sourceProfiles.find(function (item) {
                        return item.id === profileId;
                    });
                    if (!profileId || !currentProfile) {
                        return;
                    }
                    const result = await invokeEdgeFunction("admin-profile", {
                        profileId: profileId,
                        role: roleSelect ? roleSelect.value : currentProfile.role,
                        status: statusSelect ? statusSelect.value : currentProfile.status
                    });
                    if (result.error) {
                        return;
                    }
                    await refreshAdminPageData();
                    return;
                }

                const profiles = getProfiles();

                if (roleSelect) {
                    const profile = profiles.find(function (item) { return item.id === roleSelect.getAttribute("data-profile-role"); });
                    if (!profile) {
                        return;
                    }
                    profile.role = roleSelect.value;
                    saveProfiles(profiles);
                    return;
                }

                if (statusSelect) {
                    const profile = profiles.find(function (item) { return item.id === statusSelect.getAttribute("data-profile-status"); });
                    if (!profile) {
                        return;
                    }
                    profile.status = statusSelect.value;
                    profile.is_active = statusSelect.value === "approved";
                    saveProfiles(profiles);
                }
            });
        }

        if (noticeForm) {
            noticeForm.addEventListener("submit", async function (event) {
                event.preventDefault();
                const formData = new FormData(noticeForm);
                const title = String(formData.get("title") || "").trim();
                const body = String(formData.get("body") || "").trim();
                if (!title || !body) {
                    showMessage(noticeMessage, "Заполните заголовок и текст уведомления.", "error");
                    return;
                }

                if (title.length > 120 || body.length > 2000) {
                    showMessage(noticeMessage, "Уведомление слишком длинное. Сократите текст.", "error");
                    return;
                }

                if (isServerAuthAvailable()) {
                    const result = await supabaseClient
                        .from("notices")
                        .insert({
                            title: title,
                            body: body,
                            created_by: session.profile_id
                        });
                    if (result.error) {
                        showMessage(noticeMessage, "Не удалось опубликовать уведомление.", "error");
                        return;
                    }
                } else {
                    const notices = getNotices();
                    notices.push({
                        id: "notice-" + Date.now(),
                        title: title,
                        body: body,
                        createdAt: new Date().toISOString()
                    });
                    saveNotices(notices);
                }
                noticeForm.reset();
                showMessage(noticeMessage, "Уведомление опубликовано.", "success");
            });
        }

        if (messageRoot) {
            messageRoot.addEventListener("change", async function (event) {
                const statusSelect = event.target.closest("[data-message-status]");
                if (!statusSelect) {
                    return;
                }
                const messageId = statusSelect.getAttribute("data-message-status");
                const nextStatus = statusSelect.value;
                if (!messageId || !nextStatus) {
                    return;
                }

                if (isServerAuthAvailable()) {
                    const result = await supabaseClient
                        .from("messages")
                        .update({ status: nextStatus })
                        .eq("id", messageId);
                    if (result.error) {
                        await refreshAdminPageData();
                        return;
                    }
                    await refreshAdminPageData();
                    return;
                }

                const messages = getMessages();
                const message = messages.find(function (item) { return item.id === messageId; });
                if (!message) {
                    return;
                }
                message.status = nextStatus;
                saveMessages(messages);
                renderAdminSummary();
                renderAdminMessages();
            });
        }

        if (resetRoot) {
            resetRoot.addEventListener("click", async function (event) {
                const button = event.target.closest("[data-reset-generate]");
                if (!button) {
                    return;
                }

                const requestId = button.getAttribute("data-reset-generate");

                if (isServerAuthAvailable()) {
                    const result = await invokeEdgeFunction("admin-reset-password", {
                        requestId: requestId
                    });
                    if (result.error) {
                        return;
                    }
                    await refreshAdminPageData();
                    const pendingRequests = adminDataCache && adminDataCache.resetRequests ? adminDataCache.resetRequests : [];
                    const requestRecord = pendingRequests.find(function (item) { return item.id === requestId; });
                    if (requestRecord && result.data && result.data.temporaryPassword) {
                        requestRecord.generated_password = result.data.temporaryPassword;
                        requestRecord.status = "completed";
                        renderResetRequests();
                    }
                    return;
                }

                const requests = getResetRequests();
                const request = requests.find(function (item) { return item.id === requestId; });
                const profiles = getProfiles();
                const profile = profiles.find(function (item) { return item.login === request.login; });
                if (!request || !profile) {
                    return;
                }

                const tempPassword = generateTemporaryPassword();
                const hashed = await hashPassword(tempPassword);
                profile.password_hash = hashed.hashBase64;
                profile.password_salt = hashed.saltBase64;
                profile.password_iterations = hashed.iterations;
                request.generated_password = tempPassword;
                request.status = "completed";
                request.reviewed_by = session.login;
                request.reviewed_at = new Date().toISOString();

                saveProfiles(profiles);
                saveResetRequests(requests);
                clearAttempts(profile.login);
                renderResetRequests();
            });
        }

        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                void signOutEverywhere(false);
            });
        }
    }

    function renderQualityPage(session) {
        const qualityRoot = document.getElementById("quality-access-role");
        if (qualityRoot) {
            qualityRoot.textContent = getRoleLabel(session.role);
        }
        const categoriesNode = document.getElementById("quality-stat-categories");
        const statusesNode = document.getElementById("quality-stat-statuses");
        const curatorsNode = document.getElementById("quality-stat-curators");
        const causesNode = document.getElementById("quality-stat-causes");
        if (categoriesNode) {
            categoriesNode.textContent = String(qualityTaxonomy.categories.length);
        }
        if (statusesNode) {
            statusesNode.textContent = String(qualityTaxonomy.statuses.length);
        }
        if (curatorsNode) {
            curatorsNode.textContent = String(qualityTaxonomy.curators.length);
        }
        if (causesNode) {
            causesNode.textContent = String(qualityTaxonomy.causeGroups.length);
        }
        const nextStep = document.getElementById("quality-next-step");
        if (nextStep) {
            const roleHint = session.role === "admin"
                ? "Как администратор, вы можете открывать доступ сотрудникам ОКК, менять роли и контролировать защищённые разборы."
                : session.role === "okk_head"
                    ? "Как руководитель ОКК, вы ведёте эскалации, защищённые разборы и контроль выполнения мер."
                    : "Как сотрудник ОКК, вы ведёте первичную оценку, категоризацию случая и сопровождение мер.";
            nextStep.innerHTML = '<strong>Что делать дальше</strong><p>' + escapeHtml(roleHint) + "</p>";
        }

        const caseBoard = document.getElementById("quality-case-board");
        if (caseBoard) {
            caseBoard.innerHTML = adverseEventStatusBoard.map(function (column) {
                const items = adverseEventCases.filter(function (item) { return item.status === column.key; });
                return [
                    '<section class="quality-case-column">',
                    '  <div class="quality-case-column-head">',
                    '    <strong>' + escapeHtml(column.title) + '</strong>',
                    '    <span>' + escapeHtml(column.note) + '</span>',
                    '  </div>',
                    '  <div class="quality-case-list">',
                    items.map(function (item, index) {
                        return [
                            '<article class="quality-case-card' + (index === 0 ? ' is-featured' : '') + '">',
                            '  <div class="quality-case-meta">',
                            '    <span class="quality-case-code">' + escapeHtml(item.code) + '</span>',
                            '    <span class="quality-case-urgency">' + escapeHtml(item.urgency) + '</span>',
                            '  </div>',
                            '  <strong>' + escapeHtml(item.title) + '</strong>',
                            '  <p>' + escapeHtml(item.department) + '</p>',
                            '  <span class="quality-case-owner">Куратор: ' + escapeHtml(item.owner) + '</span>',
                            '  <span class="quality-case-deadline">Срок: ' + escapeHtml(item.deadline) + '</span>',
                            '  <p class="quality-case-next">Следующий шаг: ' + escapeHtml(item.nextStep) + '</p>',
                            '  <div class="quality-chip-wrap">',
                            item.tags.map(function (tag) { return '<span class="quality-chip">' + escapeHtml(tag) + '</span>'; }).join(''),
                            '  </div>',
                            '</article>'
                        ].join('');
                    }).join('') || '<article class="quality-case-card quality-case-empty"><strong>Нет активных случаев</strong><p>В этой колонке сейчас нет кейсов.</p></article>',
                    '  </div>',
                    '</section>'
                ].join('');
            }).join('');
        }

        const detailRoot = document.getElementById("quality-case-detail");
        if (detailRoot) {
            const focusCase = adverseEventCases[0];
            const detail = adverseEventCaseDetails[focusCase.code];
            detailRoot.innerHTML = [
                '<div class="quality-detail-head">',
                '  <div>',
                '    <p class="portal-kicker">Фокус разбора</p>',
                '    <h3>' + escapeHtml(focusCase.code + ' — ' + focusCase.title) + '</h3>',
                '    <p class="quality-detail-summary">' + escapeHtml(detail.summary) + '</p>',
                '  </div>',
                '  <div class="quality-detail-badges">',
                '    <span class="quality-case-code">' + escapeHtml(focusCase.status) + '</span>',
                '    <span class="quality-case-urgency">' + escapeHtml(focusCase.owner) + '</span>',
                '  </div>',
                '</div>',
                '<div class="quality-detail-grid">',
                '  <section class="quality-detail-card">',
                '    <strong>Хронология</strong>',
                '    <div class="quality-detail-list">',
                detail.timeline.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join(''),
                '    </div>',
                '  </section>',
                '  <section class="quality-detail-card">',
                '    <strong>Назначенные меры</strong>',
                '    <div class="quality-detail-list">',
                detail.measures.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join(''),
                '    </div>',
                '  </section>',
                '  <section class="quality-detail-card">',
                '    <strong>Контакты и участники</strong>',
                '    <div class="quality-detail-list">',
                detail.contacts.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join(''),
                '    </div>',
                '  </section>',
                '  <section class="quality-detail-card">',
                '    <strong>Готовность к закрытию</strong>',
                '    <div class="quality-detail-list">',
                detail.closure.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join(''),
                '    </div>',
                '  </section>',
                '</div>'
            ].join('');
        }

        const actionsGrid = document.getElementById("quality-actions-grid");
        if (actionsGrid) {
            actionsGrid.innerHTML = qualityActionCards.map(function (item) {
                return [
                    '<a class="quality-action-card" href="' + item.href + '" target="_blank" rel="noreferrer">',
                    '  <div class="quality-action-top">',
                    '    <span class="quality-action-icon">' + item.icon + "</span>",
                    '    <span class="quality-action-arrow">→</span>',
                    "  </div>",
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    "  <p>" + escapeHtml(item.description) + "</p>",
                    '  <span class="quality-action-link">' + escapeHtml(item.action) + "</span>",
                    "</a>"
                ].join("");
            }).join("");
        }

        const workflowGrid = document.getElementById("quality-workflow-grid");
        if (workflowGrid) {
            workflowGrid.innerHTML = qualityWorkflowSteps.map(function (item) {
                return [
                    '<article class="quality-step-card">',
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    "  <p>" + escapeHtml(item.body) + "</p>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const lifecycleGrid = document.getElementById("quality-lifecycle-grid");
        if (lifecycleGrid) {
            lifecycleGrid.innerHTML = adverseEventLifecycle.map(function (item) {
                return [
                    '<article class="quality-step-card quality-lifecycle-card">',
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    '  <span class="quality-owner-line">Ответственный: ' + escapeHtml(item.owner) + "</span>",
                    "  <p>" + escapeHtml(item.body) + "</p>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const taxonomyRoot = document.getElementById("quality-taxonomy-summary");
        if (taxonomyRoot) {
            const groups = [
                { title: "Категории", items: qualityTaxonomy.categories },
                { title: "Подкатегории", items: qualityTaxonomy.subcategories },
                { title: "Статусы", items: qualityTaxonomy.statuses },
                { title: "Срочность", items: qualityTaxonomy.urgency },
                { title: "Типы мер", items: qualityTaxonomy.measureTypes },
                { title: "Группы причин", items: qualityTaxonomy.causeGroups }
            ];
            taxonomyRoot.innerHTML = groups.map(function (group) {
                return [
                    '<article class="quality-taxonomy-card">',
                    "  <strong>" + escapeHtml(group.title) + "</strong>",
                    '  <div class="quality-chip-wrap">',
                    group.items.map(function (item) {
                        return '<span class="quality-chip">' + escapeHtml(item) + "</span>";
                    }).join(""),
                    "  </div>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const ownershipGrid = document.getElementById("quality-ownership-grid");
        if (ownershipGrid) {
            ownershipGrid.innerHTML = adverseEventOwnership.map(function (item) {
                return [
                    '<article class="quality-step-card quality-lifecycle-card">',
                    "  <strong>" + escapeHtml(item.role) + "</strong>",
                    '  <span class="quality-owner-line">Зона ответственности</span>',
                    "  <p>" + escapeHtml(item.responsibility) + "</p>",
                    '  <span class="quality-result-line">Результат: ' + escapeHtml(item.result) + "</span>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const curatorGrid = document.getElementById("quality-curator-grid");
        if (curatorGrid) {
            curatorGrid.innerHTML = qualityTaxonomy.curators.map(function (item) {
                return [
                    '<article class="quality-mini-card">',
                    "  <strong>" + escapeHtml(item) + "</strong>",
                    "  <span>Подключается в зависимости от категории, срочности и последствий.</span>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const reviewGrid = document.getElementById("quality-review-grid");
        if (reviewGrid) {
            reviewGrid.innerHTML = qualityReviewRules.map(function (item) {
                return [
                    '<article class="quality-mini-card">',
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    "  <span>" + escapeHtml(item.text) + "</span>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const escalationGrid = document.getElementById("quality-escalation-grid");
        if (escalationGrid) {
            escalationGrid.innerHTML = adverseEventEscalation.map(function (item) {
                return [
                    '<article class="quality-mini-card">',
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    "  <span>" + escapeHtml(item.text) + "</span>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const communicationGrid = document.getElementById("quality-communication-grid");
        if (communicationGrid) {
            communicationGrid.innerHTML = adverseEventCommunication.map(function (item) {
                return [
                    '<article class="quality-mini-card">',
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    "  <span>" + escapeHtml(item.text) + "</span>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const closureGrid = document.getElementById("quality-closure-grid");
        if (closureGrid) {
            closureGrid.innerHTML = adverseEventClosureChecklist.map(function (item) {
                return [
                    '<article class="quality-mini-card quality-check-card">',
                    '  <strong>✓ Контрольный пункт</strong>',
                    "  <span>" + escapeHtml(item) + "</span>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const caseFieldsGrid = document.getElementById("quality-casefields-grid");
        if (caseFieldsGrid) {
            caseFieldsGrid.innerHTML = adverseEventCaseFields.map(function (group) {
                return [
                    '<article class="quality-mini-card">',
                    "  <strong>" + escapeHtml(group.title) + "</strong>",
                    '  <div class="quality-chip-wrap">',
                    group.items.map(function (item) {
                        return '<span class="quality-chip">' + escapeHtml(item) + '</span>';
                    }).join(''),
                    "  </div>",
                    "</article>"
                ].join("");
            }).join("");
        }

        const catalogGrid = document.getElementById("quality-catalog-grid");
        if (catalogGrid) {
            catalogGrid.innerHTML = qualityResourceCards.map(function (item) {
                return [
                    '<a class="quality-mini-card quality-mini-link" href="' + item.href + '" target="_blank" rel="noreferrer">',
                    "  <strong>" + escapeHtml(item.title) + "</strong>",
                    "  <span>" + escapeHtml(item.description) + "</span>",
                    "</a>"
                ].join("");
            }).join("");
        }
    }

    async function handleDashboardPage() {
        const dashboardMarker = document.getElementById("dashboard-page-marker");
        if (!dashboardMarker) {
            return;
        }
        let session = isServerAuthAvailable() ? await hydrateSessionFromSupabase() : readSession();
        session = requireSession(["employee", "okk_member", "okk_head", "admin"]);
        if (!session) {
            return;
        }
        await renderDashboard(session);
    }

    async function handleAdminPage() {
        const requestRoot = document.getElementById("request-list");
        if (!requestRoot) {
            return;
        }
        let session = isServerAuthAvailable() ? await hydrateSessionFromSupabase() : readSession();
        session = requireSession(["admin"]);
        if (!session) {
            return;
        }

        if (isServerAuthAvailable()) {
            await refreshAdminPageData();
        }
        renderAdminSummary();
        renderAdminRequests();
        renderAdminUsers();
        renderAdminMessages();
        renderResetRequests();
        bindAdminActions(session);
    }

    async function handleQualityPage() {
        const qualityMarker = document.getElementById("quality-page-marker");
        if (!qualityMarker) {
            return;
        }
        let session = isServerAuthAvailable() ? await hydrateSessionFromSupabase() : readSession();
        session = requireSession(["okk_member", "okk_head", "admin"]);
        if (!session) {
            return;
        }
        renderQualityPage(session);
        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                void signOutEverywhere(false);
            });
        }
    }

    async function handleTrainingPage() {
        const trainingMarker = document.getElementById("training-page-marker");
        if (!trainingMarker) {
            return;
        }
        let session = isServerAuthAvailable() ? await hydrateSessionFromSupabase() : readSession();
        session = requireSession(["employee", "okk_member", "okk_head", "admin"]);
        if (!session) {
            return;
        }
        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                void signOutEverywhere(false);
            });
        }
    }

    async function handlePageStartup() {
        const currentPath = getCurrentPath();
        const isPublicPage = currentPath === "login.html" || currentPath === "register.html" || currentPath === "index.html" || currentPath === "forgot.html";

        handleLoginPage();
        handleRegisterPage();
        handleForgotPage();
        await handleDashboardPage();
        await handleAdminPage();
        await handleQualityPage();
        await handleTrainingPage();

        if (!isPublicPage && readSession()) {
            startInactivityGuard();
        }
    }

    void handlePageStartup();
})();
