from sqlalchemy import text

# Categorias de Carregadores no GLPI (SIS)
CHARGER_ITIL_CATEGORIES = (55, 56, 57, 58, 101, 102, 103)

SQL_CHARGER_META = text("""
    SELECT 
        ch.id, 
        ch.name, 
        l.completename as location,
        COALESCE(NULLIF(f.statusofflinefield, ''), '0') as is_offline_raw,
        f.motivodainatividadefield as offline_reason,
        f.expectativaderetornofield as expected_return,
        COALESCE(NULLIF(f.inciodoexpedientefield, ''), '08:00') as b_start,
        COALESCE(NULLIF(f.fimdoexpedientefield, ''), '18:00') as b_end
    FROM glpi_plugin_genericobject_carregadors ch
    LEFT JOIN glpi_locations l ON ch.locations_id = l.id
    LEFT JOIN glpi_plugin_fields_plugingenericobjectcarregadorcarregadors f 
        ON f.items_id = ch.id 
        AND f.itemtype = 'PluginGenericobjectCarregador'
    WHERE ch.is_deleted = 0
""")

SQL_AVAILABLE_CHARGERS = text("""
    SELECT c.id, c.name,
           (SELECT MAX(t.solvedate)
            FROM glpi_items_tickets it
            JOIN glpi_tickets t ON it.tickets_id = t.id
            WHERE it.itemtype = 'PluginGenericobjectCarregador'
              AND it.items_id = c.id
              AND t.status IN (5, 6)) as last_solved_date
    FROM glpi_plugin_genericobject_carregadors c
    WHERE c.is_deleted = 0
      AND NOT EXISTS (
          SELECT 1 FROM glpi_items_tickets it_active
          JOIN glpi_tickets t_active ON it_active.tickets_id = t_active.id
          WHERE it_active.itemtype = 'PluginGenericobjectCarregador'
            AND it_active.items_id = c.id
            AND t_active.status IN (1, 2, 3, 4)
            AND t_active.is_deleted = 0
      )
    ORDER BY last_solved_date ASC, c.name ASC
""")

SQL_LAST_RESOLVED_TICKET = text("""
    SELECT t.id, t.name as title, t.solvedate,
           COALESCE(l.completename, '') as location
    FROM glpi_items_tickets it
    JOIN glpi_tickets t ON it.tickets_id = t.id
    LEFT JOIN glpi_locations l ON t.locations_id = l.id
    WHERE it.itemtype = 'PluginGenericobjectCarregador'
      AND it.items_id = :cid
      AND t.status IN (5, 6)
      AND t.is_deleted = 0
    ORDER BY t.solvedate DESC LIMIT 1
""")

SQL_ALLOCATED_CHARGERS = text("""
    SELECT 
        c.id as charger_id, c.name as charger_name,
        t.id as ticket_id, t.name as ticket_name, t.date as ticket_date, t.status as ticket_status,
        COALESCE(loc.completename, '') as location,
        COALESCE(cat.completename, '') as category_name,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''), u.realname, u.firstname, u.name) as requester_name,
        (
            SELECT MIN(gl.date_mod)
            FROM glpi_logs gl
            WHERE gl.itemtype = 'Ticket' AND gl.items_id = t.id
              AND gl.itemtype_link = 'PluginGenericobjectCarregador' AND gl.linked_action = 15
              AND gl.new_value LIKE CONCAT('%(', c.id, ')%')
        ) as assigned_date
    FROM glpi_plugin_genericobject_carregadors c
    JOIN glpi_items_tickets it ON c.id = it.items_id AND it.itemtype = 'PluginGenericobjectCarregador'
    JOIN glpi_tickets t ON it.tickets_id = t.id
    LEFT JOIN glpi_locations loc ON t.locations_id = loc.id
    LEFT JOIN glpi_itilcategories cat ON t.itilcategories_id = cat.id
    LEFT JOIN glpi_tickets_users tu ON t.id = tu.tickets_id AND tu.type = 1
    LEFT JOIN glpi_users u ON tu.users_id = u.id
    WHERE c.is_deleted = 0
      AND t.status IN (1, 2, 3, 4)
      AND t.is_deleted = 0
      AND t.itilcategories_id IN :categories
    ORDER BY t.date DESC
""")

