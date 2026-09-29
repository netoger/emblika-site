# Публикация «Эмблики»: сборка, резервная копия, выкладка на Timeweb, проверки, коммит и отправка на GitHub.
# Запуск из корня проекта в PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
# Параметры: -SkipHosting — только GitHub; -SkipGit — только хостинг.
param([switch]$SkipHosting,[switch]$SkipGit,[string]$Message='Зелёный дизайн, прайс с поиском, обучение, заявки клиентов и учеников')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$OutputEncoding=New-Object System.Text.UTF8Encoding $false   # без BOM: иначе bash на сервере споткнётся о первую строку
$Host_='cc250576@vh470.timeweb.ru'
$Root='/home/c/cc250576/emblema/public_html'   # единственный каталог этого проекта; /home/c/cc250576/public_html — чужой сайт
$Site='https://emblema.tw1.ru'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step($t){Write-Host "`n== $t" -ForegroundColor Green}
function Check($what){if($LASTEXITCODE -ne 0){throw "Ошибка: $what (код $LASTEXITCODE). Выкладка остановлена."}}
function Remote($script){($script -replace "`r",'') | ssh $Host_ 'bash -s';Check 'команда на сервере'}

Step 'Сборка'
npm run build;Check 'npm run build'
$bad=Get-ChildItem dist -Recurse -Force | Where-Object {$_.Name -eq '.env' -or $_.Extension -in '.sqlite','.db' -or $_.FullName -match '\\app\\data(\\|$)'}
if($bad){$bad | ForEach-Object {Write-Host $_.FullName};throw 'В dist попали секреты или база. Выкладка остановлена.'}
Write-Host 'В dist нет .env и базы.'

if(-not $SkipHosting){
 Step 'Резервная копия сайта и базы на сервере (вне webroot)'
 Remote @'
set -e
stamp=$(date +%Y%m%d-%H%M%S); mkdir -p ~/backups; chmod 700 ~/backups
cd /home/c/cc250576/emblema
tar -czf ~/backups/emblema-site-$stamp.tar.gz --exclude=public_html/app/data public_html
if [ -f public_html/app/data/emblika.sqlite ]; then
  php -r '$s=new SQLite3($argv[1],SQLITE3_OPEN_READONLY);$d=new SQLite3($argv[2]);if(!$s->backup($d))exit(1);' public_html/app/data/emblika.sqlite ~/backups/emblema-db-$stamp.sqlite
fi
chmod 600 ~/backups/emblema-*-$stamp.*
ls -la ~/backups | tail -3
'@

 Step 'Передача архива'
 if(Test-Path release.tar.gz){Remove-Item release.tar.gz}
 tar -czf release.tar.gz -C dist .;Check 'создание архива'
 scp release.tar.gz "${Host_}:/home/c/cc250576/emblema-release.tar.gz";Check 'scp'

 Step 'Распаковка и права'
 Remote @'
set -e
cd /home/c/cc250576/emblema/public_html
test -f app/.env || { echo "Нет app/.env на сервере — остановка"; exit 1; }
tar -xzf /home/c/cc250576/emblema-release.tar.gz --no-same-owner
find . -path ./app/data -prune -o -type d -exec chmod 755 {} +
find . -path ./app/data -prune -o -type f -exec chmod 644 {} +
chmod 600 app/.env
rm -f /home/c/cc250576/emblema-release.tar.gz
echo "Распаковано в $(pwd)"
'@

 Step 'Проверки'
 $fail=0
 function Code($u){(curl.exe -s -o NUL -w '%{http_code}' $u)}
 foreach($c in @(@("$Site/",'200'),@("$Site/admin/",'200'),@("$Site/api/index.php?action=catalog",'200'),@("$Site/privacy.html",'200'),@("$Site/app/.env",'403'),@("$Site/app/data/emblika.sqlite",'403'),@("$Site/app/bootstrap.php",'403'))){
  $got=Code $c[0];$ok=($got -eq $c[1]);if(-not $ok){$fail++}
  Write-Host ("{0}  {1}  ожидалось {2}, получено {3}" -f ($(if($ok){'OK '}else{'ОШИБКА'})),$c[0],$c[1],$got)
 }
 $http=(curl.exe -s -o NUL -w '%{http_code} %{redirect_url}' 'http://emblema.tw1.ru/')
 Write-Host "HTTP → HTTPS: $http"
 if($fail){throw "Проверок с ошибкой: $fail. Резервная копия лежит в ~/backups на сервере."}
}

if(-not $SkipGit){
 Step 'Коммит и отправка на GitHub'
 git add -A;Check 'git add'
 $files=git diff --cached --name-only
 $danger=$files | Where-Object {$_ -match '(^|/)\.env$|\.sqlite$|\.db$|release\.tar\.gz$|(^|/)data/'}
 if($danger){git reset -q;$danger | ForEach-Object {Write-Host $_};throw 'В коммит попали секреты, база или архив. Коммит отменён.'}
 Write-Host "Файлы в коммите:";$files | ForEach-Object {Write-Host "  $_"}
 if($files){git commit -m $Message;Check 'git commit'}else{Write-Host 'Изменений для коммита нет.'}
 git push;Check 'git push'
}
Step 'Готово'
