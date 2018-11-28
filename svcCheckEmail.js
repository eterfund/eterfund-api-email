(function() {
	var $ = window.jQuery || window.$;

	// Возможные состояния:
	var STATUS_ERROR = 1,   // ошибка при запросе/разборе ответа
			STATUS_INVALID = 2, // email некорректный
			STATUS_LOADING = 3, // загрузка...
			STATUS_NONE = 4,    // проверка не выполнялась (поле не изменялось, например)
			STATUS_SUCCESS = 5; // email корректный

	// Возможные ошибки в адресе, значения констант - коды, присылаемые сервером
	var ERROR_DNS_RECORDS_NOT_FOUND = 'dns_records_not_found', // нет такого домена
			ERROR_DOMAIN_TYPO = 'typed_domain', // очепятка в домене
			ERROR_WRONG_FORMAT = 'wrong_email_format', // некорректный формат
			ERROR_EMPTY = 'empty', // пустой email
			ERROR_UNKNOWN = 'unknown'; // неизвестная ошибка

	// Виды сообщения сверху (notice)
	var NOTICE_GREEN =  'green',
			NOTICE_RED =    'red',
			NOTICE_YELLOW = 'yellow';

	// Варианты стилей для самого поля
	var FIELD_LOADING = 'bg-loading',
			FIELD_SUCCESS = 'bg-true',
			FIELD_INVALID = 'bg-false';

	// TODO: нужно поосторожнее с проверкой
	//var EMAIL_REGEX = /^([^@\s]+)@(([a-zA-Z0-9\_\-]+\.)+([a-zA-Z]{2}|aero|arpa|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|post|pro|tel|travel|xxx|events|space))$/;
	var EMAIL_REGEX = /^([^@\s]+)@(([a-zA-Z0-9\_\-]+\.)+([a-zA-Z]{2,10}))$/;

	// TODO: избавиться от глобального состояния, лучше для каждой
	// формы иметь свой набор таких полей
	var noticeTimer, emailInput, noticeShow = false, status = STATUS_NONE;
	var lastNoticeType, lastNoticeMessage;
	// Изменять ли стили самого поля
	var modifyField;
	var onSubmit = [];
	
	// Проверяем сначала локально, потом на сервере, выставляем статус проверки
	// Опционально - можно передать callback, принимающий результат (true/false)
	function checkEmailFull (email, callback) {
		var _callback = function (result) {
			if (callback) {
				callback(result);
				onSubmit.forEach(function (callback) {
					callback(result);
				});
				onSubmit = [];
			}
		};

		if (!email.length) {
			setStatus(STATUS_NONE);
			_callback(false);
			return;
		}

		// Проверяем без отправки на сервер
		if (!checkEmailLocal(email)) {
			setStatus(STATUS_ERROR, getErrorMessage(ERROR_WRONG_FORMAT));
			_callback(false);
			return;
		}

		setStatus(STATUS_LOADING, 'Идёт проверка адреса e-mail, это может занять несколько секунд.');

		checkEmailOnServer(email, function (error, result) {
			if (error) {
				console.error(error);
				setStatus(STATUS_ERROR, 'Ошибка связи с сервером, проверка адреса не удалась.');
			} else if (result.success) {
				setStatus(STATUS_SUCCESS, 'Email адрес указан верно.');
				setHash(result.hash);
				_callback(true);
				return;
			} else {
				setStatus(STATUS_INVALID, getErrorMessage(result.message));
			}

			_callback(false);
		});
	}

	function checkEmailLocal (email) {
		return email.length > 5 && EMAIL_REGEX.test(email);
	}

	// callback - функция с аргументами (error, result), где result - объект с полями
	// success (булево) и message (строка, опционально)
	// Если происходит ошибка запроса, то error будет задано, а result - нет.
	// В случае успешного запроса - наоборот (см. "node-style callback")
	function checkEmailOnServer (email, callback) {
		// Проверяем на сервере
		$.ajax({
			url: '//eterfund.ru/api/email/svcCheckEmail.php',
			type: 'GET',
			data: {
				email: email
			},
			error: function() {
				callback(new Error('Ошибка связи с сервером'), null);
			},
			success: function(responseRawBody) {
				try {
					var responseJson = JSON.parse(responseRawBody);

					if (responseJson.status === false) {
						callback(null, {
							message: responseJson.error,
							success: false
						});
					} else {
						callback(null, {
							hash: responseJson.hash,
							success: true
						});
					}
				} catch (error) {
					callback(error, null);
				}
			}
		});
	}

	function closeNotice () {
		if (noticeShow === true) {
			clearTimeout(noticeTimer);
			emailNotice.animate({ marginTop: '-=51px' }, 300);
			noticeShow = false;
		}
	}

	function getEMail() {
		var email = emailInput.val();
		try {
			email = email.trim();
		} catch (error) {
			// Trim недоступен в текущем браузере. Вернём как есть.
			// TODO: исправить?
		}
		return email;
	}

	function getErrorMessage (error) {
		var defaultMessage = 'Введённый вами адрес недоступен. Пожалуйста, укажите корректный e-mail.';
		return {
			'dns_records_not_found': 'Проверьте e-mail, такой домен не обнаружен.',
			'typed_domain': 'Обнаружена опечатка в домене. Проверьте внимательно указанный вами e-mail.',
			'wrong_email_format': 'Что-то не так в написании адреса. Возможно, указаны лишние точки или пробелы.<br>Адрес должен иметь вид: <b>имя_пользователя@имя_домена</b> (например <b>somebody@example.com</b>)',
			'check': 'Идёт проверка адреса e-mail, это может занять несколько секунд.',
			'empty': 'Адрес email пустой. Необходимо ввести корректный адрес email.'
		}[error] || defaultMessage;
	}

	function setFieldStyle (className) {
		var classesToRemove = [FIELD_INVALID, FIELD_LOADING, FIELD_SUCCESS].join(' ');
		emailInput.removeClass(classesToRemove).addClass(className);
	}

	function setHash (hash) {
		// Во все инпуты с name=emailhash запишем hash
		$('input[name="emailhash"]').val(hash);
	}

	function setStatus (_status, message) {
		if (_status === STATUS_NONE) {
			closeNotice();
		} else {
			var noticeType, fieldType;
			switch (_status) {
				case STATUS_LOADING:
					noticeType = NOTICE_YELLOW;
					fieldType = FIELD_LOADING;
					break;
				case STATUS_SUCCESS:
					noticeType = NOTICE_GREEN;
					fieldType = FIELD_SUCCESS;
					break;
				default:
					noticeType = NOTICE_RED;
					fieldType = FIELD_INVALID;
			}
			status = _status;
			if (modifyField) {
				setFieldStyle(fieldType);
			}
			showNotice(noticeType, message);
		}
	}
	
	function showNotice(type, message) {
		if (!document.getElementById('svcCheckEmail_notice')) {
			var notice = '<div id="svcCheckEmail_notice"><div class="notice_center_auto">';
					notice += '<div id="notice_text"></div>';
					notice += '<div id="notice_close_btn">&nbsp;</div>';
					notice += '</div></div>';

			emailNotice = $(notice);
			$('body').prepend(emailNotice);
			$('#notice_close_btn').click(closeNotice);
		}
		
		$('#notice_text').html(message);
		
		emailNotice.removeClass().addClass(type);
		$('#notice_close_btn').removeClass().addClass(type);

		lastNoticeType = type;
		lastNoticeMessage = message;
		
		if (noticeShow === false) {
			emailNotice.animate({ marginTop: '+=51px' }, 300);
			noticeShow = true;
		}
		/* Настраиваем скрытие через N секунд */
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(function() {
			emailNotice.animate({ marginTop: '-=51px' }, 300);
			noticeShow = false;
		}, 7000);
	}

	// Повторить сообщение
	function showSameNotice () {
		showNotice(lastNoticeType, lastNoticeMessage);
	}
	
	// Добавляем CSS и расставляем вызов
	$(function() {
		$('<link />').attr({
			rel: 'stylesheet',
			type: 'text/css',
			href: '//eterfund.ru/api/email/svcCheckEmail.css'
		}).appendTo('head');
		
		// Значение во время предыдущей проверки
		var previousCheckValue;
		emailInput = $('.svcCheckEmail');
		modifyField = !emailInput.hasClass('svcCheckEmail-nostyle');
		var emailNotice, emailForm = emailInput.closest('form');
		
		if (!emailForm.hasClass('manual')) {
			emailForm.submit(function() {
				var email = getEMail();
				if (email === '') {
					setStatus(STATUS_ERROR, getErrorMessage(ERROR_EMPTY));
					return false;
				}

				if (status === STATUS_NONE || status === STATUS_LOADING) {
					// Если в момент сабмита проверка не выполнялась или же выполняется другая
					// выполним новую проверку, после чего сабмитнем форму, если всё хорошо
					checkEmailFull(email, function (result) {
						if (result) {
							emailForm[0] && emailForm[0].submit();
						}
					});
					return false;
				}

				if (status !== STATUS_SUCCESS) {
					showSameNotice();
					return false;
				}
				
				return true;
			});
		}

		window.checkEmail = function(callback) {
			var email = getEMail();
			if (email === '') {
				setStatus(STATUS_ERROR, getErrorMessage(ERROR_EMPTY));
				callback(false);
				return;
			}

			checkEmailFull(email, function (result) {
				callback(result);
			});
		};
		
		emailInput.blur(function () {
			var email = getEMail();
			emailInput.val(email);
			if (previousCheckValue === email) {
				return false;
			}
			previousCheckValue = email;

			checkEmailFull(email);
		});
	});	
})();
