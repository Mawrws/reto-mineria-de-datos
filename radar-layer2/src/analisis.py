"""
Reto: Radar de Layer 2
======================

Reproduce el análisis completo (pasos 1 a 5 y bonus) a partir de
data/dataset_reto_l2.csv, imprime los resultados y guarda:

    reports/figures/*.png        gráficos con título, ejes y unidades
    reports/resultados.json      todas las cifras del análisis

Uso (desde la carpeta raíz del proyecto):

    python src/analisis.py
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # genera los PNG sin abrir ventanas
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Rutas
# --------------------------------------------------------------------------
RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / "data" / "dataset_reto_l2.csv"
FIGURAS = RAIZ / "reports" / "figures"
RESULTADOS = RAIZ / "reports" / "resultados.json"

N_TRAIN = 90          # días de entrenamiento (paso 4)
SHOCK = -0.10         # escenario del paso 5A: el índice L2 cae 10 %
K_SIGMA = 2           # umbral de alertas del paso 5B
SEMILLA = 0           # para que el remuestreo dé siempre lo mismo

# --------------------------------------------------------------------------
# Estilo de gráficos (minimalista)
# --------------------------------------------------------------------------
TINTA, GRIS, REJILLA = "#111827", "#6B7280", "#E5E7EB"
ACENTO, NARANJA, ALERTA = "#2563EB", "#EA580C", "#DC2626"
MESES = {1: "ene", 2: "feb", 3: "mar", 4: "abr", 5: "may", 6: "jun",
         7: "jul", 8: "ago", 9: "sep", 10: "oct", 11: "nov", 12: "dic"}

plt.rcParams.update({
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.titlelocation": "left",
    "axes.titlecolor": TINTA,
    "axes.labelcolor": GRIS,
    "axes.edgecolor": REJILLA,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": REJILLA,
    "grid.linewidth": 0.8,
    "xtick.color": GRIS,
    "ytick.color": GRIS,
    "legend.frameon": False,
    "figure.dpi": 110,
    "savefig.dpi": 150,
    "savefig.bbox": "tight",
})

def _pct(v: float, _=None) -> str:
    p = v * 100
    dec = 0 if abs(p - round(p)) < 1e-9 else 1
    return f"{p:.{dec}f} %".replace(".", ",").replace("-", "−")


pct = plt.FuncFormatter(_pct)
usd = plt.FuncFormatter(lambda v, _: f"{v:.2f}".replace(".", ","))
fecha_corta = plt.FuncFormatter(
    lambda v, _: f"{mdates.num2date(v).day}-{MESES[mdates.num2date(v).month]}"
)


def es(valor: float, dec: int = 3) -> str:
    """Formatea un número con coma decimal (estilo español)."""
    return f"{valor:.{dec}f}".replace(".", ",").replace("-", "−")


def guardar(fig: plt.Figure, nombre: str) -> None:
    FIGURAS.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIGURAS / nombre)
    plt.close(fig)


def rmse(real, predicho) -> float:
    """Raíz del error cuadrático medio."""
    return float(np.sqrt(np.mean((np.asarray(real) - np.asarray(predicho)) ** 2)))


# --------------------------------------------------------------------------
# Paso 1. Entender y limpiar
# --------------------------------------------------------------------------
def paso1(df: pd.DataFrame) -> dict:
    saltos = df["fecha"].diff().dropna().dt.days
    ret_calc = np.log(df["precio_matic"] / df["precio_matic"].shift(1))
    b_con = np.polyfit(df["ret_indice_l2"], df["ret_matic"], 1)[0]
    b_sin = np.polyfit(df["ret_indice_l2"].iloc[1:], df["ret_matic"].iloc[1:], 1)[0]
    return {
        "filas": int(df.shape[0]),
        "columnas": int(df.shape[1]),
        "nulos": int(df.isna().sum().sum()),
        "duplicados": int(df.duplicated().sum()),
        "fechas_repetidas": int(df["fecha"].duplicated().sum()),
        "saltos_de_1_dia": int((saltos == 1).sum()),
        "saltos_totales": int(len(saltos)),
        "desde": str(df["fecha"].min().date()),
        "hasta": str(df["fecha"].max().date()),
        "max_dif_log_retorno": float((ret_calc - df["ret_matic"]).abs().max()),
        "ceros_exactos_l2": int((df["ret_indice_l2"] == 0).sum()),
        "beta_con_fila1": float(b_con),
        "beta_sin_fila1": float(b_sin),
    }


# --------------------------------------------------------------------------
# Paso 2. Explorar
# --------------------------------------------------------------------------
def paso2(df: pd.DataFrame) -> dict:
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df["fecha"], df["precio_matic"], color=ACENTO, lw=2)
    ax.set_title("Precio de MATIC, 1-mar a 28-jun-2023")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Precio de MATIC (USD)")
    ax.yaxis.set_major_formatter(usd)
    ax.xaxis.set_major_formatter(fecha_corta)
    guardar(fig, "01_precio.png")

    x, y = df["ret_indice_l2"], df["ret_matic"]
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    ax.scatter(x, y, s=28, color=ACENTO, alpha=0.6, edgecolor="white", linewidth=0.5)
    ax.set_title("Retorno diario: MATIC vs. índice L2")
    ax.set_xlabel("Retorno diario del índice L2 (%)")
    ax.set_ylabel("Retorno diario de MATIC (%)")
    ax.xaxis.set_major_formatter(pct)
    ax.yaxis.set_major_formatter(pct)
    guardar(fig, "02_dispersion.png")

    return {
        "correlacion": float(x.corr(y)),
        "precio_inicial": float(df["precio_matic"].iloc[0]),
        "precio_final": float(df["precio_matic"].iloc[-1]),
        "precio_minimo": float(df["precio_matic"].min()),
        "fecha_precio_minimo": str(df.loc[df["precio_matic"].idxmin(), "fecha"].date()),
    }


# --------------------------------------------------------------------------
# Paso 3. Medir la beta
# --------------------------------------------------------------------------
def paso3(df: pd.DataFrame) -> dict:
    x, y = df["ret_indice_l2"], df["ret_matic"]
    beta, alpha = np.polyfit(x, y, 1)          # primero X (L2), luego Y (MATIC)
    corr = x.corr(y)
    r2 = corr ** 2
    n = len(df)
    residuos = y - (alpha + beta * x)
    se_beta = np.sqrt((residuos ** 2).sum() / (n - 2) / ((x - x.mean()) ** 2).sum())
    beta_invertida = np.polyfit(y, x, 1)[0]     # el error común, solo para mostrarlo

    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    ax.scatter(x, y, s=28, color=GRIS, alpha=0.5, edgecolor="white", linewidth=0.5, label="días")
    xs = np.linspace(x.min(), x.max(), 100)
    ax.plot(xs, alpha + beta * xs, color=ACENTO, lw=2.5, label=f"recta ajustada (beta = {es(beta)})")
    ax.set_title("MATIC vs. índice L2 con recta de regresión")
    ax.set_xlabel("Retorno diario del índice L2 (%)")
    ax.set_ylabel("Retorno diario de MATIC (%)")
    ax.xaxis.set_major_formatter(pct)
    ax.yaxis.set_major_formatter(pct)
    ax.legend(loc="upper left")
    guardar(fig, "03_recta.png")

    return {
        "beta": float(beta),
        "alpha": float(alpha),
        "r2": float(r2),
        "error_estandar_beta": float(se_beta),
        "ic95_beta": [float(beta - 1.98 * se_beta), float(beta + 1.98 * se_beta)],
        "beta_si_se_invierten_x_e_y": float(beta_invertida),
    }


# --------------------------------------------------------------------------
# Paso 4. Validar a ciegas
# --------------------------------------------------------------------------
def paso4(df: pd.DataFrame, beta_120: float, alpha_120: float) -> dict:
    train, test = df.iloc[:N_TRAIN], df.iloc[N_TRAIN:]
    beta_tr, alpha_tr = np.polyfit(train["ret_indice_l2"], train["ret_matic"], 1)
    pred = alpha_tr + beta_tr * test["ret_indice_l2"]

    err_modelo = rmse(test["ret_matic"], pred)
    err_base = rmse(test["ret_matic"], 0)
    mejora = 1 - err_modelo / err_base

    # Honestidad: ¿qué tan estable es la mejora con solo 30 días? (bootstrap)
    rng = np.random.default_rng(SEMILLA)
    e_mod = ((test["ret_matic"] - pred) ** 2).to_numpy()
    e_base = (test["ret_matic"] ** 2).to_numpy()
    mejoras = []
    for _ in range(5000):
        i = rng.integers(0, len(test), len(test))
        mejoras.append(1 - np.sqrt(e_mod[i].mean()) / np.sqrt(e_base[i].mean()))
    mejoras = np.array(mejoras)

    # Lo que NO se debe hacer: beta con los 120 días ("mirar el examen")
    pred_trampa = alpha_120 + beta_120 * test["ret_indice_l2"]

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(test["fecha"], test["ret_matic"], color=TINTA, lw=1.8, marker="o", ms=4, label="MATIC real")
    ax.plot(test["fecha"], pred, color=ACENTO, lw=1.8, marker="s", ms=4, label="predicción (beta de 90 días)")
    ax.axhline(0, color=GRIS, ls="--", lw=1.2, label="línea base: predecir 0")
    ax.set_title("Validación a ciegas: 30-may a 28-jun-2023")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Retorno diario de MATIC (%)")
    ax.yaxis.set_major_formatter(pct)
    ax.xaxis.set_major_formatter(fecha_corta)
    ax.legend(loc="upper left", bbox_to_anchor=(0, -0.18), ncol=3)
    guardar(fig, "04_validacion.png")

    return {
        "train": [str(train["fecha"].min().date()), str(train["fecha"].max().date())],
        "test": [str(test["fecha"].min().date()), str(test["fecha"].max().date())],
        "beta_train": float(beta_tr),
        "alpha_train": float(alpha_tr),
        "rmse_modelo": err_modelo,
        "rmse_base": err_base,
        "mejora": float(mejora),
        "dias_que_gana": int((np.abs(test["ret_matic"] - pred) < np.abs(test["ret_matic"])).sum()),
        "bootstrap_ic95_mejora": [float(np.percentile(mejoras, 2.5)), float(np.percentile(mejoras, 97.5))],
        "bootstrap_prob_no_gana": float(np.mean(mejoras <= 0)),
        "mejora_con_trampa_120_dias": float(1 - rmse(test["ret_matic"], pred_trampa) / err_base),
    }


# --------------------------------------------------------------------------
# Paso 5. Usarlo: A) escenario, B) alertas
# --------------------------------------------------------------------------
def paso5(df: pd.DataFrame, beta: float, alpha: float) -> dict:
    x = df["ret_indice_l2"]

    # A) Escenario
    efecto = beta * SHOCK
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.hist(x, bins=np.arange(-0.05, 0.05, 0.005), color=GRIS, edgecolor="white")
    ax.axvline(SHOCK, color=NARANJA, lw=2.5)
    ax.text(SHOCK + 0.002, ax.get_ylim()[1] * 0.9, "escenario\n−10 %", color=NARANJA, fontweight="bold")
    ax.set_xlim(-0.12, 0.06)
    ax.set_title("Los 120 días del índice L2 frente al escenario")
    ax.set_xlabel("Retorno diario del índice L2 (%)")
    ax.set_ylabel("Número de días")
    ax.xaxis.set_major_formatter(pct)
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(integer=True))
    guardar(fig, "05_escenario.png")

    # B) Alertas (fórmula de la guía: residuo = ret_matic - beta * ret_indice_l2)
    residuo = df["ret_matic"] - beta * x
    sigma = residuo.std()                       # desviación muestral = DESVEST.M
    alertas = df[residuo.abs() > K_SIGMA * sigma].copy()
    alertas["residuo"] = residuo[alertas.index]
    extremos = alertas.reindex(alertas["residuo"].abs().sort_values(ascending=False).index).head(2)

    residuo_con_alpha = df["ret_matic"] - (alpha + beta * x)
    n_alertas_con_alpha = int((residuo_con_alpha.abs() > K_SIGMA * residuo_con_alpha.std()).sum())

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df["fecha"], residuo, color=GRIS, lw=1.2)
    for v in (K_SIGMA * sigma, -K_SIGMA * sigma):
        ax.axhline(v, color=ALERTA, ls="--", lw=1.2)
    ax.scatter(alertas["fecha"], alertas["residuo"], color=ALERTA, s=40, zorder=3)
    for _, r in alertas.iterrows():
        ax.annotate(f"{r['fecha'].day}-{MESES[r['fecha'].month]}", (r["fecha"], r["residuo"]),
                    xytext=(6, 0), textcoords="offset points", va="center", color=TINTA, fontsize=10)
    ax.set_title("Residuo de MATIC (lo que L2 no explica) con bandas de ±2σ")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Residuo diario (%)")
    ax.yaxis.set_major_formatter(pct)
    ax.xaxis.set_major_formatter(fecha_corta)
    guardar(fig, "06_alertas_residuo.png")

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df["fecha"], df["precio_matic"], color=GRIS, lw=1.6)
    ax.scatter(alertas["fecha"], alertas["precio_matic"], color=TINTA, s=30, zorder=3)
    ax.scatter(extremos["fecha"], extremos["precio_matic"], color=ALERTA, s=60, zorder=4)
    for _, r in extremos.iterrows():
        ax.annotate(f"{r['fecha'].day}-{MESES[r['fecha'].month]}: {'+' if r['ret_matic'] > 0 else ''}{es(r['ret_matic'] * 100, 1)} %",
                    (r["fecha"], r["precio_matic"]), xytext=(0, 14 if r["ret_matic"] > 0 else -20),
                    textcoords="offset points", ha="center", color=ALERTA, fontweight="bold")
    ax.set_title("Precio de MATIC con los días en alerta")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Precio de MATIC (USD)")
    ax.yaxis.set_major_formatter(usd)
    ax.xaxis.set_major_formatter(fecha_corta)
    guardar(fig, "07_alertas_precio.png")

    return {
        "escenario": {
            "shock_l2": SHOCK,
            "efecto_matic": float(efecto),
            "efecto_con_alpha": float(alpha + beta * SHOCK),
            "min_l2": float(x.min()),
            "fecha_min_l2": str(df.loc[x.idxmin(), "fecha"].date()),
            "max_l2": float(x.max()),
            "fecha_max_l2": str(df.loc[x.idxmax(), "fecha"].date()),
            "desviaciones_estandar": float(abs(SHOCK) / x.std()),
            "veces_peor_caida": float(SHOCK / x.min()),
        },
        "alertas": {
            "sigma": float(sigma),
            "umbral": float(K_SIGMA * sigma),
            "n_alertas": int(len(alertas)),
            "n_alertas_con_alpha": n_alertas_con_alpha,
            "dias": [
                {
                    "fecha": str(r["fecha"].date()),
                    "ret_matic": float(r["ret_matic"]),
                    "ret_l2": float(r["ret_indice_l2"]),
                    "residuo": float(r["residuo"]),
                    "volumen_musd": float(r["volumen_musd"]),
                }
                for _, r in alertas.iterrows()
            ],
            "extremos": [str(d.date()) for d in extremos["fecha"].sort_values()],
        },
    }


# --------------------------------------------------------------------------
# Bonus. Segundo factor: ret_btc
# --------------------------------------------------------------------------
def ajustar(cols: list[str], datos: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    X = np.column_stack([np.ones(len(datos))] + [datos[c] for c in cols])
    coef, *_ = np.linalg.lstsq(X, datos["ret_matic"], rcond=None)
    return coef, X


def bonus(df: pd.DataFrame) -> dict:
    train, test = df.iloc[:N_TRAIN], df.iloc[N_TRAIN:]
    salida = {}
    for nombre, cols in (("solo_l2", ["ret_indice_l2"]), ("l2_y_btc", ["ret_indice_l2", "ret_btc"])):
        coef, X = ajustar(cols, df)
        y = df["ret_matic"]
        res = y - X @ coef
        n, k = X.shape
        r2 = 1 - (res ** 2).sum() / ((y - y.mean()) ** 2).sum()
        coef_tr, _ = ajustar(cols, train)
        X_te = np.column_stack([np.ones(len(test))] + [test[c] for c in cols])
        salida[nombre] = {
            "r2": float(r2),
            "r2_ajustado": float(1 - (1 - r2) * (n - 1) / (n - k)),
            "coeficientes": [float(c) for c in coef],
            "coeficientes_train": [float(c) for c in coef_tr],
            "rmse_test": rmse(test["ret_matic"], X_te @ coef_tr),
        }
    r = df["ret_indice_l2"].corr(df["ret_btc"])
    salida["corr_l2_btc"] = float(r)
    salida["corr_matic_btc"] = float(df["ret_matic"].corr(df["ret_btc"]))
    salida["vif"] = float(1 / (1 - r ** 2))
    return salida


# --------------------------------------------------------------------------
# Programa principal
# --------------------------------------------------------------------------
def main() -> None:
    df = pd.read_csv(DATOS, parse_dates=["fecha"])

    r1 = paso1(df)
    r2 = paso2(df)
    r3 = paso3(df)
    r4 = paso4(df, r3["beta"], r3["alpha"])
    r5 = paso5(df, r3["beta"], r3["alpha"])
    rb = bonus(df)

    resultados = {"paso1": r1, "paso2": r2, "paso3": r3, "paso4": r4, "paso5": r5, "bonus": rb}
    RESULTADOS.parent.mkdir(parents=True, exist_ok=True)
    RESULTADOS.write_text(json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8")

    a = r5["alertas"]
    print("RADAR DE LAYER 2 · resultados")
    print("-" * 52)
    print(f"Datos        {r1['filas']} filas x {r1['columnas']} columnas · nulos {r1['nulos']} · "
          f"duplicados {r1['duplicados']} · saltos de 1 día {r1['saltos_de_1_dia']}/{r1['saltos_totales']}")
    print(f"Correlación  {es(r2['correlacion'])}")
    print(f"Beta         {es(r3['beta'])}  (alpha {es(r3['alpha'], 5)}, R² {es(r3['r2'])})")
    print(f"             Por cada 1 % de L2, MATIC se mueve {es(r3['beta'], 2)} %")
    print(f"Validación   beta train {es(r4['beta_train'])} · RMSE modelo {es(r4['rmse_modelo'], 5)} "
          f"vs base {es(r4['rmse_base'], 5)} · mejora {es(r4['mejora'] * 100, 1)} %")
    print(f"Escenario    L2 −10 % → MATIC {es(r5['escenario']['efecto_matic'] * 100, 1)} %")
    print(f"Alertas      {a['n_alertas']} días (umbral {es(a['umbral'] * 100, 2)} %) · extremos: "
          f"{', '.join(a['extremos'])}")
    print(f"Bonus BTC    R² ajustado {es(rb['solo_l2']['r2_ajustado'])} → {es(rb['l2_y_btc']['r2_ajustado'])} · "
          f"corr L2-BTC {es(rb['corr_l2_btc'])}")
    print("-" * 52)
    print(f"Figuras en   {FIGURAS.relative_to(RAIZ)}")
    print(f"Cifras en    {RESULTADOS.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
