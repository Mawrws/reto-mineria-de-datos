# Guía paso a paso: VS Code, GitHub y GitHub Pages

Esta guía lleva el proyecto desde la carpeta descomprimida hasta un repositorio en GitHub con la demo publicada en una URL que se abre desde cualquier computadora.

**Contenido**

1. [Instalar lo necesario (una sola vez)](#1-instalar-lo-necesario-una-sola-vez)
2. [Abrir el proyecto en VS Code](#2-abrir-el-proyecto-en-vs-code)
3. [Crear el entorno de Python](#3-crear-el-entorno-de-python)
4. [Ejecutar el análisis](#4-ejecutar-el-análisis)
5. [Ver la demo web](#5-ver-la-demo-web)
6. [Subir el proyecto a GitHub](#6-subir-el-proyecto-a-github)
7. [Publicar la demo con GitHub Pages](#7-publicar-la-demo-con-github-pages)
8. [Usarlo desde otra computadora](#8-usarlo-desde-otra-computadora)
9. [Guardar cambios nuevos](#9-guardar-cambios-nuevos)
10. [Lista para el día de la exposición](#10-lista-para-el-día-de-la-exposición)
11. [Problemas frecuentes](#11-problemas-frecuentes)

---

## 1. Instalar lo necesario (una sola vez)

| Programa | Dónde | Nota |
|---|---|---|
| **Python 3.10 o superior** | python.org/downloads | En Windows marca **"Add python.exe to PATH"** en el instalador |
| **Git** | git-scm.com/downloads | Deja las opciones por defecto |
| **VS Code** | code.visualstudio.com | |
| **Cuenta de GitHub** | github.com | Gratis |

Comprueba en una terminal:

```bash
python --version     # en macOS puede ser: python3 --version
git --version
```

Configura tu nombre en Git (una sola vez por computadora):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

> Usa el mismo correo de tu cuenta de GitHub.

## 2. Abrir el proyecto en VS Code

1. Descomprime `radar-layer2.zip` en una carpeta fácil de encontrar (por ejemplo `Documentos/radar-layer2`).
2. En VS Code: **File → Open Folder…** y elige la carpeta `radar-layer2` (la que contiene `README.md`).
3. VS Code mostrará un aviso de **extensiones recomendadas**: pulsa **Install All**. Son:
   - **Python** (Microsoft)
   - **Jupyter** (Microsoft)
   - **Live Server** (para ver la web con recarga automática)
4. Abre la terminal integrada: **Terminal → New Terminal** (o ``Ctrl + ` ``).

## 3. Crear el entorno de Python

En la terminal de VS Code, dentro de la carpeta del proyecto:

**Windows (PowerShell)**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS / Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Sabrás que el entorno está activo porque la terminal muestra `(.venv)` al inicio de la línea.

Después, en VS Code: **Ctrl + Shift + P → "Python: Select Interpreter"** y elige el que dice **`.venv`**.

> Si PowerShell dice que *la ejecución de scripts está deshabilitada*, ejecuta una vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y responde `S`.

## 4. Ejecutar el análisis

### Opción A: el script

```bash
python src/analisis.py
```

Imprime el resumen de resultados y regenera `reports/figures/*.png` y `reports/resultados.json`.

### Opción B: el notebook (para mostrar el procedimiento paso a paso)

1. Abre `notebooks/reto_radar_l2.ipynb`.
2. Arriba a la derecha, en **Select Kernel**, elige **`.venv`**.
3. Pulsa **Run All**. Cada paso tiene una celda de código y una celda de texto con las respuestas.

### Opción C: Excel

Abre `excel/reto_radar_l2.xlsx`. La hoja `datos` tiene las fórmulas exactamente en las celdas de la guía; la hoja `guia_formulas` explica cada una en español.

## 5. Ver la demo web

- **Más simple:** doble clic en `docs/index.html`. Funciona sin internet (los datos están dentro de `docs/js/data.js`).
- **Con Live Server:** clic derecho en `docs/index.html` → **Open with Live Server**. Se abre en el navegador y se recarga cada vez que guardas un cambio en el HTML, CSS o JS.

| Archivo | Qué hace |
|---|---|
| `docs/index.html` | Estructura de la página: pestañas, textos y contenedores de los gráficos |
| `docs/css/styles.css` | Diseño: colores, tipografía, tarjetas, tablas |
| `docs/js/data.js` | El CSV del dataset dentro de una variable |
| `docs/js/app.js` | Los cálculos (correlación, mínimos cuadrados, RMSE, bootstrap, residuos) y los gráficos SVG |

## 6. Subir el proyecto a GitHub

### 6.1 Crear el repositorio vacío en GitHub

1. Entra a github.com → botón **New** (o **+ → New repository**).
2. **Repository name:** `radar-layer2`.
3. Elige **Public** (necesario para GitHub Pages gratis).
4. **No** marques "Add a README", ni `.gitignore`, ni licencia (el proyecto ya los trae).
5. Pulsa **Create repository**. Copia la URL que aparece, del tipo `https://github.com/<tu-usuario>/radar-layer2.git`.

### 6.2 Subir los archivos desde la terminal de VS Code

```bash
git init
git add .
git commit -m "Reto Radar de Layer 2: análisis, notebook, Excel y demo web"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/radar-layer2.git
git push -u origin main
```

La primera vez se abrirá una ventana para **iniciar sesión en GitHub**: acepta y autoriza. Al terminar, recarga la página del repositorio y verás todos los archivos con el README como portada.

> **Alternativa sin comandos:** en VS Code abre la vista **Source Control** (icono de ramas a la izquierda) → **Publish to GitHub** → elige **public repository**. VS Code crea el repositorio y sube todo.

## 7. Publicar la demo con GitHub Pages

1. En tu repositorio de GitHub: **Settings → Pages**.
2. En **Build and deployment → Source** elige **Deploy from a branch**.
3. En **Branch** elige **`main`** y la carpeta **`/docs`**. Pulsa **Save**.
4. Espera 1–2 minutos y recarga la página: aparecerá *"Your site is live at"*
   `https://<tu-usuario>.github.io/radar-layer2/`
5. Copia esa URL en el `README.md` (línea "Demo en vivo"), y súbelo de nuevo (paso 9).

> Consejo: en la página principal del repositorio, pulsa el engranaje de **About** y pega la URL en **Website**. Así queda visible arriba a la derecha.

## 8. Usarlo desde otra computadora

**Solo para mostrar la demo:** abre `https://<tu-usuario>.github.io/radar-layer2/` en cualquier navegador. No hace falta instalar nada.

**Para trabajar con el código:**

```bash
git clone https://github.com/<tu-usuario>/radar-layer2.git
cd radar-layer2
```

Luego repite los pasos 3 y 4 (crear `.venv`, instalar dependencias y ejecutar).

## 9. Guardar cambios nuevos

Cada vez que modifiques algo:

```bash
git add .
git commit -m "Describe aquí el cambio"
git push
```

Si trabajaste en otra computadora, antes de empezar descarga lo último con `git pull`.

GitHub Pages se actualiza solo uno o dos minutos después de cada `git push`.

## 10. Lista para el día de la exposición

- [ ] La URL de GitHub Pages abre bien (pruébala en el celular también).
- [ ] Tienes el ZIP o el repositorio clonado en la computadora del aula, por si no hay internet: `docs/index.html` funciona con doble clic.
- [ ] El notebook está ejecutado (las salidas se ven sin volver a correrlo).
- [ ] Las diapositivas exportadas están en `presentacion/` (PDF por si falla PowerPoint).
- [ ] Orden sugerido para la demostración: **Paso 3** (mover la recta y pulsar *Mínimos cuadrados*) → **Paso 4** (casilla de *trampa* y botón *Remuestrear*) → **Paso 5** (mover el shock y el umbral).

## 11. Problemas frecuentes

| Problema | Solución |
|---|---|
| `python` no se reconoce | Reinstala Python marcando *Add to PATH*, o usa `py` (Windows) / `python3` (macOS) |
| `No module named pandas` | El entorno no está activo o no es el kernel elegido: activa `.venv` y elige `.venv` como intérprete/kernel |
| El notebook no encuentra el CSV | Ábrelo desde la carpeta `notebooks/`: busca `../data/dataset_reto_l2.csv`. En Google Colab, sube el CSV junto al notebook |
| `git push` pide usuario y contraseña | GitHub ya no acepta contraseña: usa la ventana de inicio de sesión del navegador, o publica desde VS Code (*Publish to GitHub*) |
| `error: remote origin already exists` | `git remote set-url origin https://github.com/<tu-usuario>/radar-layer2.git` |
| La página de Pages da 404 | Revisa que elegiste la carpeta `/docs` y que el repositorio es público; espera 2 minutos |
| La web se ve sin estilos | Comprueba que existen `docs/css/styles.css` y `docs/js/app.js` con esos nombres exactos (mayúsculas incluidas) |
