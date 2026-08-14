import json
import logging
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FIRESTORE_BASE_URL = "https://firestore.googleapis.com/v1"
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
TIMEOUT_SECONDS = 30

def get_auth_headers():
    with open('service-account.json', 'r', encoding='utf-8') as f:
        sa_info = json.load(f)
    creds = service_account.Credentials.from_service_account_info(sa_info, scopes=SCOPES)
    creds.refresh(Request())
    return {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json"
    }

def delete_document(doc_name, headers):
    url = f"{FIRESTORE_BASE_URL}/{doc_name}"
    res = requests.delete(url, headers=headers, timeout=TIMEOUT_SECONDS)
    if res.status_code == 200:
        logger.info("Deletado: %s", doc_name)
    else:
        logger.error("Erro ao deletar %s: %d - %s", doc_name, res.status_code, res.text)

def clear_collection(project_id, database_id, collection_id, headers):
    page_token = None
    while True:
        url = f"{FIRESTORE_BASE_URL}/projects/{project_id}/databases/{database_id}/documents/{collection_id}"
        params = {}
        if page_token:
            params['pageToken'] = page_token
            
        res = requests.get(url, headers=headers, params=params, timeout=TIMEOUT_SECONDS)
        if res.status_code == 404:
            break
        if res.status_code != 200:
            logger.error("Erro ao listar colecao %s: %d - %s", collection_id, res.status_code, res.text)
            break

        data = res.json()
        documents = data.get('documents', [])
        for doc_item in documents:
            doc_name = doc_item.get('name')
            if doc_name:
                delete_document(doc_name, headers)

        page_token = data.get('nextPageToken')
        if not page_token:
            break

def clear_all():
    logger.info("Iniciando reset do banco de dados via API REST do Firestore...")
    try:
        with open('service-account.json', 'r', encoding='utf-8') as f:
            sa_info = json.load(f)
        with open('firebase-applet-config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
            
        database_id = config.get('firestoreDatabaseId')
        project_id = sa_info.get('project_id')
        
        headers = get_auth_headers()
        logger.info("Conectado ao projeto %s, banco de dados: %s", project_id, database_id)

        collections = ['users', 'organizations', 'teams', 'agreements', 'reconciliations', 'audit_logs']
        for col in collections:
            logger.info("Limpando colecao '%s'...", col)
            clear_collection(project_id, database_id, col, headers)
            logger.info("Colecao '%s' processada.", col)

        logger.info("--- RESET CONCLUIDO COM SUCESSO! ---")
    except (OSError, json.JSONDecodeError, requests.RequestException) as err:
        logger.error("Erro durante o reset: %s", err)

if __name__ == "__main__":
    clear_all()
