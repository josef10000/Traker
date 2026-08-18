import os
import sys
import subprocess
import logging
import winreg
from pathlib import Path
from datetime import datetime

# ── Detecta caminhos reais do Windows ─────────────────────────────────────────
def _shell_folder(name: str) -> Path:
    key = winreg.OpenKey(
        winreg.HKEY_CURRENT_USER,
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders",
    )
    return Path(winreg.QueryValueEx(key, name)[0])

DESKTOP = _shell_folder("Desktop")
DOCUMENTS = _shell_folder("Personal")
DESTINO = DOCUMENTS / "Desktop Organizado"

# ── Mapeamento exclusivo para ARQUIVOS SOLTOS ─────────────────────────────────
# ATENÇÃO: Nenhuma pasta ou diretório na raiz da Área de Trabalho será movido.
# Todas as pastas de projetos, códigos e workspaces são preservadas intactas no Desktop.

EXTENSOES_MAP = {
    # 02_Documentos_e_Carreira
    ".pdf": "02_Documentos_e_Carreira/PDFs",
    ".doc": "02_Documentos_e_Carreira/Word_e_Textos",
    ".docx": "02_Documentos_e_Carreira/Word_e_Textos",
    ".txt": "02_Documentos_e_Carreira/Word_e_Textos",
    ".odt": "02_Documentos_e_Carreira/Word_e_Textos",
    ".xls": "02_Documentos_e_Carreira/Planilhas",
    ".xlsx": "02_Documentos_e_Carreira/Planilhas",
    ".csv": "02_Documentos_e_Carreira/Planilhas",
    ".ods": "02_Documentos_e_Carreira/Planilhas",
    ".ppt": "02_Documentos_e_Carreira/Apresentacoes",
    ".pptx": "02_Documentos_e_Carreira/Apresentacoes",

    # 04_Midia_e_Design
    ".jpg": "04_Midia_e_Design/Imagens",
    ".jpeg": "04_Midia_e_Design/Imagens",
    ".png": "04_Midia_e_Design/Imagens",
    ".gif": "04_Midia_e_Design/Imagens",
    ".bmp": "04_Midia_e_Design/Imagens",
    ".svg": "04_Midia_e_Design/Imagens",
    ".webp": "04_Midia_e_Design/Imagens",
    ".ico": "04_Midia_e_Design/Imagens",
    ".tiff": "04_Midia_e_Design/Imagens",
    ".heic": "04_Midia_e_Design/Imagens",
    ".mp4": "04_Midia_e_Design/Videos",
    ".mkv": "04_Midia_e_Design/Videos",
    ".avi": "04_Midia_e_Design/Videos",
    ".mov": "04_Midia_e_Design/Videos",
    ".mp3": "04_Midia_e_Design/Audios",
    ".wav": "04_Midia_e_Design/Audios",
    ".m4a": "04_Midia_e_Design/Audios",

    # 05_Instaladores_e_Compactados
    ".zip": "05_Instaladores_e_Compactados/Compactados",
    ".rar": "05_Instaladores_e_Compactados/Compactados",
    ".7z": "05_Instaladores_e_Compactados/Compactados",
    ".tar": "05_Instaladores_e_Compactados/Compactados",
    ".gz": "05_Instaladores_e_Compactados/Compactados",
    ".exe": "05_Instaladores_e_Compactados/Executaveis",
    ".msi": "05_Instaladores_e_Compactados/Executaveis",
    ".apk": "05_Instaladores_e_Compactados/Executaveis",
}

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_DIR = DESTINO / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

log_file = LOG_DIR / f"organizar_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────
def destino_unico_arquivo(pasta_destino: Path, nome: str) -> Path:
    caminho = pasta_destino / nome
    if not caminho.exists():
        return caminho
    stem, suffix = Path(nome).stem, Path(nome).suffix
    i = 1
    while caminho.exists():
        caminho = pasta_destino / f"{stem}_{i}{suffix}"
        i += 1
    return caminho

def mover_via_powershell(origem: Path, destino: Path) -> bool:
    try:
        cmd = [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            f'Move-Item -LiteralPath "{origem}" -Destination "{destino}" -Force'
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return res.returncode == 0
    except Exception as e:
        log.warning(f"Falha ao mover {origem.name} via PowerShell: {e}")
        return False

# ── Execução Principal ────────────────────────────────────────────────────────
def organizar():
    log.info("=" * 70)
    log.info(f"Iniciando Organizacao Segura da Area de Trabalho -- {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    log.info(f"Origem : {DESKTOP}")
    log.info(f"Destino: {DESTINO}")
    log.info("Regra  : PASTAS DE PROJETOS E DIRETORIOS NUNCA SAO MOVIDOS")
    log.info("=" * 70)

    movidos = 0
    ignorados = 0

    try:
        itens = list(DESKTOP.iterdir())
    except Exception as e:
        log.error(f"Erro ao acessar Desktop: {e}")
        return

    for item in itens:
        # 1. NUNCA MOVER PASTAS/DIRETÓRIOS (Preserva 100% das pastas de código e projetos)
        if item.is_dir():
            log.info(f"[PASTA PRESERVADA] {item.name} (mantida na raiz do Desktop)")
            ignorados += 1
            continue

        # 2. Ignora atalhos (.lnk) e arquivos ocultos/sistema
        if item.suffix.lower() == ".lnk" or item.name.startswith(".") or item.name.lower() == "desktop.ini":
            ignorados += 1
            continue

        # 3. Ignora se for o próprio destino
        try:
            if item.resolve() == DESTINO.resolve():
                ignorados += 1
                continue
        except Exception:
            pass

        # 4. Processar apenas arquivos soltos com extensões permitidas no mapa
        ext = item.suffix.lower()
        if ext not in EXTENSOES_MAP:
            log.info(f"[ARQUIVO PRESERVADO] {item.name} (extensao '{ext}' nao configurada para movimentacao)")
            ignorados += 1
            continue

        subcaminho = EXTENSOES_MAP[ext]
        pasta_destino = DESTINO / subcaminho
        pasta_destino.mkdir(parents=True, exist_ok=True)
        dest_arq = destino_unico_arquivo(pasta_destino, item.name)
        
        try:
            if mover_via_powershell(item, dest_arq):
                log.info(f"[ARQUIVO MOVIDO ] {item.name}  ->  {dest_arq.relative_to(DESTINO)}")
                movidos += 1
            else:
                log.warning(f"[PULADO         ] {item.name} (Arquivo em uso ou bloqueado)")
                ignorados += 1
        except Exception as e:
            log.warning(f"[ERRO           ] {item.name} ({e})")
            ignorados += 1

    log.info("-" * 70)
    log.info(f"Concluido! {movidos} arquivo(s) movido(s), {ignorados} item(ns) preservado(s)/ignorado(s).")
    log.info(f"Log salvo em: {log_file}")

if __name__ == "__main__":
    organizar()
