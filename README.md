# Fecha ♥

Una dedicatoria animada con un árbol de corazones, palabras que aparecen poco a poco y una cuenta regresiva para un cumpleaños. Inspirada en el video de referencia: tarjeta crema, tronco que crece, copa con forma de corazón y hojas rojas y rosadas que caen.

## Iniciar

Necesitas **Node.js 22 o superior**. No requiere instalar dependencias.

```bash
git clone https://github.com/Maxi-ING/Fecha.git
cd Fecha
npm start
```

- **Dedicatoria:** http://localhost:3000
- **Editor:** http://localhost:3000/edit

Al iniciar, la terminal muestra una clave de edición generada automáticamente. Se conserva al reiniciar. También puedes copiar `.env.example` a `.env` y establecer tu propia `EDIT_PASSWORD` antes de ejecutar `npm start`. No subas `.env` ni compartas la clave con quien recibe la dedicatoria.

## Personalizar

Abre `/edit`, introduce tu clave y modifica:

| Campo | Qué cambia |
| --- | --- |
| Para quién, título y mensaje | La dedicatoria junto al árbol. Admite párrafos y emojis. |
| Despedida o firma | La frase final del mensaje. |
| Fecha, hora y zona horaria | El instante al que llega la cuenta regresiva. Por defecto, Perú. |
| Frase de la cuenta regresiva | El texto que acompaña al contador. |
| Mensaje cuando llegue la fecha | La felicitación que reemplaza al contador al llegar a cero. |

Pulsa **Guardar cambios**. La configuración se guarda en el servidor: la ven todos los visitantes y permanece tras reiniciarlo. Una dedicatoria que ya esté abierta recoge los cambios en un máximo aproximado de 30 segundos mientras su pestaña esté activa, o al volver a ella.

La portada no tiene enlaces, botones ni menús hacia el editor. `/edit` no incluye vista previa y exige la clave para guardar. La fecha es una fecha concreta: no se renueva automáticamente cada año. Si ya pasó, aparece la felicitación.

El texto inicial es personalizable y la fecha inicial queda fijada cinco días después del primer arranque. **Edita esos valores antes de compartir la página.**

## Compartir por internet

El repositorio contiene la aplicación; subirlo a GitHub no publica por sí solo una web. Para compartirla mediante un enlace, aloja este proyecto en un servidor que ejecute Node.js, con:

- Comando de inicio: `npm start`.
- `EDIT_PASSWORD`: tu clave privada.
- `DATA_DIR`: una carpeta en un **disco o volumen persistente**, para conservar los cambios al redesplegar.
- `PORT`: el puerto que indique el alojamiento, o `3000`.
- `COOKIE_SECURE=true` cuando la web use HTTPS.

GitHub Pages sirve archivos estáticos y **no ejecuta este servidor**. El editor con guardado compartido necesita el servidor de este proyecto. La página pública puede abrirse sin una cuenta; el editor requiere la clave. Usa una sola instancia del servidor con su volumen; si necesitas varias, sustituye el archivo por una base de datos compartida.

### Docker, opcional

```bash
docker build -t fecha .
docker run --rm -p 3000:3000 --env-file .env -v fecha-data:/app/.data fecha
```

El volumen `fecha-data` conserva la dedicatoria. Usa `COOKIE_SECURE=false` al probar únicamente por HTTP local.

## Verificación

```bash
npm run check
npm test
```

Las pruebas cubren inicio de sesión, guardado autorizado, protección CSRF, cierre de sesión, bloqueo de intentos repetidos, persistencia tras reinicio y fechas con distintas zonas horarias y cambios de horario de verano. La animación respeta la preferencia de movimiento reducido y se pausa cuando la pestaña queda oculta.

## Estructura

```text
public/          Dedicatoria, editor, estilos y animación Canvas
lib/config.mjs   Validación y conversión de fechas
server.mjs       Servidor, sesión y guardado persistente
test/            Pruebas del servidor y las fechas
.data/           Datos locales y clave generada; excluidos de Git
```

Sin fuentes, rastreadores, imágenes ni bibliotecas de terceros. Los corazones y las ramas se dibujan como vectores en Canvas. La música y las marcas del montaje de TikTok no forman parte de la página.
