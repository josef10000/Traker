import firebase_admin
from firebase_admin import credentials, firestore
import json

def delete_collection(coll_ref, batch_size=100):
    docs = list(coll_ref.limit(batch_size).stream())
    deleted = 0

    for doc in docs:
        doc.reference.delete()
        deleted += 1

    if deleted >= batch_size:
        return delete_collection(coll_ref, batch_size)

def clear_all():
    print("Iniciando limpeza total do banco de dados Firestore...")
    try:
        cred = credentials.Certificate('service-account.json')
        with open('firebase-applet-config.json', 'r') as f:
            client_config = json.load(f)
        database_id = client_config.get('firestoreDatabaseId')
        
        firebase_admin.initialize_app(cred)
        try:
            db = firestore.client(database=database_id)
            print(f"Conectado ao banco de dados nomeado: {database_id}")
        except Exception as e:
            db = firestore.client()
            print("Conectado ao banco de dados padrão (default)")

        collections = ['users', 'organizations', 'teams', 'agreements', 'reconciliations', 'audit_logs']
        for col_name in collections:
            coll_ref = db.collection(col_name)
            print(f"Limpando colecao '{col_name}'...")
            delete_collection(coll_ref)
            print(f"Colecao '{col_name}' limpa com sucesso.")

        print("--- BANCO DE DADOS RESETADO COM SUCESSO! ---")

    except Exception as e:
        print(f"Erro ao resetar banco de dados: {e}")

if __name__ == "__main__":
    clear_all()
