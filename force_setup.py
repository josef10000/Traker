import json
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def force_setup():
    try:
        cred = credentials.Certificate('service-account.json')
        with open('firebase-applet-config.json', 'r', encoding='utf-8') as f:
            client_config = json.load(f)
        database_id = client_config.get('firestoreDatabaseId')
        
        firebase_admin.initialize_app(cred)
        try:
            db = firestore.client(database=database_id)
        except Exception:
            db = firestore.client()

        uid = "yan4TWHRHwNW68WInKwDhkUajSz2"
        email = "jfs102019@hotmail.com"
        team_id = "equipe_oficial"

        logger.info("Forcando acesso para %s...", email)

        db.collection('teams').document(team_id).set({
            "id": team_id,
            "name": "Equipe Oficial",
            "supervisorId": uid,
            "inviteToken": "convite_oficial_2026",
            "createdAt": firestore.SERVER_TIMESTAMP
        })

        db.collection('users').document(uid).set({
            "uid": uid,
            "email": email,
            "displayName": "José Frazão",
            "role": "supervisor",
            "teamId": team_id,
            "managedTeams": [team_id],
            "createdAt": firestore.SERVER_TIMESTAMP
        })

        logger.info("SUCESSO! Dados gravados no banco nomeado.")

    except (OSError, json.JSONDecodeError, ValueError) as err:
        logger.error("Erro no force_setup: %s", err)

if __name__ == "__main__":
    force_setup()
