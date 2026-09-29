<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/bootstrap.php';
header('Cache-Control: no-store');
start_session();
try {
 $method=$_SERVER['REQUEST_METHOD'];$action=$_GET['action']??'catalog';
 $input=[];
 if($method==='POST'){
    if((int)($_SERVER['CONTENT_LENGTH']??0)>12000)fail('Слишком большой запрос.',413);
    $input=json_decode(file_get_contents('php://input'),true);
    if(!is_array($input))fail('Некорректный запрос.');
    csrf($input);
 } elseif($method!=='GET')fail('Метод не поддерживается.',405);
 if($method==='GET' && $action==='catalog'){
    cleanup();
    reply(['services'=>query('SELECT * FROM services WHERE active=1 ORDER BY id')->fetchAll(PDO::FETCH_ASSOC),'masters'=>query('SELECT * FROM masters ORDER BY id')->fetchAll(PDO::FETCH_ASSOC),'csrf'=>$_SESSION['csrf'],'today'=>date('Y-m-d'),'demo'=>true]);
 }
 if($method==='GET' && $action==='slots')reply(['times'=>slots((int)($_GET['service']??0),(int)($_GET['master']??0),(string)($_GET['date']??''))]);
 if($method==='POST' && $action==='book'){
    limited('book',12,3600);
    if(!empty($input['website']))fail('Не удалось отправить запись.');
    if(($input['consent']??false)!==true || ($input['demoConsent']??false)!==true)fail('Подтвердите согласие и тестовый характер записи.');
    $name=trim((string)($input['name']??''));$phone=preg_replace('/\D/','',(string)($input['phone']??''));
    if(mb_strlen($name)<2 || mb_strlen($name)>80)fail('Имя должно содержать от 2 до 80 символов.');
    if(!preg_match('/^[78]\d{10}$/',$phone))fail('Укажите номер из 11 цифр, начинающийся с 7 или 8.');
    $serviceId=(int)($input['service']??0);$masterId=(int)($input['master']??0);$date=(string)($input['date']??'');$time=(string)($input['time']??'');
    $requestId=(string)($input['requestId']??'');
    if(!preg_match('/^[a-zA-Z0-9-]{20,80}$/',$requestId))fail('Обновите страницу и повторите запись.');
    $sessionRequest=hash('sha256',session_id().'|'.$requestId);
    db()->exec('BEGIN IMMEDIATE');
    try {
       $old=query('SELECT reference FROM appointments WHERE request_id=?',[$sessionRequest])->fetchColumn();
       if($old){db()->exec('COMMIT');reply(['reference'=>$old,'demo'=>true]);}
       if(!in_array($time,slots($serviceId,$masterId,$date),true)){db()->exec('ROLLBACK');fail('Это время уже занято или недоступно. Выберите другое.',409);}
       $service=query('SELECT * FROM services WHERE id=?',[$serviceId])->fetch(PDO::FETCH_ASSOC);
       $start=strtotime($date.' '.$time);$reference='ЭМ-'.strtoupper(bin2hex(random_bytes(4)));
       query('INSERT INTO appointments(reference,request_id,service_id,master_id,service_name,price,duration,name,phone,start_at,end_at,consent_at,consent_ip,consent_version,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$reference,$sessionRequest,$serviceId,$masterId,$service['name'],$service['price'],$service['duration'],$name,$phone,$start,$start+60*$service['duration'],time(),$_SERVER['REMOTE_ADDR']??'',CONSENT_VERSION,time()]);
       db()->exec('COMMIT');reply(['reference'=>$reference,'demo'=>true],201);
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();else {try{db()->exec('ROLLBACK');}catch(Throwable $ignored){}}throw $e;}
 }
 if($method==='GET' && $action==='session')reply(['csrf'=>$_SESSION['csrf'],'authenticated'=>!empty($_SESSION['admin']) && time()-($_SESSION['last_seen']??0)<=3600]);
 if($method==='POST' && $action==='login'){
    limited('login',8,900);$c=env_config();
    if(!hash_equals($c['ADMIN_USER']??'admin',(string)($input['username']??'')) || !password_verify((string)($input['password']??''),$c['ADMIN_HASH']??''))fail('Неверный логин или пароль.',401);
    session_regenerate_id(true);$_SESSION['admin']=true;$_SESSION['last_seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));reply(['csrf'=>$_SESSION['csrf']]);
 }
 admin_required();
 if($method==='POST' && $action==='logout'){$_SESSION=[];session_destroy();reply(['ok'=>true]);}
 if($method==='GET' && $action==='dashboard'){
    cleanup();reply(['appointments'=>query('SELECT a.*,m.name master_name FROM appointments a JOIN masters m ON m.id=a.master_id ORDER BY a.start_at DESC LIMIT 500')->fetchAll(PDO::FETCH_ASSOC),'services'=>query('SELECT * FROM services ORDER BY id')->fetchAll(PDO::FETCH_ASSOC),'masters'=>query('SELECT * FROM masters')->fetchAll(PDO::FETCH_ASSOC),'shifts'=>query('SELECT * FROM shifts WHERE date>=? ORDER BY date,master_id',[date('Y-m-d')])->fetchAll(PDO::FETCH_ASSOC),'csrf'=>$_SESSION['csrf'],'today'=>date('Y-m-d')]);
 }
 if($method==='POST' && $action==='status'){
    $id=(int)($input['id']??0);$status=(string)($input['status']??'');
    if(!in_array($status,['pending','confirmed','completed','cancelled'],true))fail('Неизвестный статус.');
    db()->exec('BEGIN IMMEDIATE');
    $a=query('SELECT * FROM appointments WHERE id=?',[$id])->fetch(PDO::FETCH_ASSOC);
    if(!$a){db()->exec('ROLLBACK');fail('Запись не найдена.',404);}
    if($status!=='cancelled'){
      $conflict=query("SELECT COUNT(*) FROM appointments WHERE id!=? AND master_id=? AND status!='cancelled' AND start_at<? AND end_at>?",[$id,$a['master_id'],$a['end_at'],$a['start_at']])->fetchColumn();
      if($conflict){db()->exec('ROLLBACK');fail('Время занято другой записью.',409);}
    }
    query('UPDATE appointments SET status=? WHERE id=?',[$status,$id]);db()->exec('COMMIT');reply(['ok'=>true]);
 }
 if($method==='POST' && $action==='delete'){
    query('DELETE FROM appointments WHERE id=?',[(int)($input['id']??0)]);reply(['ok'=>true]);
 }
 if($method==='POST' && $action==='shift'){
    $master=(int)($input['master']??0);$date=(string)($input['date']??'');$start=(string)($input['start']??'');$end=(string)($input['end']??'');
    if(!query('SELECT id FROM masters WHERE id=?',[$master])->fetchColumn() || !valid_date($date) || $date<date('Y-m-d') || $date>date('Y-m-d',strtotime('+90 days')))fail('Проверьте мастера и дату.');
    db()->exec('BEGIN IMMEDIATE');
    if(($input['closed']??false)===true){
       if(query("SELECT COUNT(*) FROM appointments WHERE master_id=? AND status!='cancelled' AND start_at>=? AND start_at<?",[$master,strtotime($date),strtotime($date.' +1 day')])->fetchColumn()){db()->exec('ROLLBACK');fail('Сначала отмените записи на этот день.');}
       query('DELETE FROM shifts WHERE master_id=? AND date=?',[$master,$date]);
    }else{
       if(!preg_match('/^(?:[01]\d|2[0-3]):[03]0$/',$start) || !preg_match('/^(?:[01]\d|2[0-3]):[03]0$/',$end) || $start >= $end){db()->exec('ROLLBACK');fail('Укажите начало и конец с шагом 30 минут.');}
       $outside=query("SELECT COUNT(*) FROM appointments WHERE master_id=? AND status!='cancelled' AND start_at>=? AND start_at<? AND (start_at<? OR end_at>?)",[$master,strtotime($date),strtotime($date.' +1 day'),strtotime($date.' '.$start),strtotime($date.' '.$end)])->fetchColumn();
       if($outside){db()->exec('ROLLBACK');fail('Вне новой смены есть записи. Сначала отмените их.');}
       query('INSERT INTO shifts(master_id,date,start_time,end_time) VALUES(?,?,?,?) ON CONFLICT(master_id,date) DO UPDATE SET start_time=excluded.start_time,end_time=excluded.end_time',[$master,$date,$start,$end]);
    }
    db()->exec('COMMIT');reply(['ok'=>true]);
 }
 if($method==='POST' && $action==='service'){
    $id=(int)($input['id']??0);$name=trim((string)($input['name']??''));$duration=(int)($input['duration']??0);$price=$input['price']??null;
    if(mb_strlen($name)<2 || mb_strlen($name)>100 || $duration<30 || $duration>360 || $duration%30!==0 || ($price!==null && (!is_numeric($price) || $price<0 || $price>100000)))fail('Проверьте название, цену и длительность (30–360 минут с шагом 30).');
    query('UPDATE services SET name=?,price=?,duration=?,active=? WHERE id=?',[$name,$price===null?null:(int)$price,$duration,($input['active']??true)?1:0,$id]);reply(['ok'=>true]);
 }
 fail('Действие не найдено.',404);
} catch(Throwable $e) {error_log('Emblika API failure: '.get_class($e));reply(['error'=>'Сервис временно недоступен. Попробуйте позднее.'],500);}
