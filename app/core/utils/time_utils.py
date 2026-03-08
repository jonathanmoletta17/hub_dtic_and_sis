from datetime import datetime, timedelta

def calculate_business_minutes(
    start_dt: datetime, 
    end_dt: datetime, 
    schedule_start: str = "08:00", 
    schedule_end: str = "18:00", 
    work_on_weekends: bool = False
) -> int:
    """
    Calcula os minutos úteis corridos entre duas datas, 
    respeitando o horário comercial e finais de semana.
    """
    if start_dt > end_dt:
        return 0

    fmt = "%H:%M"
    b_start = datetime.strptime(schedule_start, fmt).time()
    b_end = datetime.strptime(schedule_end, fmt).time()
    
    total_minutes = 0
    current_dt = start_dt.replace(second=0, microsecond=0)
    
    while current_dt.date() <= end_dt.date():
        # Pula final de semana se necessário
        if not work_on_weekends and current_dt.weekday() >= 5:
            current_dt += timedelta(days=1)
            current_dt = current_dt.replace(hour=b_start.hour, minute=b_start.minute)
            continue
        
        day_start = datetime.combine(current_dt.date(), b_start)
        day_end = datetime.combine(current_dt.date(), b_end)
        
        # Janela de sobreposição no dia atual
        overlap_start = max(current_dt, day_start)
        overlap_end = min(end_dt, day_end)
        
        if overlap_start < overlap_end:
            delta = overlap_end - overlap_start
            total_minutes += int(delta.total_seconds() / 60)
        
        # Próximo dia às b_start
        current_dt += timedelta(days=1)
        current_dt = current_dt.replace(hour=b_start.hour, minute=b_start.minute)
        
    return total_minutes

def format_elapsed_time(minutes: int) -> str:
    """Formata minutos em 'Xh Ym'."""
    h = minutes // 60
    m = minutes % 60
    return f"{h}h {m}m"
