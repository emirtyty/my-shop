# Скрипт для автоматической сборки APK
Write-Host "🚀 Начинаю сборку APK..." -ForegroundColor Green

# Устанавливаем JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"

# Собираем проект
Write-Host "📦 Собираю Next.js проект..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки Next.js" -ForegroundColor Red
    exit 1
}

# Синхронизируем с Capacitor
Write-Host "🔄 Синхронизирую с Android..." -ForegroundColor Yellow
npx cap sync

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка синхронизации Capacitor" -ForegroundColor Red
    exit 1
}

# Собираем APK
Write-Host "🏗️ Собираю APK..." -ForegroundColor Yellow
Set-Location android
.\gradlew assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки APK" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Проверяем результат
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkInfo = Get-ItemProperty $apkPath
    $sizeMB = [math]::Round($apkInfo.Length / 1MB, 2)
    
    Write-Host "✅ APK успешно собран!" -ForegroundColor Green
    Write-Host "📍 Путь: $apkPath" -ForegroundColor Cyan
    Write-Host "📏 Размер: $sizeMB MB" -ForegroundColor Cyan
    Write-Host "📅 Создан: $($apkInfo.LastWriteTime)" -ForegroundColor Cyan
    
    # Копируем в корень с датой
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $newName = "RA-DELL-$timestamp.apk"
    Copy-Item $apkPath $newName
    Write-Host "📋 Скопирован как: $newName" -ForegroundColor Green
} else {
    Write-Host "❌ APK файл не найден" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Готово! APK файл готов для установки." -ForegroundColor Green
