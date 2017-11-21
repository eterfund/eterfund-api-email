<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<script type="text/javascript" src="//eterfund.ru/js/jquery/latest/jquery.min.js"></script>
		<script type="text/javascript" src="svcCheckEmail.js"></script>
		<style type="text/css">
			form {
				width: 100%;
				position: absolute;
				text-align: center;
				top: 30%;
			}
		</style>
	</head>
</html>
<body>
	<form action="" method="post">
		E-mail: <input type="text" name="email" value="<?php echo $_POST['email']; ?>" class="svcCheckEmail" />
		<input type="submit" value="Отправить" />
	</form>
</body>
