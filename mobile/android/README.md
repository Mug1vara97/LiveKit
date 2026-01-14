# LiveKit Voice - Android App

Android приложение для голосовой связи на базе LiveKit.

## Структура проекта

```
app/
├── src/
│   ├── main/
│   │   ├── java/com/whithin/voice/
│   │   │   ├── data/              # Data layer
│   │   │   ├── domain/            # Domain layer
│   │   │   ├── presentation/      # Presentation layer
│   │   │   ├── di/                # Dependency Injection
│   │   │   ├── VoiceApplication.kt
│   │   │   └── MainActivity.kt
│   │   ├── res/                   # Resources
│   │   └── AndroidManifest.xml
│   └── test/                      # Unit tests
└── build.gradle.kts
```

## Требования

- Android Studio Hedgehog (2023.1.1) или новее
- JDK 17
- Min SDK: 24 (Android 7.0)
- Target SDK: 34 (Android 14)

## Настройка

1. Скопируйте `local.properties.example` в `local.properties` и укажите путь к Android SDK
2. Синхронизируйте проект: `File` → `Sync Project with Gradle Files`
3. Убедитесь, что все зависимости загружены

## Сборка

### Debug
```bash
./gradlew assembleDebug
```

### Release
```bash
./gradlew assembleRelease
```

## Запуск

1. Подключите Android устройство или запустите эмулятор
2. Нажмите `Run` в Android Studio или выполните:
```bash
./gradlew installDebug
```

## Конфигурация

### Сервер URL
По умолчанию используется `https://whithin.ru`. Для изменения отредактируйте:
- `di/AppModule.kt` - измените `BASE_URL`

### LiveKit URL
URL для подключения к LiveKit серверу получается от сервера при запросе токена.

## Разрешения

Приложение запрашивает следующие разрешения:
- `RECORD_AUDIO` - для записи аудио
- `CAMERA` - для видеозвонков
- `INTERNET` - для сетевых запросов
- `MODIFY_AUDIO_SETTINGS` - для управления аудио настройками

## Архитектура

Проект использует:
- **MVVM** (Model-View-ViewModel)
- **Clean Architecture** (Data/Domain/Presentation)
- **Jetpack Compose** для UI
- **Hilt** для Dependency Injection
- **Kotlin Coroutines** и **Flow** для асинхронности
- **Retrofit** для сетевых запросов

## Зависимости

Основные библиотеки:
- `livekit-android:2.0.0` - LiveKit SDK
- `compose-bom:2024.02.00` - Jetpack Compose
- `hilt-android:2.48` - Dependency Injection
- `retrofit:2.9.0` - HTTP клиент

Полный список зависимостей см. в `app/build.gradle.kts`

## Документация

- [SETUP.md](SETUP.md) - Инструкция по созданию проекта
- [STACK.md](STACK.md) - Описание используемого стека
- [README_IMPLEMENTATION.md](README_IMPLEMENTATION.md) - Описание реализации

## Полезные ссылки

- [LiveKit Android SDK](https://docs.livekit.io/client-sdk-android/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Hilt](https://developer.android.com/training/dependency-injection/hilt-android)