SQL_PENDING_DEMANDS = text("""
    SELECT 
        t.id, t.name, t.status, t.priority, t.date as date_creation,
        COALESCE(loc.completename, '') as location,
        c.completename as category,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''), u.realname, u.firstname, u.name) as requester_name
    FROM glpi_tickets t
    JOIN glpi_itilcategories c ON t.itilcategories_id = c.id
    LEFT JOIN glpi_tickets_users tu ON t.id = tu.tickets_id AND tu.type = 1
    LEFT JOIN glpi_users u ON tu.users_id = u.id
    LEFT JOIN glpi_locations loc ON t.locations_id = loc.id
    WHERE t.is_deleted = 0
      AND t.status IN (1, 2, 3, 4)
      AND t.itilcategories_id IN :categories
      AND NOT EXISTS (
          SELECT 1 FROM glpi_items_tickets it
          WHERE it.tickets_id = t.id AND it.itemtype = 'PluginGenericobjectCarregador'
      )
    ORDER BY t.date ASC
""")

SQL_RANKING_LOGS = text("""
    SELECT 
        ch.id, 
        ch.name,
        COALESCE(NULLIF(f.inciodoexpedientefield, ''), '08:00') as b_start,
        COALESCE(NULLIF(f.fimdoexpedientefield, ''), '18:00') as b_end,
        it.tickets_id as ticket_id,
        t.date as ticket_date,
        t.solvedate,
        COALESCE(
            (
                SELECT MIN(gl.date_mod)
                FROM glpi_logs gl
                WHERE gl.itemtype = 'Ticket' AND gl.items_id = t.id
                  AND gl.itemtype_link = 'PluginGenericobjectCarregador' AND gl.linked_action = 15
                  AND gl.new_value LIKE CONCAT('%(', it.items_id, ')%')
            ),
            t.date
        ) as assigned_at
    FROM glpi_plugin_genericobject_carregadors ch
    LEFT JOIN glpi_plugin_fields_plugingenericobjectcarregadorcarregadors f
        ON f.items_id = ch.id AND f.itemtype = 'PluginGenericobjectCarregador'
    JOIN glpi_items_tickets it ON ch.id = it.items_id AND it.itemtype = 'PluginGenericobjectCarregador'
    JOIN glpi_tickets t ON it.tickets_id = t.id
    WHERE ch.is_deleted = 0
      AND t.is_deleted = 0
      AND (t.solvedate BETWEEN :start AND :end OR (t.solvedate IS NULL AND t.date BETWEEN :start AND :end))
""")

SQL_ALL_ACTIVE_CHARGERS = text("""
    SELECT id, name FROM glpi_plugin_genericobject_carregadors WHERE is_deleted = 0
""")

SQL_TICKET_BASIC_DETAILS = text("""
    SELECT t.id, t.name, t.content, t.date, t.status, t.priority,
           COALESCE(loc.completename, '') as location,
           COALESCE(cat.completename, '') as category,
           COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''), u.realname, u.firstname, u.name) as requester_name
    FROM glpi_tickets t
    LEFT JOIN glpi_locations loc ON t.locations_id = loc.id
    LEFT JOIN glpi_itilcategories cat ON t.itilcategories_id = cat.id
    LEFT JOIN glpi_tickets_users tu ON t.id = tu.tickets_id AND tu.type = 1
    LEFT JOIN glpi_users u ON tu.users_id = u.id
    WHERE t.id = :tid AND t.is_deleted = 0
    LIMIT 1
""")

