# Smlbox.net IPTV Playlist Uploader

Загружает плейлисты в `XSPF` и `M3U` форматах на [smlbox.net](http://www.smlbox.net/)

## Использование

#### Установка
Установите [node.js](https://nodejs.org/).

В новой директории выполните команду в терминале:
```
npm install smlbox-playlist-uploader
```

После установки модуля, переименуйте файл `.env.example` в `.env` и отредактируйте его значения, согласно комментариям в нем.

В файле `.env` для переменных `sml_cookie_username` и `sml_cookie_password` необходимо использовать оригинальные значение cookies, которые устанавливает [smlbox.net](http://www.smlbox.net/) в вашем браузере после авторизации на сайте сервиса (`username` и `password` соответственно). Использование имени пользователя и пароля вместо значений из `cookies` недопустимо.

#### Загрузка каналов из плейлиста
```
npm run start --upload
```
#### Удаление всех каналов
```
npm run start --delete
```
#### Удаление всех каналов и последующая загрузка
```
npm run start --delete --upload
```