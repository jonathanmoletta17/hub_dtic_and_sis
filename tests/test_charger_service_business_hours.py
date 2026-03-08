import pytest
from datetime import datetime
from app.core.utils.time_utils import calculate_business_minutes

@pytest.fixture
def service_calc():
    return calculate_business_minutes

def test_business_minutes_same_day(service):
    """Teste de chamado dentro do mesmo dia útil, sem corte de horário."""
    start = datetime(2023, 10, 2, 10, 0, 0) # Segunda-feira 10h
    end = datetime(2023, 10, 2, 12, 0, 0)   # Segunda-feira 12h
    
    # 2 horas = 120 minutos
    mins = service.calculate_business_minutes(start, end, "08:00", "18:00")
    assert mins == 120

def test_business_minutes_overnight(service):
    """Teste de chamado pegando final do expediente de um dia e começo do outro."""
    start = datetime(2023, 10, 2, 17, 30, 0) # Segunda-feira 17h30
    end = datetime(2023, 10, 3, 9, 0, 0)    # Terça-feira 09:00
    
    # Expediente 08:00 às 18:00
    # Segunda: 17h30 às 18h00 = 30 min
    # Terça: 08h00 às 09h00 = 60 min
    # Total esperado: 90 min
    mins = service.calculate_business_minutes(start, end, "08:00", "18:00")
    assert mins == 90

def test_business_minutes_over_weekend(service):
    """Teste ignorando fim de semana (work_on_weekends=False)."""
    start = datetime(2023, 10, 6, 17, 0, 0) # Sexta-feira 17:00
    end = datetime(2023, 10, 9, 10, 0, 0)   # Segunda-feira 10:00
    
    # Expediente 08:00 às 18:00
    # Sexta: 17h às 18h = 60 min
    # Sábado = 0
    # Domingo = 0
    # Segunda: 08h às 10h = 120 min
    # Total esperado = 180 min
    mins = service.calculate_business_minutes(start, end, "08:00", "18:00", False)
    assert mins == 180

def test_business_minutes_include_weekend(service):
    """Teste forçando contagem no final de semana (work_on_weekends=True)."""
    start = datetime(2023, 10, 6, 17, 0, 0) # Sexta-feira 17:00
    end = datetime(2023, 10, 8, 10, 0, 0)   # Domingo 10:00
    
    # Expediente 08:00 às 18:00
    # Sexta: 17h às 18h = 60 min
    # Sábado: 08h às 18h = 600 min
    # Domingo: 08h às 10h = 120 min
    # Total esperado: 780 min
    mins = service.calculate_business_minutes(start, end, "08:00", "18:00", True)
    assert mins == 780

def test_business_minutes_night_shift(service):
    """Teste de limite 1 para chamado que não ocorreu no horário comercial."""
    start = datetime(2023, 10, 2, 19, 0, 0) # Segunda-feira 19:00
    end = datetime(2023, 10, 2, 23, 0, 0)   # Segunda-feira 23:00
    
    # Horário comercial 08:00 às 18:00 -> Tudo ocorreu fora de hora, 0 min.
    mins = service.calculate_business_minutes(start, end, "08:00", "18:00", False)
    assert mins == 0

def test_business_minutes_inverted_dates(service):
    """Teste de blindagem quando data fim é menor que data início."""
    start = datetime(2023, 10, 3, 10, 0, 0)
    end = datetime(2023, 10, 2, 10, 0, 0)
    
    mins = service.calculate_business_minutes(start, end, "08:00", "18:00")
    assert mins == 0
