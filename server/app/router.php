<?php
// Только для локального предпросмотра через защищённый SSH-туннель.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(preg_match('~^/app(?:/|$)|^/uploads/.*\.php|(?:^|/)\.|\.(?:sqlite|db|env|log|bak)$~i',rawurldecode($path))){http_response_code(403);exit;}
return false;
