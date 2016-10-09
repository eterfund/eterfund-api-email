
svcCheckEmail.cp1251.js: svcCheckEmail.js
	iconv -f utf8 -t cp1251 <$< >$@
