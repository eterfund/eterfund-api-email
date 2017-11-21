(function() {
	var noticeTimer, noticeShow = false;
	
	function getEMail()
	{
		var emailInput = $('.svcCheckEmail');
		var email = emailInput.val();
		try {
			email = email.trim();
		} catch(e) {
			//
		}
		return email;
	}
	
	
	function closeNotice() {
		if(noticeShow === true) {
			clearTimeout(noticeTimer);
			emailNotice.animate({ marginTop: '-=51px' }, 300);
			noticeShow = false;
		}
	}
	
	function showNotice(type, message) {
		if(!document.getElementById('svcCheckEmail_notice')) {
			var notice = '<div id="svcCheckEmail_notice"><div class="notice_center_auto">';
				notice += '<div id="notice_text"></div>';
				notice += '<div id="notice_close_btn" onclick="closeNotice();">&nbsp;</div>';
				notice += '</div></div>';
			
			emailNotice = $(notice);
			$('body').prepend(emailNotice);
		}
		
		$('#notice_text').html(message);
		
		emailNotice.removeClass().addClass(type);
		$('#notice_close_btn').removeClass().addClass(type);
		
		if(noticeShow === false) {
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
	
	function showErrorNotice(error)
	{
		var noticeText;
		switch (error) {
			case 'dns_records_not_found':
				noticeText = 'Проверьте e-mail, такой домен не обнаружен.';
				break;
			case 'typed_domain':
				noticeText = 'Обнаружена опечатка в домене. Проверьте внимательно указанный вами e-mail.';
				break;
			case 'wrong_email_format':
				noticeText = 'Что-то не так в написании адреса. Возможно, указаны лишние точки или пробелы.<br>Адрес должен иметь вид: <b>имя_пользователя@имя_домена</b> (например <b>somebody@example.com</b>)';
				break;
			// FIXME
			case 'check':
				noticeText = 'Идёт проверка адреса e-mail, это может занять несколько секунд.';
			default:
			// FIXME
				noticeText = 'Введённый вами адрес недоступен. Пожалуйста, укажите корректный e-mail.';
				break;
		}
		showNotice('red', noticeText);
	}
	
	
	// Добавляем CSS и расставляем вызов
	$(function() {
		$('<link />').attr({
			rel: 'stylesheet',
			type: 'text/css',
			href: '//eterfund.ru/api/email/svcCheckEmail.css'
		}).appendTo('head');
		
		var prev_emailCheck, checkDoneStatus = 'empty';
		var emailInput = $('.svcCheckEmail');
		var emailNotice, emailForm = emailInput.closest('form');
		
		emailForm.submit(function() {
			if(getEMail() == '') {
				return false;
			}
			// FIXME
			if(checkDoneStatus == 'empty') {
				emailInput.blur();
			}
			
			if(checkDoneStatus != 'done') {
				showErrorNotice(checkDoneStatus);
			}
			
			if(checkDoneStatus == 'done') {
				closeNotice();
				return true;
			}
			/* forbid send */
			return false;
		});
		
		emailInput.blur(function() {
			var email = getEMail();
			var regex = /^([^@\s]+)@(([a-zA-Z0-9\_\-]+\.)+([a-zA-Z]{2}|aero|arpa|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|post|pro|tel|travel|xxx))$/;
			
			emailInput.val(email);
			
			if(prev_emailCheck == email) {
				return false;
			}
			
			prev_emailCheck = email;
			checkDoneStatus = 'fail';
			
			if(email.length == 0) {
				if(noticeShow === true) {
					clearTimeout(noticeTimer);
					emailNotice.css({ marginTop: '-51px' });
					noticeShow = false;
				}
				
				emailInput.removeClass('bg-loader').removeClass('bg-true').removeClass('bg-false');
				
				return false;
			}
			
			inputHeight = parseInt(emailInput.height()) + parseInt(emailInput.css('margin-top')) + parseInt(emailInput.css('margin-bottom'));
			
			showNotice('yellow', 'Идёт проверка адреса e-mail, это может занять несколько секунд.');
			checkDoneStatus = 'check';
	
			emailInput.removeClass('bg-true').removeClass('bg-false').addClass('bg-loader');
			
			clearTimeout(noticeTimer);
			
			// Проверяем без отправки на сервер
			if(email.length < 5 || !regex.test(email)) {
				checkDoneStatus = 'wrong_email_format';
				showErrorNotice(checkDoneStatus);
				emailInput.removeClass('bg-loader').addClass('bg-false');
				return false;
			}
			
			// Проверяем на сервере
			$.ajax({
				url: '//eterfund.ru/api/email/svcCheckEmail.php',
				type: 'GET',
				data: {
					email: email
				},
				error: function() {
					showNotice('red', 'Ошибка связи с сервером, проверка адреса не удалась.');
					emailInput.removeClass('bg-loader').addClass('bg-true');
					// FIXME
					checkDoneStatus = 'true';
				},
				success: function(response) {
					try {
						response = JSON.parse(response);
						
						if(response.status === false) {
							showErrorNotice(response.error);
							emailInput.removeClass('bg-loader').addClass('bg-false');
							
							checkDoneStatus = response.error;
						}
						else {
							showNotice('green', 'Email адрес указан верно.');
							emailInput.removeClass('bg-loader').addClass('bg-true');
							document.CheckEmailHash = response.hash;
		
							/* emailhash hidden field support */
							els = document.getElementsByName('emailhash');
							if (els.length)
								els[0].value = response.hash;
		
							checkDoneStatus = 'done';
						}
						// FIXME
					} catch (e) {
						showNotice('yellow', 'Не удалось проверить адрес e-mail.');
						emailInput.removeClass('bg-loader').addClass('bg-true');
						checkDoneStatus = 'done';
					}
	
				}
			});
			return true;
		});
	});	
})();
