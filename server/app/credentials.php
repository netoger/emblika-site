<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$path=__DIR__.'/.env';
$config=parse_ini_file($path,false,INI_SCANNER_RAW);
if(isset($config['ADMIN_PASSWORD'])){
 $hash=password_hash($config['ADMIN_PASSWORD'],PASSWORD_DEFAULT);
 file_put_contents($path,'ADMIN_USER="admin"'.PHP_EOL.'ADMIN_HASH="'.$hash.'"'.PHP_EOL);
 chmod($path,0600);
}
echo "Доступ администратора настроен.\n";
