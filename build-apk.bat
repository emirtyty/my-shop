@echo off
chcp 65001 >nul
echo 🚀 Начинаю сборку APK...

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot

echo 📦 Собираю Next.js проект...
call npm run build
if errorlevel 1 (
    echo ❌ Ошибка сборки Next.js
    pause
    exit /b 1
)

echo 🔄 Синхронизирую с Android...
call npx cap sync
if errorlevel 1 (
    echo ❌ Ошибка синхронизации Capacitor
    pause
    exit /b 1
)

echo 🏗️ Собираю APK...
cd android
call gradlew assembleDebug
if errorlevel 1 (
    echo ❌ Ошибка сборки APK
    cd ..
    pause
    exit /b 1
)
cd ..

if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ APK успешно собран!
    echo 📍 Путь: android\app\build\outputs\apk\debug\app-debug.apk
    
    for %%F in ("android\app\build\outputs\apk\debug\app-debug.apk") do (
        set /a size=%%~zF/1024/1024
        echo 📏 Размер: %%size%% MB
    )
    
    echo 📋 Копирую в корень...
    copy "android\app\build\outputs\apk\debug\app-debug.apk" "RA-DELL-APK.apk" >nul
    echo 📋 Готовый файл: RA-DELL-APK.apk
    
    echo 🎉 Готово! APK файл готов для установки.
) else (
    echo ❌ APK файл не найден
    pause
    exit /b 1
)

pause
