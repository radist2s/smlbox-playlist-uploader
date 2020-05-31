# Smlbox.net IPTV Playlist Uploader

Загружает плейлисты в `XSPF` и `M3U` форматах на [smlbox.net](http://www.smlbox.net/)

## Использование

#### Установка
Установите [node.js](https://nodejs.org/).

Выполните команду в терминале:
```
npm install -g smlbox-playlist-uploader
```

В удобной для вас директории создайте файл `.env`, скопируйте в него содержимое из файла по ссылке: [.env.example](https://raw.githubusercontent.com/radist2s/smlbox-playlist-uploader/master/.env.example)

Отредактируйте значения в `.env`-файле, согласно комментариям из него.

В файле `.env` для переменных `sml_cookie_username` и `sml_cookie_password` необходимо использовать оригинальные значение cookies, которые устанавливает [smlbox.net](http://www.smlbox.net/) в вашем браузере после авторизации на сайте сервиса (`username` и `password` соответственно). Использование имени пользователя и пароля вместо значений из `cookies` недопустимо.

#### Загрузка каналов из плейлиста
Необходимо выполнять команды из той директории, в которой находится ваш `.env`-файл с настройками.
```
smlbox-playlist-uploader --upload
```
#### Удаление всех каналов
```
smlbox-playlist-uploader --delete
```
#### Удаление всех каналов и последующая загрузка
```
smlbox-playlist-uploader --delete --upload
```