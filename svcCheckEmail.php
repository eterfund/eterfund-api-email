<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-Requested-With, Content-Type');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range');
header('Access-Control-Expose-Headers: DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range');


error_reporting(0);

function typeddomain($domain) {
    // TODO: русские буквы в любом виде
    // I know, yadex.ru and mail.com are exists, but we will ban it
    // TODO: тут мы вполне можем предложить автоисправление
    $blacklist = array("lnbox.ru", "indox.ru", "meil.ru", "maile.ru", "meil.ru","mali.ru", "wail.ru","maiil.ru","maij.ru","mfil.ru","mai.ru","qmail.com","mal.ru","vail.ru",
                       "yandeks.ru","yandexs.ru","jandex.ru","yahdex.ru","yanbex.ru","ayndex.ru","yndex.ru","yanddex.ru","yamdex.ru","yundex.ru","eandex.ru","yadex.ru","yandes.ru",
                       "gmal.com","gmal.ru","gmeil.com","gmauil.com","gmail.ru","gmal.com","dmail.com", "mail.com",
                       "rabler.ru","ramdler.ru","ranbler.ru");
    return in_array($domain, $blacklist);
}

// TODO: что за повтор???

// http://stackoverflow.com/questions/15699101/get-the-client-ip-address-using-php
// Function to get the client IP address
function get_client_ip_env() {
    $ipaddress = '';
    if (getenv('HTTP_CLIENT_IP'))
        $ipaddress = getenv('HTTP_CLIENT_IP');
    else if(getenv('HTTP_X_FORWARDED_FOR'))
        $ipaddress = getenv('HTTP_X_FORWARDED_FOR');
    else if(getenv('HTTP_X_FORWARDED'))
        $ipaddress = getenv('HTTP_X_FORWARDED');
    else if(getenv('HTTP_FORWARDED_FOR'))
        $ipaddress = getenv('HTTP_FORWARDED_FOR');
    else if(getenv('HTTP_FORWARDED'))
       $ipaddress = getenv('HTTP_FORWARDED');
    else if(getenv('REMOTE_ADDR'))
        $ipaddress = getenv('REMOTE_ADDR');
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

// Function to get the client IP address
function get_client_ip() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

function calc_hash($domain, $ip, $email)
{
	$net = preg_replace( '_(\d+)\.(\d+)\.(\d+)\.(\d+)$_', '$1.$2.$3', $ip );
	return md5($domain.$net.$email);
}

// TODO: improve domain list? drop it?
function validate_email($email, &$matches)
{
	if ( mb_strlen($email, 'utf8') <= 5 )
		return false;
	//return preg_match('/^([^@\s]+)@(([a-zA-Z0-9\_\-]+\.)+([a-zA-Z]{2}|aero|arpa|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|post|pro|tel|travel|events|space))$/', $email, $matches);
	return preg_match('/^([^@\s]+)@(([a-zA-Z0-9\_\-]+\.)+([a-zA-Z]{2,10}))$/', $email, $matches);
}

$email = isset($argv[1]) ? $argv[1] : $_GET['email'];
$http_referer = $_SERVER['HTTP_REFERER'];
$site_domain = parse_url($http_referer, PHP_URL_HOST);
$ip_from = get_client_ip();



if( !validate_email($email, $matches) ) {
	$response = array(
		'email' => $email,
		'username' => null,
		'domain' => null,
		'ip_from' => $ip_from,
		'hash'	=> null,
		'status' => false,
		'error' => 'wrong_email_format'
	);
	echo json_encode($response);
	// Failed to load resource: the server responded with a status of 406 (Not Acceptable)
	// http_response_code(406); // 406 Not Acceptable («неприемлемо»
	exit(1);
}

	$response = array(
		'email' => $matches[0],
		'username' => $matches[1],
		'domain' => $matches[2],
		'ip_from' => $ip_from,
		'hash'    => null,
		'status' => true,
		'error' => null
	);

	if(typeddomain($matches[2])) {
		$response['status'] = false;
		$response['error'] = 'typed_domain';
	}

	// TODO: проверять отдельно на существование домена
	if(checkdnsrr($matches[2], "MX") === false) {
		$response['status'] = false;
		$response['error'] = 'dns_records_not_found';
	}

	// Встроенная в PHP проверка
	if(!filter_var($email, FILTER_VALIDATE_EMAIL)) {
		$response['status'] = false;
		$response['error'] = 'wrong_email_format';
	}

	// TODO: Referer: http://translate.googleusercontent.com/translate_c?depth=1&rurl=translate.google.com&sl=ru&tl=ar&u=http://azbyka.ru/znakomstva/
	$referer = $http_referer ? $http_referer : 'Unknown';
	$referer_host = $http_referer ? str_ireplace('www.', '', parse_url($referer, PHP_URL_HOST)) : 'unknown_host';

	if ($response['status'] === true)
		$response['hash' ] = calc_hash($site_domain, $ip_from, $matches[0]);

	$data = 'Date: '.date('d/m/Y H:i:s').
		' | IP: '.$ip_from.
		' | Referer: '.$referer.
		' | Query e-mail: '.$response['email'].
		' | Username: '.($response['username'] ? $response['username'] : 'null').
		' | Domain: '.($response['domain'] ? $response['domain'] : 'null').
		' | Status: '.($response['status'] ? 'true' : 'false').
		' | Hash: '.$response['hash'].
		' | Error: '.($response['error'] ? $response['error'] : 'null').
		PHP_EOL;
	
	file_put_contents(dirname(__FILE__).'/logs/'.$referer_host.'.'.($response['status'] ? 'ok' : 'error').'.log', $data, FILE_APPEND);

	echo json_encode($response);

