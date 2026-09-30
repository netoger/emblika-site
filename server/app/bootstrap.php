<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Moscow');
ini_set('display_errors', '0');
const CONSENT_VERSION = 'demo-2026-09-30';
const RETENTION_DAYS = 30;
function env_config(): array {
    static $config;
    if ($config === null) $config = is_file(__DIR__.'/.env') ? (parse_ini_file(__DIR__.'/.env', false, INI_SCANNER_RAW) ?: []) : [];
    return $config;
}
function db(): PDO {
    static $db;
    if ($db) return $db;
    if (!is_dir(__DIR__.'/data')) mkdir(__DIR__.'/data', 0755, true);
    $db = new PDO('sqlite:'.__DIR__.'/data/emblika.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    // Заявки добавлены после первой установки: таблица создаётся и на уже работающей базе.
    $db->exec("CREATE TABLE IF NOT EXISTS leads(id INTEGER PRIMARY KEY,reference TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL UNIQUE,type TEXT NOT NULL,topic TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,comment TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'new',consent_at INTEGER NOT NULL,consent_ip TEXT NOT NULL,consent_version TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at);");
    migrate($db);
    return $db;
}
// Новые процедуры без подтверждённых мастера, цены и длительности: принимаются по заявке,
// пока студия не заполнит их в кабинете и не включит онлайн-запись.
const NEW_SERVICES = [
    ['Уходовые процедуры для волос','Волосы','Уход за волосами. Процедуру и стоимость подбираем после оценки длины и состояния волос.'],
    ['Чистка лица','Эстетическая косметология','Вид чистки специалист подбирает после осмотра кожи.'],
    ['Пилинг','Эстетическая косметология','Состав пилинга и количество процедур подбираются индивидуально на консультации.'],
    ['Радиочастотный (RF) лифтинг лица','Эстетическая косметология','Аппаратная процедура. Показания и противопоказания обсуждаются на консультации.'],
    ['Аппаратная коррекция фигуры','Коррекция фигуры','Программу и количество процедур подбираем на консультации. Оставьте заявку — администратор свяжется с вами.'],
];
// Изменения схемы по номеру в PRAGMA user_version. Пока install.php не создал таблицы, миграции ждут:
// установщик вызовет их сам после начального наполнения.
function migrate(PDO $db): void {
    if ((int)$db->query('PRAGMA user_version')->fetchColumn() >= 1) return;
    if (!$db->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='services'")->fetchColumn()) return;
    $db->exec('BEGIN IMMEDIATE');
    try {
        // Повторная проверка внутри блокировки: параллельный запрос мог уже выполнить миграцию.
        if ((int)$db->query('PRAGMA user_version')->fetchColumn() < 1) {
            // Версия 1 (30.09.2026): фото и способ записи у услуг, новые направления, часы работы 10:00–20:00.
            $db->exec("ALTER TABLE services ADD COLUMN image TEXT");
            $db->exec("ALTER TABLE services ADD COLUMN mode TEXT NOT NULL DEFAULT 'booking'");
            $db->exec("UPDATE services SET category='Эстетическая косметология' WHERE category='Уход за лицом'");
            $exists = $db->prepare('SELECT COUNT(*) FROM services WHERE name=?');
            $add = $db->prepare("INSERT INTO services(name,category,description,price,duration,masters,mode) VALUES(?,?,?,NULL,60,'[]','request')");
            foreach (NEW_SERVICES as $s) { $exists->execute([$s[0]]); if (!$exists->fetchColumn()) $add->execute($s); }
            $db->prepare("UPDATE shifts SET end_time='20:00' WHERE end_time='19:00' AND date>=?")->execute([date('Y-m-d')]);
            $db->exec('PRAGMA user_version=1');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}
// Фото услуг лежат в public_html/uploads/services: вне app/, иначе .htaccess не отдаст их посетителям.
function uploads_dir(): string { return dirname(__DIR__).'/uploads/services'; }
function store_service_image(int $id, array $file): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) fail('Не удалось получить файл. Попробуйте ещё раз.');
    if ($file['size'] > 15*1024*1024) fail('Файл больше 15 МБ. Уменьшите фотографию.');
    $info = @getimagesize($file['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) fail('Загрузите фотографию в формате JPG, PNG или WebP.');
    [$w, $h] = $info;
    if ($w < 200 || $h < 200) fail('Фотография слишком маленькая: нужно не меньше 200×200 точек.');
    if ($w * $h > 50_000_000) fail('Фотография слишком большая по размеру в точках.');
    $src = match ($info[2]) { IMAGETYPE_JPEG => @imagecreatefromjpeg($file['tmp_name']), IMAGETYPE_PNG => @imagecreatefrompng($file['tmp_name']), IMAGETYPE_WEBP => @imagecreatefromwebp($file['tmp_name']) };
    if (!$src) fail('Не удалось прочитать фотографию.');
    // Снимки с телефона хранят поворот в EXIF: применяем его, чтобы фото не легло набок.
    if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
        $angle = [3=>180, 6=>-90, 8=>90][(int)(@exif_read_data($file['tmp_name'])['Orientation'] ?? 1)] ?? 0;
        if ($angle) { $src = imagerotate($src, $angle, 0); $w = imagesx($src); $h = imagesy($src); }
    }
    // Перекодирование через GD отбрасывает метаданные и любое постороннее содержимое файла.
    $scale = min(1, 1200 / max($w, $h)); $nw = (int)round($w*$scale); $nh = (int)round($h*$scale);
    $dst = imagecreatetruecolor($nw, $nh);
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    $dir = uploads_dir();
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail('Не удалось сохранить фото.', 500);
    $guard = dirname($dir).'/.htaccess';
    if (!is_file($guard)) file_put_contents($guard, "Options -Indexes\n<FilesMatch \"(?i)\\.(php\\d?|phtml|phar|cgi|pl|py|sh)$\">\nRequire all denied\n</FilesMatch>\n");
    $name = 's'.$id.'-'.bin2hex(random_bytes(6)).'.jpg';
    if (!imagejpeg($dst, $dir.'/'.$name, 84)) fail('Не удалось сохранить фото.', 500);
    chmod($dir.'/'.$name, 0644);
    return '/uploads/services/'.$name;
}
function remove_service_image(?string $url): void {
    if ($url && preg_match('~^/uploads/services/(s\d+-[0-9a-f]{12}\.jpg)$~', $url, $m) && is_file(uploads_dir().'/'.$m[1])) unlink(uploads_dir().'/'.$m[1]);
}
function query(string $sql, array $args=[]): PDOStatement { $q=db()->prepare($sql); $q->execute($args); return $q; }
function reply(array $data, int $status=200): never { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); exit; }
function fail(string $message, int $status=400): never { reply(['error'=>$message],$status); }
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode','1');
    session_name('emblika_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off'),'httponly'=>true,'samesite'=>'Lax']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));
}
function admin_required(): void {
    if (empty($_SESSION['admin']) || time()-($_SESSION['last_seen']??0)>3600) {unset($_SESSION['admin']);fail('Войдите в кабинет администратора.',401);}
    $_SESSION['last_seen']=time();
}
function csrf(array $input): void {
    if (!hash_equals($_SESSION['csrf'], (string)($input['csrf']??''))) fail('Сессия обновилась. Перезагрузите страницу.',403);
}
function limited(string $scope, int $limit, int $seconds): void {
    $key=hash('sha256',$scope.'|'.($_SERVER['REMOTE_ADDR']??'cli'));
    $start=time()-$seconds;
    db()->exec('BEGIN IMMEDIATE');
    try {
        query('DELETE FROM attempts WHERE created_at < ?', [time()-86400]);
        $count=(int)query('SELECT COUNT(*) FROM attempts WHERE key=? AND created_at>?',[$key,$start])->fetchColumn();
        if ($count >= $limit) {db()->exec('COMMIT');header('Retry-After: '.$seconds);fail('Слишком много попыток. Попробуйте позднее.',429);}
        query('INSERT INTO attempts(key,created_at) VALUES(?,?)',[$key,time()]);
        db()->exec('COMMIT');
    } catch(Throwable $e) {db()->exec('ROLLBACK');throw $e;}
}
function clean_text(string $s): string { return trim(preg_replace('/[\x00-\x1F\x7F]+/u',' ',$s) ?? ''); }
function valid_date(string $s): bool { $d=DateTimeImmutable::createFromFormat('!Y-m-d',$s);return $d && $d->format('Y-m-d')===$s; }
function cleanup(): void {
    query('DELETE FROM appointments WHERE created_at < ?', [time()-RETENTION_DAYS*86400]);
    query('DELETE FROM leads WHERE created_at < ?', [time()-RETENTION_DAYS*86400]);
    query('DELETE FROM shifts WHERE date < ?', [date('Y-m-d',time()-RETENTION_DAYS*86400)]);
    query('DELETE FROM attempts WHERE created_at < ?', [time()-86400]);
}
function slots(int $serviceId, int $masterId, string $date): array {
    if (!valid_date($date) || $date<date('Y-m-d') || $date>date('Y-m-d',strtotime('+90 days'))) return [];
    $service=query("SELECT * FROM services WHERE id=? AND active=1 AND mode='booking'",[$serviceId])->fetch(PDO::FETCH_ASSOC);
    if (!$service || !in_array($masterId,json_decode($service['masters'],true),true)) return [];
    $shift=query('SELECT * FROM shifts WHERE master_id=? AND date=?',[$masterId,$date])->fetch(PDO::FETCH_ASSOC);
    if (!$shift) return [];
    $busy=query("SELECT start_at,end_at FROM appointments WHERE master_id=? AND status!='cancelled' AND start_at>=? AND start_at<?",[$masterId,strtotime($date),strtotime($date.' +1 day')])->fetchAll(PDO::FETCH_ASSOC);
    $out=[];$end=strtotime($date.' '.$shift['end_time']);$duration=(int)$service['duration']*60;
    for($t=strtotime($date.' '.$shift['start_time']);$t+$duration<=$end;$t+=1800){
        if($t<time()+1800)continue;
        $ok=true;foreach($busy as $b)if($t<(int)$b['end_at'] && $t+$duration>(int)$b['start_at']){$ok=false;break;}
        if($ok)$out[]=date('H:i',$t);
    }
    return $out;
}
