# Checkemail


## 1. Установка

Для checkemail необходим jQuery. Если его нет на странице, то можете добавить:
```
<script type="text/javascript" src="//eterfund.ru/js/jquery/jquery-latest.min.js"></script>
```

Далее, добавьте сам checkemail (после jQuery):
```
<script type="text/javascript" src="//eterfund.ru/api/email/svcCheckEmail.js"></script>
```

## 2. Использование

Checkemail, по сути, состоит из трёх частей:
1. Клиентский скрипт на JavaScript
2. Серверный код вычисления хэша
3. Код проверки хэша на сайте

### 2.1 Настройка клиента

Чтобы связать checkEmail с нужным полем на странице, задайте полю
класс svcCheckEmail:
```
<input type='email' class='svcCheckEmail'>
```

И добавьте скрытое поле в форму:
```
<input type="hidden" name="emailhash" value="valuable" />
```

После этого checkEmail сам добавит нужные обработчики и всё должно заработать.
Checkemail будет обращаться к серверу и подставлять вычисленный хэш в скрытое поле.

### 2.2 Проверка на сервере

На сервере в обработчике формы вам нужно проверять значение emailhash.
Пример кода на PHP, который проверяет соответствие emailhash:
```
function get_client_ip()
{
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
  
  
function get_emailhash($email)
{
    $http_referer = $_SERVER['HTTP_REFERER'];
    $domain = parse_url($http_referer, PHP_URL_HOST);
    $ip = get_client_ip();
    # Due strange providers who change IP on every request
    $net = preg_replace( '_(\d+)\.(\d+)\.(\d+)\.(\d+)$_', '$1.$2.$3', $ip );
    return md5($domain.$net.$email);
}

$expectedEmailhash = get_emailhash($data['email']);
if ($data['emailhash'] != $expectedEmailhash) {
  // Проверка не пройдена
}
```

Обратите внимание, что если вы используете обратный прокси (например, nginx), то
необходимо настроить проброс IP-адреса клиента через заголовок X-Forwarded-For.

### 2.3 Дополнительные возможности

- *Отключение стилей.* Checkemail применяет стили к полю ввода, но иногда это мешает.
Чтобы отключить стили checkemail, добавьте класс svcCheckEmail-nostyle на `<input>`.
- *Вызов checkemail вручную.* Иногда необходимо вызвать checkemail вручную - например,
если форма отправляется через асинхронный запрос (XHR/fetch). Для этого есть метод
`window.checkEmail(callback)`, где `callback` - функция вида `function (valid) { ... }`.
