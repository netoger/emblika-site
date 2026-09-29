<?php
declare(strict_types=1);
date_default_timezone_set('Europe/Moscow');
ini_set('display_errors', '0');
const CONSENT_VERSION = 'demo-2026-09-26';
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
    return $db;
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
function valid_date(string $s): bool { $d=DateTimeImmutable::createFromFormat('!Y-m-d',$s);return $d && $d->format('Y-m-d')===$s; }
function cleanup(): void {
    query('DELETE FROM appointments WHERE created_at < ?', [time()-RETENTION_DAYS*86400]);
    query('DELETE FROM shifts WHERE date < ?', [date('Y-m-d',time()-RETENTION_DAYS*86400)]);
    query('DELETE FROM attempts WHERE created_at < ?', [time()-86400]);
}
function slots(int $serviceId, int $masterId, string $date): array {
    if (!valid_date($date) || $date<date('Y-m-d') || $date>date('Y-m-d',strtotime('+90 days'))) return [];
    $service=query('SELECT * FROM services WHERE id=? AND active=1',[$serviceId])->fetch(PDO::FETCH_ASSOC);
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
