# Fecha ♥

Una dedicatoria con un árbol animado de corazones, texto que aparece poco a poco y una cuenta regresiva. Preparada como **web estática para Vercel**: editas el código, subes el cambio a GitHub y Vercel publica la nueva versión.

## Dónde cambiar los textos y la fecha

Edita únicamente **[`public/config.js`](public/config.js)**. Cada campo tiene un comentario justo encima que explica qué puedes cambiar.

| Campo | Qué modifica |
| --- | --- |
| `recipient` | Para quién es la dedicatoria. |
| `title` | El título junto al árbol. |
| `message` | El mensaje principal. Puedes escribir varios párrafos y emojis. |
| `signature` | La despedida o tu nombre. |
| `countdownLabel` | La frase que acompaña a la cuenta regresiva. |
| `birthdayMessage` | La felicitación que aparece al llegar a cero. |
| `date` | La fecha en formato **año-mes-día**: `'2027-02-14'`. |
| `time` | La hora en formato de 24 horas: `'00:00'`. |
| `timezone` | La zona horaria. Para Perú: `'America/Lima'`. |

Ejemplo de la parte de la fecha:

```js
// 14 de febrero de 2027, a la medianoche de Perú.
date: '2027-02-14',
time: '00:00',
timezone: 'America/Lima',
```

`00:00` es el comienzo del día seleccionado. La cuenta regresiva llega al mismo instante aunque la visita venga de otro país. La fecha es fija: no se reinicia al abrir la página ni se renueva cada año. Si ya pasó, aparece `birthdayMessage`.

Para el mensaje principal, conserva las comillas invertidas y escribe libremente entre ellas. Deja una línea vacía para separar párrafos. Conserva también los nombres de los campos y las comas. El archivo incluye los límites de texto junto a cada campo.

**Personaliza los textos de ejemplo y la fecha de muestra (`2026-10-25`) antes de compartir la dedicatoria.** El contenido de este archivo forma parte de la página pública.

## Publicar en Vercel

1. Entra a [Vercel](https://vercel.com/new) y conecta tu cuenta de GitHub.
2. Importa el repositorio **`Maxi-ING/Fecha`**.
3. Deja la raíz del proyecto en la carpeta principal del repositorio. La configuración de `vercel.json` establece:

   | Opción | Valor |
   | --- | --- |
   | Framework Preset | **Other** |
   | Build Command | `npm run build` |
   | Output Directory | `public` |
   | Production Branch | `main` |

4. Pulsa **Deploy**. Cuando finalice, Vercel te dará el enlace para compartir.

No necesitas variables de entorno, base de datos ni un servidor de aplicación en producción. `/edit` se eliminó: toda la personalización se hace en `public/config.js`.

Si ya importaste la versión anterior, revisa las opciones de build anteriores y vuelve a desplegar el último commit de `main`.

## Actualizar después de publicar

Puedes hacerlo directamente desde GitHub:

1. Abre `public/config.js` y pulsa el lápiz para editar.
2. Cambia los textos o la fecha, y guarda con **Commit changes** en `main`.
3. Espera a que Vercel termine el nuevo despliegue conectado a esa rama.
4. Abre o recarga el enlace público para ver la nueva versión.

Desde tu PC, el flujo equivalente es:

```bash
git add public/config.js
git commit -m "content: actualizar mensaje y fecha"
git push origin main
```

El enlace principal sigue siendo el mismo. Una pestaña que ya estaba abierta conserva su versión hasta que la recargues. Si la configuración contiene una fecha imposible, una hora inexistente por el horario de verano o textos demasiado largos, la verificación bloquea ese nuevo despliegue hasta que lo corrijas.

## Probar en tu PC

Necesitas **Node.js 22 o superior**. No hay dependencias externas que instalar.

```bash
git clone https://github.com/Maxi-ING/Fecha.git
cd Fecha
npm start
```

Abre **http://localhost:3000**. Después de editar `public/config.js`, recarga la página. Usa el servidor local en lugar de abrir el HTML con doble clic, porque la página utiliza módulos JavaScript.

## Verificación

```bash
npm run build
```

Comprueba la sintaxis, valida tu configuración real y ejecuta las pruebas de fechas y publicación estática. GitHub Actions ejecuta la misma verificación. La animación conserva el modo de movimiento reducido y se pausa cuando la pestaña queda oculta.

## Archivos principales

| Archivo | Función |
| --- | --- |
| `public/config.js` | **Aquí editas los textos y la fecha.** |
| `public/index.html` | Estructura de la dedicatoria. |
| `public/style.css` | Colores, tipografía y adaptación a móviles. |
| `public/tree.js` | Árbol de corazones y animación Canvas. |
| `public/app.js` | Texto progresivo, cuenta regresiva y botones. |
| `public/date.js` | Validación y cálculo de la fecha por zona horaria. |
| `vercel.json` | Configuración de publicación estática. |
| `scripts/serve.mjs` | Servidor estático de prueba local; no se despliega. |

Los corazones y las ramas se dibujan con código, sin imágenes ni fuentes externas. La música y las marcas del montaje de TikTok no forman parte de la página.

Referencia: [integración oficial de Vercel con GitHub](https://vercel.com/docs/git/vercel-for-github).
