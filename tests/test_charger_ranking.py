import pytest
from datetime import datetime
from zoneinfo import ZoneInfo
from unittest.mock import AsyncMock, MagicMock
from app.services.charger_service import ChargerService

class MockRowDetail:
    def __init__(self, cid, name, b_start, b_end, tid, t_date, s_date, assigned_at):
        self.id = cid
        self.name = name
        self.b_start = b_start
        self.b_end = b_end
        self.ticket_id = tid
        self.ticket_date = t_date
        self.solvedate = s_date
        self.assigned_at = assigned_at

class MockChargerRow:
    def __init__(self, cid, name):
        self.id = cid
        self.name = name

@pytest.mark.asyncio
async def test_get_ranking_calculates_business_hours_correctly():
    service = ChargerService()
    
    # Mocks para o banco de dados simulando retorno de queries
    # Serão duas chamadas await glpi_db.execute(), uma pros tickets, outra pros carregadores gerais
    
    tz = ZoneInfo("America/Sao_Paulo")
    
    # 1. Mock dos tickets brutos
    # Ticket 1: Começa 17h, termina 09h dia seguinte. (Apenas 90 mins comerciais de 08:00->18:00)
    row_t1 = MockRowDetail(
        cid=1, name="Leonardo", b_start="08:00", b_end="18:00", 
        tid=100, t_date=datetime(2023, 10, 2, 17, 0, 0, tzinfo=tz), 
        s_date=datetime(2023, 10, 3, 9, 0, 0, tzinfo=tz), 
        assigned_at=datetime(2023, 10, 2, 17, 30, 0, tzinfo=tz)
    )
    
    # Ticket 2: (Para o mesmo Leonardo) Fim de semana (17h sexta -> 10h segunda = 180 min)
    row_t2 = MockRowDetail(
        cid=1, name="Leonardo", b_start="08:00", b_end="18:00", 
        tid=101, t_date=datetime(2023, 10, 6, 17, 0, 0, tzinfo=tz), 
        s_date=datetime(2023, 10, 9, 10, 0, 0, tzinfo=tz), 
        assigned_at=datetime(2023, 10, 6, 17, 0, 0, tzinfo=tz)
    )

    # 2. Mock dos carregadores
    all_ch_rows = [MockChargerRow(1, "Leonardo"), MockChargerRow(2, "Ocioso")]

    # Configurando o Mock do AsyncSession
    mock_db = AsyncMock()
    
    # Mock do resultado do `execute().fetchall()`
    mock_res_tickets = MagicMock()
    mock_res_tickets.fetchall.return_value = [row_t1, row_t2]
    
    mock_res_all = MagicMock()
    mock_res_all.fetchall.return_value = all_ch_rows

    # side_effect permite retornar resultados diferentes em chamadas sequenciais
    mock_db.execute.side_effect = [mock_res_tickets, mock_res_all]

    # Chama o get_ranking ignorando datas reais pra focar na montagem do JSON
    res = await service.get_ranking("sis", mock_db, "2023-10-01", "2023-10-31")

    # Verifica o resultado
    assert res.context == "sis"
    assert len(res.ranking) == 2
    
    leo = next((r for r in res.ranking if r.name == "Leonardo"), None)
    ocioso = next((r for r in res.ranking if r.name == "Ocioso"), None)
    
    assert leo is not None
    assert ocioso is not None
    
    # Total Leonardo = 90min (T1) + 180min (T2) = 270 minutos
    assert leo.total_service_minutes == 270
    assert leo.completed_tickets == 2
    # Média = 270 / 2 = 135 minutos (2h 15m)
    assert leo.average_wait_time == "2h 15m"

    # Total Ocioso = 0
    assert ocioso.total_service_minutes == 0
    assert ocioso.completed_tickets == 0