SQL_CHARGERS_IN_TICKET = text("""
    SELECT c.id, c.name,
           COALESCE(NULLIF(f.inciodoexpedientefield, ''), '08:00') as b_start,
           COALESCE(NULLIF(f.fimdoexpedientefield, ''), '18:00') as b_end,
           (
               SELECT MIN(gl.date_mod)
               FROM glpi_logs gl
               WHERE gl.itemtype = 'Ticket' AND gl.items_id = :tid
                 AND gl.itemtype_link = 'PluginGenericobjectCarregador' AND gl.linked_action = 15
                 AND gl.new_value LIKE CONCAT('%(', c.id, ')%')
           ) as assigned_date
    FROM glpi_items_tickets it
    JOIN glpi_plugin_genericobject_carregadors c ON it.items_id = c.id
    LEFT JOIN glpi_plugin_fields_plugingenericobjectcarregadorcarregadors f
        ON f.items_id = c.id AND f.itemtype = 'PluginGenericobjectCarregador'
    WHERE it.tickets_id = :tid
      AND it.itemtype = 'PluginGenericobjectCarregador'
      AND c.is_deleted = 0
""")

SQL_AVAILABLE_CHARGERS_DETAILED = text("""
    SELECT c.id, c.name,
           COALESCE(NULLIF(f.statusofflinefield, ''), '0') as is_offline_raw,
           (SELECT t2.id
            FROM glpi_items_tickets it2
            JOIN glpi_tickets t2 ON it2.tickets_id = t2.id
            WHERE it2.itemtype = 'PluginGenericobjectCarregador'
              AND it2.items_id = c.id
              AND t2.status >= 5 AND t2.is_deleted = 0
            ORDER BY t2.solvedate DESC LIMIT 1
           ) as last_ticket_id,
           (SELECT t2.name
            FROM glpi_items_tickets it2
            JOIN glpi_tickets t2 ON it2.tickets_id = t2.id
            WHERE it2.itemtype = 'PluginGenericobjectCarregador'
              AND it2.items_id = c.id
              AND t2.status >= 5 AND t2.is_deleted = 0
            ORDER BY t2.solvedate DESC LIMIT 1
           ) as last_ticket_name,
           (SELECT t2.solvedate
            FROM glpi_items_tickets it2
            JOIN glpi_tickets t2 ON it2.tickets_id = t2.id
            WHERE it2.itemtype = 'PluginGenericobjectCarregador'
              AND it2.items_id = c.id
              AND t2.status >= 5 AND t2.is_deleted = 0
            ORDER BY t2.solvedate DESC LIMIT 1
           ) as last_ticket_solvedate,
           (SELECT COALESCE(loc2.completename, '')
            FROM glpi_items_tickets it2
            JOIN glpi_tickets t2 ON it2.tickets_id = t2.id
            LEFT JOIN glpi_locations loc2 ON t2.locations_id = loc2.id
            WHERE it2.itemtype = 'PluginGenericobjectCarregador'
              AND it2.items_id = c.id
              AND t2.status >= 5 AND t2.is_deleted = 0
            ORDER BY t2.solvedate DESC LIMIT 1
           ) as last_ticket_location
    FROM glpi_plugin_genericobject_carregadors c
    LEFT JOIN glpi_plugin_fields_plugingenericobjectcarregadorcarregadors f
        ON f.items_id = c.id AND f.itemtype = 'PluginGenericobjectCarregador'
    WHERE c.is_deleted = 0
      AND NOT EXISTS (
          SELECT 1 FROM glpi_items_tickets it_a
          JOIN glpi_tickets t_a ON it_a.tickets_id = t_a.id
          WHERE it_a.itemtype = 'PluginGenericobjectCarregador'
            AND it_a.items_id = c.id
            AND t_a.status IN (1, 2, 3, 4)
            AND t_a.is_deleted = 0
      )
    ORDER BY c.name ASC
""")
