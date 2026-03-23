"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  type ChargerReportResponseV2,
  type ChargerV2,
  createChargerV2,
  fetchChargerReportV2,
  inactivateChargerV2,
  listChargersV2,
  reactivateChargerV2,
} from "@/lib/api/chargerManagementService";

function toIso(date: Date): string {
  return date.toISOString();
}

function startOfTodayIso(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  return toIso(start);
}

function endOfTodayIso(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return toIso(end);
}

export default function ChargerManagementV2Page() {
  const params = useParams<{ context: string }>();
  const context = params?.context || "sis";

  const [chargers, setChargers] = useState<ChargerV2[]>([]);
  const [report, setReport] = useState<ChargerReportResponseV2 | null>(null);
  const [startAt, setStartAt] = useState(startOfTodayIso());
  const [endAt, setEndAt] = useState(endOfTodayIso());
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("SIS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [chargersData, reportData] = await Promise.all([
        listChargersV2(context),
        fetchChargerReportV2(context, {
          start_at: startAt,
          end_at: endAt,
        }),
      ]);
      setChargers(chargersData);
      setReport(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [context, endAt, startAt]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createChargerV2(context, {
        name: name.trim(),
        department: department.trim(),
      });
      setName("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar carregador");
    } finally {
      setSaving(false);
    }
  }, [context, department, loadData, name]);

  const handleToggleStatus = useCallback(
    async (charger: ChargerV2) => {
      setSaving(true);
      setError(null);
      try {
        if (charger.status === "active") {
          await inactivateChargerV2(context, charger.id, {
            reason_code: "administrative",
            reason_text: "Inativacao operacional",
            inactivated_at: new Date().toISOString(),
            expected_return_at: null,
          });
        } else {
          await reactivateChargerV2(context, charger.id);
        }
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao alterar status");
      } finally {
        setSaving(false);
      }
    },
    [context, loadData]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gestao de Carregadores v2</h1>
            <p className="text-sm text-slate-400">
              Contexto: <span className="font-mono">{context}</span>
            </p>
          </div>
          <button
            type="button"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
            onClick={() => {
              startTransition(() => {
                void loadData();
              });
            }}
            disabled={loading || saving}
          >
            Atualizar
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total de carregadores</p>
            <p className="mt-2 text-2xl font-semibold">{chargers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Ativos</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {chargers.filter((item) => item.status === "active").length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Minutos em atuacao</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-300">
              {report?.data.reduce((acc, item) => acc + item.acting_minutes, 0) ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Minutos ociosos</p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">
              {report?.data.reduce((acc, item) => acc + item.idle_minutes, 0) ?? 0}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">Nome do carregador</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Carregador Patio C"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm text-slate-300">Departamento</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="SIS"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm text-slate-300">Inicio do periodo</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              value={startAt.slice(0, 16)}
              onChange={(event) => {
                const next = new Date(event.target.value);
                if (!Number.isNaN(next.getTime())) {
                  setStartAt(next.toISOString());
                }
              }}
            />
          </div>
          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm text-slate-300">Fim do periodo</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              value={endAt.slice(0, 16)}
              onChange={(event) => {
                const next = new Date(event.target.value);
                if (!Number.isNaN(next.getTime())) {
                  setEndAt(next.toISOString());
                }
              }}
            />
          </div>
          <div className="lg:col-span-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
              disabled={!name.trim() || saving}
              onClick={() => {
                startTransition(() => {
                  void handleCreate();
                });
              }}
            >
              Adicionar carregador
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              onClick={() => {
                startTransition(() => {
                  void loadData();
                });
              }}
            >
              Aplicar periodo
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-md border border-rose-700 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Carregador</th>
                <th className="px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3 font-medium">Atuacao (min)</th>
                <th className="px-4 py-3 font-medium">Ociosidade (min)</th>
                <th className="px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                chargers.map((charger) => {
                  const reportRow = report?.data.find((item) => item.charger_id === charger.id);
                  return (
                    <tr key={charger.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">{charger.name}</td>
                      <td className="px-4 py-3 text-slate-300">{charger.department}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md border border-slate-700 px-2 py-1 text-xs uppercase tracking-wide">
                          {charger.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{reportRow?.ticket_count ?? 0}</td>
                      <td className="px-4 py-3">{reportRow?.acting_minutes ?? 0}</td>
                      <td className="px-4 py-3">{reportRow?.idle_minutes ?? 0}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-800 disabled:opacity-60"
                          disabled={saving}
                          onClick={() => {
                            startTransition(() => {
                              void handleToggleStatus(charger);
                            });
                          }}
                        >
                          {charger.status === "active" ? "Inativar" : "Reativar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Carregando dados...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
