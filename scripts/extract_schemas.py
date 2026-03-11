import os
import json
import sys

# Adiciona o diretório atual ao sys.path para importações locais funcionarem
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.schemas.charger_schemas import KanbanResponse, RankingResponse, ChargerCreate, ScheduleUpdate, MultipleAssignment

def main():
    os.makedirs('docs/charger_schemas', exist_ok=True)
    schemas = {
        'KanbanResponse.json': KanbanResponse.model_json_schema(),
        'RankingResponse.json': RankingResponse.model_json_schema(),
        'ChargerCreate.json': ChargerCreate.model_json_schema(),
        'ScheduleUpdate.json': ScheduleUpdate.model_json_schema(),
        'MultipleAssignment.json': MultipleAssignment.model_json_schema()
    }

    for name, schema in schemas.items():
        with open(f'docs/charger_schemas/{name}', 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2)
    print("Schemas gerados com sucesso na pasta docs/charger_schemas/")

if __name__ == '__main__':
    main()
