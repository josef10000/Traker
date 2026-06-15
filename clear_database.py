import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

def get_auth_headers():
    with open('service-account.json', 'r') as f:
        sa_info = json.load(f)
    scopes = ['https://www.googleapis.com/auth/cloud-platform']
    creds = service_account.Credentials.from_service_account_info(sa_info, scopes=scopes)
    creds.refresh(Request())
    return {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json"
    }

def delete_document(doc_name, headers):
    url = f"https://firestore.googleapis.com/v1/{doc_name}"
    res = requests.delete(url, headers=headers)
    if res.status_code == 200:
        print(f"Deletado: {doc_name}")
    else:
        print(f"Erro ao deletar {doc_name}: {res.status_code} - {res.text}")

def clear_collection(project_id, database_id, collection_id, headers):
    page_token = None
    while True:
        url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/{database_id}/documents/{collection_id}"
        params = {}
        if page_token:
            params['pageToken'] = page_token
            
        res = requests.get(url, headers=headers, params=params)
        if res.status_code == 404:
            break
        if res.status_code != 200:
            print(f"Erro ao listar colecao {collection_id}: {res.status_code} - {res.text}")
            break

        data = res.json()
        documents = data.get('documents', [])
        for doc in documents:
            doc_name = doc.get('name')
            delete_document(doc_name, headers)

        page_token = data.get('nextPageToken')
        if not page_token:
            break

def clear_all():
    print("Iniciando reset do banco de dados via API REST do Firestore...")
    try:
        with open('service-account.json', 'r') as f:
            sa_info = json.load(f)
        with open('firebase-applet-config.json', 'r') as f:
            config = json.load(f)
            
        database_id = config.get('firestoreDatabaseId')
        project_id = sa_info['project_id']
        
        headers = get_auth_headers()
        print(f"Conectado ao projeto {project_id}, banco de dados: {database_id}")

        collections = ['users', 'organizations', 'teams', 'agreements', 'reconciliations', 'audit_logs']
        for col in collections:
            print(f"Limpando colecao '{col}'...")
            clear_collection(project_id, database_id, col, headers)
            print(f"Colecao '{col}' processada.")

        print("--- RESET CONCLUIDO COM SUCESSO! ---")
    except Exception as e:
        print(f"Erro no reset: {e}")

if __name__ == "__main__":
    clear_all()
