#!/usr/bin/env python3
"""Genera un PDF con capturas de los dashboards de SkillFinder en Grafana."""

from __future__ import annotations

import argparse
import base64
import os
import sys
from datetime import date
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - depende del entorno del usuario
    raise SystemExit(
        "Falta Pillow. Instala las dependencias con: "
        "py -m pip install -r infra/scripts/requirements-grafana.txt"
    ) from exc

DASHBOARDS = [
    ("skillfinder-negocio", "negocio"),
    ("skillfinder-tecnico", "tecnico"),
    ("skillfinder-reportes-categoria", "categoria"),
]


def download_dashboard(
    base_url: str,
    dashboard_uid: str,
    username: str,
    password: str,
    start: str,
    end: str,
    category: str,
) -> Image.Image:
    params = {
        "from": start,
        "to": end,
        "width": "1800",
        "height": "1100",
        "tz": "America/La_Paz",
    }
    if dashboard_uid == "skillfinder-reportes-categoria":
        params["var-categoria"] = category

    url = (
        f"{base_url.rstrip('/')}/render/d/{dashboard_uid}/{dashboard_uid}?"
        f"{urlencode(params)}"
    )
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    request = Request(
        url,
        headers={"Authorization": f"Basic {credentials}", "User-Agent": "SkillFinder-Report-Exporter/1.0"},
    )

    try:
        with urlopen(request, timeout=180) as response:
            content_type = response.headers.get("Content-Type", "")
            if "image/png" not in content_type:
                raise RuntimeError(
                    f"Grafana no devolvio una imagen para {dashboard_uid}: {content_type}"
                )
            payload = response.read()
    except HTTPError as exc:
        detail = exc.read(500).decode("utf-8", errors="replace")
        raise RuntimeError(f"Grafana respondio HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"No se pudo conectar con Grafana en {base_url}: {exc}") from exc

    return Image.open(BytesIO(payload)).convert("RGB")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from", dest="start", default="now-7d", help="Inicio Grafana, por defecto now-7d")
    parser.add_argument("--to", dest="end", default="now", help="Fin Grafana, por defecto now")
    parser.add_argument("--category", choices=["MEC", "CHA", "GOM", "ELA"], default="MEC")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    base_url = os.getenv("GRAFANA_URL", "http://localhost:3001")
    username = os.getenv("GRAFANA_USER", "admin")
    password = os.getenv("GRAFANA_PASSWORD")
    if not password:
        raise SystemExit("Define GRAFANA_PASSWORD con la clave de administrador de Grafana.")

    output = args.output or Path("reports") / f"skillfinder-piloto-{date.today().isoformat()}.pdf"
    output.parent.mkdir(parents=True, exist_ok=True)

    images: list[Image.Image] = []
    try:
        for uid, label in DASHBOARDS:
            print(f"Renderizando dashboard: {label}")
            images.append(
                download_dashboard(
                    base_url, uid, username, password, args.start, args.end, args.category
                )
            )
    except Exception as exc:
        print(f"No se pudo generar el reporte: {exc}", file=sys.stderr)
        return 1

    first, *rest = images
    first.save(output, "PDF", resolution=150.0, save_all=True, append_images=rest)
    print(f"Reporte creado: {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
