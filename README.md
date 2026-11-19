# Analizador Sintáctico Visual

Aplicación web estática que analiza fragmentos de código, detecta el lenguaje, tokeniza el fuente y dibuja un **árbol de sintaxis abstracta (AST) interactivo en SVG**.

Construida únicamente con **HTML5, CSS3 y JavaScript nativo (ES6+)**: sin frameworks, sin librerías, sin CDNs y sin backend.

## Lenguajes soportados

| Lenguaje | Detección | AST |
| --- | --- | --- |
| Python | ✅ | ✅ (indentación significativa) |
| Java | ✅ | ✅ |
| JavaScript | ✅ | ✅ (funciones flecha incluidas) |
| C | ✅ | ✅ (directivas `#include` / `#define`) |
| Rust | ✅ | ✅ (`fn`, `let mut`, macros `vec!` / `println!`) |

Otros contenidos (texto plano, HTML, SQL, PHP, XML, JSON…) se rechazan con un aviso claro y **no se genera el árbol**.

## Características

- **Análisis léxico real**: palabras clave, identificadores, números, cadenas, operadores, delimitadores, comentarios y directivas del preprocesador.
- **Detección ponderada de lenguaje**: patrones característicos con umbral mínimo y dominancia sobre el segundo candidato; mensajes de error y de ambigüedad.
- **AST jerárquico**: declaraciones, funciones, parámetros, `if` / `else`, `for`, `while`, llamadas, accesos, expresiones aritméticas y lógicas.
- **SVG nativo e interactivo**: zoom con rueda, desplazamiento arrastrando, botón *Ajustar* y plegado/desplegado de nodos con clic (también con teclado).
- **Tabla de tokens** colapsable con token, tipo y línea.
- **Interfaz oscura tipo IDE**, responsive con CSS Grid y Flexbox.
- **Ejemplos** cargables para cada lenguaje.
- **Atajos**: `Ctrl/Cmd + Enter` analiza, `Ctrl/Cmd + 0` ajusta la vista.

## Estructura

```
Analizador-Sintactico/
├── index.html   # Estructura de la interfaz
├── styles.css   # Tema oscuro y estilos responsive
├── app.js       # Léxico, detección, parser y render SVG
└── README.md
```

## Ejecutar en local

Al no usar módulos ni peticiones de red, basta con abrir `index.html` en el navegador.

Si prefieres servirlo por HTTP:

```bash
python3 -m http.server 8000
# Abre http://localhost:8000
```

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `analizador-sintactico`).
2. Sube `index.html`, `styles.css` y `app.js` a la rama `main`, en la raíz del repositorio:

   ```bash
   git init
   git add index.html styles.css app.js README.md
   git commit -m "Analizador sintáctico visual"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/analizador-sintactico.git
   git push -u origin main
   ```

3. En GitHub, entra en **Settings → Pages**.
4. En *Build and deployment*, selecciona **Deploy from a branch**.
5. Elige la rama **main** y la carpeta **/(root)**. Guarda.
6. Espera un par de minutos; la aplicación estará en:

   ```
   https://TU_USUARIO.github.io/analizador-sintactico/
   ```

Todas las rutas son relativas, por lo que también funciona en un subdirectorio de proyecto (`usuario.github.io/repositorio/`).

## Notas y limitaciones

- La detección es heurística: fragmentos muy cortos o genéricos pueden resultar ambiguos y se rechazan de forma explícita.
- El parser es didáctico y tolerante a errores: recupera y continúa en lugar de abortar, por lo que no valida semántica ni tipos.
- El objetivo es visualizar estructura, no compilar ni ejecutar el código.
