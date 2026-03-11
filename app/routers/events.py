import asyncio
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Import database injector
from app.core.database import get_db

from app.core.auth_guard import verify_session
router = APIRouter(prefix="/api/v1/{context}/events", tags=["Domain: Events (SSE)"], dependencies=[Depends(verify_session)])

@router.get("/stream")
async def sse_stream(request: Request, context: str, db: AsyncSession = Depends(get_db)):
    """
    [SSE / EventSource]
    Streaming assíncrono para eventos em tempo real do GLPI.
    Faz polling no bd a cada 3s buscando novos logs.
    """
    async def event_generator():
        last_id = 0
        
        # Pega o ultimo ID inicialmente para não despejar tudo
        initial_query = text("SELECT MAX(id) FROM glpi_logs")
        try:
            res = await db.execute(initial_query)
            row = res.fetchone()
            if row and row[0]:
                last_id = row[0]
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Erro no fetch inicial de MAX(id) no SSE events: %s", e)

        while True:
            # Verifica se o cliente desconectou
            if await request.is_disconnected():
                break

            try:
                # Polling na tabela glpi_logs para updates em Tickets (e Carregadores se vinculados via ticket)
                query = text("""
                    SELECT id, itemtype, items_id, date_mod, message_log, content
                    FROM glpi_logs 
                    WHERE id > :last_id 
                    ORDER BY id ASC 
                    LIMIT 20
                """)
                res = await db.execute(query, {"last_id": last_id})
                rows = res.fetchall()
                
                if rows:
                    for r in rows:
                        event_data = {
                            "id": r[0],
                            "itemtype": r[1],
                            "items_id": r[2],
                            "date_mod": str(r[3]),
                            "message_log": str(r[4]) if r[4] else "",
                            "content": str(r[5]) if r[5] else ""
                        }
                        # Formatação estrita SSE (Server-Sent Events)
                        yield f"data: {json.dumps(event_data)}\\n\\n"
                        last_id = r[0]
                        
            except Exception as e:
                import logging
                logging.getLogger(__name__).error("Erro no processamento central do SSE events: %s", e)
            
            # Ping para manter conexão ativa (previne timeout de proxy)
            yield ": keep-alive\\n\\n"
            await asyncio.sleep(3)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
