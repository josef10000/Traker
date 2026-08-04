import json
import logging
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RULES_BASE_URL = "https://firebaserules.googleapis.com/v1"
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
TIMEOUT_SECONDS = 30

def deploy_rules_to_named_db():
    logger.info("Iniciando deploy de regras para o banco nomeado...")
    
    try:
        with open('service-account.json', 'r', encoding='utf-8') as f:
            sa_info = json.load(f)
        
        with open('firebase-applet-config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
            
        database_id = config.get('firestoreDatabaseId')
        project_id = sa_info.get('project_id')
        
        logger.info("Projeto: %s", project_id)
        logger.info("Banco de Dados: %s", database_id)

        creds = service_account.Credentials.from_service_account_info(sa_info, scopes=SCOPES)
        creds.refresh(Request())
        token = creds.token
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        rules_content = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}"""

        logger.info("Criando novo ruleset...")
        ruleset_payload = {
            "source": {
                "files": [{"name": "firestore.rules", "content": rules_content}]
            }
        }
        
        ruleset_res = requests.post(
            f"{RULES_BASE_URL}/projects/{project_id}/rulesets",
            json=ruleset_payload,
            headers=headers,
            timeout=TIMEOUT_SECONDS
        )
        
        if ruleset_res.status_code != 200:
            logger.error("Erro ao criar ruleset: %s", ruleset_res.text)
            return

        ruleset_name = ruleset_res.json().get('name')
        logger.info("Ruleset criado: %s", ruleset_name)

        release_name = f"cloud.firestore/{database_id}"
        release_url = f"{RULES_BASE_URL}/projects/{project_id}/releases/{release_name}"
        
        logger.info("Atualizando release %s...", release_name)
        release_payload = {
            "release": {
                "name": f"projects/{project_id}/releases/{release_name}",
                "rulesetName": ruleset_name
            }
        }
        
        res = requests.patch(
            f"{release_url}?updateMask=rulesetName",
            json=release_payload["release"],
            headers=headers,
            timeout=TIMEOUT_SECONDS
        )

        if res.status_code == 200:
            logger.info("--- REGRAS APLICADAS COM SUCESSO NO BANCO NOMEADO! ---")
        else:
            logger.error("Erro ao atualizar release: %s", res.text)
            
    except (OSError, json.JSONDecodeError, requests.RequestException) as err:
        logger.error("Erro no deploy de regras: %s", err)

if __name__ == "__main__":
    deploy_rules_to_named_db()
