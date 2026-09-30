<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
require __DIR__.'/bootstrap.php';
db()->exec("CREATE TABLE IF NOT EXISTS masters(id INTEGER PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,image TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL,price INTEGER,duration INTEGER NOT NULL,masters TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS shifts(id INTEGER PRIMARY KEY,master_id INTEGER NOT NULL REFERENCES masters(id),date TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,UNIQUE(master_id,date));
CREATE TABLE IF NOT EXISTS appointments(id INTEGER PRIMARY KEY,reference TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL UNIQUE,service_id INTEGER NOT NULL REFERENCES services(id),master_id INTEGER NOT NULL REFERENCES masters(id),service_name TEXT NOT NULL,price INTEGER,duration INTEGER NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,start_at INTEGER NOT NULL,end_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',consent_at INTEGER NOT NULL,consent_ip TEXT NOT NULL,consent_version TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS appointments_overlap ON appointments(master_id,start_at,end_at,status);
CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY,key TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS attempts_lookup ON attempts(key,created_at);");
if (!(int)query('SELECT COUNT(*) FROM masters')->fetchColumn()) {
    foreach([[1,'Полина','Ресницы, брови и уход за лицом','/assets/polina.jpg'],[2,'Анна','Маникюр и педикюр','/assets/anna.jpg'],[3,'Мария','Стрижки и окрашивание','/assets/maria.jpg']] as $m)query('INSERT INTO masters VALUES(?,?,?,?)',$m);
    $services=[
      [1,'Маникюр с покрытием','Ногти','Обработка ногтей и кутикулы, форма и однотонное покрытие гель-лаком.',1400,120,'[2]'],
      [2,'Наращивание ногтей','Ногти','Дополнительная длина и форма. Дизайн и итоговую стоимость согласуем отдельно.',2300,150,'[2]'],
      [3,'Экспресс-педикюр','Ногти','Обработка пальчиков и покрытие. Удобный вариант между полными процедурами.',1700,90,'[2]'],
      [4,'Наращивание ресниц 2,5D','Ресницы и брови','Подбор изгиба и длины под ваш взгляд. Объёмное наращивание ресниц.',1900,150,'[1]'],
      [5,'Ламинирование ресниц','Ресницы и брови','Ламинирование верхних и нижних ресниц с окрашиванием.',2700,90,'[1]'],
      [6,'Оформление бровей','Ресницы и брови','Подбор формы и аккуратная коррекция. Окрашивание обсуждается с мастером.',null,60,'[1]'],
      [7,'Уход за лицом','Уход за лицом','Обсудите со специалистом пожелания и подходящий уход до начала процедуры.',null,60,'[1]'],
      [8,'Женская стрижка','Волосы','Обсуждение формы и длины перед стрижкой. Стоимость зависит от выбранной услуги.',null,60,'[3]'],
      [9,'Мужская стрижка','Волосы','Подбор формы и стрижка с учётом ваших пожеланий.',null,60,'[3]'],
      [10,'Окрашивание волос','Волосы','Цвет, техника и стоимость согласуются после оценки длины и состояния волос.',null,180,'[3]']
    ];
    foreach($services as $s)query('INSERT INTO services(id,name,category,description,price,duration,masters) VALUES(?,?,?,?,?,?,?)',$s);
    for($d=0;$d<14;$d++)foreach([1,2,3] as $m)query('INSERT OR IGNORE INTO shifts(master_id,date,start_time,end_time) VALUES(?,?,?,?)',[$m,date('Y-m-d',strtotime("+$d days")),'10:00','20:00']);
}
// Миграции пропускались, пока таблиц не было; теперь приводим новую базу к последней версии.
migrate(db());
echo "База и демонстрационное расписание готовы.\n";
